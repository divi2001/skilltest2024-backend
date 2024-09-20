const connection = require('../config/db1');
const path = require('path');
const fs1 = require('fs');
const archiver = require('archiver');
const moment = require('moment-timezone');
const { encrypt, decrypt } = require('../config/encrypt');

exports.updateStudentBatchDates = async (req, res) => {
    try {
        // SQL query to update students table
        const updateQuery = `
            UPDATE students s
            INNER JOIN batchdb b ON s.batchNo = b.batchNo
            SET s.batchdate = b.batchdate
        `;

        // Execute the query
        await connection.query(updateQuery);

        res.send('Successfully updated batch dates for all students');
    } catch (err) {
        console.error('Failed to update student batch dates:', err);
        res.status(500).send('Internal server error');
    }
};

exports.updateAudioLogTime = async (req, res) => {
    const { audioType } = req.body;
    const studentId = req.session.studentId;
    console.log(studentId, audioType)

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!audioType) {
        return res.status(400).send('Audio type is required');
    }

    // Map audioType to database column names
    const audioTypeMap = {
        trial: 'trial_time',
        passageA: 'audio1_time',
        passageB: 'audio2_time'
    };

    const columnName = audioTypeMap[audioType];

    if (!columnName) {
        return res.status(400).send('Invalid audio type');
    }

    // Get the current time in Kolkata, India
    const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    try {
        const updateAudioLogQuery = `
            UPDATE studentlogs
            SET ${columnName} = ?
            WHERE student_id = ?
        `;

        await connection.query(updateAudioLogQuery, [currentTime, studentId]);

        res.send(`Updated ${columnName} for student ${studentId} successfully!`);
    } catch (err) {
        // console.error('Failed to update audio log time:', err);
        res.status(500).send('Internal server error');
    }
};



exports.updatePassagewLogTime = async (req, res) => {
    const { audioType } = req.body;
    const studentId = req.session.studentId;
    console.log(studentId, audioType)

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!audioType) {
        return res.status(400).send('Audio type is required');
    }

    // Map audioType to database column names
    const audioTypeMap = {

        passageA: 'passage1_time',
        passageB: 'passage2_time'
    };

    const columnName = audioTypeMap[audioType];

    if (!columnName) {
        return res.status(400).send('Invalid audio type');
    }

    // Get the current time in Kolkata, India
    const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    try {
        const updateAudioLogQuery = `
            UPDATE studentlogs
            SET ${columnName} = ?
            WHERE student_id = ?
        `;

        await connection.query(updateAudioLogQuery, [currentTime, studentId]);

        res.send(`Updated ${columnName} for student ${studentId} successfully!`);
    } catch (err) {
        console.error('Failed to update audio log time:', err);
        res.status(500).send('Internal server error');
    }
};

const columnsToKeep = ['student_id', 'instituteId', 'batchNo', 'batchdate',
    'fullname', 'subjectsId', 'courseId', 'batch_year', 'loggedin', 'done',
    'PHOTO', 'center', 'reporting_Time', 'start_time', 'end_time', 'DAY',
    'qset', 'base64']




