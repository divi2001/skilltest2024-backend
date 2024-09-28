const connection = require("../../config/db1")


exports.resetStudentProgress = async (req, res) => {
    const { student_id, studentLogin, trialAudioShortHand, audioShorthandA, textShorthandA, audioShorthandB, textShorthandB, trialText, textTyping , finalShorthandPassageA ,finalShorthandPassageB , finalTrialPassageTyping , finalTypingPassage } = req.body;
    console.log("Request body:", req.body);
    const queries = {
        studentLogin: `
            UPDATE students s
            JOIN exam_stages es ON s.student_id = es.StudentId
            SET s.loggedin = 0, s.done = 0, 
                es.StudentInfo = 0, es.Instructions = 0, es.InputChecker = 0, 
                es.HeadphoneTest = 0, es.ControllerPassword = 0
            WHERE s.student_id = ?;
        `,
        trialAudio: `
            UPDATE audiologs a
            JOIN exam_stages es ON a.student_id = es.StudentId
            SET a.trial = 0, es.TrialPassage = 0, es.ThankYou = 0
            WHERE a.student_id = ?;
        `,
        audioShorthandA: `
            UPDATE audiologs a
            JOIN exam_stages es ON a.student_id = es.StudentId
            SET a.passageA = 0, es.AudioPassageA = 0, es.ThankYou = 0
            WHERE a.student_id = ?;
        `,
        textShorthandA: `
            UPDATE textlogs t
            JOIN exam_stages es ON t.student_id = es.StudentId
            SET t.mina = 0, t.texta = NULL, es.TypingPassageA = 0, es.ShorthandSummary = 0 ,es.ThankYou = 0
            WHERE t.student_id = ?;
        `,
        finalShorthandPassageA: `
            UPDATE finalPassageSubmit f
            JOIN exam_stages es ON f.student_id = es.StudentId
            SET f.passageA = NULL,es.TypingPassageA = 0, es.ShorthandSummary = 0,es.ThankYou = 0
            WHERE f.student_id = ?;
        `,
        audioShorthandB: `
            UPDATE audiologs a
            JOIN exam_stages es ON a.student_id = es.StudentId
            SET a.passageB = 0, es.AudioPassageA = 0, es.ThankYou = 0
            WHERE a.student_id = ?;
        `,
        textShorthandB: `
            UPDATE textlogs t
            JOIN exam_stages es ON t.student_id = es.StudentId
            SET t.minb = 0, t.textb = NULL, es.TypingPassageA = 0, es.ThankYou = 0
            WHERE t.student_id = ?;
        `,
        finalShorthandPassageB: `
            UPDATE finalPassageSubmit f
            JOIN exam_stages es ON f.student_id = es.StudentId
            SET f.passageB = NULL, es.ShorthandSummary = 0, es.ThankYou = 0
            WHERE f.student_id = ?;
        `,
        trialPassageTyping: `
            UPDATE typingpassagelogs t
            JOIN exam_stages es ON t.student_id = es.StudentId
            SET t.trial_time = NULL, t.trial_passage = NULL, es.TrialTypewriting = 0, es.ThankYou = 0
            WHERE t.student_id = ?;
        `,
        finalTrialPassageTyping: `
            UPDATE typingpassage t
            JOIN exam_stages es ON t.student_id = es.StudentId
            SET t.trial_passage = NULL, es.TrialTypewriting = 0, es.ThankYou = 0
            WHERE t.student_id = ?;
        `,
        typingPassage: `
            UPDATE typingpassagelogs t
            JOIN exam_stages es ON t.student_id = es.StudentId
            SET t.passage_time = NULL, t.passage = NULL, es.Typewriting = 0, es.TypingSummary = 0, es.ThankYou = 0
            WHERE t.student_id = ?;
        `,
        finalTypingPassage: `
            UPDATE typingpassage t
            JOIN exam_stages es ON t.student_id = es.StudentId
            SET t.passage = NULL, t.time = NULL, es.Typewriting = 0, es.TypingSummary = 0, es.ThankYou = 0
            WHERE t.student_id = ?;
        `,
    };

    const queryParam = [student_id];
    let executedQueries = [];

    try {
        if (studentLogin) {
            for (let key in queries) {
                console.log(`Executing ${key} query`);
                const [result] = await connection.query(queries[key], queryParam);
                console.log(`${key} query result:`, result);
                executedQueries.push({ query: key, affectedRows: result.affectedRows });
            }
        } else {
            if (trialAudioShortHand) {
                console.log("Reset trialAudio query");
                const [result] = await connection.query(queries.trialAudio, queryParam);
                console.log("trialAudio query result:", result);
                executedQueries.push({ query: 'trialAudio', affectedRows: result.affectedRows });
            }
            if (audioShorthandA) {
                console.log("Reset audioShorthandA query");
                const [result] = await connection.query(queries.audioShorthandA, queryParam);
                console.log("audioShorthandA query result:", result);
                executedQueries.push({ query: 'audioShorthandA', affectedRows: result.affectedRows });
            }
            if (textShorthandA) {
                console.log("Reset textShorthandA query");
                const [result] = await connection.query(queries.textShorthandA, queryParam);
                console.log("textShorthandA query result:", result);
                executedQueries.push({ query: 'textShorthandA', affectedRows: result.affectedRows });
            }
            if (audioShorthandB) {
                console.log("Reset audioShorthandB query");
                const [result] = await connection.query(queries.audioShorthandB, queryParam);
                console.log("audioShorthandB query result:", result);
                executedQueries.push({ query: 'audioShorthandB', affectedRows: result.affectedRows });
            }
            if (textShorthandB) {
                console.log("Reset textShorthandB query");
                const [result] = await connection.query(queries.textShorthandB, queryParam);
                console.log("textShorthandB query result:", result);
                executedQueries.push({ query: 'textShorthandB', affectedRows: result.affectedRows });
            }
            if (trialText) {
                console.log("Reset trialPassageTyping query");
                const [result] = await connection.query(queries.trialPassageTyping, queryParam);
                console.log("trialPassageTyping query result:", result);
                executedQueries.push({ query: 'trialPassageTyping', affectedRows: result.affectedRows });
            }
            if (textTyping) {
                console.log("Reset typingPassage query");
                const [result] = await connection.query(queries.typingPassage, queryParam);
                console.log("typingPassage query result:", result);
                executedQueries.push({ query: 'typingPassage', affectedRows: result.affectedRows });
            }
            if(finalShorthandPassageA){
                console.log("Reset Final Shorthand Passage A query");
                const[result] = await connection.query(queries.finalShorthandPassageA,queryParam);
                console.log("finalShorthandPassageA query result: ",result);
                executedQueries.push({ query: 'finalShorthandPassageA', affectedRows: result.affectedRows })
            }
            if(finalShorthandPassageB){
                console.log("Reset Final Shorthand Passage B query");
                const[result] = await connection.query(queries.finalShorthandPassageB,queryParam);
                console.log("finalShorthandPassageB query result: ",result);
                executedQueries.push({ query: 'finalShorthandPassageB', affectedRows: result.affectedRows })
            }
            if(finalTrialPassageTyping){
                console.log("Reset Final Typing Trial Passage query");
                const[result] = await connection.query(queries.finalTrialPassageTyping,queryParam);
                console.log("finalTrialPassageTypingquery result: ",result);
                executedQueries.push({ query: 'finalTrialPassageTyping', affectedRows: result.affectedRows })
            }
            if(finalTypingPassage){
                console.log("Reset Final Typing  Passage query");
                const[result] = await connection.query(queries.finalTypingPassage,queryParam);
                console.log("finalTypingPassage result: ",result);
                executedQueries.push({ query: 'finalTypingPassage', affectedRows: result.affectedRows })
            }
        }

        if (executedQueries.length === 0) {
            res.status(400).json({ "message": "No valid reset options selected" });
        } else {
            console.log("Executed queries:", executedQueries);
            res.status(200).json({ "message": "Reset Successful!", "executedQueries": executedQueries });
            // You can call your logResetTable function here if needed
            // logResetTable(student_id, reason, studentLogin, trialAudioShortHand, audioShorthandA, textShorthandA, audioShorthandB, textShorthandB, trialText, textTyping);
        }

    } catch (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ "error": err.message });
    }
}
