// controllers/marksCalculationController.js
//
// Marks calculation moved off the browser.
//
// The page used to fetch every student's passages, POST them all to the Python
// comparison service, and score the results in the tab. For department 17 that
// meant ~206 MB of mistake word lists in browser memory and an Out-of-memory
// crash. The scoring itself only ever needed the LENGTH of those word lists, so
// the words never had to cross the network at all.
//
// Now: this controller fetches the same rows the table shows, calls the same
// comparison service in bounded chunks, runs the same scoring functions, and
// returns only the per-row scalars the UI renders. The word lists are spooled to
// disk for the Student-wise report and for the expand-a-row detail view.

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { fetchReviewRows } = require('./expertAuthentication/studentSpecific');
const marks = require('../services/marksCalculation');

// Job ids are derived from the filters, not random, so re-running the same
// department reuses one spool file instead of piling up copies on disk.
const jobIdFor = (filters) => {
    const parts = [
        filters.table, filters.departmentId, filters.examType, filters.subjectId,
        filters.qset, filters.expertId, filters.subm_done, filters.student_id
    ].map(v => (v === undefined || v === null || v === '' ? '_' : String(v)));
    return parts.join('-').replace(/[^A-Za-z0-9._-]/g, '');
};

/**
 * POST /calculate-marks
 * Body: the same filter object the list endpoint takes.
 * Returns one lightweight result object per student — no passages, no word lists.
 */
exports.calculateMarks = async (req, res) => {
    const filters = req.body || {};
    const startedAt = Date.now();

    try {
        marks.cleanupOldSpools();

        const { rows } = await fetchReviewRows(filters);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No records match these filters' });
        }

        const jobId = jobIdFor(filters);
        console.log(`[marks] calculating ${rows.length} student(s) for job ${jobId}`);

        const { results, calculated, skipped } = await marks.calculateMarksForRows(rows, {
            jobId,
            maxWorkers: Number(filters.maxWorkers) || 16,
            onProgress: (done, total) => {
                if (done % 1000 < marks.CHUNK_SIZE) console.log(`[marks] ${jobId}: ${done}/${total}`);
            }
        });

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`[marks] ${jobId}: ${calculated} calculated, ${skipped} skipped in ${seconds}s`);

        res.status(200).json({
            success: true,
            jobId,
            calculated,
            // Rows the comparison could not score — same condition that used to
            // leave a row untouched in the browser.
            skipped,
            processingTime: `${seconds}s`,
            results
        });
    } catch (err) {
        console.error('[marks] calculation failed:', err);
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Marks calculation failed'
        });
    }
};

/**
 * GET /marks-detail/:jobId/:rowId
 * The mistake word lists for a single row, for the expand-a-row detail view.
 * One row at a time is a few KB; all 8,583 at once was the problem.
 */
