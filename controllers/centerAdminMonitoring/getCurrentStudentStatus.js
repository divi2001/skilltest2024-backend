const connection = require('../../config/db1');
const moment = require('moment-timezone');

exports.getCurrentStudentDetails = async (req, res) => {
    try {
        const center = req.session.centerId
        const batchNo = req.query.batchNo;

        let filter = '';
        const queryParams = [center];

        if (batchNo) { 
            filter += ' AND s.batchNo = ?';
            queryParams.push(batchNo);
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
            s.batchNo, 
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
            s.center = ? ${filter}
        GROUP BY  
            s.batchNo, b.start_time, s.batchdate
        ORDER BY 
            s.batchNo;
    `;

        const [results] = await connection.query(query, queryParams);

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