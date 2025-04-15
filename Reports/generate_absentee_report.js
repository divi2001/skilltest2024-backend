const connection = require("../config/db1");
const moment = require('moment-timezone'); // Make sure to install and import moment.js for easier date handling

async function getData(center, batchNo) {
    try {
        console.log(`Looking for data with center: ${center}, batchNo: ${batchNo}`);
        
        // First, log all department IDs present in the system for reference
        const deptQuery = 'SELECT departmentId, departmentName FROM departmentdb';
        const [departments] = await connection.query(deptQuery);
        console.log("Available departments in the system:", departments);
        
        // Check if there are any students for this batch and center, regardless of department
        const checkQuery = 'SELECT COUNT(*) as count FROM students WHERE batchNo = ? AND center = ?';
        const [checkResult] = await connection.query(checkQuery, [batchNo, center]);
        console.log(`Total students found for batch ${batchNo} at center ${center}: ${checkResult[0].count}`);
        
        // Get a breakdown of department IDs for students in this batch and center
        const deptBreakdownQuery = 'SELECT departmentId, COUNT(*) as count FROM students WHERE batchNo = ? AND center = ? GROUP BY departmentId';
        const [deptBreakdown] = await connection.query(deptBreakdownQuery, [batchNo, center]);
        console.log(`Department ID breakdown for batch ${batchNo} at center ${center}:`, deptBreakdown);
        
        // Specifically check for departmentId=2
        const deptCheckQuery = 'SELECT COUNT(*) as count FROM students WHERE batchNo = ? AND center = ? AND departmentId = 2';
        const [deptCheckResult] = await connection.query(deptCheckQuery, [batchNo, center]);
        console.log(`Students with departmentId=2 for batch ${batchNo} at center ${center}: ${deptCheckResult[0].count}`);
        
        // Modified main query - explicitly targeting departmentId=2
        const query = `SELECT s.student_id, s.departmentId, d.departmentName, d.logo 
                      FROM students as s 
                      JOIN departmentdb d ON s.departmentId = d.departmentId 
                      WHERE s.batchNo = ? AND s.center = ?`;
        const [response] = await connection.query(query, [batchNo, center]);
        console.log(`Students found with department join: ${response.length}`);
        if (response.length > 0) {
            console.log("Sample student record:", response[0]);
        }
        
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchquery, [batchNo]);
        
        if (!response || response.length === 0) {
            console.log("No students found with department join - checking if we have students without the join");
            // Try a simpler query without the department join as a fallback
            const fallbackQuery = 'SELECT student_id, departmentId FROM students WHERE batchNo = ? AND center = ?';
            const [fallbackResponse] = await connection.query(fallbackQuery, [batchNo, center]);
            console.log(`Fallback query found ${fallbackResponse.length} students`);
            
            if (fallbackResponse.length > 0) {
                console.log("Sample fallback student:", fallbackResponse[0]);
                
                // If we found students without the join, use default department info
                console.log("Using default department info for students");
                const defaultDept = { departmentName: 'GCC Examination', logo: null };
                
                // Create a response with default department info
                const mappedResponse = fallbackResponse.map(student => ({
                    student_id: student.student_id,
                    departmentName: defaultDept.departmentName,
                    logo: defaultDept.logo
                }));
                
                return { 
                    response: mappedResponse, 
                    batchData: batchData
                };
            }
            
            return null; // No students found even with fallback query
        }
        
        return { 
            response: response, 
            batchData: batchData
        };
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

function checkDownloadAllowed(batchDate) {
    const today = moment().startOf('day');
    const batchMoment = moment(batchDate).startOf('day');
    console.log(today,batchMoment);
    const differenceInDays = batchMoment.diff(today, 'days');
    console.log(differenceInDays);
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
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Date (Kolkata):', nowKolkata.format('YYYY-MM-DD'));
    console.log('One Day Before (Kolkata):', oneDayBefore.format('YYYY-MM-DD'));

    // Check if current date is after or equal to 1 day before the batch date
    return nowKolkata.isSameOrAfter(oneDayBefore);
}

function addHeader(doc, data) {
    // Only try to display the logo if it exists
    if (data.departmentLogo) {
        doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 40, { width: 60, height: 60 });
    }

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

    doc.fontSize(12).font('Helvetica')
        .text('ATTENDENCE REPORT', 110, doc.y + 5, {
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
    doc.fontSize(10).text('Note: Make a circle on the Seat Number below for absent students with a red pen.', 55, 160).stroke();

    createTable(doc, data.seatNumbers, data);
}

function getDateFromISOString(isoString) {
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
}

async function generateReport(doc, center, batchNo) {
    try {
        const Data = await getData(center, batchNo);
        
        if (!Data) {
            throw new Error('No data returned from getData');
        }

        const response = Data.response;
        if (!Array.isArray(response) || response.length === 0) {
            throw new Error('No student data found');
        }

        if (!Array.isArray(Data.batchData) || Data.batchData.length === 0) {
            throw new Error('No batch data available');
        }

        const batchInfo = Data.batchData[0];
        const examDate = moment(batchInfo.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY');
        
        if(!checkDownloadAllowedStudentLoginPass(batchInfo.batchdate)) {
            throw new Error("Download not allowed at this time");
        }
        
        const data = {
            centerCode: center,
            batch: batchNo.toString(),
            examDate: examDate,
            examTime: batchInfo.start_time,
            seatNumbers: response.map(student => student.student_id.toString()),
            departmentName: response[0].departmentName || 'GCC Examination',
            departmentLogo: response[0].logo || null
        };

        createAttendanceReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { generateReport };