// Reset student 5151524885 - Clear all logs and set loggedIn to 0
const connection = require('./config/db1');

const STUDENT_ID = 5151524885;

async function resetStudent() {
    try {
        console.log(`🔄 Resetting student ${STUDENT_ID}...\n`);
        console.log('='.repeat(80));

        // Get student info first
        const [students] = await connection.query(
            'SELECT * FROM students WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (students.length === 0) {
            console.log('❌ Student not found!');
            await connection.end();
            return;
        }

        const student = students[0];
        console.log('📋 STUDENT INFO:');
        console.log(`   Student ID: ${student.student_id}`);
        console.log(`   Name: ${student.fullname}`);
        console.log(`   Batch: ${student.batchNo}`);
        console.log(`   Center: ${student.center}`);
        console.log(`   Current loggedIn: ${student.loggedin}`);
        console.log(`   Current done: ${student.done}`);
        console.log('');

        // Start clearing
        console.log('🗑️  Clearing data...\n');

        // 1. Delete from studentlogs
        const [slResult] = await connection.query(
            'DELETE FROM studentlogs WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log(`✅ Deleted from studentlogs (${slResult.affectedRows} row(s))`);

        // 2. Delete from textlogs
        const [tlResult] = await connection.query(
            'DELETE FROM textlogs WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log(`✅ Deleted from textlogs (${tlResult.affectedRows} row(s))`);

        // 3. Delete from finalPassageSubmit
        const [fpsResult] = await connection.query(
            'DELETE FROM finalPassageSubmit WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log(`✅ Deleted from finalPassageSubmit (${fpsResult.affectedRows} row(s))`);

        // 4. Delete from trackrecord
        const [trResult] = await connection.query(
            'DELETE FROM trackrecord WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log(`✅ Deleted from trackrecord (${trResult.affectedRows} row(s))`);

        // 5. Delete from loginlogs
        const [llResult] = await connection.query(
            'DELETE FROM loginlogs WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log(`✅ Deleted from loginlogs (${llResult.affectedRows} row(s))`);

        // 6. Delete from typingpassagelogs (if exists)
        try {
            const [tplResult] = await connection.query(
                'DELETE FROM typingpassagelogs WHERE student_id = ?',
                [STUDENT_ID]
            );
            console.log(`✅ Deleted from typingpassagelogs (${tplResult.affectedRows} row(s))`);
        } catch (e) {
            // Table might not exist or no records
            console.log('⚠️  typingpassagelogs: ' + e.message);
        }

        // 7. Delete from feedbackdb (if exists)
        try {
            const [fbResult] = await connection.query(
                'DELETE FROM feedbackdb WHERE student_id = ?',
                [STUDENT_ID]
            );
            console.log(`✅ Deleted from feedbackdb (${fbResult.affectedRows} row(s))`);
        } catch (e) {
            // Table might not exist or no records
            console.log('⚠️  feedbackdb: ' + e.message);
        }

        console.log('');

        // 8. Update students table - set loggedin = 0 and done = 0
        await connection.query(
            'UPDATE students SET loggedin = 0, done = 0 WHERE student_id = ?',
            [STUDENT_ID]
        );
        console.log('✅ Updated students: loggedin = 0, done = 0');

        console.log('\n' + '='.repeat(80));
        console.log('✅ STUDENT RESET COMPLETE!\n');
        console.log('Summary:');
        console.log(`   Student ID: ${STUDENT_ID}`);
        console.log(`   Name: ${student.fullname}`);
        console.log(`   Status: Ready for fresh exam attempt`);
        console.log(`   All logs cleared: ✅`);
        console.log(`   loggedIn set to: 0`);
        console.log(`   done set to: 0`);

        console.log('\n🎉 Student can now take the exam again!\n');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        await connection.end();
        process.exit(1);
    }
}

resetStudent();
