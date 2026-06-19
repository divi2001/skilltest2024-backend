const connection = require('./config/db1');

async function setPassageBTimer() {
    const studentId = '5352616093';
    const newTimerValue = 30; // Minutes requested by user

    try {
        console.log(`\n⏳ Setting Passage B timer to ${newTimerValue} mins for student ${studentId}...\n`);

        // 1. Reset completion status in exam_stages
        const updateStagesQuery = 'UPDATE exam_stages SET TypingPassageB = 0 WHERE StudentId = ?';
        await connection.query(updateStagesQuery, [studentId]);
        console.log('✅ Updated exam_stages: TypingPassageB set to 0');

        // 2. Set the timer value in textlogs
        const updateTextlogsQuery = 'UPDATE textlogs SET minb = ? WHERE student_id = ?';
        await connection.query(updateTextlogsQuery, [newTimerValue, studentId]);
        console.log(`✅ Updated textlogs: minb set to ${newTimerValue}`);

        // 3. Clear from finalPassageSubmit (so they can submit again)
        const updateFinalSubmitQuery = 'UPDATE finalPassageSubmit SET passageB = NULL WHERE student_id = ?';
        await connection.query(updateFinalSubmitQuery, [studentId]);
        console.log('✅ Updated finalPassageSubmit: passageB set to NULL');

        // 4. Clear from trackrecord (so the dashboard reflects it's not done)
        const updateTrackRecordQuery = 'UPDATE trackrecord SET PB_filename = NULL, PB_datetime = NULL WHERE student_id = ?';
        await connection.query(updateTrackRecordQuery, [studentId]);
        console.log('✅ Updated trackrecord: PB fields cleared');

        // 5. Optionally reset passage2_time in studentlogs if we want to reset the "start moment"
        const updateStudentLogsQuery = 'UPDATE studentlogs SET passage2_time = NULL WHERE student_id = ?';
        await connection.query(updateStudentLogsQuery, [studentId]);
        console.log('✅ Updated studentlogs: passage2_time set to NULL');

        console.log('\n🚀 Success! The student should now see the Typing Passage B with 30 minutes left.\n');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error during update:', err);
        process.exit(1);
    }
}

setPassageBTimer();
