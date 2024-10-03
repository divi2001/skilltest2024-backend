const connection = require("../../config/db1");

exports.populateExpertReviewLog = async (req, res) => {
    const { department } = req.body;
    try {
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
        WHERE s.departmentId = ?`;

        const [results] = await connection.query(query, [department]);
        if(results.length === 0) return res.status(201).json({"message":"No students Available "})

        let inserted = 0;
        let updated = 0;

        for (const row of results) {
            const passageAWordCount = row.passageA.split(/\s+/).filter(Boolean).length;
            const passageBWordCount = row.passageB.split(/\s+/).filter(Boolean).length;

            // Check if a row exists for this student_id
            const [existingRows] = await connection.execute(
                'SELECT id FROM expertreviewlog WHERE student_id = ?',
                [row.student_id]
            );

            if (existingRows.length > 0) {
                // Update existing row
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
                updated++;
            } else {
                // Insert new row
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
                inserted++;
            }
        }
        
        console.log(`Inserted ${inserted} rows and updated ${updated} rows in expertreviewlog`);
        res.status(200).json({ 
            message: `Successfully inserted ${inserted} rows and updated ${updated} rows in expertreviewlog.` 
        });

    } catch (error) {
        console.error('Error populating expertreviewlog:', error);
        res.status(500).json({ "message": "Internal Server error" });
    }
}