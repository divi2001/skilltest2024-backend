const connection = require("../config/db1");
const moment = require('moment-timezone'); // Make sure to install and import moment.js for easier date handling

// Helper function to strip last two digits from student ID
function stripLastTwoDigits(studentId) {

    return studentId; // Remove last 2 characters
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

const getData = async(center, batchNo, departmentId) => {
    try {
        console.log(center, batchNo, departmentId);
        const query = 'SELECT s.fullname, s.student_id, s.base64, s.sign_base64, sub.subject_name_short, d.departmentName, d.departmentExam, d.logo FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId JOIN departmentdb d ON s.departmentId = d.departmentId WHERE s.center = ? AND s.batchNo = ? AND s.departmentId = ?';
        const response = await connection.query(query, [center, batchNo, departmentId]);
        
        // Modified batch query to include departmentId
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ? AND departmentId = ?';
        const batchData = await connection.query(batchquery, [batchNo, departmentId]);
        
        return { 
            response: response[0], 
            batchData: batchData[0], 
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

function createTable(doc, seatNumbers, headerData) {
    const tableTop = 200;
    const tableLeft = 50;
    const cellWidth = 100;
    const cellHeight = 20;
    const headerHeight = 20;
    const pageHeight = doc.page.height;
    const marginBottom = 50;
    const signatureHeight = 60;
    const signatureGap = 60;
    const columnsPerRow = 5;
    const maxRowsPerPage = Math.floor((pageHeight - tableTop - marginBottom - signatureHeight - signatureGap) / cellHeight);

    if (!Array.isArray(seatNumbers)) {
        console.error('seatNumbers is not an array:', seatNumbers);
        return tableTop;
    }

    let currentY = tableTop;

    function drawHeaderRow(y) {
        for (let i = 0; i < columnsPerRow; i++) {
            const x = tableLeft + i * cellWidth;
            doc.rect(x, y, cellWidth, headerHeight).stroke();
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Seat No', x, y + 5, {
                width: cellWidth,
                align: 'center'
            });
        }
        return y + headerHeight;
    }

    currentY = drawHeaderRow(currentY);
    let rowsOnCurrentPage = 0;

    for (let i = 0; i < seatNumbers.length; i += columnsPerRow) {
        if (rowsOnCurrentPage >= maxRowsPerPage) {
            
            doc.addPage();
            addHeader(doc, headerData);
            currentY = tableTop;
            currentY = drawHeaderRow(currentY);
            rowsOnCurrentPage = 0;
        }

        for (let j = 0; j < columnsPerRow; j++) {
            const currentX = tableLeft + j * cellWidth;
            doc.rect(currentX, currentY, cellWidth, cellHeight).stroke();

            if (i + j < seatNumbers.length) {
                doc.fontSize(10).font('Helvetica');
                const textHeight = doc.currentLineHeight();
                const textY = currentY + (cellHeight - textHeight) / 2;

                // Display the stripped seat number
                doc.text(seatNumbers[i + j], currentX, textY, {
                    width: cellWidth,
                    align: 'center'
                });
            }
        }

        currentY += cellHeight;
        rowsOnCurrentPage++;
    }
    
    return currentY;
}

function createAttendanceReport(doc, data) {
    addHeader(doc, data);
    doc.fontSize(14).font('Helvetica-Bold')
    .text('Seating Arrangement', 50, 170, {
        width: 500,
        align: 'center'
    });
    // doc.fontSize(10).text('Note: Make a circle on the Seat Number below for absent students with a red pen.', 55, 160).stroke();
    createTable(doc, data.seatNumbers, data);
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

async function generateSeatingArrangementReport(doc, center, batchNo, departmentId) {
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
        if(!checkDownloadAllowedStudentLoginPass(batchInfo.start_time, batchInfo.batchdate)) {
            throw new Error("Download not allowed at this time");
        }
        
        // Convert start_time to 12-hour format
        const formattedExamTime = formatTime(batchInfo.start_time);

        const data = {
            centerCode: center,
            batch: batchNo.toString(),
            examDate: examDate,
            examTime: formattedExamTime, // Now in 12-hour format
            seatNumbers: response.map(student => stripLastTwoDigits(student.student_id.toString())), // Strip last two digits
            departmentName: response[0].departmentName,
            departmentExam: response[0].departmentExam,
            departmentLogo: response[0].logo
        };

        createAttendanceReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { generateSeatingArrangementReport };