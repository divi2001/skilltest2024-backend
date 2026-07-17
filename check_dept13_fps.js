// Check finalPassageSubmit for NULL/missing/blank data — dept 13, today's date
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
                tr.PA_datetime,
                tr.PB_datetime,
                CASE WHEN fps.student_id IS NULL THEN 'MISSING' ELSE 'EXISTS' END AS fps_status,
                CASE WHEN fps.passageA IS NULL OR TRIM(fps.passageA) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageA_status,
                CASE WHEN fps.passageB IS NULL OR TRIM(fps.passageB) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageB_status
            FROM students s
            INNER JOIN trackrecord tr ON s.student_id = tr.student_id
            LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
            WHERE s.departmentId = 13
              AND (
                DATE(tr.PA_datetime) = CURDATE()
                OR DATE(tr.PB_datetime) = CURDATE()
              )
            ORDER BY s.batchNo, s.student_id
        `);

        const total    = rows.length;
        const missing  = rows.filter(r => r.fps_status === 'MISSING');
        const nullA    = rows.filter(r => r.fps_status === 'EXISTS' && r.passageA_status === 'BLANK');
        const nullB    = rows.filter(r => r.fps_status === 'EXISTS' && r.passageB_status === 'BLANK');
        const bothNull = rows.filter(r => r.fps_status === 'EXISTS' && r.passageA_status === 'BLANK' && r.passageB_status === 'BLANK');
        const complete = rows.filter(r => r.fps_status === 'EXISTS' && r.passageA_status === 'FILLED' && r.passageB_status === 'FILLED');

        console.log('======================================================================');
        console.log(' Dept 13 | ALL batches | TODAY | finalPassageSubmit NULL/blank check');
        console.log('======================================================================');
        console.log(`  Total students with today's trackrecord   : ${total}`);
        console.log(`  ✅ Both passageA & passageB filled         : ${complete.length}`);
        console.log(`  ❌ No row in finalPassageSubmit at all     : ${missing.length}`);
        console.log(`  ⚠️  passageA = NULL/BLANK (has fps row)    : ${nullA.length}`);
        console.log(`  ⚠️  passageB = NULL/BLANK (has fps row)    : ${nullB.length}`);
        console.log(`  ⚠️  BOTH NULL/BLANK (has fps row)          : ${bothNull.length}`);
        console.log('======================================================================');

        // Per-batch breakdown
        const batches = [...new Set(rows.map(r => r.batchNo))].sort((a, b) => a - b);
        for (const batch of batches) {
            const bRows    = rows.filter(r => r.batchNo === batch);
            const bMissing = bRows.filter(r => r.fps_status === 'MISSING').length;
            const bNullA   = bRows.filter(r => r.fps_status === 'EXISTS' && r.passageA_status === 'BLANK').length;
            const bNullB   = bRows.filter(r => r.fps_status === 'EXISTS' && r.passageB_status === 'BLANK').length;
            const bOk      = bRows.filter(r => r.fps_status === 'EXISTS' && r.passageA_status === 'FILLED' && r.passageB_status === 'FILLED').length;
            console.log(`\n  Batch ${batch} (${bRows.length} students):`);
            console.log(`    Both filled  : ${bOk}`);
            console.log(`    No fps row   : ${bMissing}`);
            console.log(`    passageA BLANK: ${bNullA}`);
            console.log(`    passageB BLANK: ${bNullB}`);
        }

        console.log('\n======================================================================');

        if (missing.length > 0) {
            console.log(`\n❌ MISSING from finalPassageSubmit (${missing.length}):`);
            missing.forEach(r => console.log(`   ${r.student_id}  batch ${r.batchNo}`));
        }

        if (nullA.length > 0) {
            console.log(`\n⚠️  passageA = BLANK (${nullA.length}):`);
            nullA.forEach(r => console.log(`   ${r.student_id}  batch ${r.batchNo}  | A: ${r.passageA_status}  B: ${r.passageB_status}`));
        }

        if (nullB.length > 0) {
            console.log(`\n⚠️  passageB = BLANK (${nullB.length}):`);
            nullB.forEach(r => console.log(`   ${r.student_id}  batch ${r.batchNo}  | A: ${r.passageA_status}  B: ${r.passageB_status}`));
        }

        if (missing.length === 0 && nullA.length === 0 && nullB.length === 0) {
            console.log('\n✅ All students have complete finalPassageSubmit records for today!');
        }

        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
