const connection = require("../config/db1");
const moment = require('moment-timezone');
const {decrypt} = require('../config/encrypt');

async function getData(center, batchNo) {
    try {
        // console.log(batchNo, center);

        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchQuery, [batchNo]);

        if (!batchData || batchData.length === 0) {
            throw new Error("Batch not found");
        }

        // console.log(batchData[0].start_time, batchData[0].batchdate);

        const query = 'SELECT s.student_id, s.password , d.departmentName , d.logo FROM students as s JOIN departmentdb d ON s.departmentId = d.departmentId  WHERE s.center = ? AND s.batchNo = ?';
        const [results] = await connection.query(query, [center, batchNo]);

        const decryptedResults = await Promise.all(results.map(async (row) => ({
            student_id: String(row.student_id),
            password: await decrypt(row.password)
        })));

        return { 
            response: decryptedResults, 
            departmentName:results[0].departmentName,
            logo:results[0].logo,
            batchData: batchData
        };
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

function addHeader(doc, data) {
    doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 50, { width: 60, height: 50 });

    doc.fontSize(14).font('Helvetica-Bold')
        .text(data.departmentName, 110, 50, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text('GCC COMPUTER SHORTHAND EXAMINATION DECEMBER 2024', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();

    doc.moveDown();
    const yPosition = doc.y-8;
    const fontSize = 12;
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
    const columnWidth = tableWidth / 2;
    const rowHeight = 20;

    // Draw table header
    doc.font('Helvetica-Bold').fontSize(10);
    doc.rect(tableLeft, currentY, tableWidth, rowHeight).stroke();
    doc.text('Seat No.', tableLeft + cellPadding, currentY + cellPadding, { width: columnWidth - cellPadding * 2 });
    doc.text('Password', tableLeft + columnWidth + cellPadding, currentY + cellPadding, { width: columnWidth - cellPadding * 2 });

    // Add vertical line in header
    doc.moveTo(tableLeft + columnWidth, currentY)
       .lineTo(tableLeft + columnWidth, currentY + rowHeight)
       .stroke();

    // Draw table rows
    doc.font('Helvetica').fontSize(10);
    students.forEach((student, index) => {
        const rowY = currentY + rowHeight * (index + 1);
        doc.rect(tableLeft, rowY, tableWidth, rowHeight).stroke();
        doc.text(student.student_id, tableLeft + cellPadding, rowY + cellPadding, { width: columnWidth - cellPadding * 2 });
        doc.text(student.password, tableLeft + columnWidth + cellPadding, rowY + cellPadding, { width: columnWidth - cellPadding * 2 });

        // Add vertical line in row
        doc.moveTo(tableLeft + columnWidth, rowY)
           .lineTo(tableLeft + columnWidth, rowY + rowHeight)
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

function checkDownloadAllowedStudentLoginPass(startTime, batchDate) {
    // Set the timezone to Kolkata
    const kolkataZone = 'Asia/Kolkata';

    // Parse the batchDate (which is in UTC) and convert it to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone);

    // Combine the Kolkata date with the provided startTime
    const startDateTime = moment.tz(
        `${batchDateKolkata.format('YYYY-MM-DD')} ${startTime}`,
        'YYYY-MM-DD hh:mm A',
        kolkataZone
    );
    
    // Get current time in Kolkata timezone
    const now = moment().tz();

    const differenceInMinutes = startDateTime.diff(now, 'minutes');
    
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    // console.log('Current Time (Kolkata):', now.format('YYYY-MM-DD hh:mm A'));
    console.log('Start Time (Kolkata):', startDateTime.format('YYYY-MM-DD hh:mm A'));
    console.log('Difference in Minutes:', differenceInMinutes);

    // Return true if startTime is between 0 and 30 minutes ahead of the current time
    return differenceInMinutes <= 105;
}

async function generateStudentIdPasswordPdf(doc, center, batchNo) {
    try {
        const Data = await getData(center, batchNo);
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
        
        // Uncomment the following lines if you want to check download allowance
        if(!checkDownloadAllowedStudentLoginPass(batchInfo.start_time,batchInfo.batchdate)) {
            throw new Error("Download not allowed at this time");
        }

        const data = {
            centerCode: center,
            batch: batchNo.toString(),
            examDate: examDate,
            examTime: batchInfo.start_time,
            students: response,
            departmentName:Data.departmentName,
            departmentLogo:Data.logo
        };

        createSeatingArrangementReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { generateStudentIdPasswordPdf };