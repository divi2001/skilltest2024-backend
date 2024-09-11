const connection = require('../../config/db1');
const StudentTrackDTO = require('../../dto/studentProgress');
const encryptionInterface = require('../../config/encrypt');

exports.getStudentsTrack = async (req, res) => {
    console.log('Starting getStudentsTrack function');
    const { batchNo } = req.params;
    const examCenterCode = req.session.centerId;
    const { subject_name, loginStatus } = req.query;
    
    console.log("Exam center code:", examCenterCode);
    console.log("Batch no:", batchNo);
    console.log("Subject:", subject_name);
    console.log("Login status:", loginStatus);

    if (!examCenterCode) {
        console.log('Center admin is not logged in');
        return res.status(404).json({"message":"Center admin is not logged in"});
    }
    
    const queryParams = [examCenterCode];
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
    s.done,
    s.Reporting_Time,
    s.start_time,
    s.end_time,
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
        MAX(feedback_time) as feedback_time
    FROM 
        studentlogs
    GROUP BY 
        student_id
) sl ON s.student_id = sl.student_id
WHERE s.center = ?`;

    console.log('Base query created');

    if (batchNo) {
        query += ' AND s.batchNo = ?';
        queryParams.push(batchNo);
        console.log('Added batch condition to query');
    } 

    if (subject_name) {
        query += ' AND sub.subject_name = ?';
        queryParams.push(subject_name);
        console.log('Added subject condition to query');
    }

    if (loginStatus) {
        if (loginStatus === 'loggedin') {
            query += ' AND s.loggedin = 1';
            console.log('Added condition for logged-in students');
        } else if (loginStatus === 'loggedout') {
            query += ' AND s.loggedin = 0';
            console.log('Added condition for logged-out students');
        }
    }

    // console.log('Final query:', query);
    console.log('Query parameters:', queryParams);

    try {
        console.log('Executing database query');
        const [results] = await connection.query(query, queryParams);
        console.log('Query results count:', results.length);

        if (results.length > 0) {
            console.log('Processing results');
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
                    result.subject_name_short
                );
                
                if (typeof studentTrack.fullname === 'string') {
                    studentTrack.fullname = encryptionInterface.decrypt(studentTrack.fullname);
                    console.log('Decrypted fullname for student:', studentTrack.student_id);
                }
                return studentTrack;
            });

            console.log('Sending response');
            res.status(200).json(studentTrackDTOs);
        } else {
            console.log('No records found');
            res.status(404).send('No records found!');
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send(err.message);
    }
    console.log('Ending getStudentsTrack function');
}