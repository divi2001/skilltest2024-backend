// Update studentlogs.feedback_time = passage1_time + 30 mins for student 211151610010 (batch 101)
// Uses .env for DB connection

require('dotenv').config();
const connection = require('./config/db1');

const STUDENT_ID = 211151610010;
const BATCH_NO = 101;

async function updateFeedbackTime() {
    try {
        console.log('='.repeat(70));
        console.log(`Updating studentlogs for student ${STUDENT_ID} (batch ${BATCH_NO})`);
        console.log(`DB: ${process.env.DB_HOST} / ${process.env.DB_DATABASE}`);
        console.log('='.repeat(70));

        // 1. Verify student exists and belongs to batch 101
        const [students] = await connection.query(
            'SELECT student_id, fullname, batchNo, center FROM students WHERE student_id = ? AND batchNo = ?',
            [STUDENT_ID, BATCH_NO]
        );

        if (students.length === 0) {
            console.log(`ERROR: Student ${STUDENT_ID} not found in batch ${BATCH_NO}`);
            await connection.end();
            return;
        }

        const student = students[0];
        console.log(`\nStudent: ${student.fullname}`);
        console.log(`Batch  : ${student.batchNo}`);
        console.log(`Center : ${student.center}`);

        // 2. Fetch current studentlogs row
        const [logs] = await connection.query(
            'SELECT * FROM studentlogs WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (logs.length === 0) {
            console.log(`\nERROR: No studentlogs row found for student ${STUDENT_ID}`);
            await connection.end();
            return;
        }

        const log = logs[0];
        console.log('\nCurrent studentlogs:');
        console.log(`  passage1_time  : ${log.passage1_time}`);
        console.log(`  feedback_time  : ${log.feedback_time}`);

        if (!log.passage1_time) {
            console.log('\nERROR: passage1_time is NULL — cannot calculate feedback_time');
            await connection.end();
            return;
        }

        // 3. Calculate feedback_time = passage1_time + 30 minutes (done in MySQL to avoid tz issues)
        console.log(`\nWill set feedback_time = DATE_ADD(passage1_time, INTERVAL 30 MINUTE)`);

        // 4. Update studentlogs using MySQL DATE_ADD to stay timezone-safe
        const [result] = await connection.query(
            'UPDATE studentlogs SET feedback_time = DATE_ADD(passage1_time, INTERVAL 30 MINUTE) WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (result.affectedRows > 0) {
            console.log(`\nSUCCESS: Updated studentlogs.feedback_time for student ${STUDENT_ID}`);
        } else {
            console.log('\nWARNING: No rows were updated');
        }

        // 5. Show feedbackdb entry for reference
        const [feedbacks] = await connection.query(
            'SELECT * FROM feedbackdb WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (feedbacks.length > 0) {
            console.log('\nfeedbackdb entry exists for this student:');
            console.log(feedbacks[0]);
        } else {
            console.log('\nNo feedbackdb entry found for this student');
        }

        // 6. Confirm final state
        const [updated] = await connection.query(
            'SELECT passage1_time, feedback_time FROM studentlogs WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log('\nFinal studentlogs state:');
        console.log(`  passage1_time : ${updated[0].passage1_time}`);
        console.log(`  feedback_time : ${updated[0].feedback_time}`);
        console.log('='.repeat(70));

        await connection.end();
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

updateFeedbackTime();
