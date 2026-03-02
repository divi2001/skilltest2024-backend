// controllers\centerAdminMonitoring\trackStudentsProgress.js
const connection = require('../../config/db1');
const StudentTrackDTO = require('../../dto/studentProgress');
const encryptionInterface = require('../../config/encrypt');
const moment = require('moment-timezone');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper function to format date to YYYY-MM-DD with proper validation and logging
function formatDate(dateString) {
    console.log('formatDate input:', dateString, 'type:', typeof dateString);

    if (!dateString || dateString === 'Invalid date' || dateString === null || dateString === undefined) {
        console.log('formatDate: Invalid or null input, returning null');
        return null;
    }

    // Handle different input types
    let momentDate;

    if (dateString instanceof Date) {
        console.log('formatDate: Input is Date object');
        momentDate = moment(dateString);
    } else if (typeof dateString === 'string') {
        console.log('formatDate: Input is string, attempting to parse');
        // Try parsing with specific formats first
        const formats = ['YYYY-MM-DD', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss'];
        momentDate = moment(dateString, formats, true);

        // If strict parsing fails, try lenient parsing
        if (!momentDate.isValid()) {
            console.log('formatDate: Strict parsing failed, trying lenient parsing');
            momentDate = moment(dateString);
        }
    } else {
        console.log('formatDate: Unknown input type, attempting direct moment parsing');
        momentDate = moment(dateString);
    }

    if (!momentDate.isValid()) {
        console.warn('formatDate: Invalid date after parsing:', dateString);
        return null;
    }

    const formattedDate = momentDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log('formatDate output:', formattedDate);
    return formattedDate;
}

function formatDateTimeIST(dateString) {
    if (!dateString) return null;
    const date = moment(dateString);
    if (!date.isValid()) return null;
    return date.tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
}

// Helper function to convert DD/MM/YYYY to MySQL DATE format string (YYYY-MM-DD)
function convertDateFormat(dateString) {
    console.log('convertDateFormat input:', dateString);

    if (!dateString) {
        console.log('convertDateFormat: No input provided, returning null');
        return null;
    }

    // Handle DD/MM/YYYY format
    const momentDate = moment(dateString, 'DD/MM/YYYY', true);

    if (!momentDate.isValid()) {
        console.warn('convertDateFormat: Invalid date format:', dateString);
        console.log('convertDateFormat: Expected format is DD/MM/YYYY (e.g., 09/07/2025)');
        return null;
    }

    const convertedDate = momentDate.format('YYYY-MM-DD');
    console.log('convertDateFormat output:', convertedDate);
    return convertedDate;
}

// Helper function to get active department IDs
async function getActiveDepartmentIds() {
    const query = `SELECT departmentId FROM departmentdb WHERE departmentStatus = 1`;
    const [results] = await connection.query(query);
    return results.map(row => row.departmentId);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/attendance/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 // 1MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Create attendance_reports table if it doesn't exist
async function createAttendanceTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS attendance_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batchNo VARCHAR(255) NOT NULL,
            departmentId INT NOT NULL,
            center VARCHAR(255) NOT NULL,
            present_count INT NOT NULL,
            absent_count INT NOT NULL,
            attendance_pdf VARCHAR(500),
            report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (departmentId) REFERENCES departmentdb(departmentId),
            UNIQUE KEY unique_batch_dept_center (batchNo, departmentId, center)
        )
    `;

    try {
        await connection.query(createTableQuery);
        // console.log('Attendance reports table created or already exists');
    } catch (error) {
        console.error('Error creating attendance reports table:', error);
    }
}

// Initialize table on module load
createAttendanceTable();

exports.getStudentsTrack = async (req, res) => {
    console.log('Starting getStudentsTrack function');
    const { batchNo } = req.params;
    const examCenterCode = req.session.centerId;
    let { subject_name, loginStatus, batchDate, exam_type, departmentId } = req.query;

    console.log("Exam center code:", examCenterCode);
    console.log("Batch no:", batchNo);
    console.log("Department ID:", departmentId);
    console.log("Subject:", subject_name);
    console.log("Login status:", loginStatus);
    console.log("Exam type:", exam_type);
    console.log("Original Batch date:", batchDate);

    if (!examCenterCode) {
        console.log('Center admin is not logged in');
        return res.status(404).json({ "message": "Center admin is not logged in" });
    }

    try {
        // Determine which department IDs to use
        let targetDepartmentIds = [];

        if (departmentId) {
            // If specific department is requested, check if it's active
            const deptQuery = 'SELECT departmentId FROM departmentdb WHERE departmentId = ? AND departmentStatus = 1';
            const [deptResult] = await connection.query(deptQuery, [departmentId]);

            if (deptResult.length === 0) {
                console.log(`Department ${departmentId} is not active or doesn't exist`);
                return res.status(404).json({ message: 'Selected department is not active' });
            }

            targetDepartmentIds = [departmentId];
        } else {
            // Get all active department IDs
            targetDepartmentIds = await getActiveDepartmentIds();
            console.log("Active department IDs:", targetDepartmentIds);

            if (targetDepartmentIds.length === 0) {
                console.log('No active departments found');
                return res.status(404).json({ message: 'No active departments found' });
            }
        }

        // Create placeholders for IN clause
        const departmentPlaceholders = targetDepartmentIds.map(() => '?').join(',');

        // Step 1: First check if there are any students for this center
        const studentsQuery = `SELECT COUNT(*) as count FROM students WHERE center = ?`;
        const [studentsResult] = await connection.query(studentsQuery, [examCenterCode]);
        console.log(`Students count for center ${examCenterCode}:`, studentsResult[0].count);

        if (studentsResult[0].count === 0) {
            console.log(`No students found for center: ${examCenterCode}`);
            return res.status(404).json({ message: 'No students found for this center' });
        }

        // Step 2: Check students with target department IDs
        const deptStudentsQuery = `SELECT COUNT(*) as count FROM students WHERE center = ? AND departmentId IN (${departmentPlaceholders})`;
        const [deptStudentsResult] = await connection.query(deptStudentsQuery, [examCenterCode, ...targetDepartmentIds]);
        console.log(`Students with target departments for center ${examCenterCode}:`, deptStudentsResult[0].count);

        if (deptStudentsResult[0].count === 0) {
            console.log(`No students with target departments found for center: ${examCenterCode}`);
            return res.status(404).json({ message: 'No students with selected department found for this center' });
        }

        // Step 3: Check if batch number exists (if provided)
        if (batchNo) {
            const batchQuery = `SELECT COUNT(*) as count FROM students WHERE center = ? AND batchNo = ? AND departmentId IN (${departmentPlaceholders})`;
            const [batchResult] = await connection.query(batchQuery, [examCenterCode, batchNo, ...targetDepartmentIds]);
            console.log(`Students with batch ${batchNo} for center ${examCenterCode}:`, batchResult[0].count);

            if (batchResult[0].count === 0) {
                console.log(`No students found for batch: ${batchNo} in center: ${examCenterCode}`);
                return res.status(404).json({ message: `No students found for batch: ${batchNo}` });
            }
        }

        // Step 4: Check if subject exists (if provided)
        if (subject_name) {
            const subjectQuery = `
                SELECT COUNT(*) as count 
                FROM students s
                JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
                WHERE s.center = ? AND sub.subject_name = ? AND s.departmentId IN (${departmentPlaceholders})`;
            const [subjectResult] = await connection.query(subjectQuery, [examCenterCode, subject_name, ...targetDepartmentIds]);
            console.log(`Students with subject ${subject_name} for center ${examCenterCode}:`, subjectResult[0].count);

            if (subjectResult[0].count === 0) {
                console.log(`No students found for subject: ${subject_name} in center: ${examCenterCode}`);
                return res.status(404).json({ message: `No students found for subject: ${subject_name}` });
            }
        }

        // Step 5: Check combined conditions for students table
        let studentsConditionQuery = `
            SELECT COUNT(*) as count 
            FROM students s
            LEFT JOIN departmentdb d ON s.departmentId = d.departmentId
            WHERE s.center = ? AND s.departmentId IN (${departmentPlaceholders})`;

        let queryParams = [examCenterCode, ...targetDepartmentIds];

        if (batchNo) {
            studentsConditionQuery += ` AND s.batchNo = ?`;
            queryParams.push(batchNo);
        }

        if (loginStatus) {
            if (loginStatus === 'loggedin') {
                studentsConditionQuery += ` AND s.loggedin = 1`;
            } else if (loginStatus === 'loggedout') {
                studentsConditionQuery += ` AND s.loggedin = 0`;
            }
        }

        // In the students condition query section
        if (exam_type) {
            if (exam_type === 'shorthand') {
                studentsConditionQuery += ` AND s.IsShorthand = 1 AND s.IsTypewriting = 0 AND d.examType = 'GCC'`;
            } else if (exam_type === 'typewriting') {
                // 'typewriting' in frontend means SKILL exam type
                studentsConditionQuery += ` AND d.examType = 'SKILL'`;
            } else if (exam_type === 'both') {
                studentsConditionQuery += ` AND s.IsShorthand = 1 AND s.IsTypewriting = 1`;
            }
        }

        if (batchDate) {
            console.log('Processing batchDate filter:', batchDate);
            console.log('Expected batchDate format: DD/MM/YYYY (e.g., 09/07/2025)');

            const formattedDate = convertDateFormat(batchDate);
            if (formattedDate) {
                studentsConditionQuery += ` AND DATE(s.batchdate) = ?`;
                queryParams.push(formattedDate);
                console.log("Using formatted batch date:", formattedDate);
            } else {
                console.log("Invalid batchDate format, skipping date filter");
                console.log("Please provide batchDate in DD/MM/YYYY format (e.g., 09/07/2025)");
            }
        }

        console.log("Students condition query:", studentsConditionQuery);
        console.log("Students condition params:", queryParams);

        const [studentsConditionResult] = await connection.query(studentsConditionQuery, queryParams);
        console.log("Students matching all conditions:", studentsConditionResult[0].count);

        if (studentsConditionResult[0].count === 0) {
            console.log("No students match all the specified conditions");
            return res.status(404).json({ message: 'No students match the specified criteria' });
        }

        // Step 6: Now fetch actual student data with join checks
        console.log("Checking each join separately...");

        // Check subjectsdb join
        const subjectsJoinQuery = `
            SELECT COUNT(*) as count 
            FROM students s
            LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
            WHERE s.center = ? AND s.departmentId IN (${departmentPlaceholders})`;
        const [subjectsJoinResult] = await connection.query(subjectsJoinQuery, [examCenterCode, ...targetDepartmentIds]);
        console.log("Results after subjectsdb join:", subjectsJoinResult[0].count);

        // Check audiologs join
        const audioJoinQuery = `
            SELECT COUNT(*) as count 
            FROM students s
            LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
            LEFT JOIN audiologs a ON s.student_id = a.student_id
            WHERE s.center = ? AND s.departmentId IN (${departmentPlaceholders})`;
        const [audioJoinResult] = await connection.query(audioJoinQuery, [examCenterCode, ...targetDepartmentIds]);
        console.log("Results after audiologs join:", audioJoinResult[0].count);

        // Check studentlogs join
        const logsJoinQuery = `
            SELECT COUNT(*) as count 
            FROM students s
            LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
            LEFT JOIN audiologs a ON s.student_id = a.student_id
            LEFT JOIN (
                SELECT
                    student_id,
                    MAX(loginTime) as loginTime
                FROM
                    studentlogs
                GROUP BY
                    student_id
            ) sl ON s.student_id = sl.student_id
            WHERE s.center = ? AND s.departmentId IN (${departmentPlaceholders})`;
        const [logsJoinResult] = await connection.query(logsJoinQuery, [examCenterCode, ...targetDepartmentIds]);
        console.log("Results after studentlogs join:", logsJoinResult[0].count);

        // Step 7: Final full query with all conditions
        const finalQuery = `SELECT 
            s.student_id,
            s.center,
            s.fullname, 
            s.subjectsId,
            sub.subject_name,
            sub.subject_name_short,
            s.courseId,
            s.loggedin,
            s.batchNo,
            s.batchdate,
            s.done,
            s.Reporting_Time,
            s.start_time,
            s.end_time,
            s.departmentId,
            a.trial,
            a.passageA,
            a.passageB,
            sl.loginTime,
            sl.login,
            sl.trial_time,
            sl.audio1_time,
            sl.passage1_time,
            sl.audio2_time,
            sl.passage2_time,
            sl.trial_passage_time,
            sl.typing_passage_time,
            sl.feedback_time
        FROM
            students s
        LEFT JOIN
            departmentdb d ON s.departmentId = d.departmentId
        LEFT JOIN
            subjectsdb sub ON s.subjectsId = sub.subjectId AND d.examType = sub.examType
        LEFT JOIN (
            SELECT student_id, MAX(trial) as trial, MAX(passageA) as passageA, MAX(passageB) as passageB
            FROM audiologs
            GROUP BY student_id
        ) a ON s.student_id = a.student_id
        LEFT JOIN (
            SELECT
                student_id,
                MAX(loginTime) as loginTime,
                MAX(login) as login,
                MAX(trial_time) as trial_time,
                MAX(audio1_time) as audio1_time,
                MAX(passage1_time) as passage1_time,
                MAX(audio2_time) as audio2_time,
                MAX(passage2_time) as passage2_time,
                MAX(trial_passage_time) as trial_passage_time,
                MAX(typing_passage_time) as typing_passage_time,
                MAX(feedback_time) as feedback_time
            FROM
                studentlogs
            GROUP BY
                student_id
        ) sl ON s.student_id = sl.student_id
        WHERE s.departmentId IN (${departmentPlaceholders}) AND s.center = ?` +
            (batchNo ? ' AND s.batchNo = ?' : '') +
            (subject_name ? ' AND sub.subject_name = ?' : '') +
            (loginStatus === 'loggedin' ? ' AND s.loggedin = 1' :
                loginStatus === 'loggedout' ? ' AND s.loggedin = 0' : '') +
            (exam_type === 'shorthand' ? " AND s.IsShorthand = 1 AND s.IsTypewriting = 0 AND d.examType = 'GCC'" :
                exam_type === 'typewriting' ? " AND d.examType = 'SKILL'" :
                    exam_type === 'both' ? ' AND s.IsShorthand = 1 AND s.IsTypewriting = 1' : '') +
            (batchDate && convertDateFormat(batchDate) ? ' AND DATE(s.batchdate) = ?' : '');

        // Prepare final query parameters
        let finalQueryParams = [...targetDepartmentIds, examCenterCode];

        if (batchNo) finalQueryParams.push(batchNo);
        if (subject_name) finalQueryParams.push(subject_name);
        if (batchDate) {
            const formattedDate = convertDateFormat(batchDate);
            if (formattedDate) {
                finalQueryParams.push(formattedDate);
            }
        }

        console.log("Final query:", finalQuery);
        console.log("Final query params:", finalQueryParams);

        const [results] = await connection.query(finalQuery, finalQueryParams);
        console.log('Final query executed. Number of results:', results.length);

        if (results.length > 0) {
            console.log("Processing student records...");
            const studentTrackDTOs = results.map(result => {
                console.log('Processing batchdate for student:', result.student_id, 'batchdate value:', result.batchdate, 'type:', typeof result.batchdate);

                const studentTrack = new StudentTrackDTO(
                    result.student_id,
                    result.center,
                    result.fullname,
                    result.batchNo,
                    formatDateTimeIST(result.loginTime),
                    result.login,
                    result.done,
                    result.Reporting_Time,
                    result.start_time,
                    result.end_time,
                    result.trial,
                    result.passageA,
                    result.passageB,
                    formatDateTimeIST(result.trial_time),
                    formatDateTimeIST(result.audio1_time),
                    formatDateTimeIST(result.passage1_time),
                    formatDateTimeIST(result.audio2_time),
                    formatDateTimeIST(result.passage2_time),
                    formatDateTimeIST(result.feedback_time),
                    result.subject_name,
                    result.subject_name_short,
                    formatDate(result.batchdate), // This now properly handles the date with logging
                    result.departmentId,
                    formatDateTimeIST(result.trial_passage_time),
                    formatDateTimeIST(result.typing_passage_time)
                );

                if (typeof studentTrack.fullname === 'string') {
                    studentTrack.fullname = encryptionInterface.decrypt(studentTrack.fullname);
                }
                return studentTrack;
            });

            // Remove the additional formatting that was causing the issue
            console.log("Student data processing completed");
            res.status(200).json(studentTrackDTOs);
        } else {
            console.log("No matching student records found in final query");
            res.status(404).json({ message: 'No records found!' });
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).json({ message: err.message });
    }
};

