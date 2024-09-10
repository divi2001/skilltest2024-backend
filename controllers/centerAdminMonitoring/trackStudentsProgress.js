const connection = require('../../config/db1');
const StudentTrackDTO = require('../../dto/studentProgress');
const encryptionInterface = require('../../config/encrypt');

exports.getStudentsTrack = async (req, res) => {
    const { batchNo } = req.params;
    const examCenterCode = req.session.centerId;
    const {subject_name,loggedin} = req.query;
    console.log("exam center code: " + examCenterCode);
    console.log("batch no: " + batchNo);
    console.log("subject: " +subject_name);
    console.log("loggedin: "+ loggedin);
    if(!examCenterCode) return res.status(404).json({"message":"Center admin is not logged in"});
    
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
WHERE 1=1`;
    
    if (examCenterCode && batchNo) {
        query += ' AND s.center = ? AND s.batchNo = ?';
        queryParams.push(examCenterCode, batchNo);
    } else if (examCenterCode) {
        query += ' AND s.center = ?';
        queryParams.push(examCenterCode);
    }else if(subject_name){
        query += ' AND sub.subject_name = ?';
        queryParams.push(subject_name);
    }else if(loggedin){
         query+= 'AND  s.loggedin = ?';
         queryParams.push(loggedin);
    }

    try {
        const [results] = await connection.query(query, queryParams);
        console.log(results);

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
                    result.subject_name_short
                );
                
                if (typeof studentTrack.fullname === 'string') {
                    studentTrack.fullname = encryptionInterface.decrypt(studentTrack.fullname);
                }
                return studentTrack;
            });

            res.status(200).json(studentTrackDTOs);
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send(err.message);
    }
}