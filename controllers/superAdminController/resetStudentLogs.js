const connection = require("../../config/db1")
const moment = require('moment-timezone');

exports.resetStudentProgress = async (req, res) => {
    const { student_id, studentLogin, trialAudioShortHand, audioShorthandA, textShorthandA, audioShorthandB, textShorthandB, trialText, textTyping, finalShorthandPassageA, finalShorthandPassageB, finalTrialPassageTyping, finalTypingPassage } = req.body;
    const { reset_id } = req.query;
    console.log("Request body:", req.body);
    if (!reset_id || !student_id) {
        return res.status(400).json({ "message": "Missing reset_id or student_id." });
    }

    const commonQuery = `
    UPDATE resetrequests 
    SET approved = "Approved", reseted_by = "super-admin" 
    WHERE id = ? AND student_id = ?
`;
















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

    const queryParam = [student_id];
    let executedQueries = [];

    try {
        if (studentLogin) {
            for (let key in queries) {
                console.log(`Executing ${key} queries`);
                for (let query of queries[key]) {
                    const [result] = await connection.query(query, queryParam);
                    console.log(`${key} query result:`, result);
                    executedQueries.push({ query: key, affectedRows: result.affectedRows });
                }
            }
        } else {
            const resetOperations = [
                { condition: trialAudioShortHand, key: 'trialAudio' },
                { condition: audioShorthandA, key: 'audioShorthandA' },
                { condition: textShorthandA, key: 'textShorthandA' },
                { condition: audioShorthandB, key: 'audioShorthandB' },
                { condition: textShorthandB, key: 'textShorthandB' },
                { condition: trialText, key: 'trialPassageTyping' },
                { condition: textTyping, key: 'typingPassage' },
                { condition: finalShorthandPassageA, key: 'finalShorthandPassageA' },
                { condition: finalShorthandPassageB, key: 'finalShorthandPassageB' },
                { condition: finalTrialPassageTyping, key: 'finalTrialPassageTyping' },
                { condition: finalTypingPassage, key: 'finalTypingPassage' }
            ];

            for (let operation of resetOperations) {
                if (operation.condition) {
                    console.log(`Reset ${operation.key} queries`);
                    for (let query of queries[operation.key]) {
                        const [result] = await connection.query(query, queryParam);
                        console.log(`${operation.key} query result:`, result);
                        executedQueries.push({ query: operation.key, affectedRows: result.affectedRows });
                    }
                }
            }
        }

        // console.log(response)
        // if(response.affectedRows == 0) return res.status(403).json({"message":"error updating request status"});

        if (executedQueries.length === 0) {
            return res.status(400).json({ "message": "No valid reset options selected" });
        } else {
            // console.log("Executed queries:", executedQueries);
            if(reset_id) await connection.query(commonQuery, [reset_id, student_id]);
            
            res.status(200).json({ "message": "Reset Successful!", "executedQueries": executedQueries });
        }



    } catch (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ "error": err.message });
    }
}

exports.getResetRequests = async (req, res) => {
    const centerId = req.query.center;

    let filter = "";
    let parameter = [];
    if (centerId) {
        filter = " AND center = ?"
        parameter.push(centerId)
    }

    try {
        // Fetch reset requests for the center
        const fetchResetRequestsQuery = `
            SELECT * 
            FROM resetrequests
            WHERE 1 = 1 ${filter} AND approved = "Pending"
            ORDER BY id DESC
        `;

        const [resetRequests] = await connection.query(fetchResetRequestsQuery, parameter);

        if (resetRequests.length === 0) {
            return res.status(404).json({ message: "No reset requests found for this center" });
        }

        // Format the time for each request
        const formattedRequests = resetRequests.map(request => ({
            ...request,
            time: moment(request.time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
        }));

        res.json(formattedRequests);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};