exports.getStudentDetails = async (req, res) => {
    // console.log('Starting getStudentDetails function');
    const studentId = req.session.studentId;
    console.log('Student ID from session:', studentId);

    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectsdb WHERE subjectId = ?';


    try {
        // console.log('Querying student data');
        const [students] = await connection.query(studentQuery, [studentId]);

        if (students.length === 0) {
            console.log('Student not found');
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        
        // console.log('Student data retrieved');

        const batchDate1 = student.batchdate
        console.log(batchDate1)
        const padZero = (num) => num.toString().padStart(2, '0');

        // Convert to dd:mm:yyyy format
        const formattedDate = `${padZero(batchDate1.getDate())}/${padZero(batchDate1.getMonth() + 1)}/${batchDate1.getFullYear()}`;
        console.log('Parsed batchdate:',batchDate1);


        let subjectsId;
        try {
            console.log('Parsing subjectsId');
            subjectsId = JSON.parse(student.subjectsId);
            console.log('Parsed subjectsId:', subjectsId);
        } catch (err) {
            console.error('Error parsing subjectsId:', err);
            return res.status(500).send('Invalid subjectsId format');
        }

        const subjectId = subjectsId;
        console.log('First subject ID:', subjectId);

        console.log('Querying subject data');
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        console.log(subjects)

        if (subjects.length === 0) {
            console.log('Subject not found');
            return res.status(404).send('Subject not found');

        }
        const subject = subjects[0];
        console.log('Subject data retrieved');

        console.log('Preparing response data');
        const responseData = {
            ...student,
            ...subject,
            photo: student.base64,
            batchdate :formattedDate
        };




        console.log('Response data prepared');

        console.log('Encrypting response data');
        const encryptedResponseData = {};
        for (let key in responseData) {
            if (responseData.hasOwnProperty(key)) {
                if (responseData[key] === null) {
                    encryptedResponseData[key] = encrypt('null');
                } else {
                    encryptedResponseData[key] = encrypt(responseData[key].toString());
                }
            }
        }
        console.log('Response data encrypted');

        console.log('Sending encrypted response');
        res.send(encryptedResponseData);
    } catch (err) {
        console.error('Error in getStudentDetails:', err);
        res.status(500).send('Failed to fetch student details');
    }
    console.log('Ending getStudentDetails function');
};


exports.getaudios = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectsdb WHERE subjectId = ?';
    const audioQuery = "SELECT * FROM audiodb WHERE subjectId = ? AND qset = ?";

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        
        // Extract subjectsId and parse it to an array
        const subjectsId = student.subjectsId;
        const qset = student.qset;
        console.log(qset);

        // Assuming you want the first subject from the array
        const subjectId = student.subjectsId;
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        if (subjects.length === 0) {
            return res.status(404).send('Subject not found');
        }
        const subject = subjects[0];

        const [auidos] = await connection.query(audioQuery, [subjectId, qset]);
        if (auidos.length === 0) {
            return res.status(404).send('audio not found');
        }
        const audio = auidos[0];

        const responseData = {
            subjectId: subject.subjectId,
            courseId: subject.courseId,
            subject_name: subject.subject_name,
            subject_name_short: subject.subject_name_short,
            Daily_Timer: subject.daily_timer,
            Passage_Timer: student.disability === 1 ? subject.disability_passage_timer : subject.passage_timer,
            Demo_Timer: subject.demo_timer,
            audio1: audio.audio1,
            passage1: audio.passage1,
            audio2: audio.audio2,
            passage2: audio.passage2,
            testaudio: audio.testaudio   
        };
        // console.log("Original responseData:", responseData);
        
        const encryptedResponseData = {};
        const nullFields = [];
        
        for (let key in responseData) {
            if (responseData.hasOwnProperty(key)) {
                if (responseData[key] === null) {
                    nullFields.push(key);
                    encryptedResponseData[key] = null;
                } else {
                    encryptedResponseData[key] = encrypt(responseData[key].toString());
                }
            }
        }
        
        console.log("Null fields:", nullFields);

        res.send(encryptedResponseData);
    } catch (err) {
        // console.error('Failed to fetch student details:', err);
        res.status(500).send(err.message);
    }
};

exports.updateAudioLogs = async (req, res) => {
    const studentId = req.session.studentId;
    const { audio_type, percentage } = req.body;


    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!audio_type || !['trial', 'passageA', 'passageB'].includes(audio_type)) {
        return res.status(400).send('Valid audio type is required');
    }

    const findAudioLogQuery = `SELECT * FROM audiologs WHERE student_id = ?`;
    const updateAudioLogQuery = `UPDATE audiologs SET ${audio_type} = ? WHERE student_id = ?`;

    let insertAudioLogQuery;
    if (audio_type === 'trial') {
        insertAudioLogQuery = `INSERT INTO audiologs (student_id, trial, passageA, passageB) VALUES (?, ?, 0, 0)`;
    } else if (audio_type === 'passageA') {
        insertAudioLogQuery = `INSERT INTO audiologs (student_id, trial, passageA, passageB) VALUES (?, 0, ?, 0)`;
    } else if (audio_type === 'passageB') {
        insertAudioLogQuery = `INSERT INTO audiologs (student_id, trial, passageA, passageB) VALUES (?, 0, 0, ?)`;
    }

    try {
        const [rows] = await connection.query(findAudioLogQuery, [studentId]);

        if (rows.length > 0) {
            const existingLog = rows[0];

            if (percentage === 0 && existingLog[audio_type] !== 0) {
                return res.status(400).send(`Cannot update ${audio_type} to 0 as existing log is non-zero.`);
            }

            await connection.query(updateAudioLogQuery, [percentage, studentId]);
        } else {
            await connection.query(insertAudioLogQuery, [studentId, percentage]);
        }

        const responseData = {
            student_id: studentId,
            audio_type: audio_type,
            percentage: percentage // Stored as a number
        };

        res.send(responseData);
    } catch (err) {
        // console.error('Failed to update audio logs:', err);
        res.status(500).send(err.message);
    }
};



exports.getAudioLogs = async (req, res) => {
    const studentId = req.session.studentId;


    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    const findAudioLogQuery = `SELECT * FROM audiologs WHERE student_id = ?`;

    try {
        const [rows] = await connection.query(findAudioLogQuery, [studentId]);

        if (rows.length > 0) {

            const audioLogs = rows[0];

            // Convert null values to 0
            audioLogs.trial = audioLogs.trial || 0;
            audioLogs.passageA = audioLogs.passageA || 0;
            audioLogs.passageB = audioLogs.passageB || 0;

            // Check if passageA or passageB is null and set them to 0
            if (audioLogs.passageA === null) {
                audioLogs.passageA = 0;
            }
            if (audioLogs.passageB === null) {
                audioLogs.passageB = 0;
            }

            // Check if any audio percentage is 100 and set it to 95
            if (audioLogs.trial >= 98) {
                audioLogs.trial = 95;
            }
            if (audioLogs.passageA >=98) {
                audioLogs.passageA = 95;
            }
            if (audioLogs.passageB >=98) {
                audioLogs.passageB = 95;
            }

            res.send(audioLogs);

        } else {
            res.json({
                trial: 0,
                passageA: 0,
                passageB: 0
            });
        }
    } catch (err) {
        // console.error('Failed to fetch audio logs:', err);
        res.status(500).send('Failed to fetch student details:');
    }
};



exports.updatePassageFinalLogs = async (req, res) => {
    const studentId = req.session.studentId;
    const { passage_type, text, mac } = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!passage_type || !['passageA', 'passageB'].includes(passage_type)) {
        return res.status(400).send('Valid passage type is required');
    }

    if (!mac) {
        return res.status(400).send('MAC address is required');
    }

    const findStudentQuery = `SELECT center, batchNo FROM students WHERE student_id = ?`;
    const findAudioLogQuery = `SELECT * FROM finalPassageSubmit WHERE student_id = ?`;
    const updateAudioLogQuery = `UPDATE finalPassageSubmit SET ${passage_type} = ? WHERE student_id = ?`;
    const insertAudioLogQuery = `INSERT INTO finalPassageSubmit (student_id, ${passage_type}) VALUES (?, ?)`;

    try {
        // Query the database to get examCenterCode and batchNo
        const [studentRows] = await connection.query(findStudentQuery, [studentId]);

        if (studentRows.length === 0) {
            return res.status(404).send('Student not found');
        }

        const { center: examCenterCode, batchNo } = studentRows[0];

        const [rows] = await connection.query(findAudioLogQuery, [studentId]);

        if (rows.length > 0) {
            await connection.query(updateAudioLogQuery, [text, studentId]);
        } else {
            await connection.query(insertAudioLogQuery, [studentId, text]);
        }

        const currentTime = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');
        const sanitizedPassageType = passage_type.replace(/\s+/g, '_');
        const fileName = `${studentId}_${examCenterCode}_${currentTime}_${batchNo}_${sanitizedPassageType}_${mac}`;
        const folderName = 'typing_passage_logs';
        const folderPath = path.join(__dirname, '..', folderName);

        // Create the folder if it doesn't exist
        if (!fs1.existsSync(folderPath)) {
            fs1.mkdirSync(folderPath, { recursive: true });
        }

        const txtFilePath = path.join(folderPath, `${fileName}.txt`);
        const zipFilePath = path.join(folderPath, `${fileName}.zip`);

        // Write text to a file
        fs1.writeFileSync(txtFilePath, text, 'utf8');

        // Create a zip file
        const output = fs1.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', function () {
            // Clean up the text file after zipping
            try {
                fs1.unlinkSync(txtFilePath);
            } catch (unlinkErr) {
                console.error('Failed to delete temporary text file:', unlinkErr);
            }

            const responseData = {
                student_id: studentId,
                passage_type: passage_type,
                text: text
            };

            res.send(responseData);
        });

        archive.on('error', function (err) {
            console.error('Archiver error:', err);
            // Don't throw the error, just log it
        });

        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            } else {
                console.error('Archiver warning:', err);
            }
        });

        archive.pipe(output);
        archive.file(txtFilePath, { name: `${fileName}.txt` });
        archive.finalize();

    } catch (err) {
        console.error('Failed to update passage final logs:', err);
        res.status(500).send('An error occurred while processing your request');
    }
};

