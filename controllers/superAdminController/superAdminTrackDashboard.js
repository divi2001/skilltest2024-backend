const connection = require('../../config/db1');
const StudentTrackDTO = require("../../dto/studentProgress"); 
const moment = require('moment-timezone');

function formatDate(dateString) {
    return moment(dateString).tz('Asia/Kolkata').format('YYYY-MM-DD')
}
function convertDateFormat(dateString) {
    // Expects YYYY-MM-DD
    const [day, month, year] = dateString.split('/');
    return moment.tz(`${day}/${month}/${year}`, 'YYYY-MM-DD', 'Asia/Kolkata').toDate();
}
exports.getAllStudentsTrack = async (req,res) => {
    const adminId = req.params.adminid;
    
    // Change from req.query to req.body
    let { subject_name, loginStatus, batchDate , batchNo, center , exam_type , departmentId } = req.body;
    
    console.log("Received filters from req.body:", {
        batchNo,
        subject_name,
        loginStatus,
        exam_type,
        center,
        batchDate,
        departmentId
    });

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
WHERE 1=1`;

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

    if (departmentId && departmentId.toString().trim() !== '') {
        query += ' AND s.departmentId = ?';
        queryParams.push(departmentId.toString().trim());
        console.log("✅ Applied departmentId filter:", departmentId.toString().trim());
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
        
        query += ' AND DATE(s.batchdate) = ?';
        
        let formattedDate = inputDate;
        if (inputDate.includes('/')) {
            const [day, month, year] = inputDate.split('/');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        queryParams.push(formattedDate);
        console.log("✅ Applied batchDate filter:", formattedDate);
    }

    console.log('🔍 Final query:', query);
    console.log('🔍 Query parameters:', queryParams);

    try {
        const [results] = await connection.query(query, queryParams);
        console.log(`✅ Query returned ${results.length} results`);

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
                    result.batchdate,
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
            res.status(404).json({message: 'No records found!'});
        }
    } catch (err) {
        console.error("❌ Database query error:", err);
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

        // FIXED: Count DISTINCT students per subject
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
            s.departmentId,
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
            1=1 ${filter}
        GROUP BY  
            s.batchNo, s.batchdate, s.center, s.departmentId
        ORDER BY 
            s.batchNo, s.center, s.departmentId;
    `;

        const [results] = await connection.query(query, queryParams);
        console.log('Query results:', results);
        
        // Convert date and time to Kolkata timezone
        results.forEach(result => {
            if (result.batchdate) {
                result.batchdate = moment(result.batchdate).tz('Asia/Kolkata').format('YYYY-MM-DD');
            }

            // Restructure subject data for easier consumption
            result.subjects = subjects.map(sub => ({
                id: sub.subjectId,
                name: result[`subject_${sub.subjectId}_name`],
                count: parseInt(result[`subject_${sub.subjectId}_count`]) || 0,  // Convert to integer
                loggedIn: parseInt(result[`subject_${sub.subjectId}_logged_in`]) || 0,  // Convert to integer
                completed: parseInt(result[`subject_${sub.subjectId}_completed`]) || 0  // Convert to integer
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
