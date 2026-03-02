const connection = require("../config/db1");
const moment = require('moment-timezone');
const { decrypt } = require('../config/encrypt');
const checkReportPermission = require('./reportPermission');

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

async function getData(center, batchNo) {
    try {
        // console.log(batchNo, center);

        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchQuery, [batchNo]);

        if (!batchData || batchData.length === 0) {
            throw new Error("Batch not found");
        }

        // console.log(batchData[0].start_time, batchData[0].batchdate);

        const query = 'SELECT s.student_id, s.password , d.departmentName, d.departmentExam , d.logo FROM students as s JOIN departmentdb d ON s.departmentId = d.departmentId  WHERE s.center = ? AND s.batchNo = ? AND s.password IS NOT NULL';
        const [results] = await connection.query(query, [center, batchNo]);

        const decryptedResults = await Promise.all(results.map(async (row) => ({
            student_id: String(row.student_id),
            password: typeof row.password === 'string' ? await decrypt(row.password) : ''
        })));

        return {
            response: decryptedResults,
            departmentName: results[0].departmentName,
            departmentExam: results[0].departmentExam,
            logo: results[0].logo,
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
        .text(data.departmentName.toUpperCase(), 110, 50, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text(data.departmentExam.toUpperCase(), 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text('STUDENT ID AND PASSWORD', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();

    doc.moveDown();
    const yPosition = doc.y - 8;
    const fontSize = 12;
    doc.fontSize(fontSize).font('Helvetica');

    // Save the current position
    const currentY = yPosition + 10;

    // Reset text state and position each element individually
    doc.text('', 0, 0); // Reset any previous text state

    // Position each text element with explicit coordinates and no text flow
    doc.text(`CENTER CODE: ${data.centerCode}`, 50, currentY, {
        lineBreak: false,
        width: 130,
        align: 'left'
    });

    doc.text(`BATCH: ${data.batch}`, 185, currentY, {
        lineBreak: false,
        width: 85,
        align: 'left'
    });

    doc.text(`EXAM DATE: ${data.examDate}`, 275, currentY, {
        lineBreak: false,
        width: 145,
        align: 'left'
    });

    doc.text(`EXAM TIME: ${data.examTime}`, 425, currentY, {
        lineBreak: false,
        width: 125,
        align: 'left'
    });

    // Manually set the Y position for the next content
    doc.y = currentY + 20;

    return doc.y;
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

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const marginBottom = 50;
    const rowHeight = 20;
    const tableGap = 30;
    const tableWidth = 230;

    let studentsProcessed = 0;

    while (studentsProcessed < data.students.length) {
        const remaining = data.students.length - studentsProcessed;

        const usableHeight = pageHeight - 200 - marginBottom;
        const maxRowsPerTable = Math.floor(usableHeight / rowHeight) - 1;

        const rowsThisPage = Math.min(
            remaining,
            maxRowsPerTable * 2
        );

        const isSingleColumn = rowsThisPage <= maxRowsPerTable;

        const tablesCount = isSingleColumn ? 1 : 2;
        const totalTableWidth =
            isSingleColumn
                ? tableWidth
                : tableWidth * 2 + tableGap;

        const startX = (pageWidth - totalTableWidth) / 2;

        const rowsInLeftTable = isSingleColumn
            ? rowsThisPage
            : Math.min(maxRowsPerTable, rowsThisPage);

        const rowsInRightTable = rowsThisPage - rowsInLeftTable;

        const tablesHeight =
            Math.max(rowsInLeftTable, rowsInRightTable) * rowHeight;

        // ✅ Vertical centering
        const startY = Math.max(
            200,
            (pageHeight - tablesHeight) / 2
        );

        // LEFT / SINGLE TABLE
        const leftStudents = data.students.slice(
            studentsProcessed,
            studentsProcessed + rowsInLeftTable
        );

        const leftEndY = createTable(
            doc,
            leftStudents,
            startX,
            startY,
            maxRowsPerTable,
            tableWidth
        );

        studentsProcessed += rowsInLeftTable;

        // RIGHT TABLE (if needed)
        if (!isSingleColumn && rowsInRightTable > 0) {
            const rightStudents = data.students.slice(
                studentsProcessed,
                studentsProcessed + rowsInRightTable
            );

            createTable(
                doc,
                rightStudents,
                startX + tableWidth + tableGap,
                startY,
                maxRowsPerTable,
                tableWidth
            );

            studentsProcessed += rowsInRightTable;
        }

        if (studentsProcessed < data.students.length) {
            doc.addPage();
            addHeader(doc, data);
        }
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

        // Check dynamic permissions
        const isAllowed = await checkReportPermission('REPORT_PASSWORD_PDF', batchInfo.batchdate, batchInfo.start_time);
        if (!isAllowed) {
            throw new Error("Download is restricted for this batch at this time.");
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