const connection = require('./config/db1');

// Only these 4 test student IDs used for paper verification in dept 12
const TEST_STUDENT_IDS = [
    '211251510001',
    '211251510002',
    '211251610038',
    '211251610047'
];

async function resetTestStudents() {
    try {
        console.log('Resetting the following test students:', TEST_STUDENT_IDS);

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

        for (const studentId of TEST_STUDENT_IDS) {
            console.log(`\nResetting student: ${studentId}`);
            for (const key in queries) {
                for (const queryStr of queries[key]) {
                    try {
                        const [result] = await connection.query(queryStr, [studentId]);
                        if (result.affectedRows > 0) {
                            console.log(`  [${key}] OK (${result.affectedRows} row(s))`);
                        }
                    } catch (err) {
                        console.error(`  [${key}] Failed:`, err.message);
                    }
                }
            }
        }

        // Verify final state
        const [verify] = await connection.query(
            'SELECT student_id, fullname, loggedin, done FROM students WHERE student_id IN (?)',
            [TEST_STUDENT_IDS]
        );
        console.log('\n=== Verification ===');
        verify.forEach(s => console.log(`  ${s.student_id} | ${s.fullname} | loggedin=${s.loggedin} | done=${s.done}`));
        console.log('\nReset complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetTestStudents();
