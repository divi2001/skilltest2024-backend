const mysql = require('mysql2/promise');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 100000,
    queueLimit: 0
});

async function resetBatchStudentProgress(batch_id, subject_id) {
    try {
        const conn = await connection;
        
        // Get students with specific batch and subject ID
        const getStudentsQuery = `SELECT student_id FROM students WHERE batchNo = ? AND subjectsId = ?`;
        const [students] = await conn.query(getStudentsQuery, [batch_id, subject_id]);
        
        if (students.length === 0) {
            console.log("No students found in this batch with the specified subject");
            return;
        }

        let executedQueries = [];

        // Reset queries for each student
        for (const student of students) {
            const student_id = student.student_id;
            
            // Reset queries for each student
            const resetQueries = [
                // Students table
                `UPDATE students SET loggedin = 0, done = 0 WHERE student_id = ?`,
                
                // Exam stages
                `UPDATE exam_stages SET 
                    StudentInfo = 0, 
                    Instructions = 0, 
                    InputChecker = 0, 
                    HeadphoneTest = 0, 
                    ControllerPassword = 0,
                    TrialPassage = 0,
                    AudioPassageA = 0,
                    AudioPassageB = 0,
                    TypingPassageA = 0,
                    TypingPassageB = 0,
                    ShorthandSummary = 0,
                    ShorthandSummaryB = 0,
                    TrialTypewriting = 0,
                    Typewriting = 0,
                    TypingSummary = 0,
                    ThankYou = 0
                WHERE StudentId = ?`,
                
                // Audio logs
                `UPDATE audiologs SET trial = 0, passageA = 0, passageB = 0 WHERE student_id = ?`,
                
                // Text logs
                `UPDATE textlogs SET mina = 0, minb = 0, texta = NULL, textb = NULL WHERE student_id = ?`,
                
                // Final passage submit
                `UPDATE finalPassageSubmit SET passageA = NULL, passageB = NULL WHERE student_id = ?`,
                
                // Typing passage logs
                `UPDATE typingpassagelogs SET trial_time = NULL, trial_passage = NULL, passage_time = NULL, passage = NULL WHERE student_id = ?`,
                
                // Typing passage
                `UPDATE typingpassage SET trial_passage = NULL, passage = NULL, time = NULL WHERE student_id = ?`
            ];

            // Execute each reset query
            for (const query of resetQueries) {
                const [result] = await conn.query(query, [student_id]);
                executedQueries.push({
                    student_id: student_id,
                    affectedRows: result.affectedRows
                });
            }
        }

        console.log({
            "message": `Successfully reset progress for ${students.length} students in batch ${batch_id} with subject ID ${subject_id}`,
            "totalStudents": students.length,
            "executedQueries": executedQueries
        });

    } catch (err) {
        console.error("Error executing batch reset:", err);
    }
}

// Execute the function for batch_id 100 and subject_id 60
resetBatchStudentProgress(201, 60)
    .then(() => {
        console.log("Process completed");
        process.exit(0);
    })
    .catch(err => {
        console.error("Error:", err);
        process.exit(1);
    });