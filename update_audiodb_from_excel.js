require('dotenv').config();
const XLSX = require('xlsx');
const path = require('path');
const connection = require('./config/db1');

async function updateAudiodb() {
    // Read Excel
    const excelPath = path.join(__dirname, '..', 'audiodbmain.xlsx');
    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    console.log(`Read ${rows.length} rows from Excel`);

    const depts = [...new Set(rows.map(r => r.departmentId))].sort();
    console.log(`Departments to replace: ${depts.join(', ')}`);

    // Delete old data for those departments
    const [delResult] = await connection.query(
        `DELETE FROM audiodb WHERE departmentId IN (?)`,
        [depts]
    );
    console.log(`Deleted ${delResult.affectedRows} old rows from audiodb`);

    // Insert new data (excluding 'id' — let DB auto-assign or preserve based on need)
    let inserted = 0;
    for (const row of rows) {
        await connection.query(
            `INSERT INTO audiodb 
             (subjectId, qset, departmentId, examType, code_a, code_b, code_t, audio1, passage1, audio2, passage2, testaudio, textPassageA, textPassageB)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                row.subjectId,
                row.qset,
                row.departmentId,
                row.examType,
                row.code_a,
                row.code_b,
                row.code_t,
                row.audio1,
                row.passage1,
                row.audio2,
                row.passage2,
                row.testaudio,
                row.textPassageA,
                row.textPassageB
            ]
        );
        inserted++;
    }

    console.log(`Inserted ${inserted} new rows into audiodb`);

    // Verify
    const [counts] = await connection.query(
        'SELECT departmentId, COUNT(*) as cnt FROM audiodb GROUP BY departmentId ORDER BY departmentId'
    );
    console.log('\nFinal audiodb row counts by department:');
    console.table(counts);

    process.exit(0);
}

updateAudiodb().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
