// services/marksCalculation.js
//
// Server-side marks calculation.
//
// This is a VERBATIM port of the scoring logic that used to run in the browser
// (shorthand_exam_dashboard_frontend/src/services/comparisonService.js). It is
// deliberately a transcription, not a rewrite: calculateResultAndGrade and
// processBatchResults below must keep producing the same marks, grades and grace
// as the frontend did, so the code is copied line for line including its comments
// and its use of toFixed/parseFloat. Node and the browser both run V8, so the
// floating point behaviour is identical.
//
// Why it moved: the browser ran out of memory on department 17 (8,583 students).
// The comparison service returns ~12.3 KB per item, so a full run is ~206 MB of
// mistake word lists — 3.46 million strings. None of that affects a single mark:
// the scoring below only ever reads .length off those arrays. The words are needed
// solely for the Student-wise report and the expanded-row detail view, so they now
// stay on this side and are spooled to disk instead of being sent to the browser.

const fs = require('fs');
const path = require('path');
const os = require('os');

const COMPARE_API_BASE_URL = process.env.COMPARE_API_URL || 'http://localhost:5002';

// Students per /compare-batch request. Bounds both the request we build and the
// response we hold, so peak memory here does not scale with department size.
const CHUNK_SIZE = Number(process.env.MARKS_CHUNK_SIZE || 250);

const SPOOL_DIR = path.join(os.tmpdir(), 'shorthand-marks-jobs');

// ============================================================
// BUSINESS LOGIC — ported verbatim, do not "improve"
// ============================================================

/**
 * Did the candidate submit anything for this passage?
 *
 * The blank-passage substitution (' ') keeps the comparison running for an
 * unattempted passage, so every model-answer word still comes back as an omission -
 * that is what the Student-wise report needs to show. The MARK, though, must be an
 * outright 0 rather than 50 - total/3 clamped at zero: the clamp only lands on 0
 * because a real GCC model answer runs to hundreds of words, and would leave marks
 * on the board for a short or truncated one.
 */
const hasAttempt = (value) => value != null && String(value).trim() !== '';

/**
 * Calculate result and grade based on marks
 *
 * Mandatory order of logic (Rule 7):
 *   1. Apply rounding to individual passage marks
 *   2. Check minimum per-passage eligibility
 *   3. Determine grace eligibility (can the student pass with max 2 grace?)
 *   4. Apply grace minimally and conditionally
 *   5. Determine PASS / FAIL
 *   6. Assign grade (PASS only, with restrictions)
 */
