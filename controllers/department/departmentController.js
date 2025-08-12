// controllers/department/departmentController.js
const connection = require('../../config/db1');
const StudentTrackDTO = require("../../dto/studentProgress");
const { decrypt } = require("../../config/encrypt");
const moment = require('moment-timezone');

exports.departementLogin = async (req, res) => {
    try {
        const { departmentId, password } = req.body;
        
        if (!departmentId || !password) {
            return res.status(400).send({ "message": "Department ID and password are required" });
        }

        const departmentdbQuery = 'SELECT departmentId, departmentPassword FROM departmentdb WHERE login_id = ?';
        const [results] = await connection.query(departmentdbQuery, [departmentId]);

        if (results.length === 0) {
            return res.status(404).send({ 
                "message": 'Department not found',
                "details": `No department found with ID: ${departmentId}`
            });
        }

        const admin = results[0];
        const decryptedStoredPassword = await decrypt(admin.departmentPassword);

        if (decryptedStoredPassword === password) {
            req.session.departmentId = admin.departmentId;
            return res.status(200).send({ 
                "message": 'Logged in successfully as a department admin!',
                "loginId": admin.login_id
            });
        }

        return res.status(401).send({ 
            "message": 'Invalid credentials',
            "details": 'Password does not match'
        });

    } catch (err) {
        console.error('Department login error:', err);
        return res.status(500).send({ 
            "message": "Internal server error",
            "details": err.message
        });
    }
};

