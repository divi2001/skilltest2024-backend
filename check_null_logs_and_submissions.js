const connection = require('./config/db1');

async function checkNullLogsAndSubmissions() {
    try {
        console.log('🔍 Checking students who logged in but have NULL/Empty logs and submissions...\n');
        console.log('Target Batches: 201, 202\n');
        console.log('='.repeat(80));

        const query = `
            SELECT 
                s.student_id,
                s.fullname,
                s.batchNo,
                sl.loginTime,
                tl.texta,
                tl.textb,
                fps.passageA,
                fps.passageB
            FROM students s
            JOIN studentlogs sl ON s.student_id = sl.student_id
            LEFT JOIN textlogs tl ON s.student_id = tl.student_id
            LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
            WHERE s.batchNo IN (201, 202)
                AND (tl.texta IS NULL OR tl.texta = '')
                AND (tl.textb IS NULL OR tl.textb = '')
                AND (fps.passageA IS NULL OR fps.passageA = '')
                AND (fps.passageB IS NULL OR fps.passageB = '')
            GROUP BY s.student_id
            ORDER BY s.student_id
        `;

        const [results] = await connection.query(query);

        if (results && results.length > 0) {
            console.log(`⚠️  Found ${results.length} student(s) who logged in but have NO typed text or submitted passages:\n`);

            results.forEach((student, idx) => {
                console.log(`${idx + 1}. Student ID: ${student.student_id}`);
                console.log(`   Batch: ${student.batchNo}`);
                console.log(`   Login Time: ${student.loginTime}`);
                console.log(`   Text Logs (A/B): ${student.texta === null ? 'NULL' : 'Empty'}/${student.textb === null ? 'NULL' : 'Empty'}`);
                console.log(`   Final Submission (A/B): ${student.passageA === null ? 'NULL' : 'Empty'}/${student.passageB === null ? 'NULL' : 'Empty'}`);
                console.log('─'.repeat(40));
            });
        } else {
            console.log('✅ No students found with completely null logs and submissions for these batches.');
        }

        console.log('\n📊 Summary:');
        console.log(`   Total Identifed: ${results.length}`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ Check complete!');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkNullLogsAndSubmissions();
