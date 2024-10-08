const connection = require('../config/db1');
const fs = require('fs').promises; 
const xl = require('excel4node');

const path = require('path');
const fs1 = require('fs');
const Buffer = require('buffer').Buffer;
const archiver = require('archiver');
const moment = require('moment-timezone');

const { encrypt, decrypt } =require('../config/encrypt');
const { request } = require('http');

exports.loginStudent = async (req, res) => {
    const { userId, password, ipAddress, diskIdentifier, macAddress } = req.body;
    console.log(userId)

    const defaultIpAddress = ipAddress || "default";
    const defaultDiskIdentifier = diskIdentifier || "default";
    const defaultMacAddress = macAddress || "default";

    try {
        // Ensure loginlogs table exists
        const createLoginLogsTableQuery = `
            CREATE TABLE IF NOT EXISTS loginlogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                login_time DATETIME NOT NULL,
                ip_address VARCHAR(255) NOT NULL,
                disk_id VARCHAR(255) NOT NULL,
                mac_address VARCHAR(255) NOT NULL
            )
        `;
        await connection.query(createLoginLogsTableQuery);

        // Ensure studentlogs table exists
        const createStudentLogsTableQuery = `
            CREATE TABLE IF NOT EXISTS studentlogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                center VARCHAR(255) NOT NULL,
                loginTime DATETIME NOT NULL,
                login VARCHAR(255) NOT NULL,
                trial_time VARCHAR(255),
                audio1_time VARCHAR(255),
                passage1_time VARCHAR(255),
                audio2_time VARCHAR(255),
                passage2_time VARCHAR(255),
                feedback_time VARCHAR(255),
                UNIQUE (student_id)
            )
        `;
        await connection.query(createStudentLogsTableQuery);

        // Create login_requests table
        const createLoginRequestsTableQuery = `
            CREATE TABLE IF NOT EXISTS login_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(255) NOT NULL,
                request_time DATETIME NOT NULL,
                INDEX (ip_address, request_time)
            )
        `;
        await connection.query(createLoginRequestsTableQuery);

        // Insert login request
        const insertLoginRequestQuery = `
            INSERT INTO login_requests (ip_address, request_time)
            VALUES (?, NOW())
        `;
        await connection.query(insertLoginRequestQuery, [defaultIpAddress]);

        // Check for excessive login attempts
        const checkLoginAttemptsQuery = `
            SELECT COUNT(*) as attempt_count
            FROM login_requests
            WHERE ip_address = ? AND request_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `;
        const [loginAttempts] = await connection.query(checkLoginAttemptsQuery, [defaultIpAddress]);

        if (loginAttempts[0].attempt_count > 15) {
            console.log(`Error: Excessive login attempts from IP ${defaultIpAddress}`);
            res.status(429).send('Too many login attempts. Please try again later.');
            return;
        }

        const query1 = 'SELECT * FROM students WHERE student_id = ?';
        const [results] = await connection.query(query1, [userId]);

        if (results.length > 0) {
            const student = results[0];

            // Check if IsShorhthand is true (1)
            // if (!student.IsShorthand) {
            //     res.status(403).send('Access denied. Student is not eligible for shorthand exam.');
            //     return;
            // }

            // Fetch the batch number from the student record
            const batchNo = student.batchNo;

            // Check the batch status in the batchdb table
            const checkBatchStatusQuery = 'SELECT batchstatus FROM batchdb WHERE batchNo = ?';
            const [batchResults] = await connection.query(checkBatchStatusQuery, [batchNo]);

            if (batchResults.length === 0) {
                // console.log(`Error: Batch not found for batchNo ${batchNo}`);
                res.status(404).send('invalid credentials');
                return;
            }

            const batchStatus = batchResults[0].batchstatus;

            // if (batchStatus !== 'active') {
            //     // console.log(`Error: Batch ${batchNo} is not active. Current status: ${batchStatus}`);
            //     res.status(401).send('invalid credentials 1');
            //     return;
            // }

            // Fetch the exam center code from the student record
            const examCenterCode = student.center;

            // Decrypt the stored password
            let decryptedStoredPassword;
            try {
                decryptedStoredPassword = decrypt(student.password);
            } catch (error) {
                // console.error('Error decrypting stored password:', error);
                res.status(500).send('invalid credentials');
                return;
            }
            let decryptedStoredPassword1;
            try {
                decryptedStoredPassword1 = decrypt(password);
            } catch (error) {
                // console.error('Error decrypting provided password:', error);
                res.status(500).send('invalid credentials');
                return;
            }

            // Ensure both passwords are treated as strings
            const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
            const providedPasswordStr = String(decryptedStoredPassword1).trim();
            console.log(decryptedStoredPasswordStr, providedPasswordStr);

            if (decryptedStoredPasswordStr === providedPasswordStr) {
                // Set student session
                req.session.studentId = student.student_id;

                // Get the current time in Kolkata, India
                const loginTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                // Insert login log
                const insertLogQuery = `
                    INSERT INTO loginlogs (student_id, login_time, mac_address, ip_address, disk_id)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await connection.query(insertLogQuery, [userId, loginTime, defaultMacAddress, defaultIpAddress, defaultDiskIdentifier]);

                // Insert or update student login details
                const insertStudentLogsQuery = `
                    INSERT INTO studentlogs (student_id, center, loginTime, login)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE loginTime = ?, login = ?
                `;
                await connection.query(insertStudentLogsQuery, [userId, examCenterCode, loginTime, 1, loginTime, 1]);

                res.send('Logged in successfully as a student!');
            } else {
                // console.log(`Error: Invalid credentials for student ${userId}`);
                res.status(401).send('invalid credentials');
            }
        } else {
            // console.log(`Error: Student not found with ID ${userId}`);
            res.status(404).send('invalid credentials');
        }
    } catch (err) {
        console.log('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};


exports.updateAudioLogTime = async (req, res) => {
    const { audioType } = req.body;
    const studentId = req.session.studentId;
    console.log(studentId,audioType)

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
    console.log(studentId,audioType)

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
        const studentId = req.session.studentId;
    
        const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
        const subjectsQuery = 'SELECT * FROM subjectdb WHERE subjectId = ?';
    
        try {
            const [students] = await connection.query(studentQuery, [studentId]);
    
            if (students.length === 0) {
                return res.status(404).send('Student not found');
            }
            const student = students[0];
    
            let subjectsId;
            try {
                subjectsId = JSON.parse(student.subjectsId);
            } catch (err) {
                return res.status(500).send('Invalid subjectsId format');
            }
    
            const subjectId = subjectsId[0];
    
            const [subjects] = await connection.query(subjectsQuery, [subjectId]);
    
            if (subjects.length === 0) {
                return res.status(404).send('Subject not found');
            }
            const subject = subjects[0];
    
            const responseData = {
                ...student,
                ...subject,
                photo: student.base64
            };
          
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
    
            res.send(encryptedResponseData);
        } catch (err) {
            res.status(500).send('Failed to fetch student details');
        }
    };

    exports.getaudios = async (req, res) => {
        const studentId = req.session.studentId;
        const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
        const subjectsQuery = 'SELECT * FROM subjectdb WHERE subjectId = ?';
        const audioQuery = "SELECT * FROM audiodb WHERE subjectId = ? AND qset = ?";

        try {
            const [students] = await connection.query(studentQuery, [studentId]);
            if (students.length === 0) {
                return res.status(404).send('Student not found');
            }
            const student = students[0];
            for (const field in student) {
                if (student.hasOwnProperty(field) && !columnsToKeep.includes(field)) {
                    try {
                        student[field] = decrypt(student[field]);
                    } catch (err) {
                        // console.error(`Failed to decrypt field ${field}:`, err);
                        throw new Error(`Failed to decrypt field ${field}`);
                    }
                }
            }
        



            // Extract subjectsId and parse it to an array
            const subjectsId = JSON.parse(student.subjectsId);
            const qset = student.qset
            console.log(qset)

            // Assuming you want the first subject from the array
            const subjectId = subjectsId[0];
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
                Daily_Timer: subject.Daily_Timer,
                Passage_Timer: subject.Passage_Timer,
                Demo_Timer: subject.Demo_Timer,
                audio1: audio.audio1,
                passage1: audio.passage1,
                audio2: audio.audio2,
                passage2: audio.passage2,
                testaudio:audio.testaudio   
            };
    

            const encryptedResponseData = {};
            for (let key in responseData) {
                if (responseData.hasOwnProperty(key)) {
                    encryptedResponseData[key] = encrypt(responseData[key].toString());
                }
            }

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
            if (audioLogs.trial === '100') {
                audioLogs.trial = 95;
            }
            if (audioLogs.passageA === '100') {
                audioLogs.passageA = 95;
            }
            if (audioLogs.passageB === '100') {
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

        output.on('close', function() {
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

        archive.on('error', function(err) {
            console.error('Archiver error:', err);
            // Don't throw the error, just log it
        });

        archive.on('warning', function(err) {
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
      console.error('Student ID is required');
      return res.status(400).send('Student ID is required');
    }
  
    try {
      // Create the textlogs table if it doesn't exist
      await connection.query(createTableQuery);
  
      let insertQuery;
      let values;
  
      if (identifier === 'passageA') {
        insertQuery = 'INSERT INTO textlogs (student_id, mina, texta) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE mina = VALUES(mina), texta = VALUES(texta)';
        values = [studentId, time, text];
      } else if (identifier === 'passageB') {
        insertQuery = 'INSERT INTO textlogs (student_id, minb, textb) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE minb = VALUES(minb), textb = VALUES(textb)';
        values = [studentId, time, text];
      } else {
        console.error('Invalid identifier:', identifier);
        return res.status(400).send('Invalid identifier');
      }
  
      // Check if the text is empty, null, or an empty string
      if (text && text.trim() !== '') {
        await connection.query(insertQuery, values);
        console.log('Response done');
      } else {
        console.log('Text is empty, skipping database insertion');
      }
  
      res.sendStatus(200);
    } catch (err) {
      console.error('Failed to log text input:', err);
      res.status(500).send(err.message);
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
  exports.getcontrollerpass = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT center FROM students WHERE student_id = ?';
    const centersQuery = 'SELECT * FROM examcenterdb WHERE center = ?';
    const controllersQuery = 'SELECT * FROM controllerdb WHERE center = ?';

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            console.log(`Error: Student not found for ID ${studentId}`);
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        const centrcode = student.center;
   

        console.log(`Student center: ${centrcode}`);

        const [centers] = await connection.query(centersQuery, [centrcode]);
        if (centers.length === 0) {
            console.log(`Error: Exam center not found for center code ${centrcode}`);
            return res.status(404).send('Subject not found');
        }
        const center1 = centers[0];

        console.log(`Exam center found: ${center1.center_name}`);

        const [controllers] = await connection.query(controllersQuery, [centrcode]);
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

    } catch (err) {
        console.error('Failed to fetch student details:', err);
        console.log('Error stack:', err.stack);
        res.status(500).send(err.message);
    }
};