exports.getMarksDetail = async (req, res) => {
    const { jobId, rowId } = req.params;

    try {
        if (!marks.spoolExists(jobId)) {
            return res.status(404).json({ success: false, message: 'No calculation found. Please calculate results first.' });
        }

        const wanted = String(rowId);
        for await (const row of marks.readSpooledRows(jobId)) {
            if (String(row.id) === wanted) {
                return res.status(200).json({
                    success: true,
                    id: row.id,
                    QPA: row.QPA,
                    QPB: row.QPB,
                    mistakesA: row.mistakesA,
                    mistakesB: row.mistakesB
                });
            }
        }

        res.status(404).json({ success: false, message: `Row ${rowId} not found in this calculation` });
    } catch (err) {
        console.error('[marks] detail lookup failed:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ============================================================
// STUDENT-WISE REPORT
// Ported from studentWiseReportGenerator.js. Same 46 columns, same widths, same
// styling — it just runs here, streaming, instead of building the whole workbook
// in the tab.
// ============================================================

const STUDENT_WISE_COLUMNS = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Student ID', key: 'student_id', width: 15 },
    { header: 'Subject ID', key: 'subjectId', width: 12 },
    { header: 'Exam Type', key: 'examType', width: 12 },
    { header: 'Q Set', key: 'qset', width: 10 },
    { header: 'Department ID', key: 'departmentId', width: 14 },
    { header: 'Expert ID', key: 'expertId', width: 12 },
    { header: 'Submission Status', key: 'subm_done', width: 16 },
    { header: 'Ignored Words A', key: 'ignoredA', width: 25 },
    { header: 'Ignored Words B', key: 'ignoredB', width: 25 },
    { header: 'Spelling Words A', key: 'spellingWordsA', width: 35 },
    { header: 'Extra Added Words A', key: 'missedWordsA', width: 30 },
    { header: 'Omitted Words A', key: 'addedWordsA', width: 30 },
    { header: 'Grammar Words A', key: 'grammarWordsA', width: 30 },
    { header: 'Spelling Words B', key: 'spellingWordsB', width: 35 },
    { header: 'Extra Added Words B', key: 'missedWordsB', width: 30 },
    { header: 'Omitted Words B', key: 'addedWordsB', width: 30 },
    { header: 'Grammar Words B', key: 'grammarWordsB', width: 30 },
    { header: 'Spelling Count A', key: 'spellingA', width: 14 },
    { header: 'Extra Added Count A', key: 'missedA', width: 14 },
    { header: 'Omitted Count A', key: 'addedA', width: 14 },
    { header: 'Grammar Count A', key: 'grammarA', width: 14 },
    { header: 'Total Mistakes A', key: 'totalA', width: 16 },
    { header: 'Marks A', key: 'marksA', width: 12 },
    { header: 'Spelling Count B', key: 'spellingB', width: 14 },
    { header: 'Extra Added Count B', key: 'missedB', width: 14 },
    { header: 'Omitted Count B', key: 'addedB', width: 14 },
    { header: 'Grammar Count B', key: 'grammarB', width: 14 },
    { header: 'Total Mistakes B', key: 'totalB', width: 16 },
    { header: 'Marks B', key: 'marksB', width: 12 },
    { header: 'Total Spelling', key: 'spelling', width: 14 },
    { header: 'Total Extra Added', key: 'missed', width: 14 },
    { header: 'Total Omitted', key: 'added', width: 14 },
    { header: 'Total Grammar', key: 'grammar', width: 14 },
    { header: 'Total Mistakes', key: 'total', width: 14 },
    { header: 'Total Marks', key: 'marks', width: 12 },
    { header: 'Rounded A', key: 'roundedA', width: 12 },
    { header: 'Rounded B', key: 'roundedB', width: 12 },
    { header: 'Grace Marks A', key: 'graceMarksA', width: 14 },
    { header: 'Grace Marks B', key: 'graceMarksB', width: 14 },
    { header: 'Total Grace', key: 'totalGrace', width: 12 },
    { header: 'Rounded Grace Marks A', key: 'roundedGraceA', width: 20 },
    { header: 'Rounded Grace Marks B', key: 'roundedGraceB', width: 20 },
    { header: 'Final Marks', key: 'finalMarks', width: 12 },
    { header: 'Result', key: 'result', width: 10 },
    { header: 'Grade', key: 'grade', width: 10 }
];

const formatSpellingMistakes = (mistakes) => {
    if (!mistakes || !Array.isArray(mistakes) || mistakes.length === 0) return '';
    return mistakes.map(pair => `(${pair[0]}, ${pair[1]})`).join(', ');
};

const formatMistakesList = (mistakes) => {
    if (!mistakes || !Array.isArray(mistakes) || mistakes.length === 0) return '';
    return mistakes.join(', ');
};

const buildStudentWiseRow = (row) => {
    // SKILL exams have only Passage A and no grace marks / grade letter.
    const isSkill = row.examType === 'SKILL';
    const naIfSkill = (value) => (isSkill ? 'N/A' : value);

    return {
        id: row.id || '',
        student_id: row.student_id || '',
        subjectId: row.subjectId || '',
        examType: row.examType || '',
        qset: row.qset || '',
        departmentId: row.departmentId || '',
        expertId: row.expertId || '',
        subm_done: row.subm_done === 1 ? 'Yes' : row.subm_done === 0 ? 'No' : '',
        ignoredA: row.QPA || '',
        ignoredB: naIfSkill(row.QPB || ''),
        spellingWordsA: row.mistakesA?.spelling ? formatSpellingMistakes(row.mistakesA.spelling) : '',
        missedWordsA: row.mistakesA?.missed ? formatMistakesList(row.mistakesA.missed) : '',
        addedWordsA: row.mistakesA?.added ? formatMistakesList(row.mistakesA.added) : '',
        grammarWordsA: row.mistakesA?.grammar ? formatMistakesList(row.mistakesA.grammar) : '',
        spellingWordsB: naIfSkill(row.mistakesB?.spelling ? formatSpellingMistakes(row.mistakesB.spelling) : ''),
        missedWordsB: naIfSkill(row.mistakesB?.missed ? formatMistakesList(row.mistakesB.missed) : ''),
        addedWordsB: naIfSkill(row.mistakesB?.added ? formatMistakesList(row.mistakesB.added) : ''),
        grammarWordsB: naIfSkill(row.mistakesB?.grammar ? formatMistakesList(row.mistakesB.grammar) : ''),
        spellingA: row.spellingA !== undefined ? row.spellingA : '',
        missedA: row.missedA !== undefined ? row.missedA : '',
        addedA: row.addedA !== undefined ? row.addedA : '',
        grammarA: row.grammarA !== undefined ? row.grammarA : '',
        totalA: row.totalA !== undefined ? row.totalA : '',
        marksA: row.marksA !== undefined && row.marksA !== null ? row.marksA : '',
        spellingB: naIfSkill(row.spellingB !== undefined && row.spellingB !== null ? row.spellingB : ''),
        missedB: naIfSkill(row.missedB !== undefined && row.missedB !== null ? row.missedB : ''),
        addedB: naIfSkill(row.addedB !== undefined && row.addedB !== null ? row.addedB : ''),
        grammarB: naIfSkill(row.grammarB !== undefined && row.grammarB !== null ? row.grammarB : ''),
        totalB: naIfSkill(row.totalB !== undefined && row.totalB !== null ? row.totalB : ''),
        marksB: naIfSkill(row.marksB !== undefined && row.marksB !== null ? row.marksB : ''),
        spelling: row.spelling !== undefined ? row.spelling : '',
        missed: row.missed !== undefined ? row.missed : '',
        added: row.added !== undefined ? row.added : '',
        grammar: row.grammar !== undefined ? row.grammar : '',
        total: row.total !== undefined ? row.total : '',
        marks: row.marks || '',
        roundedA: row.roundedA !== undefined && row.roundedA !== null ? row.roundedA : '',
        roundedB: naIfSkill(row.roundedB !== undefined && row.roundedB !== null ? row.roundedB : ''),
        graceMarksA: naIfSkill(row.graceMarksA !== undefined ? row.graceMarksA : 0),
        graceMarksB: naIfSkill(row.graceMarksB !== undefined ? row.graceMarksB : 0),
        totalGrace: naIfSkill(row.totalGrace !== undefined ? row.totalGrace : 0),
        roundedGraceA: naIfSkill(row.roundedGraceA !== undefined && row.roundedGraceA !== null ? row.roundedGraceA : ''),
        roundedGraceB: naIfSkill(row.roundedGraceB !== undefined && row.roundedGraceB !== null ? row.roundedGraceB : ''),
        finalMarks: row.finalMarks !== undefined ? row.finalMarks : row.marks || '',
        result: row.result || '',
        grade: naIfSkill(row.grade || '')
    };
};

const styleDataRow = (dataRow, index) => {
    // Apply alternating row colors for better readability
    const fillColor = index % 2 === 0 ? 'FFF5F5F5' : 'FFFFFFFF';
    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };

        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };

        // Highlight result column
        if (colNumber === 45) {
            cell.font = { bold: true };
            if (cell.value === 'PASS') {
                cell.font.color = { argb: 'FF008000' };
            } else if (cell.value === 'FAIL') {
                cell.font.color = { argb: 'FFFF0000' };
            }
        }

        // Highlight grade column
        if (colNumber === 46) {
            cell.font = { bold: true };
            if (cell.value === 'A') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            } else if (cell.value === 'B') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFE0' } };
            } else if (cell.value === 'C') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } };
            }
        }
    });
};

