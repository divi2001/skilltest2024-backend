// Check finalPassageSubmit for NULL/missing data — dept 11, batches 101/102/103
const connection = require('./config/db1');

(async () => {
    try {
        const [rows] = await connection.query(`
            SELECT 
                s.student_id,
                s.batchNo,
                s.departmentId,
                fps.passageA,
                fps.passageB,
                CASE WHEN fps.student_id IS NULL THEN 'MISSING' ELSE 'EXISTS' END AS fps_status
            FROM students s
            LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
            WHERE s.departmentId = 11
              AND s.batchNo IN (101, 102, 103)
            ORDER BY s.batchNo, s.student_id
        `);

        const total    = rows.length;
        const missing  = rows.filter(r => r.fps_status === 'MISSING');
        const nullA    = rows.filter(r => r.fps_status === 'EXISTS' && r.passageA === null);
        const nullB    = rows.filter(r => r.fps_status === 'EXISTS' && r.passageB === null);
        const bothNull = rows.filter(r => r.fps_status === 'EXISTS' && r.passageA === null && r.passageB === null);
        const complete = rows.filter(r => r.fps_status === 'EXISTS' && r.passageA !== null && r.passageB !== null);

        console.log('======================================================================');
        console.log(' Dept 11 | Batches 101, 102, 103 | finalPassageSubmit NULL check');
        console.log('======================================================================');
        console.log(`  Total students in dept11 (batches 101-103) : ${total}`);
        console.log(`  ✅ Both passageA & passageB filled          : ${complete.length}`);
        console.log(`  ❌ No row in finalPassageSubmit at all      : ${missing.length}`);
        console.log(`  ⚠️  passageA = NULL (has fps row)           : ${nullA.length}`);
        console.log(`  ⚠️  passageB = NULL (has fps row)           : ${nullB.length}`);
        console.log(`  ⚠️  BOTH NULL (has fps row but empty)       : ${bothNull.length}`);
        console.log('======================================================================');

        // Per-batch breakdown
        for (const batch of [101, 102, 103]) {
            const bRows = rows.filter(r => r.batchNo === batch);
            const bMissing = bRows.filter(r => r.fps_status === 'MISSING').length;
            const bNullA   = bRows.filter(r => r.fps_status === 'EXISTS' && r.passageA === null).length;
            const bNullB   = bRows.filter(r => r.fps_status === 'EXISTS' && r.passageB === null).length;
            const bOk      = bRows.filter(r => r.fps_status === 'EXISTS' && r.passageA !== null && r.passageB !== null).length;
            console.log(`\n  Batch ${batch} (${bRows.length} students):`);
            console.log(`    Both filled  : ${bOk}`);
            console.log(`    No fps row   : ${bMissing}`);
            console.log(`    passageA NULL: ${bNullA}`);
            console.log(`    passageB NULL: ${bNullB}`);
        }

        console.log('\n======================================================================');

        if (missing.length > 0) {
            console.log(`\n❌ MISSING from finalPassageSubmit (${missing.length}):`);
            missing.forEach(r => console.log(`   ${r.student_id}  batch ${r.batchNo}`));
        }

        if (nullA.length > 0) {
            console.log(`\n⚠️  passageA = NULL (${nullA.length}):`);
            nullA.forEach(r => console.log(`   ${r.student_id}  batch ${r.batchNo}  | A: ${r.passageA}  B: ${r.passageB}`));
        }

        if (nullB.length > 0) {
            console.log(`\n⚠️  passageB = NULL (${nullB.length}):`);
            nullB.forEach(r => console.log(`   ${r.student_id}  batch ${r.batchNo}  | A: ${r.passageA}  B: ${r.passageB}`));
        }

        if (missing.length === 0 && nullA.length === 0 && nullB.length === 0) {
            console.log('\n✅ All students have complete finalPassageSubmit records!');
        }

        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
