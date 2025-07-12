const connection = require("../config/db1");
const moment = require('moment-timezone');

// Helper functions for formatting
function formatDate(dateString) {
    return moment(dateString).tz('Asia/Kolkata').format('DD-MM-YYYY');
}

function formatDateTime(dateTimeString) {
    return moment(dateTimeString).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
}

function formatTime(timeString) {
    console.log('Formatting time:', timeString, 'Type:', typeof timeString);
    
    if (!timeString) {
        return 'Not specified';
    }
    
    // Convert to string
    const timeStr = timeString.toString();
    
    // If it's already in HH:MM:SS format, return as is
    if (timeStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
        // Ensure it's in HH:MM:SS format (pad single digit hours)
        const parts = timeStr.split(':');
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1];
        const seconds = parts[2];
        return `${hours}:${minutes}:${seconds}`;
    }
    
    // If it's in HH:MM format, add seconds
    if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
        const parts = timeStr.split(':');
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1];
        return `${hours}:${minutes}:00`;
    }
    
    console.error('Unexpected time format:', timeString);
    return timeStr;
}

async function getData(center, batchNo, departmentId) {
    try {
        const query = 'SELECT s.student_id , d.departmentName , d.logo from students as s JOIN departmentdb d ON s.departmentId = d.departmentId where s.batchNo = ? AND s.center = ? AND s.loggedin = 0 AND s.departmentId = ?';
        const response = await connection.query(query, [batchNo, center, departmentId]);
        
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ? AND departmentId = ?';
        const batchData = await connection.query(batchquery, [batchNo, departmentId]);
        
        // Debug the time value
        if (batchData[0] && batchData[0].length > 0) {
            const startTime = batchData[0][0].start_time;
            console.log('Raw start_time value:', startTime);
            console.log('start_time type:', typeof startTime);
            console.log('start_time toString():', startTime ? startTime.toString() : 'null');
            console.log('start_time JSON:', JSON.stringify(startTime));
        }

        // Format the batch data dates and times
        if (batchData[0] && batchData[0].length > 0) {
            batchData[0].forEach(batch => {
                if (batch.batchdate) {
                    batch.batchdate_formatted = formatDate(batch.batchdate);
                }
                if (batch.start_time) {
                    batch.start_time_formatted = formatTime(batch.start_time);
                }
            });
        }
        
        return { 
            response: response[0], 
            batchData: batchData[0]
        };
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

// Updated function to allow downloads 3 days before batch date
function checkDownloadAllowed3DaysBefore(batchDate) {
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
    
    // Allow download from 3 days before batch date until 1 day after batch date
    // differenceInDays will be:
    // - Positive if batch date is in future
    // - 0 if batch date is today
    // - Negative if batch date is in past
    return differenceInDays >= -1 && differenceInDays <= 4;
}

function checkDownloadAllowed(batchDate) {
    const today = moment().tz('Asia/Kolkata').startOf('day');
    const batchMoment = moment(batchDate).tz('Asia/Kolkata').startOf('day');
    console.log('Today (Kolkata):', today.format('YYYY-MM-DD'));
    console.log('Batch Date (Kolkata):', batchMoment.format('YYYY-MM-DD'));
    const differenceInDays = batchMoment.diff(today, 'days');
    console.log('Difference in days:', differenceInDays);
    // Allow download if it's the day of the batch or one day before
    return differenceInDays <= 1 && differenceInDays >= 0;
}

function checkDownloadAllowedStudentLoginPass(batchDate) {
    // Set the timezone to Kolkata
    const kolkataZone = 'Asia/Kolkata';

    // Parse the batchDate (which is in UTC) and convert it to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone).startOf('day');

    // Get current date in Kolkata timezone
    const nowKolkata = moment().tz(kolkataZone).startOf('day');

    // Calculate the date 3 days before the batch date (updated from 1 day)
    const threeDaysBefore = batchDateKolkata.clone().subtract(3, 'days');

    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Date (Kolkata):', nowKolkata.format('YYYY-MM-DD'));
    console.log('Three Days Before (Kolkata):', threeDaysBefore.format('YYYY-MM-DD'));

    // Check if current date is after or equal to 3 days before the batch date
    return nowKolkata.isSameOrAfter(threeDaysBefore);
}

function addHeader(doc, data) {
    doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 40, { width: 60, height: 60 });

    doc.fontSize(14).font('Helvetica-Bold')
        .text(data.departmentName, 110, 50, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text('GCC COMPUTER SHORTHAND EXAMINATION JUNE 2025', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text('ABSENTEE REPORT', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();

    doc.moveDown();
    const yPosition = doc.y-8;
    const fontSize = 10;
    const spacer = '\u00A0\u00A0';
    doc.fontSize(fontSize).font('Helvetica');

    doc.text(`CENTER CODE: ${data.centerCode}${spacer}`, 50, yPosition + 10);
    doc.text(`BATCH: ${data.batch}${spacer}`, 200, yPosition + 10);
    doc.text(`EXAM DATE: ${data.examDate}${spacer}`, 300, yPosition + 10);
    doc.text(`EXAM TIME: ${data.examTime}`, 440, yPosition + 10);

    return doc.y + 20;
}

function createTable(doc, seatNumbers, headerData) {
    const tableTop = 190;
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
            currentY = addSignatureLines(doc, currentY, signatureGap);
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

                doc.text(seatNumbers[i + j], currentX, textY, {
                    width: cellWidth,
                    align: 'center'
                });
            }
        }

        currentY += cellHeight;
        rowsOnCurrentPage++;
    }

    // Add signatures after the table with increased gap
    currentY = addSignatureLines(doc, currentY, signatureGap);

    return currentY;
}

function addSignatureLines(doc, y, gap = 40) {
    const signatureY = y + gap;
    const lineWidth = 130;

    function addSignatureField(x, y, text) {
        doc.moveTo(x, y).lineTo(x + lineWidth, y).stroke();
        doc.fontSize(10).text(text, x + 12, y + 5);
    }

    addSignatureField(100, signatureY, "Examiner's Signature");
    addSignatureField(400, signatureY, "Supervisor's Signature");

    return signatureY + 40;
}

function createAttendanceReport(doc, data) {
    addHeader(doc, data);
    createTable(doc, data.seatNumbers, data);
}

function getDateFromISOString(isoString) {
    // Updated to return YYYY-MM-DD format in Kolkata timezone
    return moment(isoString).tz('Asia/Kolkata').format('YYYY-MM-DD');
}

async function generatePostAbsenteeReport(doc, center, batchNo, departmentId) {
    try {
        const Data = await getData(center, batchNo, departmentId);

        const response = Data.response;
        if (!Array.isArray(response) || response.length === 0) {
            throw new Error('No data returned from getData');
        }
        
        if (!Array.isArray(Data.batchData) || Data.batchData.length === 0) {
            throw new Error('No batch data available');
        }

        const batchInfo = Data.batchData[0];
        
        const examDate = formatDate(batchInfo.batchdate);
        
        // Handle time formatting with fallback
        let examTime = 'Not specified';
        if (batchInfo.start_time) {
            try {
                examTime = formatTime(batchInfo.start_time);
                if (examTime === 'Invalid time') {
                    // Fallback: try to extract time from the raw value
                    examTime = batchInfo.start_time.toString();
                }
            } catch (timeError) {
                console.error('Time formatting error:', timeError);
                examTime = batchInfo.start_time.toString();
            }
        }
        
        console.log('Formatted Exam Date:', examDate);
        console.log('Formatted Exam Time:', examTime);
        
        // Use the updated 3-day check function
        if(!checkDownloadAllowedStudentLoginPass(batchInfo.batchdate)) {
            throw new Error("Download not allowed at this time - must be within 3 days of batch date");
        }
        
        const data = {
            centerCode: center,
            batch: batchNo.toString(),
            examDate: examDate,
            examTime: examTime,
            seatNumbers: response.map(student => student.student_id.toString()),
            departmentName: response[0].departmentName,
            departmentLogo: response[0].logo
        };

        createAttendanceReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

// Add an alias function for backward compatibility
async function generateReport(doc, center, batchNo, departmentId) {
    return generatePostAbsenteeReport(doc, center, batchNo, departmentId);
}

// Fixed: Single module.exports statement
module.exports = { generatePostAbsenteeReport, generateReport };