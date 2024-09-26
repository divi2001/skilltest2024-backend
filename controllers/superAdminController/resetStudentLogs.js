const connection = require("../../config/db1")


exports.resetStudentProgress = async (req, res) => {
    const { student_id, studentLogin, trialAudioShortHand, audioShorthandA, textShorthandA, audioShorthandB, textShorthandB, trialText, textTyping } = req.body;
    console.log("Request body:", req.body);

    const queries = {
        studentLogin: `UPDATE students SET loggedin = 0, done = 0 WHERE student_id = ?;`,
        trialAudio: `UPDATE audiologs SET trial = 0 WHERE student_id = ?`,
        audioShorthandA: `UPDATE audiologs SET passageA = 0 WHERE student_id = ?`,
        textShorthandA: `UPDATE textlogs SET mina = 0, texta = NULL WHERE student_id = ?`,
        audioShorthandB: `UPDATE audiologs SET passageB = 0 WHERE student_id = ?`,
        textShorthandB: `UPDATE textlogs SET minb = 0, textb = NULL WHERE student_id = ?`,
        trialPassageTyping: `UPDATE typingpassagelogs SET trial_time = NULL, trial_passage = NULL WHERE student_id = ?;`,
        typingPassage: `UPDATE typingpassagelogs SET passage_time = NULL, passage = NULL WHERE student_id = ?;`
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
                console.log("Executing trialAudio query");
                const [result] = await connection.query(queries.trialAudio, queryParam);
                console.log("trialAudio query result:", result);
                executedQueries.push({ query: 'trialAudio', affectedRows: result.affectedRows });
            }
            if (audioShorthandA) {
                console.log("Executing audioShorthandA query");
                const [result] = await connection.query(queries.audioShorthandA, queryParam);
                console.log("audioShorthandA query result:", result);
                executedQueries.push({ query: 'audioShorthandA', affectedRows: result.affectedRows });
            }
            if (textShorthandA) {
                console.log("Executing textShorthandA query");
                const [result] = await connection.query(queries.textShorthandA, queryParam);
                console.log("textShorthandA query result:", result);
                executedQueries.push({ query: 'textShorthandA', affectedRows: result.affectedRows });
            }
            if (audioShorthandB) {
                console.log("Executing audioShorthandB query");
                const [result] = await connection.query(queries.audioShorthandB, queryParam);
                console.log("audioShorthandB query result:", result);
                executedQueries.push({ query: 'audioShorthandB', affectedRows: result.affectedRows });
            }
            if (textShorthandB) {
                console.log("Executing textShorthandB query");
                const [result] = await connection.query(queries.textShorthandB, queryParam);
                console.log("textShorthandB query result:", result);
                executedQueries.push({ query: 'textShorthandB', affectedRows: result.affectedRows });
            }
            if (trialText) {
                console.log("Executing trialPassageTyping query");
                const [result] = await connection.query(queries.trialPassageTyping, queryParam);
                console.log("trialPassageTyping query result:", result);
                executedQueries.push({ query: 'trialPassageTyping', affectedRows: result.affectedRows });
            }
            if (textTyping) {
                console.log("Executing typingPassage query");
                const [result] = await connection.query(queries.typingPassage, queryParam);
                console.log("typingPassage query result:", result);
                executedQueries.push({ query: 'typingPassage', affectedRows: result.affectedRows });
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