const calculateResultAndGrade = (marksA, marksB, totalMarks, examType) => {
    // ── Step 1: Rounding Rule ───────────────────────────────────────────
    // Decimal values up to 0.50 → round to the nearest 0.5
    // Decimal values above 0.50 → round up to next whole number
    const roundMarks = (marks) => {
        const num = parseFloat(marks);
        const wholePart = Math.floor(num);
        const decimalPart = num - wholePart;

        if (decimalPart === 0) return num;               // Exact whole number
        if (decimalPart <= 0.50) return wholePart + 0.5; // Up to 0.50 → x.5
        return Math.ceil(num);                           // Above 0.50 → round up
    };

    // ── SKILL exam branch ──────────────────────────────────────────────
    // SKILL has only Passage A, total out of 80, pass at >= 32 (40%), no grace,
    // no grade letter.
    if (examType === 'SKILL') {
        const roundedA = roundMarks(parseFloat(marksA));
        const passes = roundedA >= 32;
        const result = passes ? 'PASS' : 'FAIL';

        return {
            result,
            grade: '',
            roundedA: roundedA.toFixed(2),
            roundedB: null,
            roundedTotal: roundedA.toFixed(2),
            graceMarksA: 0,
            graceMarksB: 0,
            totalGrace: 0,
            roundedGraceA: roundedA.toFixed(2),
            roundedGraceB: null,
            finalMarks: roundedA.toFixed(2)
        };
    }

    const numMarksA = parseFloat(marksA);
    const numMarksB = parseFloat(marksB);

    // Apply rounding BEFORE any grace logic
    const roundedA = roundMarks(numMarksA);
    const roundedB = roundMarks(numMarksB);
    const roundedTotal = roundedA + roundedB;

    // ── Step 2: Check if student already passes without grace ───────────
    const alreadyPasses = roundedA >= 15 && roundedB >= 15 && roundedTotal >= 50;

    let graceMarksA = 0;
    let graceMarksB = 0;
    let totalGrace = 0;
    let finalA = roundedA;
    let finalB = roundedB;
    let finalTotal = roundedTotal;

    if (!alreadyPasses) {
        // ── Step 3: Determine grace eligibility ─────────────────────────
        // If irrecoverable (needs > 2 grace), NO grace is applied at all (Rule 7).
        const graceNeededForA = Math.max(0, 15 - roundedA);
        const graceNeededForB = Math.max(0, 15 - roundedB);
        const graceForPassageMins = graceNeededForA + graceNeededForB;

        if (graceForPassageMins <= 2) {
            const tentativeA = roundedA + graceNeededForA;
            const tentativeB = roundedB + graceNeededForB;
            const tentativeTotal = tentativeA + tentativeB;

            const graceForTotal = Math.max(0, 50 - tentativeTotal);
            const totalGraceNeeded = graceForPassageMins + graceForTotal;

            if (totalGraceNeeded <= 2) {
                // ── Step 4: Apply grace minimally and conditionally ──────────
                graceMarksA = graceNeededForA;
                graceMarksB = graceNeededForB;
                finalA = tentativeA;
                finalB = tentativeB;

                const remainingGrace = 2 - graceForPassageMins;
                if (tentativeTotal < 50 && remainingGrace > 0) {
                    let additionalGrace = Math.min(50 - tentativeTotal, remainingGrace);
                    // Distribute additional grace one mark at a time, balancing passages
                    while (additionalGrace > 0) {
                        const increment = Math.min(1, additionalGrace);
                        if (graceMarksA <= graceMarksB) {
                            graceMarksA += increment;
                            finalA += increment;
                        } else {
                            graceMarksB += increment;
                            finalB += increment;
                        }
                        additionalGrace -= increment;
                    }
                }

                totalGrace = graceMarksA + graceMarksB;
                finalTotal = finalA + finalB;
            }
            // else: total can't reach 50 even with max grace → stays FAIL, no grace
        }
        // else: passage minimums can't be met with max grace → stays FAIL, no grace
    }

    // ── Step 5: Determine PASS / FAIL ──────────────────────────────────
    const passes = finalA >= 15 && finalB >= 15 && finalTotal >= 50;
    const result = passes ? 'PASS' : 'FAIL';

    // If FAIL, ensure NO grace marks are returned (Rules 3, 6)
    if (result === 'FAIL') {
        graceMarksA = 0;
        graceMarksB = 0;
        totalGrace = 0;
        finalA = roundedA;
        finalB = roundedB;
        finalTotal = roundedTotal;
    }

    // ── Step 6: Assign grade (PASS only) ───────────────────────────────
    let grade = '';
    if (result === 'PASS') {
        if (finalTotal >= 75) {
            grade = 'A';
        } else if (finalTotal >= 60) {
            grade = 'B';
        } else {
            grade = 'C';
        }
    }

    return {
        result,
        grade,
        roundedA: roundedA.toFixed(2),
        roundedB: roundedB.toFixed(2),
        roundedTotal: roundedTotal.toFixed(2),
        graceMarksA,
        graceMarksB,
        totalGrace,
        roundedGraceA: finalA.toFixed(2),
        roundedGraceB: finalB.toFixed(2),
        finalMarks: finalTotal.toFixed(2)
    };
};

/**
 * Process batch comparison results and calculate marks for one row.
 * Returns null when the required comparisons are missing, exactly as before.
 */
