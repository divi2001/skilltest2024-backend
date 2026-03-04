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

    // Get only audiodb rows for dept 11/12 that have matching students
    const [needed] = await c.query(`
        SELECT a.id, a.subjectId, a.qset, a.departmentId, 
               a.code_a, a.code_b, a.code_t, 
               a.audio1, a.passage1, a.audio2, a.passage2, 
               a.testaudio, a.textPassageA, a.textPassageB
        FROM audiodb a
        WHERE a.departmentId IN (11, 12, 13)
          AND EXISTS (
            SELECT 1 FROM students s 
            WHERE s.departmentId = a.departmentId 
              AND s.subjectsId = a.subjectId 
              AND s.qset = a.qset
          )
        ORDER BY a.departmentId, a.subjectId, a.qset
    `);

    console.log(`Exporting ${needed.length} audiodb rows to Excel`);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(needed);
    XLSX.utils.book_append_sheet(wb, ws, 'audiodb');

    const outFile = path.join(__dirname, '..', 'audiodb.xlsx');
    XLSX.writeFile(wb, outFile);
    console.log(`Saved to: ${outFile}`);

    await c.end();
})();
