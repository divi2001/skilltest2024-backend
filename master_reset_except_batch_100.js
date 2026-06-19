const connection = require('./config/db1');

async function masterResetExceptBatch100() {
    const excludedBatch = '100';

    try {
        console.log(`Fetching students with active records (loggedin=1 OR done=1) EXCEPT Batch: ${excludedBatch}...`);

        // Select students who have some activity
        const query = 'SELECT student_id FROM students WHERE batchNo != ? AND (loggedin = 1 OR done = 1)';
        const [students] = await connection.query(query, [excludedBatch]);

        if (students.length === 0) {
            console.log('No active students found to reset.');
            process.exit(0);
        }

        const studentIds = students.map(s => s.student_id);
        console.log(`Found ${studentIds.length} students to reset.`);
        console.log(`Proceeding to Master Reset in BATCH MODE...`);

        // Helper to batch process updates if too many IDs (though <1000 is fine for IN clause)
        // We'll just use one big IN clause for simplicity as list is likely reasonable size
        const idsString = studentIds.join(',');

        const queries = {
            studentLogin: [
                `UPDATE students SET loggedin = 0, done = 0 WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET StudentInfo = 0, Instructions = 0, InputChecker = 0, HeadphoneTest = 0, ControllerPassword = 0 WHERE StudentId IN (${idsString});`
            ],
            trialAudio: [
                `UPDATE audiologs SET trial = 0 WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TrialPassage = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            audioShorthandA: [
                `UPDATE audiologs SET passageA = 0 WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET AudioPassageA = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            textShorthandA: [
                `UPDATE textlogs SET mina = 0, texta = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TypingPassageA = 0, ShorthandSummary = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            finalShorthandPassageA: [
                `UPDATE finalPassageSubmit SET passageA = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TypingPassageA = 0, ShorthandSummary = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            audioShorthandB: [
                `UPDATE audiologs SET passageB = 0 WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET AudioPassageB = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            textShorthandB: [
                `UPDATE textlogs SET minb = 0, textb = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TypingPassageB = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            finalShorthandPassageB: [
                `UPDATE finalPassageSubmit SET passageB = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TypingPassageB = 0, ShorthandSummaryB = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            trialPassageTyping: [
                `UPDATE typingpassagelogs SET trial_time = NULL, trial_passage = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TrialTypewriting = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            finalTrialPassageTyping: [
                `UPDATE typingpassage SET trial_passage = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET TrialTypewriting = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            typingPassage: [
                `UPDATE typingpassagelogs SET passage_time = NULL, passage = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET Typewriting = 0, TypingSummary = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
            ],
            finalTypingPassage: [
                `UPDATE typingpassage SET passage = NULL, time = NULL WHERE student_id IN (${idsString});`,
                `UPDATE exam_stages SET Typewriting = 0, TypingSummary = 0, ThankYou = 0 WHERE StudentId IN (${idsString});`
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
                 WHERE student_id IN (${idsString});`
            ]
        };

        // Execute all queries
        for (let key in queries) {
            console.log(`Executing updates for: ${key}`);
            for (let queryStr of queries[key]) {
                try {
                    await connection.query(queryStr);
                } catch (err) {
                    console.error(`Failed to execute query section ${key}:`, err.message);
                }
            }
        }

        console.log('Master Reset completed for active students (except batch 100).');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

masterResetExceptBatch100();
