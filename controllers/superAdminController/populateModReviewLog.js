const connection = require("../../config/db1");

exports.populateModReviewLog = async (req, res) => {
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
            COALESCE(ad.textPassageB, 'empty') AS modelPassageB,
            mq.Q1PA,
            mq.Q1PB,
            mq.Q2PA,
            mq.Q2PB,
            mq.Q3PA,
            mq.Q3PB,
            mq.Q4PA,
            mq.Q4PB
        FROM 
            students s
        LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
        LEFT JOIN textlogs tl ON s.student_id = tl.student_id
        LEFT JOIN audiodb ad ON s.subjectsId = ad.subjectId AND s.qset = ad.qset
        LEFT JOIN modqsetdb mq ON s.subjectsId = mq.subjectId
        WHERE s.departmentId = ?
        ORDER BY s.student_id`;

        const [results] = await connection.query(query, [department]);
        if(results.length === 0) return res.status(201).json({"message":"No students Available "})
        // const [results] = await connection.query("select * from modreviewlog");
        // return res.status(201).json(results);

        let inserted = 0;
        let updated = 0;

        for (const row of results) {
            const passageAWordCount = row.passageA.split(/\s+/).filter(Boolean).length;
            const passageBWordCount = row.passageB.split(/\s+/).filter(Boolean).length;

            // Determine QPA and QPB based on qset
            let QPA, QPB;
            switch(row.qset) {
                case 1:
                    QPA = row.Q1PA;
                    QPB = row.Q1PB;
                    break;
                case 2:
                    QPA = row.Q2PA;
                    QPB = row.Q2PB;
                    break;
                case 3:
                    QPA = row.Q3PA;
                    QPB = row.Q3PB;
                    break;
                case 4:
                    QPA = row.Q4PA;
                    QPB = row.Q4PB;
                    break;
                default:
                    QPA = null;
                    QPB = null;
            }

            // Check if a row exists for this student_id
            const [existingRows] = await connection.execute(
                'SELECT id FROM modreviewlog WHERE student_id = ?',
                [row.student_id]
            );

            if (existingRows.length > 0) {
                // Update existing row
                await connection.execute(`
                    UPDATE modreviewlog 
                    SET passageA = ?, passageB = ?, passageA_word_count = ?, passageB_word_count = ?, 
                        ansPassageA = ?, ansPassageB = ?, subjectId = ?, qset = ?, QPA = ?, QPB = ?
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
                    QPA,
                    QPB,
                    row.student_id
                ]);
                updated++;
            } else {
                // Insert new row
                await connection.execute(`
                    INSERT INTO modreviewlog 
                    (student_id, passageA, passageB, passageA_word_count, passageB_word_count, 
                    ansPassageA, ansPassageB, subjectId, qset, QPA, QPB)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    row.student_id,
                    row.passageA,
                    row.passageB,
                    passageAWordCount,
                    passageBWordCount,
                    row.modelPassageA,
                    row.modelPassageB,
                    row.subjectsId,
                    row.qset,
                    QPA,
                    QPB
                ]);
                inserted++;
            }
        }
        
        console.log(`Inserted ${inserted} rows and updated ${updated} rows in modreviewlog`);
        res.status(200).json({ 
            message: `Successfully inserted ${inserted} rows and updated ${updated} rows in modreviewlog.` 
        });

    } catch (error) {
        console.error('Error populating expertreviewlog:', error);
        res.status(500).json({ "message": "Internal Server error" });
    }
}