/**
 * QSET Assignment Script
 * 
 * Logic:
 * - Exclude batchNo=100 and departmentId=10
 * - Only assign to students where qset IS NULL
 * - Group by departmentId → subjectsId
 * - For each (dept, subject): collect distinct batches in ascending order, pair them
 *   - Pair 1 (batch[0], batch[1]) → qsets 1, 2
 *   - Pair 2 (batch[2], batch[3]) → qsets 3, 4
 *   - Pair 3 (batch[4], batch[5]) → qsets 5, 6  etc.
 *   - Odd leftover batch → uses the first qset of the next pair (e.g., 3)
 * - Within each batch, alternate qsets for consecutive students (ordered by student_id):
 *   student 1 → qsetA, student 2 → qsetB, student 3 → qsetA ...
 * - Department resets: each dept starts pairing from qset 1 independently
 * 
 * Run with --dry-run to preview without updating DB.
 */

const db = require('./config/db1');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  try {
    console.log(DRY_RUN ? '=== DRY RUN MODE (no DB changes) ===' : '=== LIVE MODE - Writing to DB ===');

    // Fetch all students with null qset, excluding batch 100 and dept 10
    // Order by departmentId, subjectsId, batchNo, student_id to ensure consistent alternation
    const [students] = await db.query(`
      SELECT student_id, batchNo, subjectsId, departmentId, qset
      FROM students
      WHERE qset IS NULL
        AND batchNo != 100
        AND departmentId != 10
      ORDER BY departmentId, subjectsId, batchNo, student_id
    `);

    console.log(`\nTotal students to assign: ${students.length}`);

    // Group: dept → subject → batch → [student_ids]
    const grouped = {};
    for (const s of students) {
      const d = s.departmentId;
      const sub = s.subjectsId;
      const b = s.batchNo;
      if (!grouped[d]) grouped[d] = {};
      if (!grouped[d][sub]) grouped[d][sub] = {};
      if (!grouped[d][sub][b]) grouped[d][sub][b] = [];
      grouped[d][sub][b].push(s.student_id);
    }

    // Build the assignment map: student_id → qset
    const assignments = {}; // student_id → qset
    const summary = [];     // for preview

    for (const dept of Object.keys(grouped).sort((a, b) => a - b)) {
      const subjects = grouped[dept];
      for (const subj of Object.keys(subjects).sort((a, b) => a - b)) {
        const batchMap = subjects[subj];
        // Sorted batches for this (dept, subject)
        const batches = Object.keys(batchMap).map(Number).sort((a, b) => a - b);

        // Group batches by "day" = hundreds digit (101→1, 202→2, 301→3 etc.)
        const batchesByDay = {};
        for (const batchNo of batches) {
          const day = Math.floor(batchNo / 100);
          if (!batchesByDay[day]) batchesByDay[day] = [];
          batchesByDay[day].push(batchNo);
        }

        // Qset pair counter continues across days (resets only per dept+subject)
        let globalPairCounter = 0;

        for (const day of Object.keys(batchesByDay).sort((a, b) => a - b)) {
          const dayBatches = batchesByDay[day]; // already sorted

          for (let i = 0; i < dayBatches.length; i++) {
            // i is the index *within this day* — pairing resets per day
            const pairIndex = globalPairCounter + Math.floor(i / 2);
            const qsetA = pairIndex * 2 + 1; // 1, 3, 5, 7 ...
            const qsetB = pairIndex * 2 + 2; // 2, 4, 6, 8 ...
            const posInPair = i % 2; // 0 = first batch in pair, 1 = second

            const batchStudents = batchMap[dayBatches[i]];

            for (let j = 0; j < batchStudents.length; j++) {
              // Alternate qsets; flip start based on posInPair so cross-batch consecutive
              // students also alternate
              const qset = [qsetA, qsetB][(posInPair + j) % 2];
              assignments[batchStudents[j]] = qset;
            }

            summary.push({
              dept, subj, day: Number(day), batch: dayBatches[i],
              pair: pairIndex + 1, qsets: `${qsetA},${qsetB}`,
              count: batchStudents.length
            });
          }

          // Advance global pair counter by number of pairs used in this day
          globalPairCounter += Math.ceil(dayBatches.length / 2);
        }
      }
    }

    // Print summary
    console.log('\n=== ASSIGNMENT PREVIEW ===');
    console.log('dept | subj | day | batch | pair | qsets | count');
    console.log('-----|------|-----|-------|------|-------|------');
    for (const row of summary) {
      console.log(`  ${row.dept}  |  ${String(row.subj).padEnd(4)} |  ${row.day}  | ${row.batch}  |  ${row.pair}   | ${row.qsets}   | ${row.count}`);
    }

    // Show qset distribution for verification
    const distCheck = {};
    for (const [sid, q] of Object.entries(assignments)) {
      distCheck[q] = (distCheck[q] || 0) + 1;
    }
    console.log('\n=== QSET DISTRIBUTION ===');
    for (const [q, cnt] of Object.entries(distCheck).sort((a, b) => a[0] - b[0])) {
      console.log(`  qset ${q}: ${cnt} students`);
    }
    console.log(`  TOTAL: ${Object.keys(assignments).length} students`);

    // Spot check: verify no two consecutive students in same batch/subject have same qset
    console.log('\n=== CONSECUTIVE CHECK (sample per batch/subject group) ===');
    let violations = 0;
    for (const dept of Object.keys(grouped).sort((a, b) => a - b)) {
      for (const subj of Object.keys(grouped[dept]).sort((a, b) => a - b)) {
        for (const batchNo of Object.keys(grouped[dept][subj]).sort((a, b) => a - b)) {
          const ids = grouped[dept][subj][batchNo];
          for (let i = 0; i < ids.length - 1; i++) {
            if (assignments[ids[i]] === assignments[ids[i + 1]]) {
              console.log(`  VIOLATION: dept=${dept} subj=${subj} batch=${batchNo} students ${ids[i]} and ${ids[i+1]} both qset=${assignments[ids[i]]}`);
              violations++;
            }
          }
        }
      }
    }
    if (violations === 0) console.log('  ✓ No consecutive violations found.');

    if (DRY_RUN) {
      console.log('\n[DRY RUN] No database changes made. Run without --dry-run to apply.');
      process.exit(0);
    }

    // Apply updates in batches of 500
    console.log('\n=== APPLYING UPDATES ===');
    const entries = Object.entries(assignments);
    const batchSize = 500;
    let updated = 0;

    for (let i = 0; i < entries.length; i += batchSize) {
      const chunk = entries.slice(i, i + batchSize);
      // Build CASE WHEN ... UPDATE
      const caseWhen = chunk.map(([sid, q]) => `WHEN ${sid} THEN ${q}`).join('\n        ');
      const ids = chunk.map(([sid]) => sid).join(',');
      const sql = `
        UPDATE students
        SET qset = CASE student_id
        ${caseWhen}
        END
        WHERE student_id IN (${ids})
      `;
      await db.query(sql);
      updated += chunk.length;
      process.stdout.write(`\r  Updated ${updated}/${entries.length}...`);
    }

    console.log(`\n\n✓ Done! Assigned qset to ${updated} students.`);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
