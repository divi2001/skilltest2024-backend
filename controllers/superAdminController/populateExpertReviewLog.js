// src/controllers/superAdminController/populateExpertReviewLog.js
const connection = require("../../config/db1");
const createTableIfNotExists = require("../../utils/createTableIfNotExists");

exports.populateExpertReviewLog = async (req, res) => {
    const { department } = req.body;
    const startTime = Date.now();

    console.log(`\n========== POPULATE EXPERT REVIEW LOG ==========`);
    console.log(`[${new Date().toISOString()}] Starting population for department: ${department}`);

    if (!department) {
        console.log(`❌ [ERROR] Department parameter is missing`);
        return res.status(400).json({ message: "department is required" });
    }

    try {
        // ✅ Ensure expertreviewlog table exists
        console.log(`[INFO] Checking if expertreviewlog table exists...`);
        try {
            await createTableIfNotExists(connection, "expertreviewlog");
            console.log(`✅ [SUCCESS] expertreviewlog table is ready`);
        } catch (tableError) {
            console.error(`❌ [ERROR] Failed to create/verify table:`, tableError.message);
            throw tableError;
        }

        const query = `
            SELECT 
                s.student_id,
                s.subjectsId,
                d.examType,
                s.qset,
                s.departmentId
            FROM students s
            LEFT JOIN departmentdb d 
                ON s.departmentId = d.departmentId
            LEFT JOIN finalPassageSubmit fps 
                ON s.student_id = fps.student_id
            LEFT JOIN textlogs tl 
                ON s.student_id = tl.student_id
            WHERE 
                s.departmentId = ?
                AND s.batchNo != 100
                AND (
                    fps.passageA IS NOT NULL OR 
                    fps.passageB IS NOT NULL OR 
                    tl.texta IS NOT NULL OR 
                    tl.textb IS NOT NULL
                )
            ORDER BY s.student_id
        `;

        console.log(`[INFO] Fetching students from department ${department}...`);
        const [results] = await connection.query(query, [department]);
        console.log(`✅ [SUCCESS] Found ${results.length} students with submissions`);

        if (results.length === 0) {
            console.log(`⚠️ [WARNING] No students available for department ${department}`);
            return res.status(201).json({ message: "No students available" });
        }

        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;
        const errorDetails = [];

        console.log(`\n[INFO] Processing ${results.length} students...`);
        console.log(`================================================`);

        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const studentId = row.student_id;
            
            try {
                // Validate student_id length
                if (String(studentId).length < 10) {
                    console.log(`⏭️  [${i + 1}/${results.length}] SKIPPED - Student ${studentId}: Invalid ID length (< 10 digits)`);
                    skipped++;
                    continue;
                }

                // Check if student exists in expertreviewlog
                const [existingRows] = await connection.execute(
                    `SELECT id FROM expertreviewlog WHERE student_id = ?`,
                    [studentId]
                );

                if (existingRows.length > 0) {
                    // UPDATE existing record
                    try {
                        await connection.execute(
                            `
                            UPDATE expertreviewlog
                            SET subjectId = ?, examType = ?, qset = ?, departmentId = ?
                            WHERE student_id = ?
                            `,
                            [
                                row.subjectsId,
                                row.examType,
                                row.qset,
                                row.departmentId,
                                studentId
                            ]
                        );
                        updated++;
                        console.log(`🔄 [${i + 1}/${results.length}] UPDATED - Student ${studentId} | Subject: ${row.subjectsId} | ExamType: ${row.examType} | QSet: ${row.qset}`);
                    } catch (updateError) {
                        errors++;
                        const errMsg = `Failed to update student ${studentId}: ${updateError.message}`;
                        console.error(`❌ [${i + 1}/${results.length}] ERROR - ${errMsg}`);
                        errorDetails.push({ student_id: studentId, operation: 'UPDATE', error: updateError.message });
                    }
                } else {
                    // INSERT new record
                    try {
                        await connection.execute(
                            `
                            INSERT INTO expertreviewlog
                            (student_id, subjectId, examType, qset, departmentId)
                            VALUES (?, ?, ?, ?, ?)
                            `,
                            [
                                studentId,
                                row.subjectsId,
                                row.examType,
                                row.qset,
                                row.departmentId
                            ]
                        );
                        inserted++;
                        console.log(`➕ [${i + 1}/${results.length}] INSERTED - Student ${studentId} | Subject: ${row.subjectsId} | ExamType: ${row.examType} | QSet: ${row.qset}`);
                    } catch (insertError) {
                        errors++;
                        const errMsg = `Failed to insert student ${studentId}: ${insertError.message}`;
                        console.error(`❌ [${i + 1}/${results.length}] ERROR - ${errMsg}`);
                        errorDetails.push({ student_id: studentId, operation: 'INSERT', error: insertError.message });
                    }
                }

                // Log progress every 100 students
                if ((i + 1) % 100 === 0) {
                    console.log(`\n📊 [PROGRESS] Processed ${i + 1}/${results.length} students | Inserted: ${inserted} | Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}\n`);
                }

            } catch (rowError) {
                errors++;
                const errMsg = `Unexpected error processing student ${studentId}: ${rowError.message}`;
                console.error(`❌ [${i + 1}/${results.length}] ERROR - ${errMsg}`);
                errorDetails.push({ student_id: studentId, operation: 'PROCESS', error: rowError.message });
            }
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`\n================================================`);
        console.log(`✅ [COMPLETED] Population process finished`);
        console.log(`📊 SUMMARY:`);
        console.log(`   - Total Students: ${results.length}`);
        console.log(`   - Inserted: ${inserted}`);
        console.log(`   - Updated: ${updated}`);
        console.log(`   - Skipped: ${skipped}`);
        console.log(`   - Errors: ${errors}`);
        console.log(`   - Duration: ${duration}s`);
        console.log(`================================================\n`);

        const response = {
            message: `Inserted ${inserted}, Updated ${updated} rows in expertreviewlog`,
            summary: {
                total: results.length,
                inserted,
                updated,
                skipped,
                errors,
                duration: `${duration}s`
            }
        };

        if (errorDetails.length > 0) {
            console.log(`⚠️ [WARNING] ${errorDetails.length} errors occurred during processing`);
            response.errors = errorDetails;
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error(`\n❌ [FATAL ERROR] populateExpertReviewLog failed:`, error);
        console.error(`Error details:`, {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sql: error.sql,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        console.log(`================================================\n`);
        
        return res.status(500).json({ 
            message: "Internal Server Error",
            error: error.message,
            code: error.code
        });
    }
};


