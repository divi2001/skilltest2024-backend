// Compare textlogs.texta vs finalPassageSubmit.passageA for dept 11, batches 101/102/103
const connection = require('./config/db1');

(async () => {
    try {
        const [rows] = await connection.query(`
            SELECT
                s.student_id,
                s.batchNo,
                CASE WHEN tl.texta IS NULL THEN 'NULL' WHEN tl.texta = '' THEN 'EMPTY' ELSE 'HAS_TEXT' END AS texta_status,
                CASE WHEN fps.passageA IS NULL THEN 'NULL' WHEN fps.passageA = '' THEN 'EMPTY' ELSE 'HAS_TEXT' END AS passageA_status,
                CASE WHEN fps.student_id IS NULL THEN 'NO_ROW' ELSE 'HAS_ROW' END AS fps_row,
                LENGTH(tl.texta) AS texta_len,
                LENGTH(fps.passageA) AS passageA_len,
                CASE
                    WHEN tl.texta IS NULL AND fps.passageA IS NULL THEN 'BOTH_NULL'
                    WHEN tl.texta IS NOT NULL AND fps.passageA IS NULL THEN 'TEXTA_EXISTS_FPS_NULL'
                    WHEN tl.texta IS NULL AND fps.passageA IS NOT NULL THEN 'TEXTA_NULL_FPS_EXISTS'
                    WHEN CONVERT(tl.texta USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fps.passageA USING utf8mb4) COLLATE utf8mb4_unicode_ci THEN 'MATCH'
                    ELSE 'MISMATCH'
                END AS comparison
            FROM students s
            LEFT JOIN textlogs tl ON s.student_id = tl.student_id
            LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
            WHERE s.departmentId = 11
              AND s.batchNo IN (101, 102, 103)
              AND s.loggedin = 1
            ORDER BY s.batchNo, s.student_id
        `);

        // Group by comparison result
        const groups = {};
        rows.forEach(r => {
            groups[r.comparison] = groups[r.comparison] || [];
            groups[r.comparison].push(r);
        });

        console.log('======================================================================');
        console.log(' Dept 11 | Batches 101,102,103 | textlogs.texta vs fps.passageA');
        console.log('======================================================================');
        console.log(`  Total students : ${rows.length}`);
        Object.entries(groups).forEach(([key, arr]) => {
            console.log(`  ${key.padEnd(30)}: ${arr.length}`);
        });

        console.log('\n======================================================================');
        for (const [key, arr] of Object.entries(groups)) {
            if (key === 'MATCH') continue; // skip matches, only show problems
            console.log(`\n[${key}] (${arr.length} students):`);
            arr.forEach(r => {
                console.log(`  ${r.student_id}  batch ${r.batchNo}  | texta_len: ${r.texta_len ?? 'NULL'}  passageA_len: ${r.passageA_len ?? 'NULL'}  fps_row: ${r.fps_row}`);
            });
        }

        await connection.end();
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
