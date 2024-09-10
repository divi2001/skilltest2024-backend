const { generateReport } = require('./generate_absentee_report');
const PDFDocument = require('pdfkit');
exports.generateReports = async (req, res) => {
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

    // Use a Promise to handle the PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        generateReport(doc).then(() => {
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