/**
 * Check students for department_id 11 and 12
 * - Unique combinations of subjectId + qset
 * - Controller info from controlerdb
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });

    console.log(`Connected to ${process.env.DB_DATABASE} @ ${process.env.DB_HOST}\n`);

    // 1. Total student count for dept 11 and 12
    const [countRows] = await connection.execute(
        `SELECT departmentId, COUNT(*) as student_count 
         FROM students 
         WHERE departmentId IN (11, 12) 
         GROUP BY departmentId 
         ORDER BY departmentId`
    );
    console.log('=== STUDENT COUNTS BY DEPARTMENT ===');
    console.table(countRows);

    // 2. Unique subjectsId + qset combinations
    const [uniqueCombos] = await connection.execute(
        `SELECT departmentId, subjectsId, qset, COUNT(*) as student_count
         FROM students
         WHERE departmentId IN (11, 12)
         GROUP BY departmentId, subjectsId, qset
         ORDER BY departmentId, subjectsId, qset`
    );
    console.log('\n=== UNIQUE subjectsId + qset COMBINATIONS (dept 11 & 12) ===');
    console.table(uniqueCombos);
    console.log(`Total unique combinations: ${uniqueCombos.length}`);

    // 3. With subject names
    const [combosWithNames] = await connection.execute(
        `SELECT s.departmentId, s.subjectsId, sub.subject_name, s.qset, COUNT(*) as student_count
         FROM students s
         LEFT JOIN (
            SELECT subjectId, MAX(subject_name) as subject_name 
            FROM subjectsdb 
            GROUP BY subjectId
         ) sub ON s.subjectsId = sub.subjectId
         WHERE s.departmentId IN (11, 12)
         GROUP BY s.departmentId, s.subjectsId, sub.subject_name, s.qset
         ORDER BY s.departmentId, s.subjectsId, s.qset`
    );
    console.log('\n=== UNIQUE COMBINATIONS WITH SUBJECT NAMES ===');
    console.table(combosWithNames);

    // 4. Controller info from controlerdb for dept 11 and 12
    const [controllers] = await connection.execute(
        `SELECT * FROM controllerdb WHERE departmentId IN (11, 12) ORDER BY departmentId`
    );
    console.log('\n=== CONTROLLERS FOR DEPT 11 & 12 (controllerdb) ===');
    if (controllers.length > 0) {
        console.table(controllers);
    } else {
        console.log('No controllers found in controllerdb for dept 11 & 12.');
        
        // Try alternate column name
        try {
            const [allControllers] = await connection.execute(
                `SELECT * FROM controllerdb LIMIT 5`
            );
            if (allControllers.length > 0) {
                console.log('\nSample controllerdb columns:', Object.keys(allControllers[0]));
                const colNames = Object.keys(allControllers[0]);
                const deptCol = colNames.find(c => c.toLowerCase().includes('dept') || c.toLowerCase().includes('department'));
                if (deptCol) {
                    const [ctrl2] = await connection.execute(
                        `SELECT * FROM controllerdb WHERE \`${deptCol}\` IN (11, 12) ORDER BY \`${deptCol}\``
                    );
                    console.log(`\nControllers (using column "${deptCol}"):`);
                    console.table(ctrl2);
                }
            }
        } catch(e) {
            console.log('Error checking controllerdb:', e.message);
        }
    }

    await connection.end();
    console.log('\nDone.');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
