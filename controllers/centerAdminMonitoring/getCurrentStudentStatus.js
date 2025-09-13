const connection = require('../../config/db1');
const moment = require('moment-timezone');

exports.getCurrentStudentDetails = async (req, res) => {
    try {
        const center = req.session.centerId;
        const batchNo = req.query.batchNo;
        const departmentId = req.query.departmentId;

        let filter = '';
        const queryParams = [center];

        if (batchNo) { 
            filter += ' AND s.batchNo = ?';
            queryParams.push(batchNo);
        }

        if (departmentId) {
            filter += ' AND s.departmentId = ?';
            queryParams.push(departmentId);
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
                s.departmentId,
                d.departmentName as department_name,
                COUNT(DISTINCT s.student_id) AS total_students, 
                COUNT(DISTINCT CASE WHEN sl.login = TRUE THEN s.student_id END) AS logged_in_students,
                COUNT(DISTINCT CASE WHEN sl.feedback_time IS NOT NULL THEN s.student_id END) AS completed_student, 
                b.start_time, 
                COALESCE(b.batchdate, s.batchdate) as batchdate,
                ${subjectCounts},
                ${subjectNames}
            FROM 
                students s
            LEFT JOIN batchdb b ON b.batchNo = s.batchNo AND b.departmentId = s.departmentId
            LEFT JOIN studentlogs sl ON s.student_id = sl.student_id
            LEFT JOIN departmentdb d ON d.departmentId = s.departmentId
            WHERE 
                s.center = ? ${filter}
            GROUP BY  
                s.batchNo, s.departmentId, d.departmentName, b.start_time, COALESCE(b.batchdate, s.batchdate)
            ORDER BY 
                s.departmentId, s.batchNo, b.start_time;
        `;

        console.log('Query:', query);
        console.log('Query Params:', queryParams);

        const [results] = await connection.query(query, queryParams);

        // Convert date and time to Kolkata timezone with better error handling
        results.forEach(result => {
            // Handle batch date formatting with better error handling
            if (result.batchdate) {
                try {
                    // Check if it's already a Date object
                    if (result.batchdate instanceof Date) {
                        result.batchdate = moment(result.batchdate).tz('Asia/Kolkata').format('YYYY-MM-DD');
                    } else if (typeof result.batchdate === 'string') {
                        // Try to parse the string date
                        const parsedDate = moment(result.batchdate);
                        if (parsedDate.isValid()) {
                            result.batchdate = parsedDate.tz('Asia/Kolkata').format('YYYY-MM-DD');
                        } else {
                            result.batchdate = result.batchdate; // Keep original if can't parse
                        }
                    }
                } catch (error) {
                    console.log('Error formatting date:', error);
                    result.batchdate = result.batchdate; // Keep original if error
                }
            } else {
                result.batchdate = 'N/A'; // Set default value if null
            }

            // Handle start_time formatting
            if (result.start_time) {
                try {
                    // If it's already formatted correctly, keep it
                    if (typeof result.start_time === 'string' && result.start_time.includes(':')) {
                        // Keep as is if already in HH:MM:SS format
                    } else {
                        result.start_time = moment(result.start_time, 'HH:mm:ss').format('HH:mm:ss');
                    }
                } catch (error) {
                    console.log('Error formatting time:', error);
                }
            }

            // Restructure subject data for easier consumption
            result.subjects = subjects.map(sub => ({
                id: sub.subjectId,
                name: result[`subject_${sub.subjectId}_name`],
                count: result[`subject_${sub.subjectId}_count`] || 0,
                loggedIn: result[`subject_${sub.subjectId}_logged_in`] || 0,
                completed: result[`subject_${sub.subjectId}_completed`] || 0
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
        console.log('Error details:', error);
        res.status(500).json({ "message": "Internal Server Error!!" });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const center = req.session.centerId;
        
        const query = `
            SELECT DISTINCT d.departmentId, d.departmentName as department_name
            FROM departmentdb d
            INNER JOIN students s ON s.departmentId = d.departmentId
            WHERE s.center = ?
            ORDER BY d.departmentId;
        `;
        
        const [results] = await connection.query(query, [center]);
        res.status(200).json({ departments: results });
    } catch (error) {
        console.log('Error details:', error);
        res.status(500).json({ "message": "Internal Server Error!!" });
    }
};