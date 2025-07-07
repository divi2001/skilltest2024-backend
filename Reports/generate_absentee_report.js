const connection = require("../config/db1");
const moment = require('moment-timezone'); // Make sure to install and import moment.js for easier date handling

// Helper functions for formatting
function formatDate(dateString) {
    return moment(dateString).tz('Asia/Kolkata').format('DD-MM-YYYY');
}

function formatDateTime(dateTimeString) {
    return moment(dateTimeString).tz('Asia/Kolkata').format('DD-MM-YYYY HH:mm:ss');
}

function formatTime(timeString) {
    return moment(timeString).tz('Asia/Kolkata').format('HH:mm:ss');
}

async function getData(center, batchNo) {
    try {
        // console.log(center, batchNo);
        const query = 'SELECT s.student_id , d.departmentName , d.logo from students as s JOIN departmentdb d ON s.departmentId = d.departmentId where s.batchNo = ? AND s.center = ? AND s.loggedin = 0';
        const response = await connection.query(query, [batchNo, center]);
        console.log(response);
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const batchData = await connection.query(batchquery, [batchNo]);
        console.log(response[0], batchData[0]);

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

        // Check if download is allowed
        // const isDownloadAllowed = checkDownloadAllowed(batchData[0][0].batchdate);
        
        // if(!isDownloadAllowed) throw new Error("Download is not allowed at this time")
       
        
        return { 
            response: response[0], 
            batchData: batchData[0], 
            // isDownloadAllowed 
        };
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

function checkDownloadAllowed(batchDate) {
    const today = moment().tz('Asia/Kolkata').startOf('day');
    const batchMoment = moment(batchDate).tz('Asia/Kolkata').startOf('day');
    console.log('Today (Kolkata):', today.format('DD-MM-YYYY'));
    console.log('Batch Date (Kolkata):', batchMoment.format('DD-MM-YYYY'));
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

    // Calculate the date 1 day before the batch date
    const oneDayBefore = batchDateKolkata.clone().subtract(1, 'day');

    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('DD-MM-YYYY'));
    console.log('Current Date (Kolkata):', nowKolkata.format('DD-MM-YYYY'));
    console.log('One Day Before (Kolkata):', oneDayBefore.format('DD-MM-YYYY'));

    // Check if current date is after or equal to 1 day before the batch date
    return nowKolkata.isSameOrAfter(oneDayBefore);
}

function addHeader(doc, data) {
    doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 40, { width: 60, height: 60 });

    doc.fontSize(14).font('Helvetica-Bold')
        .text(data.departmentName, 110, 50, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text('Skill Test Computer Shorthand Examination April 2025', 110, doc.y + 5, {
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
    // doc.fontSize(10).text('Note: Make a circle on the Seat Number below for absent students with a red pen.', 55, 160).stroke();

    createTable(doc, data.seatNumbers, data);
}

function getDateFromISOString(isoString) {
    // Updated to return DD-MM-YYYY format in Kolkata timezone
    return moment(isoString).tz('Asia/Kolkata').format('DD-MM-YYYY');
}

async function generatePostAbsenteeReport(doc, center, batchNo) {
    try {
        const Data = await getData(center, batchNo);
        // console.log(Data);

        const response = Data.response;
        if (!Array.isArray(response) || response.length === 0) {
            throw new Error('No data returned from getData');
        }
        
        if (!Array.isArray(Data.batchData) || Data.batchData.length === 0) {
            throw new Error('No batch data available');
        }

        const batchInfo = Data.batchData[0];
        
        // Format date and time properly
        const examDate = formatDate(batchInfo.batchdate);
        const examTime = formatTime(batchInfo.start_time);
        
        console.log('Formatted Exam Date:', examDate);
        console.log('Formatted Exam Time:', examTime);
        
        if(!checkDownloadAllowedStudentLoginPass(batchInfo.batchdate)) {
            throw new Error("Download not allowed at this time");
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

module.exports = { generatePostAbsenteeReport };