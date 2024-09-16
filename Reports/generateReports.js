const { generateReport } = require('./generate_absentee_report');
const {AttendanceReport} = require('./generate_attendance_reports');
// const {}
const PDFDocument = require('pdfkit');
const { createBlankAnswerSheet } = require('./generate_blank_answer_sheet');

exports.generateAbsenteeReport = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });
    
    const {batchNo} = req.body;
    const center = req.session.centerId;
    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generateReport(doc,center,batchNo).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating report:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating report');
    }
}

exports.generateAttendanceReport = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 50,
            bottom: 50,
            left: 0,
            right: 0
        }
    });
    
    // const {batchNo} = req.body;
    // const center = req.session.centerId;
    const {batchNo} = req.body;
    const center = req.session.centerId;

    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        AttendanceReport(doc,center,batchNo).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating report:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating report');
    }
}

exports.generateBlankAnswerSheet = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=blank_answer_sheet.pdf');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);

    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 30,
            bottom: 30,
            left: 40,
            right: 40
        }
    });

    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        createBlankAnswerSheet(doc).then(() => {
            doc.end();
        }).catch((error) => {
            console.error("Error generating blank answer sheet:", error);
            reject(error);
        });
    });

    try {
        const pdfBuffer = await pdfPromise;
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error sending PDF:", error);
        res.status(500).send('Error generating blank answer sheet');
    }
}