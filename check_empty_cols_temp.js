require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    const cols = [
        'student_id','password','instituteId','batchNo','batchdate','fullname',
        'subjectsId','courseId','batch_year','loggedin','done','photo','center',
        'reporting_time','start_time','end_time','day','qset','base64','sign_base64',
        'IsShorthand','IsTypewriting','departmentId','disability'
    ];

    const total = 234;
    console.log(`Checking NULL/empty columns for new dept 11/12 students (total: ${total})\n`);

    const results = [];
    for (const col of cols) {
        const [r] = await c.query(
            `SELECT COUNT(*) as cnt FROM students 
             WHERE ((departmentId=11 AND batchNo>=101) OR departmentId=12) 
             AND (${col} IS NULL OR CAST(${col} AS CHAR) = '')` 
        );
        if (r[0].cnt > 0) {
            results.push({ Column: col, 'NULL/Empty': r[0].cnt, 'Has Value': total - r[0].cnt });
        }
    }

    if (results.length > 0) {
        console.log('Columns with NULL/empty values:');
        console.table(results);
    } else {
        console.log('All columns have values!');
    }

    // Compare with batch 100 for reference
    console.log('\n--- Batch 100 (dept 11) for comparison ---');
    const results100 = [];
    const [t100] = await c.query(`SELECT COUNT(*) as cnt FROM students WHERE departmentId=11 AND batchNo=100`);
    const total100 = t100[0].cnt;
    for (const col of cols) {
        const [r] = await c.query(
            `SELECT COUNT(*) as cnt FROM students 
             WHERE departmentId=11 AND batchNo=100 
             AND (${col} IS NULL OR CAST(${col} AS CHAR) = '')`
        );
        if (r[0].cnt > 0) {
            results100.push({ Column: col, 'NULL/Empty': r[0].cnt, 'Has Value': total100 - r[0].cnt });
        }
    }
    if (results100.length > 0) {
        console.log(`Batch 100 columns with NULL/empty (total ${total100} students):`);
        console.table(results100);
    }

    await c.end();
})();
