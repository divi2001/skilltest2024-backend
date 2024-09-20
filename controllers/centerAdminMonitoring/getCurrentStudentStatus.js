const connection = require('../../config/db1');
const moment = require('moment-timezone');

exports.getCurrentStudentDetails = async (req, res) => {
    try {
        const center = req.session.centerId;
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
        const subjectCounts = subjects.map(sub => 
            `SUM(CASE WHEN s.subjectsId = ${sub.subjectId} THEN 1 ELSE 0 END) AS subject_${sub.subjectId}_count`
        ).join(', ');

        const subjectNames = subjects.map(sub => 
            `'${sub.subject_name}' AS subject_${sub.subjectId}_name`
        ).join(', ');

        let query = `
            SELECT 
                s.batchNo, 
                COUNT(s.student_id) AS total_students, 
                SUM(CASE WHEN s.loggedin = TRUE THEN 1 ELSE 0 END) AS logged_in_students,
                SUM(CASE WHEN s.done = TRUE THEN 1 ELSE 0 END) AS completed_student, 
                s.start_time, 
                s.batchdate,
                ${subjectCounts},
                ${subjectNames}
            FROM 
                students s
            WHERE 
                s.center = ? ${filter}
            GROUP BY  
                s.batchNo, s.start_time, s.batchdate
            ORDER BY 
                s.batchNo;
        `;

        console.log(query);
        const [results] = await connection.query(query, queryParams);

        // Convert date and time to Kolkata timezone
        results.forEach(result => {

            // const kolkataDateTime = combinedMoment.tz('Asia/Kolkata');

            result.batchdate =  moment(result.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY')
            // result.start_time =  moment(result.start_time)

            // Restructure subject data for easier consumption
            result.subjects = subjects.map(sub => ({
                id: sub.subjectId,
                name: result[`subject_${sub.subjectId}_name`],
                count: result[`subject_${sub.subjectId}_count`]
            }));

            // Remove individual subject fields
            subjects.forEach(sub => {
                delete result[`subject_${sub.subjectId}_name`];
                delete result[`subject_${sub.subjectId}_count`];
            });
        });

        console.log(results);
        res.status(200).json({ results });
    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": "Internal Server Error!!" });
    }
};