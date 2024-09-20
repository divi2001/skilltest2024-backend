const connection =  require("../config/db1");
const moment = require('moment-timezone');

function createAttendanceReport(doc , data) {
    function addHeader() {
        doc.image('Reports/logo.png', 50, 50, { width: 60, height: 50 })

        doc.fontSize(14).font('Helvetica-Bold')
            .text('Commissioner for Cooperation and Registrar, Cooperative Societies Maharashtra State, Pune', 110, 50, {
                width: 450,
                align: 'center'
            });

        doc.fontSize(12).font('Helvetica')
            .text('COMPUTER SHORTHAND EXAMINATION (SEPTEMBER 2024)', 110, doc.y + 5, {
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

    const headers = ['Sr. No.', 'SEAT NO', 'NAME OF STUDENT', 'SUBJECT', 'PHOTO\n(uploaded)', 'SIGN\n(uploaded)', 'SIGNATURE'];
    const columnWidths = [40, 60, 170, 60, 60, 60, 70];

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

            // SEAT NO
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

            // SIGN(uploaded)
            doc.rect(xPosition, yPosition, columnWidths[5], rowHeight).stroke();
            if (student.signBase64) {
                try {
                    doc.image(Buffer.from(student.signBase64, 'base64'), xPosition + 2, yPosition + 2, {
                        fit: [columnWidths[5] - 4, rowHeight - 4],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (error) {
                    console.error(`Error loading sign image for student ${student.seatNo}:`, error);
                    doc.text('No Sign', xPosition + 2, yPosition + rowHeight / 2 - 5, {
                        width: columnWidths[5],
                        align: 'center'
                    });
                }
            } else {
                doc.text('No Sign', xPosition + 2, yPosition + rowHeight / 2 - 5, {
                    width: columnWidths[5],
                    align: 'center'
                });
            }
            xPosition += columnWidths[5];

            // SIGNATURE
            doc.rect(xPosition, yPosition, columnWidths[6], rowHeight).stroke();

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

const getData = async(center , batchNo) => {
    try {
        console.log(center,batchNo)
        const query = 'SELECT s.fullname, s.student_id, s.base64 ,s.sign_base64, sub.subject_name_short FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId WHERE s.center = ? AND s.batchNo = ?';
        const response = await connection.query(query,[center,batchNo]);
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const batchData = await connection.query(batchquery, [batchNo]);
        console.log(batchData[0].batchdate);
        if(!checkDownloadAllowedStudentLoginPass(batchData[0].batchdate)) {
            return res.status(403).json({ "message": "Download not allowed at this time" });
        }
        
        return { 
            response: response[0], 
            batchData: batchData[0], 
            //  
        };
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
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

    // Check if current date is between one day before the batch date and the batch date itself (inclusive)
    return nowKolkata.isSameOrAfter(oneDayBefore) && nowKolkata.isSameOrBefore(batchDateKolkata);
}

const AttendanceReport = async(doc,center,batchNo) => {
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
    const examDate = moment(batchInfo.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY');
    if(!checkDownloadAllowedStudentLoginPass(batchInfo.batchdate)) {
        throw new Error("Download not allowed at this time");
    }

    const data = {
        centerCode: center,
        batch: batchNo,
        examDate: examDate,
        examTime: batchInfo.start_time,
        students: response.map(student => {
            return {
                seatNo: student.student_id.toString(),
                name: student.fullname,
                subject: student.subject_name_short,
                photoBase64: student.base64,
                signBase64:student.sign_base64,  // Using the same path for both photo and sign
            }
        })
    }
    createAttendanceReport(doc,data);
}

module.exports = {AttendanceReport};