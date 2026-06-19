const connection = require('./config/db1');

async function checkStudentTimer() {
    const studentId = '5352616093';

    try {
        // Get student details
        const studentQuery = 'SELECT student_id, subjectsId, disability, batchNo FROM students WHERE student_id = ?';
        const [students] = await connection.query(studentQuery, [studentId]);

        if (students.length === 0) {
            console.log(`\n❌ Student ${studentId} not found!\n`);
            process.exit(0);
        }

        const student = students[0];
        console.log('\n📊 Student Details:');
        console.log('Student ID:', student.student_id);
        console.log('Batch No:', student.batchNo);
        console.log('Disability:', student.disability);
        console.log('SubjectsId (raw):', student.subjectsId);

        // Parse subjectsId
        let subjectId;
        try {
            subjectId = JSON.parse(student.subjectsId);
        } catch (err) {
            subjectId = student.subjectsId;
        }

        console.log('SubjectsId (parsed):', subjectId);

        // Get subject details
        const subjectsQuery = 'SELECT * FROM subjectsdb WHERE subjectId = ?';
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);

        if (subjects.length === 0) {
            console.log(`\n❌ Subject ${subjectId} not found!\n`);
            process.exit(0);
        }

        const subject = subjects[0];
        console.log('\n📚 Subject Details:');
        console.log('Subject ID:', subject.subjectId);
        console.log('Subject Name:', subject.subject_name);
        console.log('Passage Timer:', subject.passage_timer);
        console.log('Disability Passage Timer:', subject.disability_passage_timer);
        console.log('Daily Timer:', subject.daily_timer);
        console.log('Demo Timer:', subject.demo_timer);

        // Calculate which timer should be used
        const timerToUse = student.disability === 1 ? subject.disability_passage_timer : subject.passage_timer;

        console.log('\n⏱️  Timer Calculation:');
        console.log('Is Disabled?', student.disability === 1 ? 'YES' : 'NO');
        console.log('Timer that SHOULD be used:', timerToUse, 'minutes');

        if (timerToUse === 0 || timerToUse === null) {
            console.log('\n⚠️  WARNING: Timer is 0 or NULL!');
            console.log('This is why the .NET application shows 0 timer.');
            console.log('\n💡 SOLUTION: Update the passage_timer in subjectsdb table');
            console.log(`   SQL: UPDATE subjectsdb SET passage_timer = 30 WHERE subjectId = ${subjectId};`);
        } else {
            console.log('\n✅ Timer is properly configured');
        }

        console.log('\n');
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkStudentTimer();
