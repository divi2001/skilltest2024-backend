const connection = require("../config/db1");
const moment = require('moment-timezone');
const {decrypt} = require('../config/encrypt');

// Helper function to strip last two digits from student ID to create Login ID
function generateLoginId(studentId) {
    const idStr = studentId.toString();
    if (idStr.length <= 2) {
        return idStr; // Return as is if length is 2 or less
    }
    return idStr.slice(0, -2); // Remove last 2 characters
}

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

async function getData(center, batchNo, departmentId) {
    try {
        // Modified query to include departmentId in the WHERE clause for batchdb
        const batchQuery = 'SELECT batchdate, start_time, departmentId FROM batchdb WHERE batchNo = ? AND departmentId = ?';
        const [batchData] = await connection.query(batchQuery, [batchNo, departmentId]);

        if (!batchData || batchData.length === 0) {
            throw new Error("Batch not found for the specified department");
        }

        // Modified query to include departmentId in the WHERE clause for students
        const query = 'SELECT s.student_id, s.password , d.departmentName , d.departmentExam, d.logo FROM students as s JOIN departmentdb d ON s.departmentId = d.departmentId  WHERE s.center = ? AND s.batchNo = ? AND s.departmentId = ?';
        const [results] = await connection.query(query, [center, batchNo, departmentId]);

        const decryptedResults = await Promise.all(results.map(async (row) => ({
            student_id: String(row.student_id),
            login_id: generateLoginId(String(row.student_id)), // Generate Login ID
            password: await decrypt(row.password)
        })));

        return { 
            response: decryptedResults, 
            departmentName: results[0]?.departmentName,
            departmentExam: results[0]?.departmentExam,
            logo: results[0]?.logo,
            batchData: batchData
        };
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

function addHeader(doc, data) {
    doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 40, { width: 60, height: 60 });

    doc.fontSize(14).font('Helvetica-Bold')
        .text(data.departmentName, 110, 50, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text(data.departmentExam, 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();

    doc.moveDown();
    const yPosition = doc.y-8;
    const fontSize = 10;
    const spacer = '\u00A0\u00A0';
    doc.fontSize(fontSize).font('Helvetica');

    doc.text(`CENTER CODE: ${data.centerCode}${spacer}`, 50, yPosition + 13);
    doc.text(`BATCH: ${data.batch}${spacer}`, 185, yPosition + 13);
    doc.text(`EXAM DATE: ${data.examDate}${spacer}`, 275, yPosition + 13);
    doc.text(`EXAM TIME: ${data.examTime}`, 425, yPosition + 13);

    return doc.y + 20;
}

function createTable(doc, students, tableLeft, currentY, maxRows, tableWidth) {
    const cellPadding = 5;
    const seatNoWidth = tableWidth * 0.35; // Increased from 33% to 45% for Seat No.
    const loginIdWidth = tableWidth * 0.40; // Decreased from 33% to 30% for Login ID
    const passwordWidth = tableWidth * 0.25; // Decreased from 34% to 25% for Password
    const rowHeight = 20;

    // Draw table header
    doc.font('Helvetica-Bold').fontSize(9);
    doc.rect(tableLeft, currentY, tableWidth, rowHeight).stroke();
    
    // Header texts
    doc.text('Seat No.', tableLeft + cellPadding, currentY + cellPadding, { 
        width: seatNoWidth - cellPadding * 2,
        align: 'center'
    });
    doc.text('Login ID' , tableLeft + seatNoWidth + cellPadding, currentY + cellPadding, { 
        width: loginIdWidth - cellPadding * 2,
        align: 'center'
    });
    doc.text('Password', tableLeft + seatNoWidth + loginIdWidth + cellPadding, currentY + cellPadding, { 
        width: passwordWidth - cellPadding * 2,
        align: 'center'
    });

    // Add vertical lines in header
    doc.moveTo(tableLeft + seatNoWidth, currentY)
       .lineTo(tableLeft + seatNoWidth, currentY + rowHeight)
       .stroke();
    doc.moveTo(tableLeft + seatNoWidth + loginIdWidth, currentY)
       .lineTo(tableLeft + seatNoWidth + loginIdWidth, currentY + rowHeight)
       .stroke();

    // Draw table rows
    doc.font('Helvetica').fontSize(9);
    students.forEach((student, index) => {
        const rowY = currentY + rowHeight * (index + 1);
        doc.rect(tableLeft, rowY, tableWidth, rowHeight).stroke();
        
        // Cell contents
        doc.text(student.login_id, tableLeft + cellPadding, rowY + cellPadding, { 
            width: seatNoWidth - cellPadding * 2,
            align: 'center'
        });
        doc.text(student.student_id, tableLeft + seatNoWidth + cellPadding, rowY + cellPadding, { 
            width: loginIdWidth - cellPadding * 2,
            align: 'center'
        });
        doc.text(student.password, tableLeft + seatNoWidth + loginIdWidth + cellPadding, rowY + cellPadding, { 
            width: passwordWidth - cellPadding * 2,
            align: 'center'
        });

        // Add vertical lines in row
        doc.moveTo(tableLeft + seatNoWidth, rowY)
           .lineTo(tableLeft + seatNoWidth, rowY + rowHeight)
           .stroke();
        doc.moveTo(tableLeft + seatNoWidth + loginIdWidth, rowY)
           .lineTo(tableLeft + seatNoWidth + loginIdWidth, rowY + rowHeight)
           .stroke();
    });

    return currentY + rowHeight * (students.length + 1);
}

function createSeatingArrangementReport(doc, data) {
    addHeader(doc, data);
    
    doc.fontSize(14).font('Helvetica-Bold')
        .text('Student Id and Password', 50, 170, {
            width: 500,
            align: 'center'
        });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginLeft = 50;
    const marginRight = 50;
    const marginBottom = 50;
    const tableTop = 200;
    const tableGap = 30; // Gap between tables
    const tableWidth = (pageWidth - marginLeft - marginRight - tableGap) / 2;
    const maxRowsPerTable = Math.floor((pageHeight - tableTop - marginBottom) / 20) - 1; // -1 for header

    let currentY = tableTop;
    let studentsProcessed = 0;

    while (studentsProcessed < data.students.length) {
        if (currentY >= pageHeight - marginBottom) {
            doc.addPage();
            addHeader(doc, data);
            currentY = tableTop;
        }

        const remainingStudents = data.students.slice(studentsProcessed);
        const leftTableStudents = remainingStudents.slice(0, maxRowsPerTable);
        studentsProcessed += leftTableStudents.length;

        const leftTableEndY = createTable(doc, leftTableStudents, marginLeft, currentY, maxRowsPerTable, tableWidth);

        if (studentsProcessed < data.students.length) {
            const rightTableStudents = remainingStudents.slice(maxRowsPerTable, maxRowsPerTable * 2);
            studentsProcessed += rightTableStudents.length;

            const rightTableX = marginLeft + tableWidth + tableGap;
            const rightTableEndY = createTable(doc, rightTableStudents, rightTableX, currentY, maxRowsPerTable, tableWidth);
            currentY = Math.max(leftTableEndY, rightTableEndY) + 20;
        } else {
            currentY = leftTableEndY + 20;
        }
    }
}

function checkDownloadAllowedStudentLoginPass(startTime, batchDate, departmentId) {
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
    
    console.log('Department ID:', departmentId);
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Time (Kolkata):', now.format('YYYY-MM-DD hh:mm A'));
    console.log('Start Time (Kolkata):', startDateTime.format('YYYY-MM-DD hh:mm A'));
    console.log('Difference in Minutes:', differenceInMinutes);

    // Return true if startTime is between 0 and 105 minutes ahead of the current time
    return differenceInMinutes <= 105;
}

async function generateStudentIdPasswordPdf(doc, center, batchNo, departmentId) {
    try {
        const Data = await getData(center, batchNo, departmentId);
        console.log(Data);

        const response = Data.response;
        if (!Array.isArray(response) || response.length === 0) {
            throw new Error('No data returned from getData');
        }

        if (!Array.isArray(Data.batchData) || Data.batchData.length === 0) {
            throw new Error('No batch data available');
        }

        const batchInfo = Data.batchData[0];
        const examDate = moment(batchInfo.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY')
        
        // Check download allowance with departmentId
        if(!checkDownloadAllowedStudentLoginPass(batchInfo.start_time, batchInfo.batchdate, departmentId)) {
            throw new Error("Download not allowed at this time");
        }

        // Convert start_time to 12-hour format
        const formattedExamTime = formatTime(batchInfo.start_time);

        const data = {
            centerCode: center,
            batch: batchNo.toString(),
            examDate: examDate,
            examTime: formattedExamTime, // Now in 12-hour format
            students: response,
            departmentName: Data.departmentName,
            departmentExam: Data.departmentExam,
            departmentLogo: Data.logo
        };

        createSeatingArrangementReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { generateStudentIdPasswordPdf };