exports.getPassageFinalLogs = async (req, res) => {
    const studentId = req.session.studentId;
    const { passage_type } = req.query;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!passage_type || !['passageA', 'passageB'].includes(passage_type)) {
        return res.status(400).send('Valid passage type is required');
    }

    const findPassageLogQuery = `SELECT ${passage_type} FROM finalPassageSubmit WHERE student_id = ?`;

    try {
        const [rows] = await connection.query(findPassageLogQuery, [studentId]);

        if (rows.length === 0) {
            return res.status(404).send('Passage log not found for this student');
        }

        const text = rows[0][passage_type];

        if (!text) {
            return res.status(404).send(`No ${passage_type} found for this student`);
        }

        const responseData = {
            student_id: studentId,
            passage_type: passage_type,
            text: text
        };

        res.json(responseData);

    } catch (err) {
        console.error('Failed to fetch passage final logs:', err);
        res.status(500).send('An error occurred while processing your request');
    }
};


exports.feedback = async (req, res) => {
    const studentId = req.session.studentId;
    const feedbackData = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS feedbackdb (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(255),
            ${Object.keys(feedbackData).map(key => `${key} VARCHAR(255)`).join(', ')}
        )
    `;
    const findLogQuery = `SELECT * FROM feedbackdb WHERE student_id = ?`;
    const updateLogQuery = `UPDATE feedbackdb SET ${Object.keys(feedbackData).map(key => `${key} = ?`).join(', ')} WHERE student_id = ?`;
    const insertLogQuery = `INSERT INTO feedbackdb (student_id, ${Object.keys(feedbackData).join(', ')}) VALUES (?, ${Object.keys(feedbackData).map(() => '?').join(', ')})`;

    try {
        // Create the feedbackdb table if it doesn't exist
        await connection.query(createTableQuery);

        const [rows] = await connection.query(findLogQuery, [studentId]);

        if (rows.length > 0) {
            await connection.query(updateLogQuery, [...Object.values(feedbackData), studentId]);
        } else {
            await connection.query(insertLogQuery, [studentId, ...Object.values(feedbackData)]);
        }

        const responseData = {
            student_id: studentId,
            ...feedbackData
        };
        console.log('Feedback updated:', responseData);

        // Update the feedback_time in the studentlogs table
        const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        const updateFeedbackTimeQuery = `
            UPDATE studentlogs
            SET feedback_time = ?
            WHERE student_id = ?
        `;
        await connection.query(updateFeedbackTimeQuery, [currentTime, studentId]);

        res.send(responseData);
    } catch (err) {
        console.error('Failed to update feedback:', err);
        res.status(500).send(err.message);
    }
};


exports.logTextInput = async (req, res) => {
    const studentId = req.session.studentId;
    const { text, identifier, time } = req.body;

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS textlogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        mina FLOAT DEFAULT 0,
        texta TEXT,
        minb FLOAT DEFAULT 0,
        textb TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (student_id)
      )
    `;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (identifier !== 'passageA' && identifier !== 'passageB') {
        return res.status(400).send('Invalid identifier');
    }

    // If text is null or undefined, set it to an empty string
    const safeText = text == null ? '' : text.trim();

    try {
        // Create the textlogs table if it doesn't exist
        await connection.query(createTableQuery);

        const insertQuery = `
            INSERT INTO textlogs (student_id, min${identifier === 'passageA' ? 'a' : 'b'}, text${identifier === 'passageA' ? 'a' : 'b'})
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            min${identifier === 'passageA' ? 'a' : 'b'} = VALUES(min${identifier === 'passageA' ? 'a' : 'b'}),
            text${identifier === 'passageA' ? 'a' : 'b'} = VALUES(text${identifier === 'passageA' ? 'a' : 'b'})
        `;

        await connection.query(insertQuery, [studentId, time, safeText]);
        
        console.log('Response logged successfully');
        res.sendStatus(200);
    } catch (err) {
        console.error('Failed to log text input:', err);
        res.status(500).send('Internal server error');
    }
};


