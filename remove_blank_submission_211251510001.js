const connection = require('./config/db1');
require('dotenv').config();

const STUDENT_ID = '211251510001';

async function removeBlankSubmission() {
    try {
        console.log(`Checking blank submission for student: ${STUDENT_ID}`);

        // Check current state before deletion
        const [before] = await connection.query(
            `SELECT student_id,
                CASE WHEN passageA IS NULL OR TRIM(passageA) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageA_status,
                CASE WHEN passageB IS NULL OR TRIM(passageB) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageB_status
             FROM finalPassageSubmit WHERE student_id = ?`,
            [STUDENT_ID]
        );

        if (before.length === 0) {
            console.log(`No record found in finalPassageSubmit for student ${STUDENT_ID}.`);
            process.exit(0);
        }

        console.log('Current state:', before[0]);

        const isBlankA = before[0].passageA_status === 'BLANK';
        const isBlankB = before[0].passageB_status === 'BLANK';

        if (!isBlankA && !isBlankB) {
            console.log('Both passages are FILLED — no blank submission to remove.');
            process.exit(0);
        }

        // Delete the blank submission row
        const [result] = await connection.query(
            `DELETE FROM finalPassageSubmit WHERE student_id = ?`,
            [STUDENT_ID]
        );

        console.log(`Deleted ${result.affectedRows} row(s) from finalPassageSubmit for student ${STUDENT_ID}.`);

        // Verify deletion
        const [after] = await connection.query(
            `SELECT student_id FROM finalPassageSubmit WHERE student_id = ?`,
            [STUDENT_ID]
        );

        if (after.length === 0) {
            console.log('Verification: Row successfully removed.');
        } else {
            console.log('Warning: Row still exists after deletion.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

removeBlankSubmission();