const processBatchResults = (row, mistakesA, mistakesB) => {
    const isSkill = row.examType === 'SKILL';

    // SKILL: only Passage A is required. GCC: both passages required.
    if (!mistakesA) return null;
    if (!isSkill && !mistakesB) return null;

    // Calculate mistakes for Passage A
    const spellingA = mistakesA.spelling?.length || 0;
    const missedA = mistakesA.missed?.length || 0;
    const addedA = mistakesA.added?.length || 0;
    const grammarA = mistakesA.grammar?.length || 0;
    const totalA = spellingA + missedA + addedA + grammarA;

    // Calculate mistakes for Passage B (zero for SKILL — no Passage B)
    const spellingB = mistakesB ? (mistakesB.spelling?.length || 0) : 0;
    const missedB = mistakesB ? (mistakesB.missed?.length || 0) : 0;
    const addedB = mistakesB ? (mistakesB.added?.length || 0) : 0;
    const grammarB = mistakesB ? (mistakesB.grammar?.length || 0) : 0;
    const totalB = spellingB + missedB + addedB + grammarB;

    // Calculate total mistakes from both passages
    const totalSpelling = spellingA + spellingB;
    const totalMissed = missedA + missedB;
    const totalAdded = addedA + addedB;
    const totalGrammar = grammarA + grammarB;
    const totalMistakes = totalSpelling + totalMissed + totalAdded + totalGrammar;

    // Calculate marks for Passage A. A blank submission is a complete omission of the
    // passage, not a partial attempt, so it scores 0 outright.
    let marksA;
    if (!hasAttempt(row.passageA)) {
        marksA = 0;
    } else if (isSkill) {
        marksA = 80 - (totalA / 2);
    } else {
        marksA = 50 - (totalA / 3);
    }
    marksA = Math.max(0, marksA);

    // Calculate marks for Passage B (null for SKILL)
    let marksB = null;
    if (!isSkill) {
        marksB = hasAttempt(row.passageB) ? 50 - (totalB / 3) : 0;
        marksB = Math.max(0, marksB);
    }

    // Calculate total marks (Passage A only for SKILL)
    const totalMarks = isSkill ? marksA : marksA + marksB;

    // Calculate result and grade
    const resultData = calculateResultAndGrade(
        marksA.toFixed(2),
        isSkill ? null : marksB.toFixed(2),
        totalMarks.toFixed(2),
        row.examType
    );

    return {
        spelling: totalSpelling,
        missed: totalMissed,
        added: totalAdded,
        grammar: totalGrammar,
        total: totalMistakes,
        marks: totalMarks.toFixed(2),
        spellingA,
        missedA,
        addedA,
        grammarA,
        totalA,
        marksA: marksA.toFixed(2),
        spellingB: isSkill ? null : spellingB,
        missedB: isSkill ? null : missedB,
        addedB: isSkill ? null : addedB,
        grammarB: isSkill ? null : grammarB,
        totalB: isSkill ? null : totalB,
        marksB: isSkill ? null : marksB.toFixed(2),
        result: resultData.result,
        grade: resultData.grade,
        roundedA: resultData.roundedA,
        roundedB: resultData.roundedB,
        roundedTotal: resultData.roundedTotal,
        graceMarksA: resultData.graceMarksA,
        graceMarksB: resultData.graceMarksB,
        totalGrace: resultData.totalGrace,
        roundedGraceA: resultData.roundedGraceA,
        roundedGraceB: resultData.roundedGraceB,
        finalMarks: resultData.finalMarks,
        mistakesA,
        mistakesB
    };
};

/**
 * Build the /compare-batch items for a set of rows.
 * Ported from prepareBatchItems — the blank-passage substitution (' ') and the
 * ignore-list parsing must stay exactly as they were or marks will move.
 */
const buildComparisonItems = (rows, indexOffset = 0) => {
    const itemsA = rows.map((row, index) => {
        const ignoreListA = row.QPA
            ? row.QPA.split(',').map(word => word.trim()).filter(word => word.length > 0)
            : [];
        const passageA = row.passageA && row.passageA.trim() !== '' ? row.passageA : ' ';
        const ansPassageA = row.ansPassageA && row.ansPassageA.trim() !== '' ? row.ansPassageA : ' ';
        return {
            id: `${row.id}_A`,
            rowIndex: indexOffset + index,
            text1: passageA,
            text2: ansPassageA,
            ignore_list: ignoreListA
        };
    });

    // Skip Passage B items for SKILL rows — SKILL has only Passage A.
    const itemsB = rows
        .map((row, index) => {
            if (row.examType === 'SKILL') return null;
            const ignoreListB = row.QPB
                ? row.QPB.split(',').map(word => word.trim()).filter(word => word.length > 0)
                : [];
            const passageB = row.passageB && row.passageB.trim() !== '' ? row.passageB : ' ';
            const ansPassageB = row.ansPassageB && row.ansPassageB.trim() !== '' ? row.ansPassageB : ' ';
            return {
                id: `${row.id}_B`,
                rowIndex: indexOffset + index,
                text1: passageB,
                text2: ansPassageB,
                ignore_list: ignoreListB
            };
        })
        .filter(item => item !== null);

    return [...itemsA, ...itemsB];
};

// ============================================================
// ORCHESTRATION
// ============================================================

