require('dotenv').config();
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const path = require('path');

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    // Get only audiodb rows that have matching students
    const [needed] = await c.query(`
        SELECT a.* 
        FROM audiodb a
        WHERE a.departmentId IN (11, 12)
          AND EXISTS (
            SELECT 1 FROM students s 
            WHERE s.departmentId = a.departmentId 
              AND s.subjectsId = a.subjectId 
              AND s.qset = a.qset
          )
        ORDER BY a.departmentId, a.subjectId, a.qset
    `);

    // Get unused ones for reference
    const [unused] = await c.query(`
        SELECT a.id, a.departmentId, a.subjectId, a.qset, a.code_a
        FROM audiodb a
        WHERE a.departmentId IN (11, 12)
          AND NOT EXISTS (
            SELECT 1 FROM students s 
            WHERE s.departmentId = a.departmentId 
              AND s.subjectsId = a.subjectId 
              AND s.qset = a.qset
          )
        ORDER BY a.departmentId, a.subjectId, a.qset
    `);

    console.log(`Needed audiodb rows (have students): ${needed.length}`);
    console.log(`Unused audiodb rows (no students): ${unused.length}`);

    // Create Excel with 2 sheets
    const wb = XLSX.utils.book_new();

    // Sheet 1: Needed (clean - remove long text fields for readability)
    const neededClean = needed.map(row => ({
        id: row.id,
        subjectId: row.subjectId,
        qset: row.qset,
        departmentId: row.departmentId,
        code_a: row.code_a,
        code_b: row.code_b,
        code_t: row.code_t,
        audio1: row.audio1,
        audio2: row.audio2,
        testaudio: row.testaudio,
        has_passage1: row.passage1 ? 'Yes' : 'No',
        has_passage2: row.passage2 ? 'Yes' : 'No',
        has_textPassageA: row.textPassageA ? 'Yes' : 'No',
        has_textPassageB: row.textPassageB ? 'Yes' : 'No'
    }));
    const ws1 = XLSX.utils.json_to_sheet(neededClean);
    XLSX.utils.book_append_sheet(wb, ws1, 'Needed AudioDB');

    // Sheet 2: Unused (to be removed)
    const ws2 = XLSX.utils.json_to_sheet(unused);
    XLSX.utils.book_append_sheet(wb, ws2, 'Unused AudioDB');

    const outFile = path.join(__dirname, '..', 'audiodb_dept_11_12_needed_only.xlsx');
    XLSX.writeFile(wb, outFile);
    console.log(`\nExcel saved to: ${outFile}`);

    await c.end();
})();