/**
 * GET /marks-report/student-wise/:jobId
 * Builds the workbook with ExcelJS's streaming writer, one row at a time straight
 * from the spool, so neither the browser nor this process holds all 8,583 rows of
 * mistake text at once.
 */
exports.downloadStudentWiseReport = async (req, res) => {
    const { jobId } = req.params;

    if (!marks.spoolExists(jobId)) {
        return res.status(404).json({ success: false, message: 'No calculation found. Please calculate results first.' });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Student_Wise_Complete_Report_${dateStr}.xlsx`;
    const tmpFile = path.join(os.tmpdir(), `student-wise-${jobId}-${process.pid}.xlsx`);

    try {
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: tmpFile, useStyles: true });
        const worksheet = workbook.addWorksheet('Student-wise Results', {
            properties: { defaultRowHeight: 20 },
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        worksheet.columns = STUDENT_WISE_COLUMNS;
        worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 46 } };

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 25;
        headerRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });
        headerRow.commit();

        let index = 0;
        for await (const row of marks.readSpooledRows(jobId)) {
            // Same gate the browser applied: only rows that actually got a result.
            if (!row.result || row.marks === undefined) continue;
            const dataRow = worksheet.addRow(buildStudentWiseRow(row));
            styleDataRow(dataRow, index);
            dataRow.commit();
            index += 1;
        }

        await worksheet.commit();
        await workbook.commit();

        if (index === 0) {
            fs.unlink(tmpFile, () => {});
            return res.status(404).json({
                success: false,
                message: 'No calculated results available. Please calculate results first before downloading the report.'
            });
        }

        console.log(`[marks] student-wise report for ${jobId}: ${index} row(s)`);
        res.download(tmpFile, filename, (err) => {
            fs.unlink(tmpFile, () => {});
            if (err && !res.headersSent) console.error('[marks] report download failed:', err);
        });
    } catch (err) {
        console.error('[marks] student-wise report failed:', err);
        fs.unlink(tmpFile, () => {});
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};
