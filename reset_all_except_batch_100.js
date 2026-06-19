const connection = require('./config/db1');

async function masterResetAllExceptBatch100() {
    const excludedBatchNo = '100';

    try {
        console.log(`Fetching all students EXCEPT Batch: ${excludedBatchNo}...`);

        const query = 'SELECT student_id, subjectsId, batchNo FROM students WHERE batchNo != ?';
        const [students] = await connection.query(query, [excludedBatchNo]);

        if (students.length === 0) {
            console.log('No students found outside batch 100.');
            process.exit(0);
        }

        console.log(`Found ${students.length} students to reset (all batches except ${excludedBatchNo}).`);
        console.log(`Proceeding to Master Reset...`);

        const queries = {
            studentLogin: [
                `UPDATE students SET loggedin = 0, done = 0 WHERE student_id = ?;`,
                `UPDATE exam_stages SET StudentInfo = 0, Instructions = 0, InputChecker = 0, HeadphoneTest = 0, ControllerPassword = 0 WHERE StudentId = ?;`
            ],
            trialAudio: [
                `UPDATE audiologs SET trial = 0 WHERE student_id = ?;`,
                `UPDATE exam_stages SET TrialPassage = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            audioShorthandA: [
                `UPDATE audiologs SET passageA = 0 WHERE student_id = ?;`,
                `UPDATE exam_stages SET AudioPassageA = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            textShorthandA: [
                `UPDATE textlogs SET mina = 0, texta = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET TypingPassageA = 0, ShorthandSummary = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            finalShorthandPassageA: [
                `UPDATE finalPassageSubmit SET passageA = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET TypingPassageA = 0, ShorthandSummary = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            audioShorthandB: [
                `UPDATE audiologs SET passageB = 0 WHERE student_id = ?;`,
                `UPDATE exam_stages SET AudioPassageB = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            textShorthandB: [
                `UPDATE textlogs SET minb = 0, textb = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET TypingPassageB = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            finalShorthandPassageB: [
                `UPDATE finalPassageSubmit SET passageB = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET TypingPassageB = 0, ShorthandSummaryB = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            trialPassageTyping: [
                `UPDATE typingpassagelogs SET trial_time = NULL, trial_passage = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET TrialTypewriting = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            finalTrialPassageTyping: [
                `UPDATE typingpassage SET trial_passage = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET TrialTypewriting = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            typingPassage: [
                `UPDATE typingpassagelogs SET passage_time = NULL, passage = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET Typewriting = 0, TypingSummary = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            finalTypingPassage: [
                `UPDATE typingpassage SET passage = NULL, time = NULL WHERE student_id = ?;`,
                `UPDATE exam_stages SET Typewriting = 0, TypingSummary = 0, ThankYou = 0 WHERE StudentId = ?;`
            ],
            studentLogs: [
                `UPDATE studentlogs SET 
                    loginTime = NULL, 
                    login = 0, 
                    trial_time = NULL, 
                    audio1_time = NULL, 
                    passage1_time = NULL, 
                    audio2_time = NULL, 
                    passage2_time = NULL, 
                    trial_passage_time = NULL, 
                    typing_passage_time = NULL, 
                    feedback_time = NULL 
                 WHERE student_id = ?;`
            ]
        };

        for (const student of students) {
            const studentId = student.student_id;
            console.log(`Resetting student: ${studentId} (batch: ${student.batchNo})`);

            for (let key in queries) {
                for (let queryStr of queries[key]) {
                    try {
                        await connection.query(queryStr, [studentId]);
                    } catch (err) {
                        console.error(`Failed to execute query for student ${studentId} [${key}]:`, err.message);
                    }
                }
            }
        }

        console.log(`\nMaster Reset completed for ${students.length} students (all batches except ${excludedBatchNo}).`);
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

masterResetAllExceptBatch100();
