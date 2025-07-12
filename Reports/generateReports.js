const connection = require("../config/db1");
const XLSX = require('xlsx');
const moment = require('moment-timezone');
const { generateReport } = require('./generate_absentee_report');
const {AttendanceReport} = require('./generate_attendance_reports');
const {generateSeatingArrangementReport} = require('./generate_seating_arrangement_sheet');
const {generateStudentIdPasswordPdf} = require('./generate_studentId_Password_sheet')
const PDFDocument = require('pdfkit');
const { generateBlankAnswerSheet } = require('./generate_blank_answer_sheet');
const {generatePostAbsenteeReport } = require('./generate_post_absentee_report');
const { decrypt } = require("../config/encrypt");
const { generateAnswerSheets } = require("./generate_answer_sheets");

// Helper function to format time to 12-hour format
function formatTime(timeString) {
    if (!timeString) {
        return 'Not specified';
    }
    
    // Convert to string
    const timeStr = timeString.toString();
    
    // If it's already in HH:MM:SS format, convert to 12-hour format without seconds
    if (timeStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
        const parts = timeStr.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const formattedHours = hours.toString().padStart(2, '0');
        
        return `${formattedHours}:${minutes} ${ampm}`;
    }
    
    // If it's in HH:MM format, convert to 12-hour format
    if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
        const parts = timeStr.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const formattedHours = hours.toString().padStart(2, '0');
        
        return `${formattedHours}:${minutes} ${ampm}`;
    }
    
    console.error('Unexpected time format:', timeString);
    return timeStr;
}

// Function to check if download is allowed (3 days before batch date)
function checkDownloadAllowed3Days(batchDate) {
    const kolkataZone = 'Asia/Kolkata';
    
    // Parse the batchDate and convert to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone).startOf('day');
    
    // Get current time in Kolkata timezone
    const now = moment().tz(kolkataZone).startOf('day');
    
    // Calculate difference in days
    const differenceInDays = batchDateKolkata.diff(now, 'days');
    
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Date (Kolkata):', now.format('YYYY-MM-DD'));
    console.log('Difference in Days:', differenceInDays);
    
    // Return true if current date is within 3 days before batch date (including batch date)
    return differenceInDays >= -1 && differenceInDays <= 4;
}

// Helper function to get batch data and check download permission
async function checkBatchDownloadPermission(batchNo, departmentId) {
    const batchQuery = 'SELECT batchdate FROM batchdb WHERE batchNo = ? AND departmentId = ?';
    const [batchData] = await connection.query(batchQuery, [batchNo, departmentId]);

    if (!batchData || batchData.length === 0) {
        throw new Error('Batch not found');
    }

    if (!checkDownloadAllowed3Days(batchData[0].batchdate)) {
        throw new Error('Download is only allowed within 3 days before the batch date');
    }

    return batchData[0];
}

exports.generateAbsenteeReport = async (req, res) => {
    try {
        const {batchNo, departmentId} = req.body;
        const center = req.session.centerId;

        // Check download permission
        await checkBatchDownloadPermission(batchNo, departmentId);

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

        console.log(batchNo, center, departmentId);

        // Use a Promise to handle the PDF generation
        const pdfPromise = new Promise((resolve, reject) => {
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            generateReport(doc, center, batchNo, departmentId).then(() => {
                doc.end();
            }).catch((error) => {
                console.error("Error generating report:", error);
                reject(error);
            });
        });

        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error:", error);
        if (error.message === 'Batch not found') {
            return res.status(404).json({ "message": error.message });
        }
        if (error.message.includes('Download is only allowed')) {
            return res.status(403).json({ "message": error.message });
        }
        res.status(500).json({ "message": "Error generating report", "error": error.message });
    }
}

