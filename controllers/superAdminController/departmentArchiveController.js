
const connection = require('../../config/db1');

exports.downloadDepartmentArchive = async (req, res) => {
    const { departmentId } = req.params;

    if (!departmentId) {
        return res.status(400).json({ message: "Department ID is required" });
    }

    try {
        const archiveData = {
            metadata: {
                departmentId,
                archivedAt: new Date(),
                version: '1.0'
            },
            department: null,
            batches: [],
            examPassControlers: [],
            audioData: [],
            attendanceReports: [],
            students: [],
            studentRelatedData: {
                studentLogs: [],
                loginLogs: [],
                textLogs: [],
                audioLogs: [],
                expertReviewLogs: [],
                modReviewLogs: [],
                answerSheets: [],
                typingPassageLogs: [],
                feedbacks: []
            }
        };

        const [dept] = await connection.query('SELECT * FROM departmentdb WHERE departmentId = ?', [departmentId]);
        if (dept.length === 0) {
            return res.status(404).json({ message: "Department not found with that ID." });
        }
        archiveData.department = dept[0];

        // 2. Fetch Direct Department Children (Batches, Controllers, Audio, Reports)
        const [batches] = await connection.query('SELECT * FROM batchdb WHERE departmentId = ?', [departmentId]);
        archiveData.batches = batches || [];

        const [controllers] = await connection.query('SELECT * FROM controllerdb WHERE departmentId = ?', [departmentId]);
        archiveData.examPassControlers = controllers || [];

        const [audios] = await connection.query('SELECT * FROM audiodb WHERE departmentId = ?', [departmentId]);
        archiveData.audioData = audios || [];

        const [reports] = await connection.query('SELECT * FROM attendance_reports WHERE departmentId = ?', [departmentId]);
        archiveData.attendanceReports = reports || [];

        // 3. Fetch Students and their IDs
        const [students] = await connection.query('SELECT * FROM students WHERE departmentId = ?', [departmentId]);
        archiveData.students = students || [];

        const studentIds = (students || []).map(s => s.student_id);

        // 4. Fetch Student Dependent Data (Logs, Reviews, etc.)
        if (studentIds.length > 0) {
            const fetchByStudentId = async (table) => {
                try {
                    const [rows] = await connection.query(`SELECT * FROM ${table} WHERE student_id IN (?)`, [studentIds]);
                    return rows;
                } catch (error) {
                    if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146 || error.sqlState === '42S02') {
                        console.warn(`Warning: Table '${table}' does not exist. Skipping archive for this table.`);
                        return []; // Return empty array so Promise.all succeeds
                    }
                    throw error; // Re-throw real database errors
                }
            };

            // Using Promise.all for parallel fetching
            const [
                sLogs, lLogs, tLogs, aLogs, eLogs, mLogs, ansSheets, tpLogs, fbacks, examStages
            ] = await Promise.all([
                fetchByStudentId('studentlogs'),
                fetchByStudentId('loginlogs'),
                fetchByStudentId('textlogs'),
                fetchByStudentId('audiologs'),
                fetchByStudentId('expertreviewlog'),
                fetchByStudentId('modreviewlog'),
                fetchByStudentId('answersheet'),
                fetchByStudentId('typingpassagelogs'),
                fetchByStudentId('feedbackdb'),
                // New table identified from FK error
                (async () => {
                    try {
                        const [rows] = await connection.query('SELECT * FROM exam_stages WHERE StudentId IN (?)', [studentIds]);
                        return rows;
                    } catch (e) { return []; }
                })()
            ]);

            archiveData.studentRelatedData.studentLogs = sLogs;
            archiveData.studentRelatedData.loginLogs = lLogs;
            archiveData.studentRelatedData.textLogs = tLogs;
            archiveData.studentRelatedData.audioLogs = aLogs;
            archiveData.studentRelatedData.expertReviewLogs = eLogs;
            archiveData.studentRelatedData.modReviewLogs = mLogs;
            archiveData.studentRelatedData.answerSheets = ansSheets;
            archiveData.studentRelatedData.typingPassageLogs = tpLogs;
            archiveData.studentRelatedData.feedbacks = fbacks;
            archiveData.studentRelatedData.examStages = examStages;
        }

        // 5. Send as Downloadable JSON with UTF-8
        const fileName = `department_${departmentId}_archive_${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Ensure data is stringified with formatting and supports UTF-8 characters
        res.send(JSON.stringify(archiveData, null, 2));

    } catch (error) {
        console.error('Error generating department archive:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Error generating archive", error: error.message });
        }
    }
};

exports.restoreDepartmentArchive = async (req, res) => {
    // Expecting JSON body directly if size is within limit, or file upload handling if needed.
    // Given the previous setup, bodyParser limit was increased to 50mb, so we can send JSON body.

    // We expect the whole JSON object in req.body
    const archiveData = req.body;

    if (!archiveData || !archiveData.metadata || !archiveData.department) {
        return res.status(400).json({
            success: false,
            message: "Invalid archive format. Missing metadata or department info."
        });
    }

    const { departmentId } = archiveData.metadata;
    const connectionState = await connection.getConnection();

    try {
        await connectionState.beginTransaction();

        // Helper to insert data into a table
        const insertData = async (table, rows) => {
            if (!rows || rows.length === 0) return;

            // Get columns from the first row
            const columns = Object.keys(rows[0]);

            // Prepare values
            const values = rows.map(row => columns.map(col => {
                // Handle different data types or nulls if necessary
                let val = row[col];
                // Convert date strings back to MySQL format if needed, 
                // but usually the driver handles ISO strings well enough or we might need simple formatting.
                if (val && typeof val === 'string' && val.includes('T') && val.endsWith('Z')) {
                    // rudimentary ISO check, mysql2 driver often handles this.
                    // Let's leave it to the driver first.
                }
                return val;
            }));

            const placeholders = values.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
            const sql = `INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;

            // Flatten values for the query
            const flatValues = values.flat();

            try {
                await connectionState.query(sql, flatValues);
            } catch (error) {
                // Ignore missing table errors
                if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146 || error.sqlState === '42S02') {
                    console.warn(`Warning: Table '${table}' does not exist. Skipping restore for this table.`);
                } else {
                    throw error;
                }
            }
        };

        console.log(`Restoring Department ${departmentId}...`);

        // 1. Restore Department
        // We actully want to ensure the department exists. 
        // If it was deleted, we re-insert it. If it exists, we skip (IGNORE).
        await insertData('departmentdb', [archiveData.department]);

        // 2. Restore Batches
        if (archiveData.batches.length > 0) await insertData('batchdb', archiveData.batches);

        // 3. Restore Controllers
        if (archiveData.examPassControlers.length > 0) await insertData('controllerdb', archiveData.examPassControlers);

        // 4. Restore Audio & Reports
        if (archiveData.audioData.length > 0) await insertData('audiodb', archiveData.audioData);
        if (archiveData.attendanceReports.length > 0) await insertData('attendance_reports', archiveData.attendanceReports);

        // 5. Restore Students
        // We usually process students in chunks to avoid massive query packets, but with 50mb limit and INSERT IGNORE,
        // we might be okay. Let's do it in one go for now, optimize if needed.
        if (archiveData.students.length > 0) {
            await insertData('students', archiveData.students);
        }

        // 6. Restore Student Logs & Dependent Data
        const sd = archiveData.studentRelatedData;
        if (sd) {
            if (sd.studentLogs && sd.studentLogs.length > 0) await insertData('studentlogs', sd.studentLogs);

            // LoginLogs depends on StudentLogs (sometimes) or just StudentID. 
            // Order matters if there are foreign keys between log tables (rare but possible).
            if (sd.loginLogs && sd.loginLogs.length > 0) await insertData('loginlogs', sd.loginLogs);
            if (sd.textLogs && sd.textLogs.length > 0) await insertData('textlogs', sd.textLogs);
            if (sd.audioLogs && sd.audioLogs.length > 0) await insertData('audiologs', sd.audioLogs);
            if (sd.expertReviewLogs && sd.expertReviewLogs.length > 0) await insertData('expertreviewlog', sd.expertReviewLogs);
            if (sd.modReviewLogs && sd.modReviewLogs.length > 0) await insertData('modreviewlog', sd.modReviewLogs);
            if (sd.answerSheets && sd.answerSheets.length > 0) await insertData('answersheet', sd.answerSheets);
            if (sd.typingPassageLogs && sd.typingPassageLogs.length > 0) await insertData('typingpassagelogs', sd.typingPassageLogs);
            if (sd.feedbacks && sd.feedbacks.length > 0) await insertData('feedbackdb', sd.feedbacks);
            if (sd.examStages && sd.examStages.length > 0) await insertData('exam_stages', sd.examStages);
        }

        await connectionState.commit();
        res.json({ success: true, message: `Department ${departmentId} restored successfully.` });

    } catch (error) {
        await connectionState.rollback();
        console.error('Error restoring department data:', error);
        res.status(500).json({
            success: false,
            message: "Error restoring department data: " + error.message,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connectionState.release();
    }
};

exports.deleteDepartmentData = async (req, res) => {
    const { departmentId } = req.body; // Safer to pass in body for destructive actions

    if (!departmentId) {
        return res.status(400).json({ message: "Department ID is required" });
    }

    const connectionState = await connection.getConnection();

    try {
        await connectionState.beginTransaction();

        // 1. Get Students to identify dependent rows
        const [students] = await connectionState.query('SELECT student_id FROM students WHERE departmentId = ?', [departmentId]);
        const studentIds = students.map(s => s.student_id);

        if (studentIds.length > 0) {
            // Delete Student Children
            const tablesWithStudentId = [
                'studentlogs', 'loginlogs', 'textlogs', 'audiologs',
                'expertreviewlog', 'modreviewlog', 'answersheet',
                'typingpassagelogs', 'feedbackdb', 'finalPassageSubmit',
                'resetrequests'
            ];

            // Handle exam_stages separately due to different column name (StudentId instead of student_id)
            try {
                // Delete from exam_stages first
                await connectionState.query('DELETE FROM exam_stages WHERE StudentId IN (?)', [studentIds]);
            } catch (error) {
                if (error.code !== 'ER_NO_SUCH_TABLE' && error.errno !== 1146 && error.sqlState !== '42S02') {
                    throw error;
                }
            }

            for (const table of tablesWithStudentId) {
                try {
                    await connectionState.query(`DELETE FROM ${table} WHERE student_id IN (?)`, [studentIds]);
                } catch (error) {
                    if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146 || error.sqlState === '42S02') {
                        console.warn(`Warning: Table '${table}' does not exist. Skipping delete for this table.`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        // 2. Delete Department Children
        await connectionState.query('DELETE FROM batchdb WHERE departmentId = ?', [departmentId]);
        await connectionState.query('DELETE FROM controllerdb WHERE departmentId = ?', [departmentId]);
        await connectionState.query('DELETE FROM audiodb WHERE departmentId = ?', [departmentId]);
        await connectionState.query('DELETE FROM attendance_reports WHERE departmentId = ?', [departmentId]);

        // 3. Delete Students associated with Department
        await connectionState.query('DELETE FROM students WHERE departmentId = ?', [departmentId]);

        // 4. Delete the Department itself (Optional: User might want to keep the empty department shell)
        // await connectionState.query('DELETE FROM departmentdb WHERE departmentId = ?', [departmentId]);

        await connectionState.commit();

        res.json({
            success: true,
            message: `Successfully archived (deleted) data for Department ${departmentId}`,
            stats: {
                studentsRemoved: studentIds.length
            }
        });

    } catch (error) {
        await connectionState.rollback();
        console.error('Error deleting department data:', error);
        res.status(500).json({ message: "Error deleting department data", error: error.message });
    } finally {
        connectionState.release();
    }
};
