const connection = require('../../config/db1');
const StudentTableDTO = require('../../dto/studentTableDTO');

exports.resetStudentProgress = async (req, res) => {
    const { student_id, reason, studentLogin, trialAudioShortHand, trialTextShortHand, audioShorthandA, textShorthandA, audioShorthandB, textShorthandB, trialText, textTyping} = req.body;

    console.log("req data: "+student_id + " studentLogin: "+ studentLogin + " trialAudioShortHand: "+ trialAudioShortHand + " trialTextShortHand: "+trialTextShortHand + " audioShorthand: "+ audioShorthand + " textShorthand: "+textShorthand + " trialText: "+trialText + " textTyping: "+textTyping);
    
    let studentLoginReset = `UPDATE students SET loggedin = 0, done = 0 WHERE student_id = ?;`;
    
    let trialAudioReset = `UPDATE audiologs SET trial = 0 WHERE student_id = ?`;
    let trialTextReset = `UPDATE textlogs SET trial = 0 WHERE student_id = ?`;
    
    let audioShorthandAReset = `UPDATE audiologs SET passageA = 0 WHERE student_id = ?`;
    let textShorthandAReset = `UPDATE textlogs SET mina = 0, texta = NULL WHERE student_id = ?`;

    let audioShorthandBReset = `UPDATE audiologs SET passageB = 0 WHERE student_id = ?`;
    let textShorthandBReset = `UPDATE textlogs SET minb = 0, textb = NULL WHERE student_id = ?`;

    let trialPassageTypeingReset = `UPDATE typingpassagelogs SET trial_time = NULL, trial_passage = NULL WHERE student_id = ?;`;
    let typingPassageReset = `UPDATE typingpassagelogs SET passage_time = NULL, passage = NULL WHERE student_id = ?;`;

    let queryParam = [student_id];

    try{
        console.log("query: "+updateQuery);
        if(studentLogin){ //master reset
            const [results] = await connection.query(studentLoginReset, queryParam);
            await connection.query(trialAudioReset, queryParam);
            await connection.query(trialTextReset, queryParam);
            await connection.query(audioShorthandAReset, queryParam);
            await connection.query(textShorthandAReset, queryParam);
            await connection.query(audioShorthandBReset, queryParam);
            await connection.query(textShorthandBReset, queryParam);
            await connection.query(trialPassageTypeingReset, queryParam);
            await connection.query(typingPassageReset, queryParam);
        }else if(trialAudioShortHand){
            const [results] = await connection.query(trialAudioReset, queryParam);
            await connection.query(trialTextReset, queryParam);
        }else if(trialTextShortHand){
            const [results] = await connection.query(trialTextReset, queryParam);
        }else if(audioShorthandA){
            const [results] = await connection.query(audioShorthandAReset, queryParam);
            await connection.query(textShorthandA, queryParam);
        }else if(textShorthandA){
            const [results] = await connection.query(textShorthandAReset, queryParam);
        }else if(audioShorthandB){
            const [results] = await connection.query(audioShorthandBReset, queryParam);
            await connection.query(textShorthandBReset, queryParam);
        }else if(textShorthandB){
            const [results] = await connection.query(textShorthandBReset, queryParam);
        }else if(trialText){
            const [results] = await connection.query(trialPassageTypeingReset, queryParam);
        }else if(textTyping){
            const [results] = await connection.query(typingPassageReset, queryParam);
        }else{

        }

        console.log(results);
        if (results.affectedRows === 0) {
            res.status(404).send("No records found to update.");
            
        }else if(results.affectedRows != 0){
            console.log("Reset successful, updating the log table!...");
            logResetTable(student_id, reason, studentLogin, trialAudioShortHand, trialTextShortHand, audioShorthand, textShorthand, trialText, textTyping);
        } else {
            res.status(200).send("Updated successful.");
            
        }
    }catch(err){
        console.error("Error executing query:", err.message);
        res.status(500).send(err.message);
    }
}
async function logResetTable(student_id, reason, studentLogin, trialAudioShortHand, trialTextShortHand, audioShorthand, textShorthand, trialText, textTyping){
    const currentTime = new Date();
    
    let resetLogQuery = `INSERT INTO resetTableLogs (student_id, reason, timeStamp, `;
    // studentLogin, studentDone, audioShorthand, textShorthand, textTyping, trialAudioShortHand, trialTextShortHand, trialText) VALUES (?, ?, ?, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE);`
    if(studentLogin){
        resetLogQuery += `studentLogin, studentDone, audioShorthand, textShorthand, textTyping, trialAudioShortHand, trialTextShortHand, trialText) VALUES (?, ?, ?, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);`
    }else if(trialAudioShortHand){
        resetLogQuery += `trialAudioShortHand, trialTextShortHand) VALUES(?, ?, ?, TRUE, TRUE);`;
    }else if(trialTextShortHand){
        resetLogQuery += `trialTextShortHand) VALUES(?, ?, ?, TRUE);`;
    }else if(audioShorthand){
        resetLogQuery += `audioShorthand, textShorthand) VALUES(?, ?, ?, TRUE, TRUE);`;
    }else if(textShorthand){
        resetLogQuery += `textShorthand) VALUES(?, ?, ?, TRUE);`;
    }else if(trialText){
        resetLogQuery += `trialText) VALUES(?, ?, ?, TRUE);`;
    }else if(textTyping){
        resetLogQuery += `textTyping) VALUES(?, ?, ?, TRUE);`;
    }else{
        
    }
    try {
        const [result] = await connection.execute(resetLogQuery, [student_id, reason, currentTime]);
        console.log('Insert successful:', result);
    } catch (error) {
        console.error('Error inserting data:', error);
    }
}