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
const { json } = require('body-parser');


exports.loginStudent = async (req, res) => {
    const { userId, password, ipAddress, diskIdentifier, macAddress } = req.body;
    console.log(userId);

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
        //     return res.status(429).send('Too many login attempts. Please try again later.');
        // }

        const query1 = 'SELECT * FROM students WHERE student_id = ?';
        const [results] = await connection.query(query1, [userId]);

        if (results.length === 0) {
            return res.status(404).send('invalid credentials 1');
        }

        const student = results[0];

        // if (!student.IsShorthand) {
        //     return res.status(403).send('Access denied. Student is not eligible for shorthand exam.');
        // }

        const batchNo = student.batchNo;

        const checkBatchStatusQuery = 'SELECT batchstatus FROM batchdb WHERE batchNo = ?';
        const [batchResults] = await connection.query(checkBatchStatusQuery, [batchNo]);

        if (batchResults.length === 0) {
            return res.status(404).send('invalid credentials 2');
        }

        const batchStatus = batchResults[0].batchstatus;

        // if (batchStatus !== 1) {
        //     return res.status(401).send('invalid credentials 3');
        // }

        const examCenterCode = student.center;
        const query4 = 'SELECT * FROM pcregistration WHERE center = ? AND mac_address=?';
        const [registrations] = await connection.query(query4, [examCenterCode,macAddress]);
        console.log(registrations)

     

        if (registrations.length===0) {
            return res.status(401).send('pc not registered');
        }

        let decryptedStoredPassword, decryptedStoredPassword1;
        try {
            decryptedStoredPassword = decrypt(student.password);
            decryptedStoredPassword1 = decrypt(password);
        } catch (error) {
            console.log(decryptedStoredPassword, password);
            return res.status(500).send('invalid credentials 4');
        }

        const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
        const providedPasswordStr = String(decryptedStoredPassword1).trim();
        console.log(decryptedStoredPasswordStr, providedPasswordStr);

        if (decryptedStoredPasswordStr !== providedPasswordStr) {
            return res.status(401).send('invalid credentials 5');
        }

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
    } catch (err) {
        console.log('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};


exports.getStudentDetails = async (req, res) => {
    // console.log('Starting getStudentDetails function');
    const {studentId} = req.body;
    // console.log(studentId);
    // console.log('Student ID from :', studentId);

    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectsdb WHERE subjectId = ?';
    const batchQuery = 'SELECT * FROM batchdb WHERE batchNo = ?'

    try {
        // console.log('Querying student data');
        const [students] = await connection.query(studentQuery,[studentId]);

        if (students.length === 0) {
            console.log('Student not found');
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        // console.log('Student data retrieved');
        const batch = student.batchNo

        const [batchs] = await connection.query(batchQuery,[batch]);

        const batch1 = batchs[0]
        const batchDate1 = batch1.batchdate

        let subjectsId;
        try {
            // console.log('Parsing subjectsId');
            subjectsId = JSON.parse(student.subjectsId);
            // console.log('Parsed subjectsId:', subjectsId);
        } catch (err) {
            console.error('Error parsing subjectsId:', err);
            return res.status(500).send('Invalid subjectsId format');
        }

        const subjectId = subjectsId;
        console.log('Parsed batchdate:',batchDate1);

        // console.log('Querying subject data');
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        // console.log(subjects)

        if (subjects.length === 0) {
            console.log('Subject not found');
            return res.status(404).send('Subject not found');
            
        }
        const subject = subjects[0];

        const responseData = {
            ...student,
            ...subject,
            photo: student.base64,
            batchdate :batchDate1
        };


        // console.log('Encrypting response data');
        // const encryptedResponseData = {};
        // for (let key in responseData) {
        //     if (responseData.hasOwnProperty(key)) {
        //         if (responseData[key] === null) {
        //             encryptedResponseData[key] = encrypt('null');
        //         } else {
        //             encryptedResponseData[key] = encrypt(responseData[key].toString());
        //         }
        //     }
        // }
        // console.log('Response data encrypted');

        // console.log('Sending encrypted response');
        // res.send(encryptedResponseData);
        res.status(201).json({responseData})
    } catch (err) {
        console.error('Error in getStudentDetails:', err);
        res.status(500).send('Failed to fetch student details');
    }
    console.log('Ending getStudentDetails function');
};

exports.totalLoginCounts = async (req,res) => {

    const {center ,batchNo , department} = req.body;
    console.log(req.body);

    try {
        let query = 'SELECT COUNT(student_id) as total_count FROM students WHERE loggedin = 1 '
        let queryParams = [];
        if(department){
           query +=' AND departmentId = ?';
           queryParams.push(department);
        }
        if(center){
            query += ' AND center = ?';
            queryParams.push(center);
        }
        if(center && batchNo){
            query += ' AND batchNo = ?';
            queryParams.push(batchNo);
        }
        if(!center &&batchNo){
            return res.status(404).json({"Message":"You should also provide center no. to get the login count of a perticular batch"})
        }

        const [result] = await connection.query(query,queryParams);
        console.log(result[0]);
        res.status(200).json(result[0])
        
    } catch (error) {
        console.log(error);
        res.status(500).json({})
    }
    
}