exports.generateAbsenteeReportPost = async (req, res) => {
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
    
    const {batchNo, departmentId} = req.body;
    const center = req.session.centerId;
    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generatePostAbsenteeReport(doc,center,batchNo,departmentId).then(() => {
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
    try {
        const {batchNo, departmentId} = req.body;
        const center = req.session.centerId;

        // Check download permission
        await checkBatchDownloadPermission(batchNo, departmentId);

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

        console.log(batchNo, center);

        // Use a Promise to handle the PDF generation
        const pdfPromise = new Promise((resolve, reject) => {
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            AttendanceReport(doc, center, batchNo, departmentId).then(() => {
                doc.end();
            }).catch((error) => {
                console.error("Error generating report:", error);
                reject(error);
            });
        });

        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error:", error);
        if (error.message === 'Batch not found') {
            return res.status(404).json({ "message": error.message });
        }
        if (error.message.includes('Download is only allowed')) {
            return res.status(403).json({ "message": error.message });
        }
        res.status(500).json({ "message": "Error generating attendance report", "error": error.message });
    }
}

exports.generateBlankAnswerSheet = async (req, res) => {
    try {
        const {batchNo, departmentId} = req.body;
        const center = req.session.centerId;

        // Check download permission
        await checkBatchDownloadPermission(batchNo, departmentId);

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

            generateBlankAnswerSheet(doc, center, batchNo, departmentId).then(() => {
                doc.end();
            }).catch((error) => {
                console.error("Error generating blank answer sheet:", error);
                reject(error);
            });
        });

        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error:", error);
        if (error.message === 'Batch not found') {
            return res.status(404).json({ "message": error.message });
        }
        if (error.message.includes('Download is only allowed')) {
            return res.status(403).json({ "message": error.message });
        }
        res.status(500).json({ "message": "Error generating blank answer sheet", "error": error.message });
    }
}

exports.generateAnswerSheet = async (req, res) => {
    try {
        const {batchNo, student_id, departmentId} = req.body;
        const center = req.session.centerId;

        // Check download permission
        await checkBatchDownloadPermission(batchNo, departmentId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=answer_sheet.pdf');
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

            generateAnswerSheets(doc, center, batchNo, student_id, departmentId).then(() => {
                doc.end();
            }).catch((error) => {
                console.error("Error generating answer sheet:", error);
                reject(error);
            });
        });

        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error:", error);
        if (error.message === 'Batch not found') {
            return res.status(404).json({ "message": error.message });
        }
        if (error.message.includes('Download is only allowed')) {
            return res.status(403).json({ "message": error.message });
        }
        res.status(500).json({ "message": "Error generating answer sheet", "error": error.message });
    }
}

exports.generateSeatingArrangement = async (req,res) => {

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
    
    const {batchNo,departmentId} = req.body;
    const center = req.session.centerId;
    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generateSeatingArrangementReport(doc,center,batchNo,departmentId).then(() => {
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

function checkDownloadAllowedStudentLoginPass(startTime, batchDate) {
    // Set the timezone to Kolkata
    const kolkataZone = 'Asia/Kolkata';

    // Parse the batchDate (which is in UTC) and convert it to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone);

    // Convert the 24-hour startTime to 12-hour format first
    const formattedStartTime = formatTime(startTime);

    // Combine the Kolkata date with the provided startTime (now in 12-hour format)
    const startDateTime = moment.tz(
        `${batchDateKolkata.format('YYYY-MM-DD')} ${formattedStartTime}`,
        'YYYY-MM-DD hh:mm A',
        kolkataZone
    );
    
    // Get current time in Kolkata timezone
    const now = moment().tz(kolkataZone);

    const differenceInMinutes = startDateTime.diff(now, 'minutes');
    
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Time (Kolkata):', now.format('YYYY-MM-DD hh:mm A'));
    console.log('Start Time (Kolkata):', startDateTime.format('YYYY-MM-DD hh:mm A'));
    console.log('Difference in Minutes:', differenceInMinutes);

    // Return true if startTime is between 0 and 105 minutes ahead of the current time
    return differenceInMinutes <= 105;
}

exports.generateStudentId_Password = async (req, res) => {
    const { batchNo,departmentId } = req.body;
    const center = req.session.centerId; 
    console.log(batchNo, center);

    try {
        // First, get the batch data
        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ? and departmentId = ?';
        const [batchData] = await connection.query(batchQuery, [batchNo,departmentId]);

        if (!batchData || batchData.length === 0) {
            return res.status(404).json({ "message": "Batch not found" });
        }

        // Check if download is allowed
        console.log(batchData[0].start_time,batchData[0].batchdate)
        if (!checkDownloadAllowedStudentLoginPass(batchData[0].start_time,batchData[0].batchdate)) {
            return res.status(403).json({ "message": "Download not allowed at this time" });
        }
 
        // If download is allowed, proceed with getting student data
        const query = 'SELECT student_id, password FROM students WHERE center = ? AND batchNo = ?';
        const [results] = await connection.query(query, [center, batchNo]);

        const decryptedResults = await Promise.all(results.map(async (row) => ({
            Seat_no: String(row.student_id),
            Password: await decrypt(row.password)
        })));

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

exports.generateStudentIdPasswordPdf =async (req,res) => {
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
    
    const {batchNo,departmentId} = req.body;
    const center = req.session.centerId;
    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generateStudentIdPasswordPdf(doc,center,batchNo,departmentId).then(() => {
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