const connection = require("../config/db1");
const moment = require('moment-timezone'); // Make sure to install and import moment.js for easier date handling



async function getData(center, batchNo) {
    try {
        // console.log(center, batchNo);
        const query = 'SELECT s.student_id , d.departmentName ,  d.logo from students as s JOIN departmentdb d ON s.departmentId = d.departmentId where s.batchNo = ? AND s.center = ?';
        const response = await connection.query(query, [batchNo, center]);
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const batchData = await connection.query(batchquery, [batchNo]);
        // console.log(response[0], batchData[0]);

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



function addHeader(doc, data) {
    doc.image(Buffer.from(data.departmentLogo, 'base64'), 50, 50, { width: 60, height: 50 });

    doc.fontSize(14).font('Helvetica-Bold')
        .text(data.departmentName, 110, 50, {
            width: 450,
            align: 'center'
        });

    doc.fontSize(12).font('Helvetica')
        .text(' COMPUTER SHORTHAND EXAMINATION (SEPTEMBER 2024)', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });


    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();

    doc.moveDown();
    const yPosition = doc.y-8;
    const fontSize = 12;
    const spacer = '\u00A0\u00A0';
    doc.fontSize(fontSize).font('Helvetica');

    doc.text(`CENTER CODE: ${data.centerCode}${spacer}`, 50, yPosition + 10);
    doc.text(`BATCH: ${data.batch}${spacer}`, 185, yPosition + 10);
    doc.text(`EXAM DATE: ${data.examDate}${spacer}`, 275, yPosition + 10);
    doc.text(`EXAM TIME: ${data.examTime}`, 425, yPosition + 10);

    return doc.y + 20;
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

async function generateSeatingArrangementReport(doc, center, batchNo) {
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
        const examDate = moment(batchInfo.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY')
        // if(!checkDownloadAllowedStudentLoginPass(batchInfo.batchdate)) {
        //     throw new Error("Download not allowed at this time");
        // }
        

        const data = {
            centerCode: center,
            batch: batchNo.toString(),
            examDate: examDate,
            examTime: batchInfo.start_time,
            seatNumbers: response.map(student => student.student_id.toString()),
            departmentName:response[0].departmentName,
            departmentLogo:response[0].logo
        };

        createAttendanceReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { generateSeatingArrangementReport };