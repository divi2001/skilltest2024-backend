const connection = require('./config/db1');
require('dotenv').config();

async function resetShorthandSummary(studentId) {
    if (!studentId) {
        console.error("Please provide a student ID.");
        process.exit(1);
    }

    console.log(`Resetting ShorthandSummary for Student ID: ${studentId}`);

    try {
        // Check current status first
        const [rows] = await connection.query(
            'SELECT ShorthandSummary FROM exam_stages WHERE StudentId = ?',
            [studentId]
        );

        if (rows.length === 0) {
            console.log('No record found for this student in exam_stages.');
            return;
        }

        console.log(`Current ShorthandSummary Status: ${rows[0].ShorthandSummary}`);

        // Update to 0 (assuming 0 means incomplete/reset)
        const [result] = await connection.query(
            'UPDATE exam_stages SET ShorthandSummary = 0, ShorthandSummaryB = 0, TypingSummary = 0, FeedbackForm = 0, ThankYou = 0 WHERE StudentId = ?',
            [studentId]
        );

        console.log(`Update Result: Changed ${result.changedRows} rows.`);
        console.log('ShorthandSummary, ShorthandSummaryB, TypingSummary, FeedbackForm, and ThankYou reset to 0.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

// Get student ID from command line argument
const studentId = process.argv[2];
resetShorthandSummary(studentId);
