const connection = require("../config/db1");
const moment = require('moment-timezone');

// Helper function to strip last two digits from student ID
function stripLastTwoDigits(studentId) {
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

function createAttendanceReport(doc, data) {
    function addHeader() {
        // Only try to display the logo if it exists and is not null
        if (data.departmentLogo) {
            try {
                doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 40, { width: 60, height: 60 });
            } catch (error) {
                console.error('Error loading department logo:', error);
                // Continue without the logo
            }
        }

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

        return doc.y + 20; // Return the Y position after the header
    }

    function addSignatureLines(y) {
        const lineLength = 200;
        const textOffset = 10;
        const pageWidth = doc.page.width;
        const leftMargin = 50;
        const rightMargin = 50;

        const leftLineX = leftMargin;
        const rightLineX = pageWidth - rightMargin - lineLength;

        doc.moveTo(leftLineX, y).lineTo(leftLineX + lineLength, y).stroke();
        doc.fontSize(10).font('Helvetica');
        doc.text('Signature of Supervisor', leftLineX+50, y + textOffset, { align: 'left' });

        doc.moveTo(rightLineX, y).lineTo(rightLineX + lineLength, y).stroke();
        doc.text('Signature of Center Head', rightLineX+50, y + textOffset, { align: 'left' });

        return y + textOffset + 20;
    }

    const tableTop = 150;
    const tableLeft = 50;
    const rowHeight = 40;
    const headerRowHeight = 30;
    const pageBreakThreshold = 700;

    // Added 'SIGNATURE' column after 'PHOTO\n(uploaded)' and adjusted widths
    const headers = ['Sr. No.', 'SEAT NO', 'NAME OF STUDENT', 'SUBJECT', 'PHOTO\n(uploaded)', 'SIGNATURE'];
    const columnWidths = [40, 80, 180, 80, 70, 70]; // Total: 520px, reduced NAME column by 20px to accommodate SIGNATURE

    function drawTableHeaders(yPosition) {
        let xPosition = tableLeft;
        headers.forEach((header, index) => {
            doc.rect(xPosition, yPosition, columnWidths[index], headerRowHeight).stroke();
            doc.fontSize(8).text(header, xPosition + 2, yPosition + 10, {
                width: columnWidths[index],
                align: 'center'
            });
            xPosition += columnWidths[index];
        });
        return yPosition + headerRowHeight;
    }

    function createTable(students) {
        let yPosition = tableTop;
        let currentPage = 1;
        let studentsOnCurrentPage = 0;
        const maxStudentsPerPage = 12;
        const signatureGap = 40;

        yPosition = drawTableHeaders(yPosition);

        students.forEach((student, index) => {
            if (studentsOnCurrentPage >= maxStudentsPerPage || yPosition + rowHeight > pageBreakThreshold - signatureGap) {
                yPosition = addSignatureLines(yPosition + signatureGap);
                doc.addPage();
                yPosition = addHeader();
                yPosition = drawTableHeaders(yPosition);
                currentPage++;
                studentsOnCurrentPage = 0;
            }

            let xPosition = tableLeft;

            // Sr. No.
            doc.rect(xPosition, yPosition, columnWidths[0], rowHeight).stroke();
            doc.text(index + 1, xPosition + 2, yPosition + rowHeight / 2 - 5, { width: columnWidths[0], align: 'center' });
            xPosition += columnWidths[0];

            // SEAT NO - Using stripped student ID
            doc.rect(xPosition, yPosition, columnWidths[1], rowHeight).stroke();
            doc.text(student.seatNo, xPosition + 2, yPosition + rowHeight / 2 - 5, { width: columnWidths[1], align: 'center' });
            xPosition += columnWidths[1];

            // NAME OF STUDENT
            doc.rect(xPosition, yPosition, columnWidths[2], rowHeight).stroke();
            doc.fontSize(8).text(student.name, xPosition, yPosition + rowHeight / 2 - 5, {
                width: columnWidths[2],
                align: 'center',
                valign: 'center'
            });
            xPosition += columnWidths[2];

            // SUBJECT
            doc.rect(xPosition, yPosition, columnWidths[3], rowHeight).stroke();
            doc.text(student.subject, xPosition + 2, yPosition + rowHeight / 2 - 5, { width: columnWidths[3], align: 'center' });
            xPosition += columnWidths[3];

            // PHOTO
            doc.rect(xPosition, yPosition, columnWidths[4], rowHeight).stroke();
            if (student.photoBase64) {
                try {
                    doc.image(Buffer.from(student.photoBase64, 'base64'), xPosition + 2, yPosition + 2, {
                        fit: [columnWidths[4] - 4, rowHeight - 4],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (error) {
                    console.error(`Error loading image for student ${student.seatNo}:`, error);
                    doc.text('No Photo', xPosition + 2, yPosition + rowHeight / 2 - 5, {
                        width: columnWidths[4],
                        align: 'center'
                    });
                }
            } else {
                doc.text('No Photo', xPosition + 2, yPosition + rowHeight / 2 - 5, {
                    width: columnWidths[4],
                    align: 'center'
                });
            }
            xPosition += columnWidths[4];

            // SIGNATURE (empty space for manual signature)
            doc.rect(xPosition, yPosition, columnWidths[5], rowHeight).stroke();

            yPosition += rowHeight;
            studentsOnCurrentPage++;

            if (index === students.length - 1) {
                yPosition = addSignatureLines(yPosition + signatureGap);
            }
        });

        return yPosition;
    }

    function addCenteredSummaryTable(startY, totalStudents) {
        if (startY > 700) {
            doc.addPage();
            startY = addHeader();
        } else {
            startY += 30;
        }

        const summaryTableWidth = 250;
        const summaryTableLeft = (doc.page.width - summaryTableWidth) / 2;
        const summaryRowHeight = 18;

        doc.rect(summaryTableLeft, startY, summaryTableWidth, summaryRowHeight * 3).stroke();

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('PRESENT', summaryTableLeft, startY + 5, { width: summaryTableWidth / 3, align: 'center' });
        doc.text('ABSENT', summaryTableLeft + summaryTableWidth / 3, startY + 5, { width: summaryTableWidth / 3, align: 'center' });
        doc.text('TOTAL', summaryTableLeft + (summaryTableWidth / 3) * 2, startY + 5, { width: summaryTableWidth / 3, align: 'center' });

        doc.moveTo(summaryTableLeft + summaryTableWidth / 3, startY)
            .lineTo(summaryTableLeft + summaryTableWidth / 3, startY + summaryRowHeight * 3)
            .stroke();
        doc.moveTo(summaryTableLeft + (summaryTableWidth / 3) * 2, startY)
            .lineTo(summaryTableLeft + (summaryTableWidth / 3) * 2, startY + summaryRowHeight * 3)
            .stroke();

        doc.moveTo(summaryTableLeft, startY + summaryRowHeight)
            .lineTo(summaryTableLeft + summaryTableWidth, startY + summaryRowHeight)
            .stroke();

        doc.fontSize(10).font('Helvetica');
        doc.text('', summaryTableLeft, startY + summaryRowHeight + 10, { width: summaryTableWidth / 3, align: 'center' });
        doc.text('', summaryTableLeft + summaryTableWidth / 3, startY + summaryRowHeight + 10, { width: summaryTableWidth / 3, align: 'center' });
        doc.text(totalStudents.toString(), summaryTableLeft + (summaryTableWidth / 3) * 2, startY + summaryRowHeight + 10, { width: summaryTableWidth / 3, align: 'center' });
        
        return startY + summaryRowHeight * 3 + 30;
    }

    const initialY = addHeader();
    const finalYPosition = createTable(data.students);
    const afterSummaryY = addCenteredSummaryTable(finalYPosition, data.students.length);
}

const getData = async(center, batchNo, departmentId) => {
    try {
        console.log(center, batchNo);
        const query = 'SELECT s.fullname, s.student_id, s.base64, sub.subject_name_short, d.departmentName, d.logo FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId JOIN departmentdb d ON s.departmentId = d.departmentId WHERE s.center = ? AND s.batchNo = ? AND s.departmentId = ?';
        const response = await connection.query(query, [center, batchNo, departmentId]);
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ? AND departmentId = ?';
        const batchData = await connection.query(batchquery, [batchNo, departmentId]);
        
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
function checkDownloadAllowed3Days(batchDate) {
    const kolkataZone = 'Asia/Kolkata';
    
    // Parse the batchDate and convert to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone).startOf('day');
    
    // Get current time in Kolkata timezone
    const now = moment().tz(kolkataZone).startOf('day');
    
    // Calculate difference in days
    const differenceInDays = batchDateKolkata.diff(now, 'days');
    
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Date (Kolkata):', now.format('YYYY-MM-DD'));
    console.log('Difference in Days:', differenceInDays);
    
    // Return true if current date is within 3 days before batch date (including batch date)
    return differenceInDays >= -1 && differenceInDays <= 4;
}

const AttendanceReport = async(doc, center, batchNo, departmentId) => {
    try {
        const Data = await getData(center, batchNo, departmentId);
        
        if (!Data) {
            throw new Error('No data returned from getData');
        }
        
        const response = Data.response;
        if (!Array.isArray(response) || response.length === 0) {
            throw new Error('No data returned from getData');
        }

        if (!Array.isArray(Data.batchData) || Data.batchData.length === 0) {
            throw new Error('No batch data available');
        }

        const batchInfo = Data.batchData[0];
        const examDate = moment(batchInfo.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY');
        
        // Updated to use 3-day validation instead of 1-day
        if(!checkDownloadAllowed3Days(batchInfo.batchdate)) {
            throw new Error("Download is only allowed within 3 days before the batch date");
        }

        // Convert start_time to 12-hour format
        const formattedExamTime = formatTime(batchInfo.start_time);

        const data = {
            centerCode: center,
            batch: batchNo,
            examDate: examDate,
            examTime: formattedExamTime, // Now in 12-hour format
            students: response.map(student => {
                return {
                    seatNo: stripLastTwoDigits(student.student_id.toString()), // Strip last two digits
                    name: student.fullname,
                    subject: student.subject_name_short,
                    photoBase64: student.base64
                }
            }),
            departmentName: response[0]?.departmentName || 'GCC Examination',
            departmentLogo: response[0]?.logo || null
        };
        
        createAttendanceReport(doc, data);
    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { AttendanceReport };