exports.getPassageProgress = async (req, res) => {
    const studentId = req.session.studentId;
    const { identifier } = req.body;

    if (!studentId) {
        console.error('Student ID is required');
        return res.status(400).send('Student ID is required');
    }

    if (!identifier) {
        console.error('Passage identifier is required');
        return res.status(400).send('Passage identifier is required');
    }

    try {
        const query =
            'SELECT mina, texta, minb, textb FROM textlogs WHERE student_id = ? ORDER BY created_at DESC LIMIT 1';
        const [rows] = await connection.query(query, [studentId]);

        if (rows.length === 0) {
            console.log('No data found for the student');
            return res.status(404).send('No data found for the student');
        }

        const { mina, texta, minb, textb } = rows[0];

        const responseData = {};

        if (identifier === 'passageA') {
            if (mina === null || texta === null || texta === '') {
                console.log('No data found for passageA');
                return res.status(404).send('No data found for passageA');
            }
            console.log('Sending data for passageA');
            responseData.timeLeft = mina;
            responseData.typedText = texta;
        } else if (identifier === 'passageB') {
            if (minb === null || textb === null || textb === '') {
                console.log('No data found for passageB');
                return res.status(404).send('No data found for passageB');
            }
            console.log('Sending data for passageB');
            responseData.timeLeft = minb;
            responseData.typedText = textb;
        } else {
            console.error('Invalid passage identifier:', identifier);
            return res.status(400).send('Invalid passage identifier');
        }

        console.log('Response data:', responseData);
        res.json(responseData);
    } catch (err) {
        console.error('Failed to fetch passage progress:', err);
        res.status(500).send(err.message);
    }
  };

  exports.getTypedTextA = async (req, res) => {
    const studentId = req.session.studentId;
  
    if (!studentId) {
      console.error('Student ID is required');
      return res.status(400).send('Student ID is required');
    }
  
    try {
      const query = 'SELECT passageA FROM finalPassageSubmit WHERE student_id = ?';
      const [rows] = await connection.query(query, [studentId]);
  
      if (rows.length === 0) {
        console.log('No data found for the student');
        return res.status(404).send('No data found for the student');
      }
  
      const { passageA } = rows[0];
  
      console.log('Sending typed text for passageA');
      res.json({ typedText: passageA });
    } catch (err) {
      console.error('Failed to fetch typed text for passageA:', err);
      res.status(500).send(err.message);
    }
  };
  
  exports.getPassage = async (req, res) => {
    const studentId = req.session.studentId;
  
    if (!studentId) {
      console.error('Student ID is required');
      return res.status(400).send('Student ID is required');
    }
  
    try {
      const query = 'SELECT passage FROM typingpassage WHERE student_id = ? ORDER BY time DESC LIMIT 1';
      const [rows] = await connection.query(query, [studentId]);
  
      if (rows.length === 0) {
        console.log('No passage found for the student');
        return res.status(404).send('No passage found for the student');
      }
  
      const { passage } = rows[0];
  
      console.log('Sending passage text');
      res.json({ passageText: passage });
    } catch (err) {
      console.error('Failed to fetch passage:', err);
      res.status(500).send(err.message);
    }
  };

  exports.getcontrollerpass = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const centersQuery = 'SELECT * FROM examcenterdb WHERE center = ?';
    const controllersQuery = 'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ?';

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            console.log(`Error: Student not found for ID ${studentId}`);
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        const centrcode = student.center;
        const batchno = student.batchNo

        console.log(batchno)


        console.log(`Student center: ${centrcode}`);

        const [centers] = await connection.query(centersQuery, [centrcode]);
        if (centers.length === 0) {
            console.log(`Error: Exam center not found for center code ${centrcode}`);
            return res.status(404).send('Subject not found');
        }
        const center1 = centers[0];

        console.log(`Exam center found: ${center1.center_name}`);

        const [controllers] = await connection.query(controllersQuery, [centrcode, batchno]);
        if (controllers.length === 0) {
            console.log(`Error: Controller not found for center code ${centrcode}`);
            return res.status(404).send('Subject not found');
        }

        const controllers1 = controllers[0];

        // Ensure both passwords are treated as strings
        const decryptedStoredPasswordStr = String(controllers1.controller_pass).trim();



        const responseData = {
            center: center1.center,
            controllerpass: decryptedStoredPasswordStr,
            center_name: center1.center_name
        };
        console.log(responseData)



        const encryptedResponseData = {};
        for (let key in responseData) {
            if (responseData.hasOwnProperty(key)) {
                try {
                    encryptedResponseData[key] = encrypt(responseData[key].toString());
                } catch (encryptError) {
                    console.log(`Error encrypting ${key}:`, encryptError);
                    encryptedResponseData[key] = '';
                }
            }
        }

        console.log('Encrypted response data keys:', Object.keys(encryptedResponseData));

        res.send(encryptedResponseData);
        // console.log(`Encrypted data while controller login: ${encryptedResponseData}`)

    } catch (err) {
        console.error('Failed to fetch student details:', err);
        console.log('Error stack:', err.stack);
        res.status(500).send(err.message);
    }
};