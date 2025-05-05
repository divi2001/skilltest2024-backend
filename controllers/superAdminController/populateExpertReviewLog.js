const connection = require("../../config/db1");

exports.populateExpertReviewLog = async (req, res) => {
    const { department } = req.body;
    console.log(`Starting populateExpertReviewLog with department: ${department}`);
    
    try {
        // First, check if students exist for this department
        const [studentCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students WHERE departmentId = ?', 
            [department]
        );
        console.log(`Found ${studentCheck[0].count} students in department ${department}`);
        
        if (studentCheck[0].count === 0) {
            console.log(`No students found in department ${department}. Check if department ID is correct.`);
            return res.status(201).json({ "message": "No students in this department" });
        }
        
        // Check each part of your join to see where data might be missing
        const [studentLogsCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students s INNER JOIN studentlogs sl ON s.student_id = sl.student_id WHERE s.departmentId = ?',
            [department]
        );
        console.log(`Found ${studentLogsCheck[0].count} students with studentlogs records`);
        
        const [feedbackCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students s INNER JOIN studentlogs sl ON s.student_id = sl.student_id WHERE s.departmentId = ? AND sl.feedback_time IS NOT NULL',
            [department]
        );
        console.log(`Found ${feedbackCheck[0].count} students with feedback_time NOT NULL`);
        
        const [loginCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students s INNER JOIN studentlogs sl ON s.student_id = sl.student_id WHERE s.departmentId = ? AND sl.feedback_time IS NOT NULL AND sl.login = true',
            [department]
        );
        console.log(`Found ${loginCheck[0].count} students with login = true`);
        
        // Check optional joins to see if data exists
        const [finalPassageCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students s LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id WHERE s.departmentId = ?',
            [department]
        );
        console.log(`Found ${finalPassageCheck[0].count} students with finalPassageSubmit joins (with LEFT JOIN)`);
        console.log(`Of these, ${finalPassageCheck[0].count - await checkNullCount('finalPassageSubmit', 'student_id', department)} have actual data`);
        
        const [textLogsCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students s LEFT JOIN textlogs tl ON s.student_id = tl.student_id WHERE s.departmentId = ?',
            [department]
        );
        console.log(`Found ${textLogsCheck[0].count} students with textlogs joins (with LEFT JOIN)`);
        console.log(`Of these, ${textLogsCheck[0].count - await checkNullCount('textlogs', 'student_id', department)} have actual data`);
        
        const [audioDbCheck] = await connection.query(
            'SELECT COUNT(*) as count FROM students s LEFT JOIN audiodb ad ON s.subjectsId = ad.subjectId AND s.qset = ad.qset WHERE s.departmentId = ?',
            [department]
        );
        console.log(`Found ${audioDbCheck[0].count} students with audiodb joins (with LEFT JOIN)`);
        console.log(`Of these, ${audioDbCheck[0].count - await checkNullCount('audiodb', 'subjectId', department)} have actual data`);
        
        // Now run the full original query with debugging
        let query = `
       SELECT 
    s.student_id,
    COALESCE(fps.passageA, tl.texta, 'empty') AS passageA,
    COALESCE(fps.passageB, tl.textb, 'empty') AS passageB,
    s.subjectsId,
    s.qset,
    COALESCE(ad.textPassageA, 'empty') AS modelPassageA,
    COALESCE(ad.textPassageB, 'empty') AS modelPassageB
FROM 
    students s
LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
LEFT JOIN textlogs tl ON s.student_id = tl.student_id
LEFT JOIN audiodb ad ON s.subjectsId = ad.subjectId AND s.qset = ad.qset
INNER JOIN studentlogs sl ON s.student_id = sl.student_id
WHERE 
    s.departmentId = ?
    AND sl.feedback_time IS NOT NULL
    AND sl.login = true
ORDER BY s.student_id`;

        console.log(`Executing full query for department: ${department}`);
        const [results] = await connection.query(query, [department]);
        console.log(`Query executed, retrieved ${results.length} rows`);
        
        if (results.length === 0) {
            console.log("No students available match all criteria. Check the previous logs to see where filtering is happening.");
            return res.status(201).json({ "message": "No students Available" });
        }

        // Rest of your existing code...
        console.log(`Processing ${results.length} student records`);
        let inserted = 0;
        let updated = 0;
        let errors = 0;

        for (const row of results) {
            try {
                console.log(`Processing student_id: ${row.student_id}`);
                console.log(`Student data: SubjectId=${row.subjectsId}, QSet=${row.qset}`);
                console.log(`PassageA length: ${row.passageA.length}, PassageB length: ${row.passageB.length}`);
                console.log(`ModelPassageA length: ${row.modelPassageA.length}, ModelPassageB length: ${row.modelPassageB.length}`);
                
                const passageAWordCount = row.passageA.split(/\s+/).filter(Boolean).length;
                const passageBWordCount = row.passageB.split(/\s+/).filter(Boolean).length;
                console.log(`Word counts - PassageA: ${passageAWordCount}, PassageB: ${passageBWordCount}`);

                // Check if a row exists for this student_id
                console.log(`Checking if student_id ${row.student_id} exists in expertreviewlog`);
                const [existingRows] = await connection.execute(
                    'SELECT id FROM expertreviewlog WHERE student_id = ?',
                    [row.student_id]
                );
                console.log(`Found ${existingRows.length} existing records for student_id ${row.student_id}`);

                if (existingRows.length > 0) {
                    // Update existing row
                    console.log(`Updating existing record for student_id ${row.student_id}`);
                    await connection.execute(`
                        UPDATE expertreviewlog 
                        SET passageA = ?, passageB = ?, passageA_word_count = ?, passageB_word_count = ?, 
                            ansPassageA = ?, ansPassageB = ?, subjectId = ?, qset = ?
                        WHERE student_id = ?
                    `, [
                        row.passageA,
                        row.passageB,
                        passageAWordCount,
                        passageBWordCount,
                        row.modelPassageA,
                        row.modelPassageB,
                        row.subjectsId,
                        row.qset,
                        row.student_id
                    ]);
                    console.log(`Successfully updated record for student_id ${row.student_id}`);
                    updated++;
                } else {
                    // Insert new row
                    console.log(`Inserting new record for student_id ${row.student_id}`);
                    await connection.execute(`
                        INSERT INTO expertreviewlog 
                        (student_id, passageA, passageB, passageA_word_count, passageB_word_count, 
                        ansPassageA, ansPassageB, subjectId, qset)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        row.student_id,
                        row.passageA,
                        row.passageB,
                        passageAWordCount,
                        passageBWordCount,
                        row.modelPassageA,
                        row.modelPassageB,
                        row.subjectsId,
                        row.qset
                    ]);
                    console.log(`Successfully inserted record for student_id ${row.student_id}`);
                    inserted++;
                }
            } catch (rowError) {
                errors++;
                console.error(`Error processing student_id ${row.student_id}:`, rowError);
                console.error(`Row data causing error:`, JSON.stringify(row, null, 2));
            }
        }

        console.log(`Operation complete: Inserted ${inserted} rows, updated ${updated} rows, encountered ${errors} errors`);
        res.status(200).json({
            message: `Successfully inserted ${inserted} rows and updated ${updated} rows in expertreviewlog.`,
            errors: errors > 0 ? `Encountered ${errors} errors during processing.` : null
        });

    } catch (error) {
        console.error('Error in populateExpertReviewLog:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        
        // Additional debugging for SQL errors
        if (error.sqlMessage) {
            console.error('SQL error message:', error.sqlMessage);
            console.error('SQL error code:', error.code);
            console.error('SQL error state:', error.sqlState);
        }
        
        res.status(500).json({ "message": "Internal Server error" });
    }
};

// Helper function to check how many NULL values exist in a specific join
async function checkNullCount(tableName, idColumn, departmentId) {
    try {
        const [result] = await connection.query(
            `SELECT COUNT(*) as count FROM students s LEFT JOIN ${tableName} t ON s.student_id = t.${idColumn} 
             WHERE s.departmentId = ? AND t.${idColumn} IS NULL`,
            [departmentId]
        );
        return result[0].count;
    } catch (error) {
        console.error(`Error checking NULL values for ${tableName}:`, error);
        return 0;
    }
}