const connection = require('../../config/db1');
const StudentTrackDTO = require('../../dto/studentProgress');
const encryptionInterface = require('../../config/encrypt');

// Helper function to format date to YYYY-MM-DD
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

exports.getStudentsTrack = async (req, res) => {
    console.log('Starting getStudentsTrack function');
    const { batchNo } = req.params;
    const examCenterCode = req.session.centerId;
    let { subject_name, loginStatus, batchDate ,exam_type } = req.query;

    console.log("Exam center code:", examCenterCode);
    console.log("Batch no:", batchNo);
    console.log("Subject:", subject_name);
    console.log("Login status:", loginStatus);
    console.log("exam type:" . exam_type);
    console.log("Original Batch date:", batchDate);

    if (batchDate) {
        batchDate = formatDate(batchDate);
        console.log("Formatted Batch date:", batchDate);
    }

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
    s.batchdate,
    s.done,
    s.Reporting_Time,
    s.start_time,
    s.end_time,
    s.batchdate,
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

// MAX(trial_passage_time) as trial_passage_time,
// MAX(typing_passage_time) as typing_passage_time,
    if (batchNo) {
        query += ' AND s.batchNo = ?';
        queryParams.push(batchNo);
    } 

    if (subject_name) {
        query += ' AND sub.subject_name = ?';
        queryParams.push(subject_name);
    }

    if (loginStatus) {
        if (loginStatus === 'loggedin') {
            query += ' AND s.loggedin = 1';
        } else if (loginStatus === 'loggedout') {
            query += ' AND s.loggedin = 0';
        }
    }

    if(exam_type){
        if(exam_type ==='shorthand'){
            query+= ' AND s.IsShorthand = 1'
        }
        else if (exam_type === 'typewriting'){
            query+=' And s.IsTypewriting = 1'
        }
        else if(exam_type === 'both'){
            query+=' AND s.IsShorthand = 1 And s.IsTypewriting = 1'
        }
    }

    if (batchDate) {
        query += ' AND DATE(s.batchdate) = ?';
        queryParams.push(batchDate);
    }
    // sl.trial_passage_time,
    // sl.typing_passage_time,
    // console.log('Final query:', query);
    console.log('Query parameters:', queryParams);

    try {
        const [results] = await connection.query(query, queryParams);
        console.log('Query result:', results);

        if (results.length > 0) {
            const studentTrackDTOs = results.map(result => {
                const studentTrack = new StudentTrackDTO(
                    result.student_id,
                    result.center,
                    result.fullname,
                    result.batchNo,
                    result.trial_passage_time,
                    result.typing_passage_time,
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
                    result.batchdate
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
        console.error("Database query error:", err);
        res.status(500).json({message: err.message});
    }
};