// CRITICAL FIX: Send raw datetime strings to frontend without timezone conversion
function formatDate(dateString) {
    if (!dateString) return null;
    try {
        // Return the datetime string as-is, let frontend handle formatting
        return dateString;
    } catch (error) {
        console.error('Error formatting date:', error);
        return null;
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return null;
    try {
        // Return the datetime string as-is, let frontend handle formatting
        return dateTimeString;
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return null;
    }
}

function formatTime(timeString) {
    if (!timeString) return null;
    try {
        // Return the time string as-is, let frontend handle formatting
        return timeString;
    } catch (error) {
        console.error('Error formatting time:', error);
        return null;
    }
}

// Fix the convertDateFormat function
function convertDateFormat(dateString) {
    if (!dateString) return null;
    try {
        // Handle DD/MM/YYYY format
        if (dateString.includes('/')) {
            const [day, month, year] = dateString.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        // Handle YYYY-MM-DD format - return as is
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateString;
        }
        // Try to parse as date and format
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        return null;
    } catch (error) {
        console.error('Error converting date format:', error);
        return null;
    }
}

exports.getStudentsTrackDepartmentwise = async (req, res) => {
    const departmentId = req.session.departmentId.toString();
    console.log('Starting getStudentsTrack function', departmentId);
    
    // IMPORTANT: Read from req.body for POST requests, not req.query
    let { subject_name, loginStatus, batchDate, batchNo, center, exam_type } = req.body;
    
    console.log("Received filters from req.body:", {
        departmentId,
        batchNo,
        subject_name,
        loginStatus,
        exam_type,
        center,
        batchDate
    });

    if (!departmentId) {
        return res.status(404).json({ "message": "Department admin is not logged in" });
    }

    const queryParams = [departmentId];
    let query = `SELECT 
        s.student_id,
        s.center,
        s.fullname, 
        s.subjectsId,
        sub.subject_name,
        sub.subject_name_short,
        s.courseId,
        s.loggedin,
        s.batchNo,
        DATE_FORMAT(s.batchdate, '%Y-%m-%d') as batchdate,
        s.done,
        s.Reporting_Time,
        s.start_time,
        s.end_time,
        s.IsShorthand,
        s.IsTypewriting,
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
        subjectsdb sub ON s.subjectsId = sub.subjectId
    LEFT JOIN
        audiologs a ON s.student_id = a.student_id
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
    WHERE s.departmentId = ?`;

    // Apply filters with proper validation
    if (batchNo && batchNo.toString().trim() !== '') {
        query += ' AND s.batchNo = ?';
        queryParams.push(batchNo.toString().trim());
        console.log("✅ Applied batchNo filter:", batchNo.toString().trim());
    }

    if (subject_name && subject_name.toString().trim() !== '') {
        query += ' AND sub.subject_name = ?';
        queryParams.push(subject_name.toString().trim());
        console.log("✅ Applied subject filter:", subject_name.toString().trim());
    }

    if (center && center.toString().trim() !== '') {
        query += ' AND s.center = ?';
        queryParams.push(center.toString().trim());
        console.log("✅ Applied center filter:", center.toString().trim());
    }

    if (loginStatus && loginStatus.toString().trim() !== '') {
        if (loginStatus === 'loggedin') {
            query += ' AND s.loggedin = 1';
        } else if (loginStatus === 'loggedout') {
            query += ' AND s.loggedin = 0';
        }
        console.log("✅ Applied loginStatus filter:", loginStatus);
    }

    if (exam_type && exam_type.toString().trim() !== '') {
        if (exam_type === 'shorthand') {
            query += ' AND s.IsShorthand = 1 AND s.IsTypewriting = 0';
        } else if (exam_type === 'typewriting') {
            query += ' AND s.IsTypewriting = 1 AND s.IsShorthand = 0';
        } else if (exam_type === 'both') {
            query += ' AND s.IsShorthand = 1 AND s.IsTypewriting = 1';
        }
        console.log("✅ Applied exam_type filter:", exam_type);
    }

    if (batchDate && batchDate.toString().trim() !== '') {
        const inputDate = batchDate.toString().trim();
        console.log("Processing batchDate:", inputDate);
        
        // Simplified date filter since we're now formatting dates consistently
        query += ' AND DATE(s.batchdate) = ?';
        
        // Convert input date to YYYY-MM-DD format if needed
        let formattedDate = inputDate;
        if (inputDate.includes('/')) {
            const [day, month, year] = inputDate.split('/');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        queryParams.push(formattedDate);
        console.log("✅ Applied batchDate filter:", formattedDate);
    }

    console.log("🔍 Final query:", query);
    console.log("🔍 Query params:", queryParams);

    try {
        const [results] = await connection.query(query, queryParams);
        console.log(`✅ Query returned ${results.length} results`);

        if (results.length > 0) {
            const studentTrackDTOs = results.map(result => {
                const formattedResult = {
                    ...result,
                    // batchdate is now already formatted as YYYY-MM-DD from the SQL query
                    batchdate: result.batchdate,
                    Reporting_Time: result.Reporting_Time,
                    start_time: result.start_time,
                    end_time: result.end_time,
                    loginTime: result.loginTime,
                    trial_time: result.trial_time,
                    audio1_time: result.audio1_time,
                    passage1_time: result.passage1_time,
                    audio2_time: result.audio2_time,
                    passage2_time: result.passage2_time,
                    trial_passage_time: result.trial_passage_time,
                    typing_passage_time: result.typing_passage_time,
                    feedback_time: result.feedback_time
                };

                const studentTrack = new StudentTrackDTO(
                    formattedResult.student_id,
                    formattedResult.center,
                    formattedResult.fullname,
                    formattedResult.batchNo,
                    formattedResult.loginTime,
                    formattedResult.login,
                    formattedResult.done,
                    formattedResult.Reporting_Time,
                    formattedResult.start_time,
                    formattedResult.end_time,
                    formattedResult.trial,
                    formattedResult.passageA,
                    formattedResult.passageB,
                    formattedResult.trial_time,
                    formattedResult.audio1_time,
                    formattedResult.passage1_time,
                    formattedResult.audio2_time,
                    formattedResult.passage2_time,
                    formattedResult.feedback_time,
                    formattedResult.subject_name,
                    formattedResult.subject_name_short,
                    formattedResult.batchdate,
                    formattedResult.departmentId,
                    formattedResult.trial_passage_time,
                    formattedResult.typing_passage_time
                );

                if (typeof studentTrack.fullname === 'string') {
                    studentTrack.fullname = decrypt(studentTrack.fullname);
                }
                return studentTrack;
            });

            res.status(200).json(studentTrackDTOs);
        } else {
            res.status(404).json({ message: 'No records found!' });
        }
    } catch (err) {
        console.error("❌ Database query error:", err);
        res.status(500).json({ message: err.message });
    }
}


// ... rest of the controller methods remain the same
exports.getDepartmentDetails = async (req,res) => {
    const department = req.session.departmentId.toString();
    console.log(department);
    if (!department) {
        return res.status(400).json({ message: "Department admin not logged in" });
    }

    let query = 'select departmentName , logo from departmentdb where departmentId = ?';

    try {
        const [response] = await connection.query(query,[department]);
        if (response.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }
        res.status(201).json({"message":"Department details found",departmentDetails:response[0]});
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ message: error.message });
    }
}

