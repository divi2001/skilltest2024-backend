const connection = require('../../config/db1');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

exports.getpassages = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectsdb WHERE subjectId = ?';
    const typingQuery = "SELECT * FROM computerTyping WHERE subjectId = ? AND qset = ?";
    const logsQuery = "SELECT * FROM typingpassagelogs WHERE student_id = ?";

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        const student = students[0];

        const subjectId = student.subjectsId;
        const qset = student.qset;

        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        if (subjects.length === 0) {
            return res.status(404).send('Subject not found');
        }
        const subject = subjects[0];

        const [passages] = await connection.query(typingQuery, [subjectId, qset]);
        if (passages.length === 0) {
            return res.status(404).send('passage not found');
        }
        const passage = passages[0];

        let passageTimer = parseInt(subject.typing_timer);
        if (student.disability === 1) {
            passageTimer += 3;
        }

        const [logs] = await connection.query(logsQuery, [studentId]);
        
        let responseData = {
            subjectId: subject.subjectId,
            courseId: subject.courseId,
            subject_name: subject.subject_name,
            subject_name_short: subject.subject_name_short,
            Daily_Timer: subject.daily_timer,
            Passage_Timer: passageTimer.toString(),
            Demo_Timer: subject.demo_timer,
            trial_passage: passage.trial_passage,
            passage1: passage.passage_text,
            usertrial: '',
            userpassage: ''
        };

        if (logs.length > 0) {
            const log = logs[0];
            responseData.Demo_Timer = log.trial_time !== null ? 
                Math.min(parseInt(subject.demo_timer), log.trial_time).toString() : 
                subject.demo_timer;
            responseData.Passage_Timer = log.passage_time !== null ? 
                Math.min(passageTimer, log.passage_time).toString() : 
                passageTimer.toString();
            responseData.usertrial = log.trial_passage || '';
            responseData.userpassage = log.passage || '';
        }

        // console.log(responseData);
        res.send(responseData);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
