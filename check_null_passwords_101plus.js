require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        connectTimeout: 30000
    });

    console.log('Connected to:', process.env.DB_HOST, '/', process.env.DB_DATABASE);

    const [summary] = await conn.query(
        `SELECT batchNo, departmentId, COUNT(*) as null_count 
         FROM students 
         WHERE password IS NULL AND batchNo >= 101 
         GROUP BY batchNo, departmentId 
         ORDER BY batchNo`
    );
    console.log('\n--- NULL PASSWORD SUMMARY (by batch/dept) ---');
    console.table(summary);

    const [rows] = await conn.query(
        `SELECT student_id, center, batchNo, departmentId 
         FROM students 
         WHERE password IS NULL AND batchNo >= 101 
         ORDER BY batchNo, center`
    );
    console.log('\n--- FULL LIST ---');
    console.log('Total students with null password:', rows.length);
    console.table(rows);

    await conn.end();
})();
