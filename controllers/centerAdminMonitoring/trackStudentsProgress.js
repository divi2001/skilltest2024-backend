const connection = require('../../config/db1');
const StudentTrackDTO = require('../../dto/studentProgress');
const encryptionInterface = require('../../config/encrypt');
const moment = require('moment-timezone');


// Helper function to format date to YYYY-MM-DD
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

exports.getStudentsTrack = async (req, res) => {
    // console.log('Starting getStudentsTrack function');
    const { batchNo } = req.params;
    const examCenterCode = req.session.centerId;
    let { subject_name, loginStatus, batchDate ,exam_type } = req.query;

    // console.log("Exam center code:", examCenterCode);
    // console.log("Batch no:", batchNo);
    // console.log("Subject:", subject_name);
    // console.log("Login status:", loginStatus);
    // console.log("exam type:" . exam_type);
    // console.log("Original Batch date:", batchDate);

   
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
WHERE s.center = ? `;


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

            res.status(200).json(studentTrackDTOs);
        } else {
            res.status(404).json({message: 'No records found!'});
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).json({message: err.message});
    }
};


exports.getStoredStages = async (req, res) => {
    const studentId = req.session.studentId;
    
    if (!studentId) {
        return res.status(400).json({
            error: 'Student ID is required'
        });
    }

    try {
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
                TrialTypewriting: 0, Typewriting: 0, ShorthandSummary: 0, TypingSummary: 0,
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
        res.status(500).json({error: 'Internal Server error'});
    }
};

exports.storeExamStage = async (req, res) => {

    const {examStage} = req.body;
    const studentId = req.session.studentId;
    
    if (!studentId || !examStage) {
        return res.status(400).json({
            error: 'Student ID and exam are required'
        })
    }

    const createQuery = `CREATE TABLE IF NOT EXISTS exam_stages (StudentId BIGINT, StudentInfo BOOLEAN DEFAULT 0, Instructions BOOLEAN DEFAULT 0, InputChecker BOOLEAN DEFAULT 0, HeadphoneTest BOOLEAN DEFAULT 0, ControllerPassword BOOLEAN DEFAULT 0, TrialPassage BOOLEAN DEFAULT 0, AudioPassageA BOOLEAN DEFAULT 0, TypingPassageA BOOLEAN DEFAULT 0, TrialTypewriting BOOLEAN DEFAULT 0, Typewriting BOOLEAN DEFAULT 0, ShorthandSummary BOOLEAN DEFAULT 0, TypingSummary BOOLEAN DEFAULT 0, FeedbackForm BOOLEAN DEFAULT 0, ThankYou BOOLEAN DEFAULT 0, FOREIGN KEY (StudentId) REFERENCES students(student_id));`
    
    
    // List of valid exam stages
    const validExamStages = [
        'StudentInfo', 'Instructions', 'InputChecker', 'HeadphoneTest',
        'ControllerPassword', 'TrialPassage', 'AudioPassageA', 'TypingPassageA',
        'TrialTypewriting', 'Typewriting', 'ShorthandSummary', 'TypingSummary',
        'FeedbackForm', 'ThankYou'
    ];

    if (!validExamStages.includes(examStage)){
        return res.status(400).json({error: 'Invalid exam stage'})
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

        res.status(200).json({ message: 'Exam stage updated successfully'})
    } catch(error) {
        console.error("Error updating the exam stage", error);
        res.status(500).json({error: 'Internal Server error'})
    }
}