exports.getCurrentStudentDetailsCenterwise = async (req, res) => {
    try {
        const department = req.session.departmentId;
        const center = req.query.center;
        const batchNo = req.query.batchNo;

        let filter = '';
        const queryParams = [department];

        if (batchNo) {
            filter += ' AND s.batchNo = ?';
            queryParams.push(batchNo);
        }
        if (center) {
            filter += ' AND s.center = ?';
            queryParams.push(center);
        }

        // First, get all subject IDs and names
        const [subjects] = await connection.query('SELECT subjectId, subject_name FROM subjectsdb');

        // FIXED: Use COUNT(DISTINCT) instead of SUM()
        const subjectCounts = subjects.map(sub => `
            COUNT(DISTINCT CASE WHEN s.subjectsId = ${sub.subjectId} THEN s.student_id END) AS subject_${sub.subjectId}_count,
            COUNT(DISTINCT CASE WHEN s.subjectsId = ${sub.subjectId} AND sl.login = TRUE THEN s.student_id END) AS subject_${sub.subjectId}_logged_in,
            COUNT(DISTINCT CASE WHEN s.subjectsId = ${sub.subjectId} AND sl.feedback_time IS NOT NULL THEN s.student_id END) AS subject_${sub.subjectId}_completed
        `).join(', ');

        const subjectNames = subjects.map(sub =>
            `'${sub.subject_name}' AS subject_${sub.subjectId}_name`
        ).join(', ');

        let query = `
        SELECT 
            s.center,
            s.batchNo, 
            COUNT(DISTINCT s.student_id) AS total_students, 
            COUNT(DISTINCT CASE WHEN sl.login = TRUE THEN s.student_id END) AS logged_in_students,
            COUNT(DISTINCT CASE WHEN sl.feedback_time IS NOT NULL THEN s.student_id END) AS completed_student, 
            MIN(b.start_time) AS start_time,
            s.batchdate,
            ${subjectCounts},
            ${subjectNames}
        FROM 
            students s
        LEFT JOIN batchdb b ON b.batchNo = s.batchNo
        LEFT JOIN studentlogs sl ON s.student_id = sl.student_id
        WHERE 
            s.departmentId = ? ${filter}
        GROUP BY  
            s.batchNo, s.batchdate, s.center
        ORDER BY 
            s.batchNo, s.center;
    `;

        console.log('Department query:', query);
        console.log('Query params:', queryParams);

        const [results] = await connection.query(query, queryParams);

        console.log('Department query results count:', results.length);
        console.log('Department query results:', results);

        // Check for duplicates
        const duplicates = results.filter((item, index, arr) => 
            arr.findIndex(other => 
                other.center === item.center && 
                other.batchNo === item.batchNo
            ) !== index
        );

        if (duplicates.length > 0) {
            console.log('DUPLICATES FOUND in department backend:', duplicates);
        }

        results.forEach(result => {
            // Restructure subject data for easier consumption
            result.subjects = subjects.map(sub => ({
                id: sub.subjectId,
                name: result[`subject_${sub.subjectId}_name`],
                count: Number(result[`subject_${sub.subjectId}_count`]),
                loggedIn: Number(result[`subject_${sub.subjectId}_logged_in`]),
                completed: Number(result[`subject_${sub.subjectId}_completed`])
            }));

            // Remove individual subject fields
            subjects.forEach(sub => {
                delete result[`subject_${sub.subjectId}_name`];
                delete result[`subject_${sub.subjectId}_count`];
                delete result[`subject_${sub.subjectId}_logged_in`];
                delete result[`subject_${sub.subjectId}_completed`];
            });
        });

        res.status(200).json({ results });
    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": "Internal Server Error!!" });
    }
};

exports.getDepartmentswithstudents = async (req, res) => {
    try {
        let query = `select d.departmentId ,d.departmentName, d.departmentStatus from departmentdb d join students s on s.departmentId = d.departmentId group by d.departmentId;`;

        const [results] = await connection.query(query);
        if (results.length === 0) return res.status(404).json({ "message": "No deparments found" });
        res.status(201).json(results);
    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": "Internal Server Error!!" });
    }
}

exports.updateDepartmentStatus = async (req, res) => {
    const { department, status } = req.body;

    if (department === undefined || status === undefined) {
        return res.status(400).json({ "message": "Missing required parameters" });
    }

    try {
        let query = `UPDATE departmentdb SET departmentStatus = ? WHERE departmentId = ?`;

        const [result] = await connection.query(query, [status, department]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ "message": "Department not found" });
        }

        res.status(200).json({
            "message": "Department status updated successfully",
            "affectedRows": result.affectedRows
        });

    } catch (error) {
        console.log("Error", error);
        res.status(500).json({ "message": "Internal server error" });
    }
};