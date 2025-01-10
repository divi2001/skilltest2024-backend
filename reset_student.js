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

// Array of student IDs
const studentIds = [
    22515001077, 22515001078, 22515001079, 22515001080, 22515001081,
    22515001082, 22515001083, 22515001084, 22515001085, 22515001086,
    22515001087, 22515001088, 22515001089, 22515001090, 22515001091,
    22515001092, 22515001093, 22515001094, 22515001095, 22515001096,
    22515001097, 22515001098, 22515001099, 22515001100, 22515001101,
    22515001102, 22515001103, 22515001104, 22515001105, 22515001106,
    22515001107, 22515001108, 22515001109, 22515001110, 22515001111,
    22515001112, 22515001113, 22515001114, 22515001115, 22515001116,
    22515001117, 22515001118, 22515001119, 22515001120, 22515001121,
    22515001122, 22515001123, 22515001124, 22515001125, 22515001126,
    22515001127, 22515001128, 22515001129, 22515001130, 22515001131,
    22515001133, 22515001134, 22515001136, 22515001137
];

async function resetMultipleStudentsProgress(students, center) {
    try {
        const conn = await connection;
        let executedQueries = [];
        let successfulResets = [];
        let failedResets = [];

        for (const student_id of students) {
            try {
                // Verify student exists and belongs to specified center
                const verifyStudentQuery = `SELECT student_id FROM students WHERE student_id = ? AND center = ? AND batchNo = ?`;
                const [student] = await conn.query(verifyStudentQuery, [student_id, center,101]);

                if (student.length === 0) {
                    failedResets.push({
                        student_id,
                        reason: "Student not found or doesn't belong to the specified center"
                    });
                    continue;
                }

                // Reset queries for the student
                const resetQueries = [
                    // Students table
                    `UPDATE students SET loggedin = 0, done = 0 WHERE student_id = ? AND center = ?`,
                    
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
                    const params = query.includes('center') ? [student_id, center] : [student_id];
                    const [result] = await conn.query(query, params);
                    executedQueries.push({
                        student_id,
                        query: query,
                        affectedRows: result.affectedRows
                    });
                }

                successfulResets.push(student_id);
                console.log(`Successfully reset student ID: ${student_id}`);

            } catch (studentErr) {
                failedResets.push({
                    student_id,
                    reason: studentErr.message
                });
                console.error(`Failed to reset student ID: ${student_id}`, studentErr.message);
            }
        }

        console.log({
            "message": `Reset process completed for center ${center}`,
            "totalStudents": students.length,
            "successfulResets": successfulResets.length,
            "failedResets": failedResets.length,
            "successfulStudents": successfulResets,
            "failedStudents": failedResets
        });

    } catch (err) {
        console.error("Error executing multiple student reset:", err);
    } finally {
        process.exit(0);
    }
}

// Execute reset for the student IDs
resetMultipleStudentsProgress(studentIds, 2251)
    .catch(err => {
        console.error("Critical Error:", err);
        process.exit(1);
    });