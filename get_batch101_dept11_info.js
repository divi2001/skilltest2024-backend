require('dotenv').config();
const connection = require('./config/db1');
const { decrypt } = require('./config/encrypt');

async function getBatch101Dept11Info() {
    try {
        const batchNo = 101;
        const departmentId = 11;

        // 1. Unique subject + qset combinations for batch 101, dept 11
        console.log(`\n=== Unique subject + qset combinations (batch ${batchNo}, dept ${departmentId}) ===`);
        const [combos] = await connection.query(
            `SELECT DISTINCT subjectsId, qset 
             FROM students 
             WHERE batchNo = ? AND departmentId = ?
             ORDER BY subjectsId, qset`,
            [batchNo, departmentId]
        );
        console.log(`Found ${combos.length} unique combinations:`);
        console.table(combos);

        // 2. Students with decrypted passwords
        console.log(`\n=== Students (batch ${batchNo}, dept ${departmentId}) with passwords ===`);
        const [students] = await connection.query(
            `SELECT student_id, password, subjectsId, qset 
             FROM students 
             WHERE batchNo = ? AND departmentId = ?
             ORDER BY subjectsId, qset, student_id`,
            [batchNo, departmentId]
        );

        console.log(`Found ${students.length} students:\n`);
        students.forEach(s => {
            let decrypted = '(decryption failed)';
            try {
                decrypted = decrypt(s.password);
            } catch (e) {
                // keep default
            }
            console.log(`student_id: ${s.student_id} | subject: ${s.subjectsId} | qset: ${s.qset} | password: ${decrypted}`);
        });

        // 3. Controller password for batch 101, dept 11
        console.log(`\n=== Controller password (batch ${batchNo}, dept ${departmentId}) ===`);
        const [controllers] = await connection.query(
            `SELECT * FROM controllerdb WHERE batchNo = ? AND departmentId = ?`,
            [batchNo, departmentId]
        );

        if (controllers.length === 0) {
            console.log('No controller found for batch 101, dept 11.');
        } else {
            controllers.forEach(c => {
                let ctrlPass = c.controller_pass;
                try {
                    ctrlPass = decrypt(c.controller_pass);
                } catch (e) {
                    // already plaintext
                }
                console.log(`Center: ${c.center} | Dept: ${c.departmentId} | Controller Password: ${ctrlPass}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

getBatch101Dept11Info();