exports.updateStudentLog = async (req, res) => {
    const studentId = req.session.studentId;
    const { passage_type } = req.body;

    // Validate input
    if (!passage_type || (passage_type !== 'trial' && passage_type !== 'passage')) {
        return res.status(400).send('Invalid data: Provide passage_type (trial or passage)');
    }

    const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // Validate the currentTime format
    if (!moment(currentTime, 'YYYY-MM-DD HH:mm:ss', true).isValid()) {
        return res.status(400).send('Invalid time format');
    }

    try {
        // Check if a record exists for this student
        const [existingRows] = await connection.query(
            'SELECT * FROM studentlogs WHERE student_id = ? ORDER BY id DESC LIMIT 1',
            [studentId]
        );

        let query, params;

        if (existingRows.length > 0) {
            // Update existing record
            const existingRecord = existingRows[0];
            const updateField = passage_type === 'trial' ? 'trial_passage_time' : 'typing_passage_time';

            query = `UPDATE studentlogs SET ${updateField} = ? WHERE id = ?`;
            params = [currentTime, existingRecord.id];
        } else {
            // Insert new record
            const fields = ['student_id'];
            const placeholders = ['?'];
            params = [studentId];

            if (passage_type === 'trial') {
                fields.push('last_trial_attempt');
                placeholders.push('?');
                params.push(currentTime);
            } else {
                fields.push('last_passage_attempt');
                placeholders.push('?');
                params.push(currentTime);
            }

            query = `INSERT INTO studentlogs (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        }

        const [result] = await connection.query(query, params);
        
        res.status(200).json({
            message: existingRows.length > 0 ? 'Student log updated successfully' : 'Student log inserted successfully',
            affectedRows: result.affectedRows
        });
    } catch (err) {
        console.error('Failed to upsert student log:', err);
        res.status(500).send(`Database error: ${err.message}`);
    }
};


exports.insertTypingPassageLog = async (req, res) => {
    const studentId = req.session.studentId;
    const { trial_time, trial_passage, passage_time, passage } = req.body;

    // Validate that we have at least some data to update
    if (!trial_time && !trial_passage && !passage_time && !passage) {
        return res.status(400).send('Invalid data: Provide at least one field to update');
    }

    const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // Validate the currentTime format
    if (!moment(currentTime, 'YYYY-MM-DD HH:mm:ss', true).isValid()) {
        return res.status(400).send('Invalid time format');
    }

    try {
        // First, check if a record exists for this student
        const [existingRows] = await connection.query(
            'SELECT * FROM typingpassagelogs WHERE student_id = ? ORDER BY time DESC LIMIT 1',
            [studentId]
        );

        let query, params;

        if (existingRows.length > 0) {
            // Update existing record
            const existingRecord = existingRows[0];
            const updateFields = [];
            params = [];

            if (trial_time !== undefined) {
                updateFields.push('trial_time = ?');
                params.push(trial_time);
            }
            if (trial_passage !== undefined) {
                updateFields.push('trial_passage = ?');
                params.push(trial_passage);
            }
            if (passage_time !== undefined) {
                updateFields.push('passage_time = ?');
                params.push(passage_time);
            }
            if (passage !== undefined) {
                updateFields.push('passage = ?');
                params.push(passage);
            }

            updateFields.push('time = ?');
            params.push(currentTime);

            query = `UPDATE typingpassagelogs SET ${updateFields.join(', ')} WHERE id = ?`;
            params.push(existingRecord.id);
        } else {
            // Insert new record
            const fields = ['student_id', 'time'];
            const placeholders = ['?', '?'];
            params = [studentId, currentTime];

            if (trial_time !== undefined) {
                fields.push('trial_time');
                placeholders.push('?');
                params.push(trial_time);
            }
            if (trial_passage !== undefined) {
                fields.push('trial_passage');
                placeholders.push('?');
                params.push(trial_passage);
            }
            if (passage_time !== undefined) {
                fields.push('passage_time');
                placeholders.push('?');
                params.push(passage_time);
            }
            if (passage !== undefined) {
                fields.push('passage');
                placeholders.push('?');
                params.push(passage);
            }

            query = `INSERT INTO typingpassagelogs (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        }

        const [result] = await connection.query(query, params);
        
        // Create zip files for trial_passage and passage
        const zipPromises = [];
        if (trial_passage) {
            zipPromises.push(createTypingPassageZip(studentId, 'trial', trial_passage));
        }
        if (passage) {
            zipPromises.push(createTypingPassageZip(studentId, 'passage', passage));
        }

        // Wait for all zip files to be created
        await Promise.all(zipPromises);

        res.status(200).json({
            message: existingRows.length > 0 ? 'Typing passage log updated successfully' : 'Typing passage log inserted successfully',
            affectedRows: result.affectedRows
        });
    } catch (err) {
        console.error('Failed to upsert typing passage log:', err);
        res.status(500).send(`Database error: ${err.message}`);
    }
};

const createTypingPassageZip = async (studentId, passageType, text) => {
    try {
        // Query the database to get examCenterCode and batchNo
        const [studentRows] = await connection.query(
            'SELECT center, batchNo FROM students WHERE student_id = ?',
            [studentId]
        );

        if (studentRows.length === 0) {
            throw new Error('Student not found');
        }

        const { center: examCenterCode, batchNo } = studentRows[0];

        const currentTime = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');
        const sanitizedPassageType = passageType.replace(/\s+/g, '_');
        const fileName = `${studentId}_${examCenterCode}_${currentTime}_${batchNo}_${sanitizedPassageType}`;
        const folderName = 'text_typing_passage_logs';
        const folderPath = path.join(__dirname, '..', folderName);

        // Create the folder if it doesn't exist
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const txtFilePath = path.join(folderPath, `${fileName}.txt`);
        const zipFilePath = path.join(folderPath, `${fileName}.zip`);

        // Write text to a file
        fs.writeFileSync(txtFilePath, text, 'utf8');

        // Create a zip file
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        return new Promise((resolve, reject) => {
            output.on('close', function () {
                // Clean up the text file after zipping
                try {
                    fs.unlinkSync(txtFilePath);
                } catch (unlinkErr) {
                    console.error('Failed to delete temporary text file:', unlinkErr);
                }
                resolve(zipFilePath);
            });

            archive.on('error', function (err) {
                reject(err);
            });

            archive.pipe(output);
            archive.file(txtFilePath, { name: `${fileName}.txt` });
            archive.finalize();
        });
    } catch (error) {
        console.error('Error in createTypingPassageZip:', error);
        throw error;
    }
};

exports.updateTypingPassageText = async (req, res) => {
    const studentId = req.session.studentId;
    const { trial_passage, passage } = req.body;

    if (!trial_passage && !passage) {
        return res.status(400).send('Invalid data: Provide at least one text field to update');
    }

    try {
        const [existingRows] = await connection.query(
            'SELECT * FROM typingpassage WHERE student_id = ? ORDER BY time DESC LIMIT 1',
            [studentId]
        );

        const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        if (!moment(currentTime, 'YYYY-MM-DD HH:mm:ss', true).isValid()) {
            return res.status(400).send('Invalid time format');
        }

        let query, params;

        if (existingRows.length > 0) {
            const existingRecord = existingRows[0];
            const updateFields = [];
            params = [];

            if (trial_passage !== undefined) {
                updateFields.push('trial_passage = ?');
                params.push(trial_passage);
            }
            if (passage !== undefined) {
                updateFields.push('passage = ?');
                params.push(passage);
            }

            if (updateFields.length === 0) {
                return res.status(400).send('No valid fields to update');
            }

            updateFields.push('time = ?');
            params.push(currentTime);

            query = `UPDATE typingpassage SET ${updateFields.join(', ')} WHERE id = ?`;
            params.push(existingRecord.id);
        } else {
            const fields = ['student_id'];
            const placeholders = ['?'];
            params = [studentId];

            if (trial_passage !== undefined) {
                fields.push('trial_passage');
                placeholders.push('?');
                params.push(trial_passage);
            }
            if (passage !== undefined) {
                fields.push('passage');
                placeholders.push('?');
                params.push(passage);
            }

            fields.push('time');
            placeholders.push('?');
            params.push(currentTime);

            query = `INSERT INTO typingpassage (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        }

        const [result] = await connection.query(query, params);

        // Create zip files for trial_passage and passage
        const zipPromises = [];
        if (trial_passage) {
            zipPromises.push(createTypingPassageZip(studentId, 'trial_passage', trial_passage));
        }
        if (passage) {
            zipPromises.push(createTypingPassageZip(studentId, 'passage', passage));
        }

        await Promise.all(zipPromises);

        res.status(200).json({
            message: existingRows.length > 0 ? 'Typing passage text updated successfully' : 'New typing passage record inserted successfully',
            affectedRows: result.affectedRows
        });
    } catch (err) {
        console.error('Failed to update/insert typing passage text:', err);
        res.status(500).send(`Error: ${err.message}`);
    }
};

exports.getFinalPassageLogs = async (req, res) => {
    const studentId = req.session.studentId;

    try {
        const [rows] = await connection.query(
            'SELECT trial_passage, passage FROM typingpassage WHERE student_id = ? ORDER BY time DESC LIMIT 1',
            [studentId]
        );

        if (rows.length > 0) {
            res.status(200).json({
                trial_passage: rows[0].trial_passage,
                passage: rows[0].passage
            });
        } else {
            res.status(404).json({ message: 'No passage logs found for this student' });
        }
    } catch (err) {
        console.error('Failed to retrieve final passage logs:', err);
        res.status(500).send(`Database error: ${err.message}`);
    }
};