require('dotenv').config();
const db = require('./config/db1');

async function checkBlankDept12() {
    const [rows] = await db.query(`
        SELECT 
            f.student_id,
            s.batchNo,
            s.loggedin,
            s.done,
            CASE WHEN f.passageA IS NULL OR TRIM(f.passageA) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageA_status,
            CASE WHEN f.passageB IS NULL OR TRIM(f.passageB) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageB_status
        FROM finalPassageSubmit f
        JOIN students s ON s.student_id = f.student_id
        WHERE s.departmentId = 12
          AND s.loggedin = 1
          AND (f.passageA IS NULL OR TRIM(f.passageA) = '' OR f.passageB IS NULL OR TRIM(f.passageB) = '')
        ORDER BY s.batchNo, f.student_id
    `);

    if (rows.length === 0) {
        console.log('No blank passages found for logged-in students in dept 12.');
    } else {
        console.log(`${'student_id'.padEnd(15)} | ${'batchNo'.padEnd(7)} | ${'loggedin'.padEnd(8)} | ${'done'.padEnd(4)} | passageA | passageB`);
        console.log('-'.repeat(75));
        rows.forEach(r => {
            console.log(
                `${String(r.student_id).padEnd(15)} | ${String(r.batchNo).padEnd(7)} | ${String(r.loggedin).padEnd(8)} | ${String(r.done).padEnd(4)} | ${r.passageA_status.padEnd(8)} | ${r.passageB_status}`
            );
        });
        console.log(`\nTotal: ${rows.length} student(s) with blank passage(s)`);
    }

    process.exit(0);
}

checkBlankDept12().catch(e => { console.error(e.message); process.exit(1); });
