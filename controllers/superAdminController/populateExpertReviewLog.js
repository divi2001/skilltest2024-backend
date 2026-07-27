const pool = require("../../config/db1");
const createTableIfNotExists = require("../../utils/createTableIfNotExists");
const { withDbConnectionRetry } = require("../../utils/withDbConnectionRetry");

const INSERT_CHUNK_SIZE = 1000;

exports.populateExpertReviewLog = async (req, res) => {
    const { department } = req.body;
    const startTime = Date.now();

    console.log(`\n========== POPULATE EXPERT REVIEW LOG ==========`);
    console.log(`[${new Date().toISOString()}] Starting population for department: ${department}`);

    if (!department) {
        console.log(`[ERROR] Department parameter is missing`);
        return res.status(400).json({ message: "department is required" });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let total = 0;

    try {
        const result = await withDbConnectionRetry(pool, async (db) => {
            console.log(`[INFO] Checking if expertreviewlog table exists...`);
            await createTableIfNotExists(db, "expertreviewlog");
            console.log(`[SUCCESS] expertreviewlog table is ready`);

            // EXISTS instead of LEFT JOIN: these tables hold multiple rows per
            // student, so joining them fans one student out into several rows.
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
                WHERE
                    s.departmentId = ?
                    AND s.batchNo != 100
                    AND (
                        EXISTS (
                            SELECT 1 FROM finalPassageSubmit fps
                            WHERE fps.student_id = s.student_id
                                AND (fps.passageA IS NOT NULL OR fps.passageB IS NOT NULL)
                        )
                        OR EXISTS (
                            SELECT 1 FROM textlogs tl
                            WHERE tl.student_id = s.student_id
                                AND (tl.texta IS NOT NULL OR tl.textb IS NOT NULL)
                        )
                        OR (
                            s.loggedin = 1
                            AND EXISTS (
                                SELECT 1 FROM studentlogs sl
                                WHERE sl.student_id = s.student_id
                            )
                        )
                    )
                ORDER BY s.student_id
            `;

            console.log(`[INFO] Fetching students from department ${department}...`);
            const [results] = await db.query(query, [department]);
            total = results.length;
            console.log(`[SUCCESS] Found ${results.length} students with submissions`);

            if (results.length === 0) {
                console.log(`[WARNING] No students available for department ${department}`);
                return {
                    status: 201,
                    body: { message: "No students available" }
                };
            }

            // Keyed by student_id so a duplicate can never reach the temporary
            // table's primary key, whatever the query returns.
            const rowsByStudentId = new Map();
            let duplicates = 0;

            for (const row of results) {
                if (String(row.student_id).length < 10) {
                    skipped += 1;
                    continue;
                }

                if (rowsByStudentId.has(row.student_id)) {
                    duplicates += 1;
                    continue;
                }

                rowsByStudentId.set(row.student_id, [
                    row.student_id,
                    row.subjectsId,
                    row.examType,
                    row.qset,
                    row.departmentId
                ]);
            }

            const validRows = Array.from(rowsByStudentId.values());

            if (duplicates > 0) {
                console.log(`[INFO] Collapsed ${duplicates} duplicate student rows`);
            }

            if (validRows.length === 0) {
                console.log(`[WARNING] All students were skipped due to invalid student IDs`);
                return {
                    status: 200,
                    body: {
                        message: "No valid students available",
                        summary: {
                            total: results.length,
                            inserted: 0,
                            updated: 0,
                            skipped,
                            errors: 0
                        }
                    }
                };
            }

            console.log(`\n[INFO] Syncing ${validRows.length} valid students using a temporary table...`);
            console.log(`================================================`);

            try {
                await db.beginTransaction();

                await db.query(`DROP TEMPORARY TABLE IF EXISTS tmp_expertreviewlog_population`);
                await db.query(`
                    CREATE TEMPORARY TABLE tmp_expertreviewlog_population (
                        student_id BIGINT PRIMARY KEY,
                        subjectId INT,
                        examType VARCHAR(20),
                        qset INT,
                        departmentId INT
                    )
                `);

                // Chunked so a large department cannot blow past max_allowed_packet.
                for (let i = 0; i < validRows.length; i += INSERT_CHUNK_SIZE) {
                    await db.query(
                        `
                        INSERT INTO tmp_expertreviewlog_population
                        (student_id, subjectId, examType, qset, departmentId)
                        VALUES ?
                        `,
                        [validRows.slice(i, i + INSERT_CHUNK_SIZE)]
                    );
                }

                const [[updateStats]] = await db.query(`
                    SELECT COUNT(*) AS count
                    FROM expertreviewlog erl
                    INNER JOIN tmp_expertreviewlog_population tmp
                        ON erl.student_id = tmp.student_id
                `);
                updated = updateStats.count;

                const [[insertStats]] = await db.query(`
                    SELECT COUNT(*) AS count
                    FROM tmp_expertreviewlog_population tmp
                    LEFT JOIN expertreviewlog erl
                        ON erl.student_id = tmp.student_id
                    WHERE erl.student_id IS NULL
                `);
                inserted = insertStats.count;

                await db.query(`
                    UPDATE expertreviewlog erl
                    INNER JOIN tmp_expertreviewlog_population tmp
                        ON erl.student_id = tmp.student_id
                    SET
                        erl.subjectId = tmp.subjectId,
                        erl.examType = tmp.examType,
                        erl.qset = tmp.qset,
                        erl.departmentId = tmp.departmentId
                `);

                await db.query(`
                    INSERT INTO expertreviewlog
                    (student_id, subjectId, examType, qset, departmentId)
                    SELECT
                        tmp.student_id,
                        tmp.subjectId,
                        tmp.examType,
                        tmp.qset,
                        tmp.departmentId
                    FROM tmp_expertreviewlog_population tmp
                    LEFT JOIN expertreviewlog erl
                        ON erl.student_id = tmp.student_id
                    WHERE erl.student_id IS NULL
                `);

                await db.commit();
            } catch (syncError) {
                await db.rollback();
                throw syncError;
            }

            return {
                status: 200,
                body: null
            };
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (result.body) {
            if (result.body.summary) {
                result.body.summary.duration = `${duration}s`;
            }
            return res.status(result.status).json(result.body);
        }

        console.log(`\n================================================`);
        console.log(`[COMPLETED] Population process finished`);
        console.log(`[SUMMARY]`);
        console.log(`   - Total Students: ${total}`);
        console.log(`   - Inserted: ${inserted}`);
        console.log(`   - Updated: ${updated}`);
        console.log(`   - Skipped: ${skipped}`);
        console.log(`   - Errors: 0`);
        console.log(`   - Duration: ${duration}s`);
        console.log(`================================================\n`);

        return res.status(200).json({
            message: `Inserted ${inserted}, Updated ${updated} rows in expertreviewlog`,
            summary: {
                total,
                inserted,
                updated,
                skipped,
                errors: 0,
                duration: `${duration}s`
            }
        });
    } catch (error) {
        console.error(`\n[FATAL ERROR] populateExpertReviewLog failed:`, error);
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
