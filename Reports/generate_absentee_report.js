const PDFDocument = require('pdfkit');
const fs = require('fs');
const connection = require("../config/db1");

async function getData() {
    try {
        const query = 'SELECT student_id from students where batchNo = 100';
        const response = await connection.query(query);
        return response[0];
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

function addHeader(doc, data) {
    // Add logo
    doc.image('Reports/logo.png', 50, 50, { width: 50, height: 50 })

    // Add main title
    doc.fontSize(14).font('Helvetica-Bold')
        .text('MAHARASHTRA STATE COUNCIL OF EXAMINATIONS, PUNE', 110, 50, {
            width: 450,
            align: 'center'
        });

    // Add subtitle
    doc.fontSize(12).font('Helvetica')
        .text('GCC COMPUTER SHORTHAND EXAMINATION (SEPTEMBER 2024)', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    // Add report title
    doc.fontSize(12).font('Helvetica')
        .text('ATTENDENCE REPORT', 110, doc.y + 5, {
            width: 450,
            align: 'center'
        });

    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    // Add information line
    doc.moveDown();
    const yPosition = doc.y;
    const fontSize = 10;
    const spacer = '\u00A0\u00A0'; // 2 non-breaking spaces
    doc.fontSize(fontSize).font('Helvetica');

    doc.text(`CENTER CODE: ${data.centerCode}${spacer}`, 50, yPosition + 10);
    doc.text(`BATCH: ${data.batch}${spacer}`, 200, yPosition + 10);
    doc.text(`EXAM DATE: ${data.examDate}${spacer}`, 300, yPosition + 10);
    doc.text(`EXAM TIME: ${data.examTime}`, 440, yPosition + 10);
}

function createTable(doc, seatNumbers, headerData, rowsPerPage = 25) {
    const tableTop = 180;
    const tableLeft = 50;
    const cellWidth = 100;
    const cellHeight = 20;

    if (!Array.isArray(seatNumbers)) {
        console.error('seatNumbers is not an array:', seatNumbers);
        return;
    }

    let currentY = tableTop;
    const columnsPerRow = 5;

    for (let i = 0; i < seatNumbers.length || i % columnsPerRow !== 0; i++) {
        const rowIndex = Math.floor(i / columnsPerRow);
        const columnIndex = i % columnsPerRow;

        if (rowIndex % rowsPerPage === 0 && columnIndex === 0 && i !== 0) {
            doc.addPage();
            addHeader(doc, headerData);
            currentY = tableTop;
        }

        const currentX = tableLeft + columnIndex * cellWidth;

        // Draw the cell rectangle
        doc.rect(currentX, currentY, cellWidth, cellHeight).stroke();

        // Add seat number if available
        if (i < seatNumbers.length) {
            doc.text(seatNumbers[i], currentX + 5, currentY + 5);
        }

        // Move to next row if we've filled all columns
        if (columnIndex === columnsPerRow - 1) {
            currentY += cellHeight;
        }
    }
}

function addSignatureLines(doc) {
    doc.moveDown(4);
    const signatureY = doc.y + 20;
    const lineWidth = 130;

    function addSignatureField(x, y, text) {
        doc.moveTo(x, y).lineTo(x + lineWidth, y).stroke();
        doc.fontSize(10).text(text, x + 12, y + 5);
    }

    addSignatureField(100, signatureY, "Examiner's Signature");
    addSignatureField(400, signatureY, "Supervisor's Signature");
}

function createAttendanceReport(doc, data) {
    addHeader(doc, data);

    doc.fontSize(10).text('Note: Make a circle on the Seat Number below for absent students with a red pen.', 50, 150).stroke();

    createTable(doc, data.seatNumbers, data);

    addSignatureLines(doc);
}

async function generateReport(doc) {
    try {
        const response = await getData();

        if (!Array.isArray(response) || response.length === 0) {
            throw new Error('No data returned from getData');
        }

        const data = {
            centerCode: '1151',
            batch: '204',
            examDate: '2024-06-27',
            examTime: '03:15 PM',
            seatNumbers: Array.from({ length: 300 }, (_, i) => `115${1540191 + i}`)
        };

        createAttendanceReport(doc, data);

    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
}

module.exports = { generateReport };