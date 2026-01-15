const connection = require('./config/db1');

async function checkStudentAudio() {
    try {
        const studentId = '1251001';
        console.log(`Checking details for student: ${studentId}`);

        // 1. Get Student Data
        const [students] = await connection.query('SELECT * FROM students WHERE student_id = ?', [studentId]);
        if (students.length === 0) {
            console.log("Student not found.");
            process.exit(0);
        }
        const student = students[0];
        console.log(`Student found. BatchNo: ${student.batchNo}, QSet: ${student.qset}, SubjectsId: ${student.subjectsId}`);

        // 2. Get Audio Data
        // Note: subjectsId might be a JSON array string "[40]" or just "40"
        let subjectId = student.subjectsId;
        try {
            const parsed = JSON.parse(subjectId);
            if (Array.isArray(parsed)) subjectId = parsed[0];
        } catch (e) {
            // keep as is
        }

        console.log(`Looking up audio for SubjectId: ${subjectId}, QSet: ${student.qset}`);
        const [audios] = await connection.query('SELECT * FROM audiodb WHERE subjectId = ? AND qset = ?', [subjectId, student.qset]);

        if (audios.length > 0) {
            const audio = audios[0];
            console.log("Audio Records Found:");
            console.log("- Audio1 URL:", audio.audio1);
            console.log("- Audio2 URL:", audio.audio2);
            console.log("- Test Audio URL:", audio.testaudio);
        } else {
            console.log("No audio record found in audiodb matching this subject and qset.");

            // Check what qsets ARE available
            const [allAudios] = await connection.query('SELECT qset FROM audiodb WHERE subjectId = ?', [subjectId]);
            console.log(`Available qsets for subject ${subjectId}:`, allAudios.map(a => a.qset));
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkStudentAudio();
