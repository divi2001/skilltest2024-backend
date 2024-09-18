const connection = require("../config/db1");
const XLSX = require('xlsx');
const moment = require('moment');
const { generateReport } = require('./generate_absentee_report');
const {AttendanceReport} = require('./generate_attendance_reports');
// const {}
const PDFDocument = require('pdfkit');
const { createBlankAnswerSheet } = require('./generate_blank_answer_sheet');
const { decrypt } = require("../config/encrypt");
const { generateAnswerSheets } = require("./generate_answer_sheets");

exports.generateAbsenteeReport = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });
    
    const {batchNo} = req.body;
    const center = req.session.centerId;
    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generateReport(doc,center,batchNo).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating report:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating report');
    }
}

exports.generateAttendanceReport = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 50,
            bottom: 50,
            left: 0,
            right: 0
        }
    });
    
    // const {batchNo} = req.body;
    // const center = req.session.centerId;
    const {batchNo} = req.body;
    const center = req.session.centerId;
    console.log(batchNo,center);

    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        AttendanceReport(doc,center,batchNo).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating report:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating report');
    }
}

exports.generateBlankAnswerSheet = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=blank_answer_sheet.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 30,
            bottom: 30,
            left: 40,
            right: 40
        }
    });

    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        createBlankAnswerSheet(doc).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating blank answer sheet:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating blank answer sheet');
    }
}
exports.generateAnswerSheet = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=blank_answer_sheet.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 30,
            bottom: 30,
            left: 40,
            right: 40
        }
    });
    const {batchNo,student_id} = req.body;
    const center = req.session.centerId;
    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generateAnswerSheets(doc,center,batchNo,student_id).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating blank answer sheet:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating blank answer sheet');
    }
}
function checkDownloadAllowedStudentLoginPass(startTime) {
    const startMoment = moment(startTime, 'HH:mm');
    const now = moment();

    const differenceInMinutes = now.diff(startMoment, 'minutes');
    
    console.log('Current Time:', now.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Start Time:', startMoment.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Difference in Minutes:', differenceInMinutes);

    return differenceInMinutes <= 15;
}
exports.generateStudentId_Password = async (req, res) => {
    const { batchNo } = req.body;
    const center = req.session.centerId; 
    console.log(batchNo, center);

    try {
        // First, get the batch data
        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchQuery, [batchNo]);

        if (!batchData || batchData.length === 0) {
            return res.status(404).json({ "message": "Batch not found" });
        }
        
        const today = moment().startOf('day');
        const batchDate = moment(batchData[0].batchdate).startOf('day');
        console.log(today,batchData);
        
        if (!today.isSame(batchDate)) {
            return res.status(403).json({ "message": "Download is only allowed on the day of the batch" });
        }

        // Check if download is allowed
        if (!checkDownloadAllowedStudentLoginPass(batchData[0].start_time)) {
            return res.status(403).json({ "message": "Download not allowed at this time" });
        }

        // If download is allowed, proceed with getting student data
        const query = 'SELECT student_id, password FROM students WHERE center = ? AND batchNo = ? AND batchdate = ?';
        const [results] = await connection.query(query, [center, batchNo ,batchData[0].batchdate]);
        
        const decryptedResults = await Promise.all(results.map(async (row) => ({
            student_id: row.student_id,
            password: await decrypt(row.password)
        })));

        console.log("Decrypted results:", decryptedResults);

        // Create a new workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(decryptedResults);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Passwords");

        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=student_passwords.xlsx');

        // Send the Excel file
        res.send(excelBuffer);
        
    } catch (error) {
        console.error("Error generating student ID/password:", error);
        res.status(500).json({ "message": "Internal Server Error", "error": error.message });
    }
}

