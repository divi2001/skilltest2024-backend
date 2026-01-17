const connection = require('../config/db1'); // Adjust path
const { encrypt } = require('../config/encrypt');

const BATCH_NO = 100;
const SUBJECTS = [40, 41]; // Subjects
const DEFAULT_PASSWORD = 'mock123';

// Generate mock data in memory for preview
exports.previewMockData = async (req, res) => {
    try {
        const { batchdate, batch_year, studentsPerSubject, departmentId, qset, reporting_time, start_time, end_time, start_from_one } = req.body;
        const countPerSubject = parseInt(studentsPerSubject) || 100;

        // Get centers
        const [centers] = await connection.query('SELECT center FROM examcenterdb');
        if (!centers.length) return res.status(400).json({ message: 'No centers found.' });

        let previewData = [];

        for (const centerRow of centers) {
            const centerId = centerRow.center;

            let studentCounter = 1;

            // If start_from_one is NOT requested, check DB for last ID
            if (!start_from_one) {
                // Get last student ID for this center (across all subjects) to ensure uniqueness
                const [lastStudent] = await connection.query(
                    'SELECT student_id FROM students WHERE center = ? AND LENGTH(student_id) <= 9 ORDER BY student_id DESC LIMIT 1',
                    [centerId]
                );

                if (lastStudent.length > 0) {
                    // Extract numeric sequence from student_id
                    studentCounter = parseInt(lastStudent[0].student_id.toString().slice(centerId.toString().length)) + 1;
                }
            }

            for (const subjectId of SUBJECTS) {
                // Generate students
                for (let i = 0; i < countPerSubject; i++) {
                    const studentId = parseInt(`${centerId}${studentCounter.toString().padStart(3, '0')}`);
                    previewData.push({
                        studentId,
                        fullname: `Mock Student ${centerId}-${subjectId}-${studentCounter}`,
                        password: DEFAULT_PASSWORD,
                        centerId,
                        subjectId,
                        batchNo: BATCH_NO,
                        batchdate: batchdate || '2025-07-09',
                        batch_year: batch_year || '2025',
                        departmentId: departmentId || 6, // Default to 6 if not provided
                        qset: qset || '',
                        reporting_time: reporting_time || '10:00:00',
                        start_time: start_time || '11:30:00',
                        end_time: end_time || '13:00:00'
                    });
                    studentCounter++; // Increment for the next student
                }
            }
        }

        res.json({ previewData, totalStudents: previewData.length });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating preview' });
    }
};

// Helper: Insert data into DB (Optimized)
const insertMockData = async (data, mode) => {
    if (!data.length) return { inserted: 0 };

    const encryptedPassword = encrypt(DEFAULT_PASSWORD);
    const connection = await require('../config/db1').getConnection(); // Get connection from pool

    try {
        await connection.beginTransaction();

        // 1. Handle REPLACE mode: Delete existing records efficiently
        if (mode === 'replace') {
            const uniqueGroups = new Set();
            data.forEach(s => uniqueGroups.add(`${s.centerId}-${s.subjectId}-${s.departmentId}`));

            for (const group of uniqueGroups) {
                const [centerId, subjectId, deptId] = group.split('-');
                await connection.query(
                    'DELETE FROM students WHERE center = ? AND batchNo = ? AND subjectsId = ? AND departmentId = ?',
                    [centerId, BATCH_NO, subjectId, deptId]
                );
            }
        }

        // 2. Prepare Bulk Insert Data
        // We use INSERT IGNORE to handle 'append' mode duplicates automatically
        const values = data.map(s => [
            s.studentId,
            encryptedPassword,
            s.fullname,
            s.centerId,
            BATCH_NO,
            s.batchdate,
            s.subjectId,
            1, // courseId
            s.batch_year,
            0, // loggedin
            0, // done
            s.centerId, // center
            s.departmentId,
            0, // disability
            1, // IsShorthand
            0,  // IsTypewriting
            s.qset, // qset
            s.reporting_time,
            s.start_time,
            s.end_time
        ]);

        if (values.length > 0) {
            const insertQuery = `INSERT IGNORE INTO students 
            (student_id, password, fullname, instituteId, batchNo, batchdate, subjectsId, courseId, batch_year, loggedin, done, center, departmentId, disability, IsShorthand, IsTypewriting, qset, reporting_time, start_time, end_time) 
            VALUES ?`;

            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
        return { inserted: values.length };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Insert new mock data (replace old)
exports.insertMockDataReplace = async (req, res) => {
    try {
        const { previewData } = req.body;
        if (!previewData || !previewData.length) return res.status(400).json({ message: 'No data provided' });

        await insertMockData(previewData, 'replace');
        res.json({ message: 'Mock data replaced successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error inserting mock data' });
    }
};

// Insert new mock data (append)
exports.insertMockDataAppend = async (req, res) => {
    try {
        const { previewData } = req.body;
        if (!previewData || !previewData.length) return res.status(400).json({ message: 'No data provided' });

        await insertMockData(previewData, 'append');
        res.json({ message: 'Mock data appended successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error appending mock data' });
    }
};
