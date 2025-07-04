const connection = require('../../config/db1');
const StudentTrackDTO = require("../../dto/studentProgress"); 
const moment = require('moment-timezone');

function formatDate(dateString) {
    return moment(dateString).tz('Asia/Kolkata').format('DD/MM/YYYY')
}
function convertDateFormat(dateString) {
    // Expects DD/MM/YYYY
    const [day, month, year] = dateString.split('/');
    return moment.tz(`${day}/${month}/${year}`, 'DD/MM/YYYY', 'Asia/Kolkata').toDate();
}
exports.getAllStudentsTrack = async (req,res) => {
    // console.log('Starting getStudentsTrack function');
    const adminId = req.params.adminid;
    // console.log(adminId);
    // if(!adminId) return res.status(404).json({"message":"Admin is not logged in!!"});
    let { subject_name, loginStatus, batchDate , batchNo, center , exam_type , departmentId } = req.query;
    // console.log("Exam center code:", departmentId);
    // console.log("Batch no:", batchNo);
    // console.log("Subject:", subject_name);
    // console.log("Login status:", loginStatus);
    // console.log("exam type:" , exam_type);
    // console.log("Center no:", center);
    // console.log("Original Batch date:", batchDate);
    // console.log("Department Id:", departmentId);

    // if (!departmentId) {
    //     console.log('department admin is not logged in');
    //     return res.status(404).json({"message":"Center admin is not logged in"});
    // }

    const queryParams = [];
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
WHERE 1=1`;

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

    if(departmentId){
        query += ' AND s.departmentId = ?';
        queryParams.push(departmentId);
    }

    if(exam_type){
        if(exam_type ==='shorthand'){
            query+= ' AND s.IsShorthand = 1 AND s.IsTypewriting = 0'
        }
        else if (exam_type === 'typewriting'){
            query+=' And s.IsTypewriting = 1 AND s.IsShorthand = 0'
        }
        else if(exam_type === 'both'){
            query+=' AND s.IsShorthand = 1 And s.IsTypewriting = 1'
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

            results.forEach(result => {
                if (result.batchdate) {
                    result.batchdate = moment(result.batchdate).tz('Asia/Kolkata').format('DD/MM/YYYY');
                }
            });

            res.status(200).json(studentTrackDTOs);
        } else {
            res.status(404).json({message: 'No records found!'});
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).json({message: err.message});
    }
}

exports.getCurrentStudentDetailsDepartmentWise = async (req, res) => {
    try {
        const department = req.query.departmentId;
        const center = req.query.center;
        const batchNo = req.query.batchNo;
        
        let filter = '';
        const queryParams = [];

        if (batchNo) {
            filter += ' AND s.batchNo = ?';
            queryParams.push(batchNo);
        }
        if(center){
            filter += ' AND s.center = ?';
            queryParams.push(center);
        }
        if(department){
            filter += ' AND s.departmentId = ?'
            queryParams.push(department);
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
            s.departmentId,
            COUNT(DISTINCT s.student_id) AS total_students, 
            COUNT(DISTINCT CASE WHEN sl.login = TRUE THEN s.student_id END) AS logged_in_students,
            COUNT(DISTINCT CASE WHEN sl.feedback_time IS NOT NULL THEN s.student_id END) AS completed_student, 
            b.start_time, 
            s.batchdate,
            ${subjectCounts},
            ${subjectNames}
        FROM 
            students s
        LEFT JOIN batchdb b ON b.batchNo = s.batchNo
        LEFT JOIN studentlogs sl ON s.student_id = sl.student_id
        WHERE 
            1=1 ${filter}
        GROUP BY  
            s.batchNo, b.start_time, s.batchdate, s.center, s.departmentId
        ORDER BY 
            s.batchNo, s.center, s.departmentId ;
    `;

        const [results] = await connection.query(query, queryParams);
        console.log(results);
        // Convert date and time to Kolkata timezone
        results.forEach(result => {
            if (result.batchdate) {
                result.batchdate = moment(result.batchdate).tz('Asia/Kolkata').format('DD/MM/YYYY');
            }

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