// New endpoint to get active departments
exports.getActiveDepartments = async (req, res) => {
    try {
        const examCenterCode = req.session.centerId;

        if (examCenterCode) {
            const query = `
                SELECT d.departmentId, d.departmentName
                FROM departmentdb d
                INNER JOIN examcenterdb e ON e.departmentId = d.departmentId
                WHERE e.center = ? AND d.departmentStatus = 1
                ORDER BY d.departmentName
            `;
            const [results] = await connection.query(query, [examCenterCode]);
            return res.status(200).json(results);
        }

        const query = 'SELECT departmentId, departmentName, examType FROM departmentdb WHERE departmentStatus = 1 ORDER BY departmentName';
        const [results] = await connection.query(query);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No active departments found' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching active departments:', error);
        res.status(500).json({ message: 'Failed to fetch departments' });
    }
};

// Modified endpoint to get batches for a specific department
// src/controllers/centerAdminMonitoring/trackStudentsProgress.js
exports.getBatchesByDepartment = async (req, res) => {
    console.log('Starting getBatchesByDepartment function');
    try {
        const { departmentId } = req.body;
        console.log('Received departmentId:', departmentId);
        const examCenterCode = req.session.centerId;

        if (!examCenterCode) {
            return res.status(404).json({ message: "Center admin is not logged in" });
        }

        if (!departmentId) {
            return res.status(400).json({ message: "Department ID is required" });
        }

        // Check if department is active
        const deptQuery = 'SELECT departmentId FROM departmentdb WHERE departmentId = ? AND departmentStatus = 1';
        const [deptResult] = await connection.query(deptQuery, [departmentId]);

        if (deptResult.length === 0) {
            return res.status(404).json({ message: 'Selected department is not active' });
        }

        // Get distinct batch numbers for the specific department and center
        const query = `
            SELECT DISTINCT s.batchNo, s.batchdate, b.start_time
            FROM students s
            LEFT JOIN batchdb b ON s.batchNo = b.batchNo AND s.departmentId = b.departmentId
            WHERE s.center = ? AND s.departmentId = ? 
            ORDER BY s.batchNo`;

        const [results] = await connection.query(query, [examCenterCode, departmentId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No batches found for this department and center' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching batches by department:', error);
        res.status(500).json({ message: 'Failed to fetch batches' });
    }
};


exports.getStoredStages = async (req, res) => {
    const studentId = req.session.studentId;

    if (!studentId) {
        return res.status(400).json({
            error: 'Student ID is required'
        });
    }

    const createQuery = `CREATE TABLE IF NOT EXISTS exam_stages 
    (StudentId BIGINT, StudentInfo BOOLEAN DEFAULT 0, 
    Instructions BOOLEAN DEFAULT 0, InputChecker BOOLEAN DEFAULT 0, HeadphoneTest BOOLEAN DEFAULT 0, 
    ControllerPassword BOOLEAN DEFAULT 0, TrialPassage BOOLEAN DEFAULT 0, AudioPassageA BOOLEAN DEFAULT 0, 
    TypingPassageA BOOLEAN DEFAULT 0, AudioPassageB BOOLEAN DEFAULT 0, TypingPassageB BOOLEAN DEFAULT 0,
    TrialTypewriting BOOLEAN DEFAULT 0, Typewriting BOOLEAN DEFAULT 0, 
    ShorthandSummary BOOLEAN DEFAULT 0, ShorthandSummaryB BOOLEAN DEFAULT 0, TypingSummary BOOLEAN DEFAULT 0, FeedbackForm BOOLEAN DEFAULT 0, 
    ThankYou BOOLEAN DEFAULT 0, FOREIGN KEY (StudentId) REFERENCES students(student_id));`

    try {
        //create table if it does not exist 
        await connection.query(createQuery);

        // Fetch the exam stages for the student
        let [examStages] = await connection.query(
            'SELECT * FROM exam_stages WHERE StudentId = ?',
            [studentId]
        );

        if (examStages.length === 0) {
            // If no exam stages found, insert a new row with default values
            const defaultStages = {
                StudentInfo: 0, Instructions: 0, InputChecker: 0, HeadphoneTest: 0,
                ControllerPassword: 0, TrialPassage: 0, AudioPassageA: 0, TypingPassageA: 0,
                AudioPassageB: 0, TypingPassageB: 0,
                TrialTypewriting: 0, Typewriting: 0, ShorthandSummary: 0,
                ShorthandSummaryB: 0, TypingSummary: 0,
                FeedbackForm: 0, ThankYou: 0
            };

            const columns = Object.keys(defaultStages).join(', ');
            const placeholders = Object.values(defaultStages).map(() => '?').join(', ');

            await connection.query(
                `INSERT INTO exam_stages (StudentId, ${columns}) VALUES (?, ${placeholders})`,
                [studentId, ...Object.values(defaultStages)]
            );

            // Fetch the newly inserted row
            [examStages] = await connection.query(
                'SELECT * FROM exam_stages WHERE StudentId = ?',
                [studentId]
            );
        }

        // Convert the exam stages to a more readable format
        const formattedExamStages = {};
        for (const [key, value] of Object.entries(examStages[0])) {
            if (key !== 'StudentId') {
                formattedExamStages[key] = value === 1;
            }
        }

        res.status(200).json({
            studentId: studentId,
            examStages: formattedExamStages
        });
    } catch (error) {
        console.error("Error fetching or inserting exam stages", error);
        res.status(500).json({ error: 'Internal Server error' });
    }
};

exports.storeExamStage = async (req, res) => {

    const { examStage } = req.body;
    const studentId = req.session.studentId;

    if (!studentId || !examStage) {
        return res.status(400).json({
            error: 'Student ID and exam are required'
        })
    }

    const createQuery = `CREATE TABLE IF NOT EXISTS exam_stages 
    (StudentId BIGINT, StudentInfo BOOLEAN DEFAULT 0, Instructions BOOLEAN DEFAULT 0, 
    InputChecker BOOLEAN DEFAULT 0, HeadphoneTest BOOLEAN DEFAULT 0, ControllerPassword BOOLEAN DEFAULT 0, 
    TrialPassage BOOLEAN DEFAULT 0, AudioPassageA BOOLEAN DEFAULT 0, TypingPassageA BOOLEAN DEFAULT 0, 
    AudioPassageB BOOLEAN DEFAULT 0, TypingPassageB BOOLEAN DEFAULT 0, TrialTypewriting BOOLEAN DEFAULT 0, 
    Typewriting BOOLEAN DEFAULT 0, ShorthandSummary BOOLEAN DEFAULT 0, ShorthandSummaryB BOOLEAN DEFAULT 0, 
    TypingSummary BOOLEAN DEFAULT 0, FeedbackForm BOOLEAN DEFAULT 0, ThankYou BOOLEAN DEFAULT 0, 
    FOREIGN KEY (StudentId) REFERENCES students(student_id));`


    // List of valid exam stages
    const validExamStages = [
        'StudentInfo', 'Instructions', 'InputChecker', 'HeadphoneTest',
        'ControllerPassword', 'TrialPassage', 'AudioPassageA', 'TypingPassageA', 'AudioPassageB',
        'TypingPassageB', 'TrialTypewriting', 'Typewriting', 'ShorthandSummary', 'ShorthandSummaryB', 'TypingSummary',
        'FeedbackForm', 'ThankYou'
    ];

    if (!validExamStages.includes(examStage)) {
        return res.status(400).json({ error: 'Invalid exam stage' })
    }

    try {

        //create table if it does not exist 
        await connection.query(createQuery);
        // Check if the student exists in the exam_stages table
        const [existingStage] = await connection.query(
            'SELECT * FROM exam_stages WHERE StudentId = ?',
            [studentId]
        )

        let query, params;
        if (existingStage.length === 0) {
            // If the student doesn't exist, insert a new row
            query = `INSERT INTO exam_stages (StudentId, ${examStage}) VALUES (?, 1)`;
            params = [studentId];
        }
        else {
            // If the student exists, update the specific exam stage
            query = `UPDATE exam_stages SET ${examStage} = 1 WHERE StudentId = ?`
            params = [studentId];
        }

        await connection.query(query, params);

        res.status(200).json({ message: 'Exam stage updated successfully' })
    } catch (error) {
        console.error("Error updating the exam stage", error);
        res.status(500).json({ error: 'Internal Server error' })
    }
}

// NEW ATTENDANCE RELATED FUNCTIONS

// Get active departments
exports.getActiveDepartments = async (req, res) => {
    try {
        const examCenterCode = req.session.centerId;

        if (examCenterCode) {
            // Center admin is logged in — return only their assigned department
            const query = `
                SELECT d.departmentId, d.departmentName, d.examType
                FROM departmentdb d
                INNER JOIN examcenterdb e ON e.departmentId = d.departmentId
                WHERE e.center = ? AND d.departmentStatus = 1
                ORDER BY d.departmentName
            `;
            const [results] = await connection.query(query, [examCenterCode]);
            return res.status(200).json(results);
        }

        // Fallback: super admin — return all active departments
        const query = `SELECT departmentId, departmentName, examType FROM departmentdb WHERE departmentStatus = 1 ORDER BY departmentName`;
        const [results] = await connection.query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching active departments:", error);
        res.status(500).json({ message: "Failed to fetch departments" });
    }
};

// Upload attendance report
exports.uploadAttendance = [
    upload.single('attendance'),
    async (req, res) => {
        try {
            const { batchNo, departmentId, present_count, absent_count } = req.body;
            const examCenterCode = req.session.centerId;

            if (!examCenterCode) {
                return res.status(401).json({ message: "Center admin is not logged in" });
            }

            // Validate required fields
            if (!batchNo || !departmentId || !present_count || !absent_count) {
                return res.status(400).json({
                    message: "All fields are required: batchNo, departmentId, present_count, absent_count"
                });
            }

            // Validate that departmentId exists and is active
            const [deptCheck] = await connection.query(
                'SELECT departmentId FROM departmentdb WHERE departmentId = ? AND departmentStatus = 1',
                [departmentId]
            );

            if (deptCheck.length === 0) {
                return res.status(400).json({
                    message: "Invalid or inactive department selected"
                });
            }

            // Check if attendance already exists for this batch and department
            const checkQuery = `
                SELECT id FROM attendance_reports 
                WHERE batchNo = ? AND departmentId = ? AND center = ?
            `;
            const [existing] = await connection.query(checkQuery, [batchNo, departmentId, examCenterCode]);

            if (existing.length > 0) {
                return res.status(400).json({
                    message: "Attendance report already exists for this batch and department"
                });
            }

            // Validate that students exist for this batch, department, and center
            const [studentCheck] = await connection.query(
                'SELECT COUNT(*) as count FROM students WHERE batchNo = ? AND departmentId = ? AND center = ?',
                [batchNo, departmentId, examCenterCode]
            );

            if (studentCheck[0].count === 0) {
                return res.status(400).json({
                    message: "No students found for this batch and department combination"
                });
            }

            // Generate current datetime in proper MySQL format
            const currentDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            console.log('Generated currentDateTime for MySQL:', currentDateTime);

            // Insert new attendance record with departmentId
            const insertQuery = `
                INSERT INTO attendance_reports 
                (batchNo, departmentId, center, present_count, absent_count, attendance_pdf, report_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const pdfPath = req.file ? `/uploads/attendance/${req.file.filename}` : null;

            await connection.query(insertQuery, [
                batchNo,
                departmentId,
                examCenterCode,
                present_count,
                absent_count,
                pdfPath,
                currentDateTime // Use properly formatted datetime
            ]);

            res.status(201).json({ message: "Attendance report uploaded successfully" });
        } catch (error) {
            console.error("Error uploading attendance:", error);

            // Clean up uploaded file if there was an error
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error("Error deleting uploaded file:", unlinkError);
                }
            }

            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "File size too large. Maximum 1MB allowed." });
            }

            res.status(500).json({ message: "Failed to upload attendance report" });
        }
    }
];

// Get attendance reports
exports.getAttendanceReports = async (req, res) => {
    try {
        const examCenterCode = req.session.centerId;

        if (!examCenterCode) {
            return res.status(401).json({ message: "Center admin is not logged in" });
        }

        const query = `
            SELECT 
                ar.id,
                ar.batchNo,
                ar.departmentId,
                d.departmentName,
                ar.present_count,
                ar.absent_count,
                ar.attendance_pdf,
                ar.report_date
            FROM attendance_reports ar
            LEFT JOIN departmentdb d ON ar.departmentId = d.departmentId
            WHERE ar.center = ?
            ORDER BY ar.report_date DESC
        `;

        const [results] = await connection.query(query, [examCenterCode]);

        res.status(200).json({ Reports: results });
    } catch (error) {
        console.error("Error fetching attendance reports:", error);
        res.status(500).json({ message: "Failed to fetch attendance reports" });
    }
};

// Delete attendance report
exports.deleteAttendance = async (req, res) => {
    try {
        const { batchNo, departmentId } = req.body;
        const examCenterCode = req.session.centerId;

        if (!examCenterCode) {
            return res.status(401).json({ message: "Center admin is not logged in" });
        }

        if (!batchNo || !departmentId) {
            return res.status(400).json({
                message: "Batch number and department ID are required"
            });
        }

        // First, get the file path to delete the PDF file
        const getFileQuery = `
            SELECT attendance_pdf FROM attendance_reports 
            WHERE batchNo = ? AND departmentId = ? AND center = ?
        `;
        const [fileResult] = await connection.query(getFileQuery, [batchNo, departmentId, examCenterCode]);

        if (fileResult.length === 0) {
            return res.status(404).json({ message: "Attendance report not found" });
        }

        // Delete the database record
        const deleteQuery = `
            DELETE FROM attendance_reports 
            WHERE batchNo = ? AND departmentId = ? AND center = ?
        `;

        const [result] = await connection.query(deleteQuery, [batchNo, departmentId, examCenterCode]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Attendance report not found" });
        }

        // Delete the PDF file if it exists
        if (fileResult[0].attendance_pdf) {
            const filePath = path.join(__dirname, '../..', fileResult[0].attendance_pdf);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('Attendance PDF file deleted:', filePath);
                }
            } catch (fileError) {
                console.error('Error deleting attendance PDF file:', fileError);
                // Don't fail the request if file deletion fails
            }
        }

        res.status(201).json({ message: "Attendance report deleted successfully" });
    } catch (error) {
        console.error("Error deleting attendance report:", error);
        res.status(500).json({ message: "Failed to delete attendance report" });
    }
};

// Get students for specific batch and department (optional utility function)
exports.getStudentsByBatchAndDepartment = async (req, res) => {
    try {
        const { batchNo, departmentId } = req.params;
        const examCenterCode = req.session.centerId;

        if (!examCenterCode) {
            return res.status(401).json({ message: "Center admin is not logged in" });
        }

        const query = `
            SELECT 
                s.student_id,
                s.fullname,
                s.batchNo,
                s.loggedin,
                d.departmentName
            FROM students s
            LEFT JOIN departmentdb d ON s.departmentId = d.departmentId
            WHERE s.batchNo = ? AND s.departmentId = ? AND s.center = ?
            ORDER BY s.fullname
        `;

        const [results] = await connection.query(query, [batchNo, departmentId, examCenterCode]);

        // Decrypt student names
        results.forEach(student => {
            if (typeof student.fullname === 'string') {
                student.fullname = encryptionInterface.decrypt(student.fullname);
            }
        });

        res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching students by batch and department:", error);
        res.status(500).json({ message: "Failed to fetch students" });
    }
};