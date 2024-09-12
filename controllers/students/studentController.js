const connection = require('../../config/db1');
const fs = require('fs').promises; 
const xl = require('excel4node');

const path = require('path');
const fs1 = require('fs');
const Buffer = require('buffer').Buffer;
const archiver = require('archiver');
const moment = require('moment-timezone');

const { encrypt, decrypt } =require('../../config/encrypt');
const { request } = require('http');


exports.loginStudent = async (req, res) => {
    const { userId, password, ipAddress, diskIdentifier, macAddress } = req.body;
    console.log(userId)

    const defaultIpAddress = ipAddress || "default";
    const defaultDiskIdentifier = diskIdentifier || "default";
    const defaultMacAddress = macAddress || "default";

    try {
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

        // if (loginAttempts[0].attempt_count > 15) {
        //     console.log(`Error: Excessive login attempts from IP ${defaultIpAddress}`);
        //     res.status(429).send('Too many login attempts. Please try again later.');
        //     return;
        // }

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
                res.status(404).send('invalid credentials 1');
                return;
            }

            const batchStatus = batchResults[0].batchstatus;

            // if (batchStatus !== 1) {
            //     // console.log(`Error: Batch ${batchNo} is not active. Current status: ${batchStatus}`);
            //     res.status(401).send('invalid credentials 2');
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
                console.log(decryptedStoredPassword)
                res.status(500).send('invalid credentials 3');
                return;
            }
            let decryptedStoredPassword1;
            try {
                decryptedStoredPassword1 = decrypt(password);
            } catch (error) {
                console.log(decryptedStoredPassword + password )
                // console.error('Error decrypting provided password:', error);
                res.status(500).send('invalid credentials 4');
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
                res.status(401).send('invalid credentials 5');
            }
        } else {
            // console.log(`Error: Student not found with ID ${userId}`);
            res.status(404).send('invalid credentials 6');
        }
    } catch (err) {
        console.log('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};
