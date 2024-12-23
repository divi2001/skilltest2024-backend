const connection = require('../../config/db1');
const StudentTrackDTO = require("../../dto/studentProgress");
const { decrypt } = require("../../config/encrypt");
const moment = require('moment-timezone');
const { stat } = require('fs/promises');
exports.departementLogin = async (req, res) => {

    console.log("Trying Department admin login");
    const { departmentId, password } = req.body;
    // console.log("center: "+centerId+ " password: "+password);
    console.log(req.body);
    const departmentdbQuery = 'SELECT departmentId, departmentPassword FROM departmentdb WHERE departmentId = ?';
    
    try {
        const [results] = await connection.query(departmentdbQuery, [departmentId]);
        console.log(results);
        if (results.length > 0) {
            const admin = results[0];
            // console.log("data: "+admin);
            // console.log(admin)
            // let decryptedStoredPassword = await decrypt(admin.departmentPassword);
            // console.log(decryptedStoredPassword);
            // try {

            //     // console.log("admin pass: " + admin.departmentPassword + " provide pass: " + password);

            // } catch (error) {
            //     console.log(error);
            // }


            if (admin.departmentPassword === password) {
                // Set institute session
                req.session.departmentId = admin.departmentId;
                res.status(200).send({"message":'Logged in successfully as an department admin!'});

            } else {
                res.status(401).send('Invalid credentials for center admin');
            }
        } else {
            res.status(404).send({"message":'department not found'});
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
}
function formatDate(dateString) {
    return moment(dateString).tz('Asia/Kolkata').format('DD-MM-YYYY')
}
function convertDateFormat(dateString) {
    // Parse the original date string
    const [day, month, year] = dateString.split('-');
  
    // Create a Date object in UTC
    // Set the time to 18:30:00 UTC of the previous day
    const date = new Date(Date.UTC(year, month - 1, day - 1, 18, 30, 0));
    
    // Convert to ISO 8601 format
    return date
}
exports.getStudentsTrackDepartmentwise = async (req, res) => {
    console.log('Starting getStudentsTrack function');
    const departmentId = req.session.departmentId;
    let { subject_name, loginStatus, batchDate, batchNo, center, exam_type } = req.query;
    // console.log("Exam center code:", departmentId);
    // console.log("Batch no:", batchNo);
    // console.log("Subject:", subject_name);
    // console.log("Login status:", loginStatus);
    // console.log("exam type:", exam_type);
    // console.log("Center no:", center);
    // console.log("Original Batch date:", batchDate);

    

    if (!departmentId) {
        // console.log('department admin is not logged in');
        return res.status(404).json({ "message": "Center admin is not logged in" });
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
        s.batchdate,
        s.done,
        s.Reporting_Time,
        s.start_time,
        s.end_time,
        s.batchdate,
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

    if (batchNo) {
        query += ' AND s.batchNo = ?';
        queryParams.push(batchNo);
    }

    if (subject_name) {
        query += ' AND sub.subject_name = ?';
        queryParams.push(subject_name);
    }

    if (center) {
        query += ' AND s.center = ?';
        queryParams.push(center);
    }

    if (loginStatus) {
        if (loginStatus === 'loggedin') {
            query += ' AND s.loggedin = 1';
        } else if (loginStatus === 'loggedout') {
            query += ' AND s.loggedin = 0';
        }
    }

    if (exam_type) {
        if (exam_type === 'shorthand') {
            query += ' AND s.IsShorthand = 1 AND s.IsTypewriting =0'
        }
        else if (exam_type === 'typewriting') {
            query += ' And s.IsTypewriting = 1 AND s.IsShorthand = 0'
        }
        else if (exam_type === 'both') {
            query += ' AND s.IsShorthand = 1 And s.IsTypewriting = 1'
        }
    }

    if (batchDate) {
        batchDate = convertDateFormat(batchDate);
        console.log("Formatted Batch date:", batchDate);
        query += ' AND s.batchdate = ?';
        queryParams.push(batchDate);
    }

    // console.log('Final query:', query);
    // console.log('Query parameters:', queryParams);

    try {
        const [results] = await connection.query(query, queryParams);
        // console.log('Query result:', results);

        if (results.length > 0) {
            const studentTrackDTOs = results.map(result => {
                const studentTrack = new StudentTrackDTO(
                    result.student_id,
                    result.center,
                    result.fullname,
                    result.batchNo,
                    result.loginTime,
                    result.login,
                    result.done,
                    result.Reporting_Time,
                    result.start_time,
                    result.end_time,
                    result.trial,
                    result.passageA,
                    result.passageB,
                    result.trial_time,
                    result.audio1_time,
                    result.passage1_time,
                    result.audio2_time,
                    result.passage2_time,
                    result.feedback_time,
                    result.subject_name,
                    result.subject_name_short,
                    formatDate(result.batchdate),
                    result.departmentId,
                    result.trial_passage_time,
                    result.typing_passage_time
                );

                if (typeof studentTrack.fullname === 'string') {
                    studentTrack.fullname = encryptionInterface.decrypt(studentTrack.fullname);
                }
                return studentTrack;
            });

            res.status(200).json(studentTrackDTOs);
        } else {
            res.status(404).json({ message: 'No records found!' });
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).json({ message: err.message });
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
        if(center){
            filter += ' AND s.center = ?';
            queryParams.push(center);
        }

        // First, get all subject IDs and names
        const [subjects] = await connection.query('SELECT subjectId, subject_name FROM subjectsdb');

        // Construct dynamic parts of the query
        const subjectCounts = subjects.map(sub => `
            SUM(CASE WHEN s.subjectsId = ${sub.subjectId} THEN 1 ELSE 0 END) AS subject_${sub.subjectId}_count,
            SUM(CASE WHEN s.subjectsId = ${sub.subjectId} AND sl.login = TRUE THEN 1 ELSE 0 END) AS subject_${sub.subjectId}_logged_in,
            SUM(CASE WHEN s.subjectsId = ${sub.subjectId} AND sl.feedback_time IS NOT NULL THEN 1 ELSE 0 END) AS subject_${sub.subjectId}_completed
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
            s.start_time, 
            s.batchdate,
            ${subjectCounts},
            ${subjectNames}
        FROM 
            students s
        LEFT JOIN studentlogs sl ON s.student_id = sl.student_id
        WHERE 
            s.departmentId = ? ${filter}
        GROUP BY  
            s.batchNo, s.start_time, s.batchdate, s.center
        ORDER BY 
            s.batchNo, s.center;
    `;

        const [results] = await connection.query(query, queryParams);

        // Convert date and time to Kolkata timezone
        results.forEach(result => {
            result.batchdate = moment(result.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY')

            // Restructure subject data for easier consumption
            result.subjects = subjects.map(sub => ({
                id: sub.subjectId,
                name: result[`subject_${sub.subjectId}_name`],
                count: result[`subject_${sub.subjectId}_count`],
                loggedIn: result[`subject_${sub.subjectId}_logged_in`],
                completed: result[`subject_${sub.subjectId}_completed`]
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

exports.getDepartmentswithstudents = async(req,res)=>{

    try {
        let query =`select d.departmentId ,d.departmentName, d.departmentStatus from departmentdb d join students s on s.departmentId = d.departmentId group by d.departmentId;`;

        const [results] = await connection.query(query);
        if(results.length === 0) return res.status(404).json({"message":"No deparments found"});
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