const compareBatch = async (items, maxWorkers) => {
    const response = await fetch(`${COMPARE_API_BASE_URL}/compare-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, max_workers: maxWorkers })
    });

    if (!response.ok) {
        throw new Error(`Comparison service returned HTTP ${response.status} from ${COMPARE_API_BASE_URL}/compare-batch`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error('Comparison service reported failure for the batch');
    }
    return data.results || [];
};

// Fields the browser needs to render the table and build the subject-wise and
// summary reports. Everything else — above all the mistake word lists — stays here.
const SCALAR_FIELDS = [
    'spelling', 'missed', 'added', 'grammar', 'total', 'marks',
    'spellingA', 'missedA', 'addedA', 'grammarA', 'totalA', 'marksA',
    'spellingB', 'missedB', 'addedB', 'grammarB', 'totalB', 'marksB',
    'result', 'grade', 'roundedA', 'roundedB', 'roundedTotal',
    'graceMarksA', 'graceMarksB', 'totalGrace',
    'roundedGraceA', 'roundedGraceB', 'finalMarks'
];

const toScalarResult = (rowId, processed) => {
    const out = { id: rowId };
    for (const field of SCALAR_FIELDS) out[field] = processed[field];
    return out;
};

const ensureSpoolDir = () => {
    if (!fs.existsSync(SPOOL_DIR)) fs.mkdirSync(SPOOL_DIR, { recursive: true });
};

const spoolPathFor = (jobId) => path.join(SPOOL_DIR, `${jobId}.jsonl`);

/**
 * Score every row.
 *
 * Comparisons go out in chunks so neither the request we build nor the response
 * we hold scales with department size. Each chunk's full detail (including the
 * word lists) is appended to a spool file and then dropped, so the only thing
 * that grows in memory is the array of per-row scalars the caller gets back.
 *
 * @returns {Promise<{jobId: string, results: Array, calculated: number, skipped: number}>}
 */
const calculateMarksForRows = async (rows, options = {}) => {
    const {
        jobId,
        maxWorkers = 16,
        chunkSize = CHUNK_SIZE,
        onProgress
    } = options;

    ensureSpoolDir();
    const spool = fs.createWriteStream(spoolPathFor(jobId), { flags: 'w' });

    const results = [];
    let calculated = 0;
    let skipped = 0;

    try {
        for (let start = 0; start < rows.length; start += chunkSize) {
            const chunk = rows.slice(start, start + chunkSize);
            const items = buildComparisonItems(chunk, start);
            const batchResults = await compareBatch(items, maxWorkers);

            const resultsMap = {};
            batchResults.forEach(r => {
                if (r.success) resultsMap[r.id] = r.result;
            });

            const lines = [];
            for (const row of chunk) {
                const isSkill = row.examType === 'SKILL';
                const mistakesA = resultsMap[`${row.id}_A`];
                const mistakesB = isSkill ? null : resultsMap[`${row.id}_B`];

                const processed = processBatchResults(row, mistakesA, mistakesB);
                if (!processed) {
                    skipped += 1;
                    continue;
                }

                calculated += 1;
                results.push(toScalarResult(row.id, processed));

                // Word lists go to disk, not to the browser and not into a
                // growing in-memory structure.
                lines.push(JSON.stringify({
                    id: row.id,
                    student_id: row.student_id,
                    subjectId: row.subjectId,
                    examType: row.examType,
                    qset: row.qset,
                    departmentId: row.departmentId,
                    expertId: row.expertId,
                    subm_done: row.subm_done,
                    QPA: row.QPA,
                    QPB: row.QPB,
                    ...processed
                }));
            }

            if (lines.length > 0) {
                // Wait when the stream is congested so a slow disk cannot let the
                // write queue grow without bound.
                const chunkText = lines.join('\n') + '\n';
                if (!spool.write(chunkText)) {
                    await new Promise(resolve => spool.once('drain', resolve));
                }
            }

            if (onProgress) {
                onProgress(Math.min(start + chunkSize, rows.length), rows.length);
            }
        }
    } finally {
        await new Promise((resolve, reject) => {
            spool.end(err => (err ? reject(err) : resolve()));
        });
    }

    return { jobId, results, calculated, skipped };
};

/** Streams the spooled rows back one at a time; never loads the file whole. */
const readSpooledRows = async function* (jobId) {
    const file = spoolPathFor(jobId);
    if (!fs.existsSync(file)) throw new Error(`No calculation found for job ${jobId}`);

    const readline = require('readline');
    const stream = fs.createReadStream(file, { encoding: 'utf8' });
    const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of lines) {
        if (line.trim()) yield JSON.parse(line);
    }
};

const spoolExists = (jobId) => fs.existsSync(spoolPathFor(jobId));

/** Drops spool files older than the retention window. */
const cleanupOldSpools = (maxAgeMs = 6 * 60 * 60 * 1000) => {
    if (!fs.existsSync(SPOOL_DIR)) return;
    const cutoff = Date.now() - maxAgeMs;
    for (const name of fs.readdirSync(SPOOL_DIR)) {
        const file = path.join(SPOOL_DIR, name);
        try {
            if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
        } catch {
            // A file vanishing mid-sweep is fine.
        }
    }
};

module.exports = {
    calculateResultAndGrade,
    processBatchResults,
    buildComparisonItems,
    calculateMarksForRows,
    readSpooledRows,
    spoolExists,
    cleanupOldSpools,
    SPOOL_DIR,
    CHUNK_SIZE
};
