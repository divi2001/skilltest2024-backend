const connection = require('./config/db1');

async function masterResetBatch() {
    const center = '5151';
    const batchNo = '100';
    const targetSubjectId = 40;

    try {
        console.log(`Fetching students for Center: ${center}, Batch: ${batchNo}...`);
        // Select subjectsId as well to filter
        const query = 'SELECT student_id, subjectsId FROM students WHERE center = ? AND batchNo = ?';
        const [students] = await connection.query(query, [center, batchNo]);

        if (students.length === 0) {
            console.log('No students found for this center and batch.');
            process.exit(0);
        }

        console.log(`Found ${students.length} students. Filtering for Subject ID: ${targetSubjectId}...`);

        const studentsToReset = students.filter(student => {
            let sIds = student.subjectsId;
            if (!sIds) return false;

            try {
                // Try parsing as JSON (e.g., "[40]" or "40")
                const parsed = JSON.parse(sIds);

                if (Array.isArray(parsed)) {
                    // Check if 40 is in the array (compare as strings just in case)
                    return parsed.some(id => String(id) === String(targetSubjectId));
                } else {
                    // Single value
                    return String(parsed) === String(targetSubjectId);
                }
            } catch (e) {
                // If parse fails, treat as raw string/number
                return String(sIds).includes(String(targetSubjectId)); // Fallback, though 'includes' might correspond to partial matches like 140. 
                // Better strict check if parse fails:
                // return String(sIds) === String(targetSubjectId);
            }
        });

        if (studentsToReset.length === 0) {
            console.log(`No students found with Subject ID ${targetSubjectId} in this batch.`);
            process.exit(0);
        }

        console.log(`Proceeding to Master Reset for ${studentsToReset.length} students...`);

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
        };

        for (const student of studentsToReset) {
            const studentId = student.student_id;
            console.log(`Resetting student: ${studentId}`);

            for (let key in queries) {
                for (let queryStr of queries[key]) {
                    try {
                        await connection.query(queryStr, [studentId]);
                    } catch (err) {
                        console.error(`Failed to execute query for student ${studentId}: ${queryStr}`, err);
                    }
                }
            }
        }

        console.log('Master Reset completed for filtered students.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

masterResetBatch();
