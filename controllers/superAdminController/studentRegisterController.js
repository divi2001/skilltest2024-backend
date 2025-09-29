// // // const path = require('path');
// // // const xlsx = require('xlsx');
// // // const fs = require('fs');
// // // const PDFDocument = require('pdfkit');

// // // // Helper function for PDF generation
// // // const generatePdf = (res, data, tempFilePath) => {
// // //     // This is a direct copy of your existing index.js logic,
// // //     // adapted to take the data and response object as parameters.
// // //     const results = new Map();
// // //     let globalSrNo = 1;

// // //     // Process the Excel data - grouped by district first, then center
// // //     data.forEach((row, index) => {
// // //         if (!row['CENTERNO'] || !row['INSTID'] || !row['Seatno']) {
// // //             console.log(`⚠️ Row ${index + 2} may have missing data:`, {
// // //                 CENTERNO: row['CENTERNO'],
// // //                 INSTID: row['INSTID'],
// // //                 Seatno: row['Seatno']
// // //             });
// // //         }
        
// // //         const centerCode = row['CENTERNO'];
// // //         const centerName = row['CenterName'] ? row['CenterName'].toString().toUpperCase() : 'UNKNOWN CENTER';
// // //         const districtName = row['DistName'] ? row['DistName'].toString().toUpperCase() : 'UNKNOWN DISTRICT';

// // //         if (!results.has(districtName)) {
// // //             results.set(districtName, new Map());
// // //         }
        
// // //         const districtCenters = results.get(districtName);
        
// // //         if (!districtCenters.has(centerCode)) {
// // //             districtCenters.set(centerCode, {
// // //                 centerName: centerName,
// // //                 districtName: districtName,
// // //                 students: []
// // //             });
// // //         }
        
// // //         const sec1Value = row['SEC1'] !== undefined ? row['SEC1'] : (row['SEC1GRACE'] || 0);
// // //         const sec2Value = row['SEC2'] !== undefined ? row['SEC2'] : (row['SEC2GRACE'] || 0);
// // //         const marksValue = row['MARKS'] !== undefined ? row['MARKS'] : (row['GRACEMARKS'] || 0);
        
// // //         let resultDate = 'N/A';
// // //         if (row['DATEOFRESULT']) {
// // //             if (typeof row['DATEOFRESULT'] === 'string' && row['DATEOFRESULT'].includes('/')) {
// // //                 const [day, month, year] = row['DATEOFRESULT'].split('/');
// // //                 resultDate = `${day}/${month}/${year}`;
// // //             } else if (row['DATEOFRESULT'] instanceof Date) {
// // //                 resultDate = row['DATEOFRESULT'].toLocaleDateString();
// // //             } else {
// // //                 resultDate = row['DATEOFRESULT'].toString();
// // //             }
// // //         }
        
// // //         let certificateNo = 'N/A';
// // //         if (row['CertificateNo'] && row['CertificateNo'] !== '#N/A') {
// // //             certificateNo = row['CertificateNo'];
// // //         } else if (row['MarkSheetNo'] && row['MarkSheetNo'] !== '#N/A') {
// // //             certificateNo = row['MarkSheetNo'];
// // //         } else if (row['CertificateNo1'] && row['CertificateNo1'] !== '#N/A') {
// // //             certificateNo = row['CertificateNo1'];
// // //         }
        
// // //         let resultStatus = 'PENDING';
// // //         if (row['RESULT']) {
// // //             resultStatus = row['RESULT'].toString().toUpperCase();
// // //         } else if (marksValue > 0) {
// // //             resultStatus = 'PASS';
// // //         }
        
// // //         let grade = '-';
// // //         if (row['Grade']) {
// // //             grade = row['Grade'].toString().toUpperCase();
// // //         } else if (marksValue >= 60) {
// // //             grade = 'A';
// // //         } else if (marksValue >= 50) {
// // //             grade = 'B';
// // //         } else if (marksValue >= 40) {
// // //             grade = 'C';
// // //         } else if (marksValue > 0) {
// // //             grade = 'D';
// // //         }
        
// // //         districtCenters.get(centerCode).students.push({
// // //             srNo: globalSrNo.toString(),
// // //             instCode: row['INSTID'] ? row['INSTID'].toString() : 'N/A',
// // //             seatNo: row['Seatno'] ? row['Seatno'].toString() : 'N/A',
// // //             subject: (row['SUBJECTNO'] ? row['SUBJECTNO'].toString() : '') + " - " + (row['SUBNAME'] ? row['SUBNAME'].toString() : ''),
// // //             name: row['NAME'] ? row['NAME'].toString() : 'N/A',
// // //             mother_name: row['MOTHERNAME'] ? row['MOTHERNAME'].toString() : 'N/A',
// // //             secI: sec1Value.toString(),
// // //             secII: sec2Value.toString(),
// // //             total: marksValue.toString(),
// // //             result: resultStatus,
// // //             grade: grade,
// // //             genRegNo: "GCC-SH-" + certificateNo,
// // //             remark: row['Remark'] ? row['Remark'].toString() : ' ',
// // //             resultDate: resultDate
// // //         });
// // //         globalSrNo++;
// // //     });

// // //     let totalStudents = 0;
// // //     for (const [, districtCenters] of results) {
// // //         for (const [, centerData] of districtCenters) {
// // //             totalStudents += centerData.students.length;
// // //         }
// // //     }

// // //     if (totalStudents === 0) {
// // //         throw new Error('No valid student data found in the Excel file');
// // //     }

// // //     const doc = new PDFDocument({
// // //         size: 'A3',
// // //         layout: 'landscape',
// // //         margins: { top: 25, bottom: 25, left: 20, right: 20 }
// // //     });
    
// // //     res.setHeader('Content-Type', 'application/pdf');
// // //     res.setHeader('Content-Disposition', 'attachment; filename=result_register.pdf');

// // //     doc.pipe(res);

// // //     const ROWS_PER_PAGE = 15;
// // //     let globalPageCounter = 1;
// // //     let totalPages = 0;
// // //     for (const [, districtCenters] of results) {
// // //         for (const [, centerData] of districtCenters) {
// // //             totalPages += Math.ceil(centerData.students.length / ROWS_PER_PAGE);
// // //         }
// // //     }

// // //     const tableHeaders = [
// // //         'SR.NO', 'INST. CODE', 'SEAT NO.', 'SUBJECT', 'NAME OF STUDENT', 
// // //         "MOTHER NAME", 'SEC I', 'SEC II', 'TOTAL', 'RESULT', 
// // //         'GRADE', 'CER.NO/M.SHEET.NO', 'REMARK'
// // //     ];

// // //     const colWidths = {
// // //         'SR.NO': 35, 'INST. CODE': 60, 'SEAT NO.': 70, 'SUBJECT': 90, 
// // //         'NAME OF STUDENT': 270, 'MOTHER NAME': 115, 'SEC I': 43, 
// // //         'SEC II': 40, 'TOTAL': 40, 'RESULT': 65, 'GRADE': 65, 
// // //         'CER.NO/M.SHEET.NO': 110, 'REMARK': 115
// // //     };

// // //     function addHeader(headerData) {
// // //         const pageWidth = doc.page.width;
// // //         const pageCenter = pageWidth / 2;
// // //         const logoWidth = 70;
// // //         const logoHeight = 75;
// // //         const titleWidth = 400;
// // //         const spacing = 0;
// // //         const titleX = pageCenter - (titleWidth / 2) + 50;
// // //         const logoX = titleX - logoWidth - spacing;

// // //         doc.fontSize(16).font('fonts/NotoSansDevanagari-Bold.ttf')
// // //             .text('महाराष्ट्र राज्य परीक्षा परिषद, पुणे', titleX, 105, { width: titleWidth, align: 'center' });
// // //         doc.fontSize(14).font('Helvetica-Bold')
// // //             .text('GCC COMPUTER SHORTHAND EXAMINATION, JUNE 2025', titleX, 133, { width: titleWidth + 50, align: 'center' });
// // //         doc.fontSize(14).font('Helvetica-Bold')
// // //             .text('CENTREWISE & SUBJECT WISE RESULT REGISTER', titleX, 155, { width: titleWidth, align: 'center' });

// // //         if (fs.existsSync('./logo.png')) {
// // //             doc.image('./logo.png', logoX, 95, { width: logoWidth, height: logoHeight });
// // //         } else {
// // //             console.log('⚠️ Logo file not found: ./logo.png');
// // //         }

// // //         doc.fontSize(10).font('Helvetica-Bold')
// // //             .text('DISTRICT: ', 40, 195)
// // //             .font('Helvetica')
// // //             .text(headerData.districtName, 100, 195);
// // //         doc.fontSize(10).font('Helvetica-Bold')
// // //             .text('CENTRE: ', 40, 210)
// // //             .font('Helvetica')
// // //             .text(`${headerData.centerCode} - ${headerData.centreName}`, 100, 210);
// // //         doc.fontSize(10).font('Helvetica')
// // //             .text(`General Page: ${headerData.generalPage} of ${totalPages}`, pageWidth - 150, 180, { align: 'left' });
// // //         doc.fontSize(10).font('Helvetica')
// // //             .text(`Centre Page: ${headerData.centrePage} of ${headerData.totalCentrePages}`, pageWidth - 150, 195, { align: 'left' });
// // //         doc.fontSize(10).font('Helvetica')
// // //             .text(`Result Date: ${headerData.resultDate}`, pageWidth - 150, 210, { align: 'left' });
// // //         return 175;
// // //     }

// // //     function drawTableHeader(y) {
// // //         let x = 40;
// // //         const cellHeight = 25;
// // //         doc.fontSize(10).font('Helvetica-Bold');
// // //         tableHeaders.forEach((header) => {
// // //             let headerText = header.includes('/') ? header.replace('/', '\n') : header.replace(' ', '\n');
// // //             if (header === 'INST. CODE') headerText = 'INST.\nCODE';
// // //             if (header === 'SEAT NO.') headerText = 'SEAT\nNO.';
// // //             if (header === 'SR.NO') headerText = 'SR.\nNO';
// // //             if (header === 'MOTHER NAME') headerText = 'MOTHER \nNAME';

// // //             doc.text(headerText, x + 2, y + 5, { width: colWidths[header], align: 'center' });
// // //             x += colWidths[header];
// // //         });

// // //         doc.lineWidth(1).moveTo(40, y-10).lineTo(doc.page.width - 40, y-10).stroke();
// // //         doc.lineWidth(1).moveTo(40, y + cellHeight + 5).lineTo(doc.page.width - 40, y + cellHeight + 5).stroke();

// // //         return y + cellHeight + 5;
// // //     }

// // //     function drawMarksSubheader(y) {
// // //         const marksStartX = colWidths['SR.NO'] + colWidths['INST. CODE'] + colWidths['SEAT NO.'] + colWidths['NAME OF STUDENT'] + colWidths['MOTHER NAME'] + colWidths['SUBJECT'] + 40;
// // //         const marksWidth = colWidths['SEC I'] + colWidths['SEC II'] + colWidths['TOTAL'];
// // //         doc.fontSize(10).font('Helvetica-Bold').text('MARKS', marksStartX, y - 5, { width: marksWidth, align: 'center' });
// // //     }

// // //     function drawTableRow(data, y) {
// // //         let x = 40;
// // //         const rowHeight = 35;
// // //         doc.fontSize(10).font('Helvetica');
// // //         Object.keys(colWidths).forEach((key, index) => {
// // //             let value = '';
// // //             switch(index) {
// // //                 case 0: value = data.srNo; break;
// // //                 case 1: value = data.instCode; break;
// // //                 case 2: value = data.seatNo; break;
// // //                 case 3: value = data.subject; break;
// // //                 case 4: value = data.name; break;
// // //                 case 5: value = data.mother_name; break;
// // //                 case 6: value = data.secI; break;
// // //                 case 7: value = data.secII; break;
// // //                 case 8: value = data.total; break;
// // //                 case 9: value = data.result; break;
// // //                 case 10: value = data.grade; break;
// // //                 case 11: value = data.genRegNo; break;
// // //                 case 12: value = data.remark; break;
// // //             }
// // //             const align = index === 4 || index === 5 ? 'left' : 'center';
// // //             const xOffset = index === 4 || index === 5 ? 10 : 2;
// // //             doc.text(value.toString(), x + xOffset, y + (rowHeight/2), { width: colWidths[key], align: align });
// // //             x += colWidths[key];
// // //         });
// // //         doc.lineWidth(0.5).moveTo(40, y + rowHeight + 5).lineTo(doc.page.width - 40, y + rowHeight + 5).stroke();
// // //         return y + rowHeight + 5;
// // //     }

// // //     for (const [districtName, districtCenters] of results) {
// // //         for (const [centerCode, centerData] of districtCenters) {
// // //             let centerPageCounter = 1;
// // //             const totalCenterPages = Math.ceil(centerData.students.length / ROWS_PER_PAGE);

// // //             if (globalPageCounter > 1) {
// // //                 doc.addPage();
// // //             }

// // //             let currentY;
// // //             let rowsOnCurrentPage = 0;

// // //             centerData.students.forEach((student, index) => {
// // //                 if (rowsOnCurrentPage === 0) {
// // //                     const headerData = {
// // //                         districtName: districtName,
// // //                         centerCode: centerCode,
// // //                         centreName: centerData.centerName,
// // //                         generalPage: globalPageCounter.toString(),
// // //                         centrePage: centerPageCounter.toString(),
// // //                         totalCentrePages: totalCenterPages.toString(),
// // //                         resultDate: centerData.students[0]?.resultDate || 'N/A'
// // //                     };
// // //                     currentY = drawTableHeader(addHeader(headerData) + 70);
// // //                     drawMarksSubheader(currentY - 30);
// // //                 }
                
// // //                 currentY = drawTableRow(student, currentY - 5);
// // //                 rowsOnCurrentPage++;

// // //                 if (rowsOnCurrentPage >= ROWS_PER_PAGE && index < centerData.students.length - 1) {
// // //                     doc.addPage();
// // //                     globalPageCounter++;
// // //                     centerPageCounter++;
// // //                     rowsOnCurrentPage = 0;
// // //                 }
// // //             });
// // //             globalPageCounter++;
// // //         }
// // //     }
// // //     doc.end();
// // // };

// // // exports.generateStudentRegister = async (req, res) => {
// // //     try {
// // //         if (!req.file) {
// // //             return res.status(400).json({ message: "No Excel file uploaded." });
// // //         }

// // //         const excelFilePath = req.file.path;
// // //         console.log("Received file:", excelFilePath);

// // //         const workbook = xlsx.readFile(excelFilePath);
// // //         const targetSheetName = 'Final Result';
// // //         let worksheet;
        
// // //         if (workbook.SheetNames.includes(targetSheetName)) {
// // //             worksheet = workbook.Sheets[targetSheetName];
// // //         } else {
// // //             const matchingSheet = workbook.SheetNames.find(sheet =>
// // //                 sheet.toLowerCase() === targetSheetName.toLowerCase()
// // //             );
// // //             worksheet = workbook.Sheets[matchingSheet] || workbook.Sheets[workbook.SheetNames[0]];
// // //         }
        
// // //         if (!worksheet) {
// // //             fs.unlinkSync(excelFilePath); // Clean up temp file
// // //             return res.status(400).json({ message: "No valid worksheet found in the Excel file." });
// // //         }

// // //         const data = xlsx.utils.sheet_to_json(worksheet);

// // //         if (data.length === 0) {
// // //             fs.unlinkSync(excelFilePath); // Clean up temp file
// // //             return res.status(400).json({ message: "Excel file is empty or contains no data." });
// // //         }

// // //         // Call the PDF generation function
// // //         await generatePdf(res, data, excelFilePath);

// // //         // Clean up the temporary file after the response has been piped.
// // //         // The `doc.end()` call above will finish the response.
// // //         res.on('finish', () => {
// // //             if (fs.existsSync(excelFilePath)) {
// // //                 fs.unlinkSync(excelFilePath);
// // //                 console.log("Deleted temporary file:", excelFilePath);
// // //             }
// // //         });

// // //     } catch (error) {
// // //         console.error('💥 Error in generateStudentRegister:', error);
// // //         // Ensure the temporary file is deleted even if an error occurs
// // //         if (req.file && fs.existsSync(req.file.path)) {
// // //             fs.unlinkSync(req.file.path);
// // //         }
// // //         res.status(500).json({
// // //             message: "Failed to generate PDF.",
// // //             details: error.message
// // //         });
// // //     }
// // // };









// // const path = require('path');
// // const xlsx = require('xlsx');
// // const fs = require('fs');
// // const PDFDocument = require('pdfkit');

// // // Helper function for PDF generation
// // const generatePdf = (res, data, tempFilePath) => {
// //     // This is a direct copy of your existing index.js logic,
// //     // adapted to take the data and response object as parameters.
// //     const results = new Map();
// //     let globalSrNo = 1;

// //     // Process the Excel data - grouped by district first, then center
// //     data.forEach((row, index) => {
// //         if (!row['CENTERNO'] || !row['INSTID'] || !row['Seatno']) {
// //             console.log(`⚠️ Row ${index + 2} may have missing data:`, {
// //                 CENTERNO: row['CENTERNO'],
// //                 INSTID: row['INSTID'],
// //                 Seatno: row['Seatno']
// //             });
// //         }
        
// //         const centerCode = row['CENTERNO'];
// //         const centerName = row['CenterName'] ? row['CenterName'].toString().toUpperCase() : 'UNKNOWN CENTER';
// //         const districtName = row['DistName'] ? row['DistName'].toString().toUpperCase() : 'UNKNOWN DISTRICT';

// //         if (!results.has(districtName)) {
// //             results.set(districtName, new Map());
// //         }
        
// //         const districtCenters = results.get(districtName);
        
// //         if (!districtCenters.has(centerCode)) {
// //             districtCenters.set(centerCode, {
// //                 centerName: centerName,
// //                 districtName: districtName,
// //                 students: []
// //             });
// //         }
        
// //         const sec1Value = row['SEC1'] !== undefined ? row['SEC1'] : (row['SEC1GRACE'] || 0);
// //         const sec2Value = row['SEC2'] !== undefined ? row['SEC2'] : (row['SEC2GRACE'] || 0);
// //         const marksValue = row['MARKS'] !== undefined ? row['MARKS'] : (row['GRACEMARKS'] || 0);
        
// //         let resultDate = 'N/A';
// //         if (row['DATEOFRESULT']) {
// //             if (typeof row['DATEOFRESULT'] === 'string' && row['DATEOFRESULT'].includes('/')) {
// //                 const [day, month, year] = row['DATEOFRESULT'].split('/');
// //                 resultDate = `${day}/${month}/${year}`;
// //             } else if (row['DATEOFRESULT'] instanceof Date) {
// //                 resultDate = row['DATEOFRESULT'].toLocaleDateString();
// //             } else {
// //                 resultDate = row['DATEOFRESULT'].toString();
// //             }
// //         }
        
// //         let certificateNo = 'N/A';
// //         if (row['CertificateNo'] && row['CertificateNo'] !== '#N/A') {
// //             certificateNo = row['CertificateNo'];
// //         } else if (row['MarkSheetNo'] && row['MarkSheetNo'] !== '#N/A') {
// //             certificateNo = row['MarkSheetNo'];
// //         } else if (row['CertificateNo1'] && row['CertificateNo1'] !== '#N/A') {
// //             certificateNo = row['CertificateNo1'];
// //         }
        
// //         let resultStatus = 'PENDING';
// //         if (row['RESULT']) {
// //             resultStatus = row['RESULT'].toString().toUpperCase();
// //         } else if (marksValue > 0) {
// //             resultStatus = 'PASS';
// //         }
        
// //         let grade = '-';
// //         if (row['Grade']) {
// //             grade = row['Grade'].toString().toUpperCase();
// //         } else if (marksValue >= 60) {
// //             grade = 'A';
// //         } else if (marksValue >= 50) {
// //             grade = 'B';
// //         } else if (marksValue >= 40) {
// //             grade = 'C';
// //         } else if (marksValue > 0) {
// //             grade = 'D';
// //         }
        
// //         districtCenters.get(centerCode).students.push({
// //             srNo: globalSrNo.toString(),
// //             instCode: row['INSTID'] ? row['INSTID'].toString() : 'N/A',
// //             seatNo: row['Seatno'] ? row['Seatno'].toString() : 'N/A',
// //             subject: (row['SUBJECTNO'] ? row['SUBJECTNO'].toString() : '') + " - " + (row['SUBNAME'] ? row['SUBNAME'].toString() : ''),
// //             name: row['NAME'] ? row['NAME'].toString() : 'N/A',
// //             mother_name: row['MOTHERNAME'] ? row['MOTHERNAME'].toString() : 'N/A',
// //             secI: sec1Value.toString(),
// //             secII: sec2Value.toString(),
// //             total: marksValue.toString(),
// //             result: resultStatus,
// //             grade: grade,
// //             genRegNo: "GCC-SH-" + certificateNo,
// //             remark: row['Remark'] ? row['Remark'].toString() : ' ',
// //             resultDate: resultDate
// //         });
// //         globalSrNo++;
// //     });

// //     let totalStudents = 0;
// //     for (const [, districtCenters] of results) {
// //         for (const [, centerData] of districtCenters) {
// //             totalStudents += centerData.students.length;
// //         }
// //     }

// //     if (totalStudents === 0) {
// //         throw new Error('No valid student data found in the Excel file');
// //     }

// //     const doc = new PDFDocument({
// //         size: 'A3',
// //         layout: 'landscape',
// //         margins: { top: 25, bottom: 25, left: 20, right: 20 }
// //     });
    
// //     res.setHeader('Content-Type', 'application/pdf');
// //     res.setHeader('Content-Disposition', 'attachment; filename=result_register.pdf');

// //     doc.pipe(res);

// //     const ROWS_PER_PAGE = 15;
// //     let globalPageCounter = 1;
// //     let totalPages = 0;
// //     for (const [, districtCenters] of results) {
// //         for (const [, centerData] of districtCenters) {
// //             totalPages += Math.ceil(centerData.students.length / ROWS_PER_PAGE);
// //         }
// //     }

// //     const tableHeaders = [
// //         'SR.NO', 'INST. CODE', 'SEAT NO.', 'SUBJECT', 'NAME OF STUDENT', 
// //         "MOTHER NAME", 'SEC I', 'SEC II', 'TOTAL', 'RESULT', 
// //         'GRADE', 'CER.NO/M.SHEET.NO', 'REMARK'
// //     ];

// //     const colWidths = {
// //         'SR.NO': 35, 'INST. CODE': 60, 'SEAT NO.': 70, 'SUBJECT': 90, 
// //         'NAME OF STUDENT': 270, 'MOTHER NAME': 115, 'SEC I': 43, 
// //         'SEC II': 40, 'TOTAL': 40, 'RESULT': 65, 'GRADE': 65, 
// //         'CER.NO/M.SHEET.NO': 110, 'REMARK': 115
// //     };

// //     function addHeader(headerData) {
// //         const pageWidth = doc.page.width;
// //         const pageCenter = pageWidth / 2;
// //         const logoWidth = 70;
// //         const logoHeight = 75;
// //         const titleWidth = 400;
// //         const spacing = 0;
// //         const titleX = pageCenter - (titleWidth / 2) + 50;
// //         const logoX = titleX - logoWidth - spacing;

// //         // Shifted header content up by 15 points
// //         doc.fontSize(16).font('fonts/NotoSansDevanagari-Bold.ttf')
// //             .text('महाराष्ट्र राज्य परीक्षा परिषद, पुणे', titleX, 90, { width: titleWidth, align: 'center' });
// //         doc.fontSize(14).font('Helvetica-Bold')
// //             .text('GCC COMPUTER SHORTHAND EXAMINATION, JUNE 2025', titleX, 118, { width: titleWidth + 50, align: 'center' });
// //         doc.fontSize(14).font('Helvetica-Bold')
// //             .text('CENTREWISE & SUBJECT WISE RESULT REGISTER', titleX, 140, { width: titleWidth, align: 'center' });

// //         // Logo shifted up by 15 points
// //         if (fs.existsSync('./logo.png')) {
// //             doc.image('./logo.png', logoX, 80, { width: logoWidth, height: logoHeight });
// //         } else {
// //             console.log('⚠️ Logo file not found: ./logo.png');
// //         }

// //         // District and Centre info shifted up by 15 points
// //         doc.fontSize(10).font('Helvetica-Bold')
// //             .text('DISTRICT: ', 40, 170)
// //             .font('Helvetica')
// //             .text(headerData.districtName, 100, 170);
// //         doc.fontSize(10).font('Helvetica-Bold')
// //             .text('CENTRE: ', 40, 185)
// //             .font('Helvetica')
// //             .text(`${headerData.centerCode} - ${headerData.centreName}`, 100, 185);
        
// //         // Page info shifted up by 15 points
// //         doc.fontSize(10).font('Helvetica')
// //             .text(`General Page: ${headerData.generalPage} of ${totalPages}`, pageWidth - 150, 155, { align: 'left' });
// //         doc.fontSize(10).font('Helvetica')
// //             .text(`Centre Page: ${headerData.centrePage} of ${headerData.totalCentrePages}`, pageWidth - 150, 170, { align: 'left' });
// //         doc.fontSize(10).font('Helvetica')
// //             .text(`Result Date: ${headerData.resultDate}`, pageWidth - 150, 185, { align: 'left' });
        
// //         return 160; // Reduced from 175 to 160
// //     }

// //     function drawTableHeader(y) {
// //         let x = 40;
// //         const cellHeight = 25;
// //         doc.fontSize(10).font('Helvetica-Bold');
// //         tableHeaders.forEach((header) => {
// //             let headerText = header.includes('/') ? header.replace('/', '\n') : header.replace(' ', '\n');
// //             if (header === 'INST. CODE') headerText = 'INST.\nCODE';
// //             if (header === 'SEAT NO.') headerText = 'SEAT\nNO.';
// //             if (header === 'SR.NO') headerText = 'SR.\nNO';
// //             if (header === 'MOTHER NAME') headerText = 'MOTHER \nNAME';

// //             doc.text(headerText, x + 2, y + 5, { width: colWidths[header], align: 'center' });
// //             x += colWidths[header];
// //         });

// //         doc.lineWidth(1).moveTo(40, y-10).lineTo(doc.page.width - 40, y-10).stroke();
// //         doc.lineWidth(1).moveTo(40, y + cellHeight + 5).lineTo(doc.page.width - 40, y + cellHeight + 5).stroke();

// //         return y + cellHeight + 5;
// //     }

// //     function drawMarksSubheader(y) {
// //         const marksStartX = colWidths['SR.NO'] + colWidths['INST. CODE'] + colWidths['SEAT NO.'] + colWidths['NAME OF STUDENT'] + colWidths['MOTHER NAME'] + colWidths['SUBJECT'] + 40;
// //         const marksWidth = colWidths['SEC I'] + colWidths['SEC II'] + colWidths['TOTAL'];
// //         doc.fontSize(10).font('Helvetica-Bold').text('MARKS', marksStartX, y - 5, { width: marksWidth, align: 'center' });
// //     }

// //     function drawTableRow(data, y) {
// //         let x = 40;
// //         const rowHeight = 35;
// //         doc.fontSize(10).font('Helvetica');
// //         Object.keys(colWidths).forEach((key, index) => {
// //             let value = '';
// //             switch(index) {
// //                 case 0: value = data.srNo; break;
// //                 case 1: value = data.instCode; break;
// //                 case 2: value = data.seatNo; break;
// //                 case 3: value = data.subject; break;
// //                 case 4: value = data.name; break;
// //                 case 5: value = data.mother_name; break;
// //                 case 6: value = data.secI; break;
// //                 case 7: value = data.secII; break;
// //                 case 8: value = data.total; break;
// //                 case 9: value = data.result; break;
// //                 case 10: value = data.grade; break;
// //                 case 11: value = data.genRegNo; break;
// //                 // COMMENTED OUT: Remarks data rendering - column header remains but no data is displayed
// //                 // case 12: value = data.remark; break;
// //                 case 12: value = ''; break; // Empty value for remarks column
// //             }
// //             const align = index === 4 || index === 5 ? 'left' : 'center';
// //             const xOffset = index === 4 || index === 5 ? 10 : 2;
            
// //             // Text positioning moved up by 5 points for better alignment
// //             doc.text(value.toString(), x + xOffset, y + (rowHeight/2) - 5, { width: colWidths[key], align: align });
// //             x += colWidths[key];
// //         });
// //         doc.lineWidth(0.5).moveTo(40, y + rowHeight + 5).lineTo(doc.page.width - 40, y + rowHeight + 5).stroke();
// //         return y + rowHeight + 5;
// //     }

// //     for (const [districtName, districtCenters] of results) {
// //         for (const [centerCode, centerData] of districtCenters) {
// //             let centerPageCounter = 1;
// //             const totalCenterPages = Math.ceil(centerData.students.length / ROWS_PER_PAGE);

// //             if (globalPageCounter > 1) {
// //                 doc.addPage();
// //             }

// //             let currentY;
// //             let rowsOnCurrentPage = 0;

// //             centerData.students.forEach((student, index) => {
// //                 if (rowsOnCurrentPage === 0) {
// //                     const headerData = {
// //                         districtName: districtName,
// //                         centerCode: centerCode,
// //                         centreName: centerData.centerName,
// //                         generalPage: globalPageCounter.toString(),
// //                         centrePage: centerPageCounter.toString(),
// //                         totalCentrePages: totalCenterPages.toString(),
// //                         resultDate: centerData.students[0]?.resultDate || 'N/A'
// //                     };
// //                     // Adjusted table positioning - reduced spacing by 15 points
// //                     currentY = drawTableHeader(addHeader(headerData) + 55);
// //                     drawMarksSubheader(currentY - 30);
// //                 }
                
// //                 currentY = drawTableRow(student, currentY - 5);
// //                 rowsOnCurrentPage++;

// //                 if (rowsOnCurrentPage >= ROWS_PER_PAGE && index < centerData.students.length - 1) {
// //                     doc.addPage();
// //                     globalPageCounter++;
// //                     centerPageCounter++;
// //                     rowsOnCurrentPage = 0;
// //                 }
// //             });
// //             globalPageCounter++;
// //         }
// //     }
// //     doc.end();
// // };

// // exports.generateStudentRegister = async (req, res) => {
// //     try {
// //         if (!req.file) {
// //             return res.status(400).json({ message: "No Excel file uploaded." });
// //         }

// //         const excelFilePath = req.file.path;
// //         console.log("Received file:", excelFilePath);

// //         const workbook = xlsx.readFile(excelFilePath);
// //         const targetSheetName = 'Final Result';
// //         let worksheet;
        
// //         if (workbook.SheetNames.includes(targetSheetName)) {
// //             worksheet = workbook.Sheets[targetSheetName];
// //         } else {
// //             const matchingSheet = workbook.SheetNames.find(sheet =>
// //                 sheet.toLowerCase() === targetSheetName.toLowerCase()
// //             );
// //             worksheet = workbook.Sheets[matchingSheet] || workbook.Sheets[workbook.SheetNames[0]];
// //         }
        
// //         if (!worksheet) {
// //             fs.unlinkSync(excelFilePath); // Clean up temp file
// //             return res.status(400).json({ message: "No valid worksheet found in the Excel file." });
// //         }

// //         const data = xlsx.utils.sheet_to_json(worksheet);

// //         if (data.length === 0) {
// //             fs.unlinkSync(excelFilePath); // Clean up temp file
// //             return res.status(400).json({ message: "Excel file is empty or contains no data." });
// //         }

// //         // Call the PDF generation function
// //         await generatePdf(res, data, excelFilePath);

// //         // Clean up the temporary file after the response has been piped.
// //         // The `doc.end()` call above will finish the response.
// //         res.on('finish', () => {
// //             if (fs.existsSync(excelFilePath)) {
// //                 fs.unlinkSync(excelFilePath);
// //                 console.log("Deleted temporary file:", excelFilePath);
// //             }
// //         });

// //     } catch (error) {
// //         console.error('💥 Error in generateStudentRegister:', error);
// //         // Ensure the temporary file is deleted even if an error occurs
// //         if (req.file && fs.existsSync(req.file.path)) {
// //             fs.unlinkSync(req.file.path);
// //         }
// //         res.status(500).json({
// //             message: "Failed to generate PDF.",
// //             details: error.message
// //         });
// //     }
// // };






// const path = require('path');
// const xlsx = require('xlsx');
// const fs = require('fs');
// const PDFDocument = require('pdfkit');

// // Helper function for PDF generation
// const generatePdf = (res, data, tempFilePath) => {
//     // This is a direct copy of your existing index.js logic,
//     // adapted to take the data and response object as parameters.
//     const results = new Map();
//     let globalSrNo = 1;

//     // Process the Excel data - grouped by district first, then center
//     data.forEach((row, index) => {
//         if (!row['CENTERNO'] || !row['INSTID'] || !row['Seatno']) {
//             console.log(`⚠️ Row ${index + 2} may have missing data:`, {
//                 CENTERNO: row['CENTERNO'],
//                 INSTID: row['INSTID'],
//                 Seatno: row['Seatno']
//             });
//         }
        
//         const centerCode = row['CENTERNO'];
//         const centerName = row['CenterName'] ? row['CenterName'].toString().toUpperCase() : 'UNKNOWN CENTER';
//         const districtName = row['DistName'] ? row['DistName'].toString().toUpperCase() : 'UNKNOWN DISTRICT';

//         if (!results.has(districtName)) {
//             results.set(districtName, new Map());
//         }
        
//         const districtCenters = results.get(districtName);
        
//         if (!districtCenters.has(centerCode)) {
//             districtCenters.set(centerCode, {
//                 centerName: centerName,
//                 districtName: districtName,
//                 students: []
//             });
//         }
        
//         const sec1Value = row['SEC1'] !== undefined ? row['SEC1'] : (row['SEC1GRACE'] || 0);
//         const sec2Value = row['SEC2'] !== undefined ? row['SEC2'] : (row['SEC2GRACE'] || 0);
//         const marksValue = row['MARKS'] !== undefined ? row['MARKS'] : (row['GRACEMARKS'] || 0);
        
//         let resultDate = 'N/A';
//         if (row['DATEOFRESULT']) {
//             if (typeof row['DATEOFRESULT'] === 'string' && row['DATEOFRESULT'].includes('/')) {
//                 const [day, month, year] = row['DATEOFRESULT'].split('/');
//                 resultDate = `${day}/${month}/${year}`;
//             } else if (row['DATEOFRESULT'] instanceof Date) {
//                 resultDate = row['DATEOFRESULT'].toLocaleDateString();
//             } else {
//                 resultDate = row['DATEOFRESULT'].toString();
//             }
//         }
        
//         let certificateNo = 'N/A';
//         if (row['CertificateNo'] && row['CertificateNo'] !== '#N/A') {
//             certificateNo = row['CertificateNo'];
//         } else if (row['MarkSheetNo'] && row['MarkSheetNo'] !== '#N/A') {
//             certificateNo = row['MarkSheetNo'];
//         } else if (row['CertificateNo1'] && row['CertificateNo1'] !== '#N/A') {
//             certificateNo = row['CertificateNo1'];
//         }
        
//         let resultStatus = 'PENDING';
//         if (row['RESULT']) {
//             resultStatus = row['RESULT'].toString().toUpperCase();
//         } else if (marksValue > 0) {
//             resultStatus = 'PASS';
//         }
        
//         let grade = '-';
//         if (row['Grade']) {
//             grade = row['Grade'].toString().toUpperCase();
//         } else if (marksValue >= 60) {
//             grade = 'A';
//         } else if (marksValue >= 50) {
//             grade = 'B';
//         } else if (marksValue >= 40) {
//             grade = 'C';
//         } else if (marksValue > 0) {
//             grade = 'D';
//         }
        
//         districtCenters.get(centerCode).students.push({
//             srNo: globalSrNo.toString(),
//             instCode: row['INSTID'] ? row['INSTID'].toString() : 'N/A',
//             seatNo: row['Seatno'] ? row['Seatno'].toString() : 'N/A',
//             subject: (row['SUBJECTNO'] ? row['SUBJECTNO'].toString() : '') + " - " + (row['SUBNAME'] ? row['SUBNAME'].toString() : ''),
//             name: row['NAME'] ? row['NAME'].toString() : 'N/A',
//             mother_name: row['MOTHERNAME'] ? row['MOTHERNAME'].toString() : 'N/A',
//             secI: sec1Value.toString(),
//             secII: sec2Value.toString(),
//             total: marksValue.toString(),
//             result: resultStatus,
//             grade: grade,
//             genRegNo: "GCC-SH-" + certificateNo,
//             remark: row['Remark'] ? row['Remark'].toString() : ' ',
//             resultDate: resultDate
//         });
//         globalSrNo++;
//     });

//     let totalStudents = 0;
//     for (const [, districtCenters] of results) {
//         for (const [, centerData] of districtCenters) {
//             totalStudents += centerData.students.length;
//         }
//     }

//     if (totalStudents === 0) {
//         throw new Error('No valid student data found in the Excel file');
//     }

//     const doc = new PDFDocument({
//         size: 'A3',
//         layout: 'landscape',
//         margins: { top: 25, bottom: 25, left: 20, right: 20 }
//     });
    
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=result_register.pdf');

//     doc.pipe(res);

//     const ROWS_PER_PAGE = 15;
//     let globalPageCounter = 1;
//     let totalPages = 0;
//     for (const [, districtCenters] of results) {
//         for (const [, centerData] of districtCenters) {
//             totalPages += Math.ceil(centerData.students.length / ROWS_PER_PAGE);
//         }
//     }

//     const tableHeaders = [
//         'SR.NO', 'INST. CODE', 'SEAT NO.', 'SUBJECT', 'NAME OF STUDENT', 
//         "MOTHER NAME", 'SEC I', 'SEC II', 'TOTAL', 'RESULT', 
//         'GRADE', 'CER.NO/M.SHEET.NO', 'REMARK'
//     ];

//     const colWidths = {
//         'SR.NO': 35, 'INST. CODE': 60, 'SEAT NO.': 70, 'SUBJECT': 90, 
//         'NAME OF STUDENT': 270, 'MOTHER NAME': 115, 'SEC I': 43, 
//         'SEC II': 40, 'TOTAL': 40, 'RESULT': 65, 'GRADE': 65, 
//         'CER.NO/M.SHEET.NO': 110, 'REMARK': 115
//     };

//     function addHeader(headerData) {
//         const pageWidth = doc.page.width;
//         const pageCenter = pageWidth / 2;
//         const logoWidth = 70;
//         const logoHeight = 75;
//         const titleWidth = 400;
//         const spacing = 0;
//         const titleX = pageCenter - (titleWidth / 2) + 50;
//         const logoX = titleX - logoWidth - spacing;

//         // Shifted header content up by 15 points
//         doc.fontSize(16).font('fonts/NotoSansDevanagari-Bold.ttf')
//             .text('महाराष्ट्र राज्य परीक्षा परिषद, पुणे', titleX, 90, { width: titleWidth, align: 'center' });
//         doc.fontSize(14).font('Helvetica-Bold')
//             .text('GCC COMPUTER SHORTHAND EXAMINATION, JUNE 2025', titleX, 118, { width: titleWidth + 50, align: 'center' });
//         doc.fontSize(14).font('Helvetica-Bold')
//             .text('CENTREWISE & SUBJECT WISE RESULT REGISTER', titleX, 140, { width: titleWidth, align: 'center' });

//         // Logo shifted up by 15 points
//         if (fs.existsSync('./logo.png')) {
//             doc.image('./logo.png', logoX, 80, { width: logoWidth, height: logoHeight });
//         } else {
//             console.log('⚠️ Logo file not found: ./logo.png');
//         }

//         // District and Centre info shifted up by 15 points
//         doc.fontSize(10).font('Helvetica-Bold')
//             .text('DISTRICT: ', 40, 170)
//             .font('Helvetica')
//             .text(headerData.districtName, 100, 170);
//         doc.fontSize(10).font('Helvetica-Bold')
//             .text('CENTRE: ', 40, 185)
//             .font('Helvetica')
//             .text(`${headerData.centerCode} - ${headerData.centreName}`, 100, 185);
        
//         // Page info shifted up by 15 points
//         doc.fontSize(10).font('Helvetica')
//             .text(`General Page: ${headerData.generalPage} of ${totalPages}`, pageWidth - 150, 155, { align: 'left' });
//         doc.fontSize(10).font('Helvetica')
//             .text(`Centre Page: ${headerData.centrePage} of ${headerData.totalCentrePages}`, pageWidth - 150, 170, { align: 'left' });
//         doc.fontSize(10).font('Helvetica')
//             .text(`Result Date: ${headerData.resultDate}`, pageWidth - 150, 185, { align: 'left' });
        
//         return 160; // Reduced from 175 to 160
//     }

//     // *** CHANGE MADE HERE - Modified drawTableHeader function for proper text alignment ***
//     function drawTableHeader(y) {
//         let x = 40;
//         const cellHeight = 25;
//         doc.fontSize(10).font('Helvetica-Bold');
        
//         tableHeaders.forEach((header) => {
//             let headerText = '';
//             let yOffset = 0; // For vertical centering adjustment
            
//             // Handle specific headers with proper line breaks and centering
//             if (header === 'CER.NO/M.SHEET.NO') {
//                 headerText = "CER.NO/\nM.SHEET.NO";
//                 yOffset = 2; // Adjust for two-line text
//             } else if (header === 'SR.NO') {
//                 headerText = "SR.\nNO.";
//                 yOffset = 2; // Adjust for two-line text
//             } else if (header === 'INST. CODE') {
//                 headerText = "INST.\nCODE";
//                 yOffset = 2; // Adjust for two-line text
//             } else if (header === 'SEAT NO.') {
//                 headerText = "SEAT\nNO.";
//                 yOffset = 2; // Adjust for two-line text
//             } else if (header === 'MOTHER NAME') {
//                 headerText = "MOTHER\nNAME";
//                 yOffset = 2; // Adjust for two-line text
//             } else if (header === 'NAME OF STUDENT') {
//                 headerText = "NAME \nOF STUDENT";
//                 yOffset = 2; // Adjust for two-line text
//             } else {
//                 // Single line headers
//                 headerText = header;
//                 yOffset = 7; // Center single line text vertically
//             }

//             // Draw text with proper vertical centering between lines
//             doc.text(headerText, x + 2, y + yOffset, { 
//                 width: colWidths[header], 
//                 align: 'center' 
//             });
//             x += colWidths[header];
//         });

//         // Draw horizontal lines (unchanged)
//         doc.lineWidth(1).moveTo(40, y-10).lineTo(doc.page.width - 40, y-10).stroke();
//         doc.lineWidth(1).moveTo(40, y + cellHeight + 5).lineTo(doc.page.width - 40, y + cellHeight + 5).stroke();

//         return y + cellHeight + 5;
//     }

//     function drawMarksSubheader(y) {
//         const marksStartX = colWidths['SR.NO'] + colWidths['INST. CODE'] + colWidths['SEAT NO.'] + colWidths['NAME OF STUDENT'] + colWidths['MOTHER NAME'] + colWidths['SUBJECT'] + 40;
//         const marksWidth = colWidths['SEC I'] + colWidths['SEC II'] + colWidths['TOTAL'];
//         doc.fontSize(10).font('Helvetica-Bold').text('MARKS', marksStartX, y - 5, { width: marksWidth, align: 'center' });
//     }

//     function drawTableRow(data, y) {
//         let x = 40;
//         const rowHeight = 35;
//         doc.fontSize(10).font('Helvetica');
//         Object.keys(colWidths).forEach((key, index) => {
//             let value = '';
//             switch(index) {
//                 case 0: value = data.srNo; break;
//                 case 1: value = data.instCode; break;
//                 case 2: value = data.seatNo; break;
//                 case 3: value = data.subject; break;
//                 case 4: value = data.name; break;
//                 case 5: value = data.mother_name; break;
//                 case 6: value = data.secI; break;
//                 case 7: value = data.secII; break;
//                 case 8: value = data.total; break;
//                 case 9: value = data.result; break;
//                 case 10: value = data.grade; break;
//                 case 11: value = data.genRegNo; break;
//                 // COMMENTED OUT: Remarks data rendering - column header remains but no data is displayed
//                 // case 12: value = data.remark; break;
//                 case 12: value = ''; break; // Empty value for remarks column
//             }
//             const align = index === 4 || index === 5 ? 'left' : 'center';
//             const xOffset = index === 4 || index === 5 ? 10 : 2;
            
//             // Text positioning moved up by 5 points for better alignment
//             doc.text(value.toString(), x + xOffset, y + (rowHeight/2) - 5, { width: colWidths[key], align: align });
//             x += colWidths[key];
//         });
//         doc.lineWidth(0.5).moveTo(40, y + rowHeight + 5).lineTo(doc.page.width - 40, y + rowHeight + 5).stroke();
//         return y + rowHeight + 5;
//     }

//     for (const [districtName, districtCenters] of results) {
//         for (const [centerCode, centerData] of districtCenters) {
//             let centerPageCounter = 1;
//             const totalCenterPages = Math.ceil(centerData.students.length / ROWS_PER_PAGE);

//             if (globalPageCounter > 1) {
//                 doc.addPage();
//             }

//             let currentY;
//             let rowsOnCurrentPage = 0;

//             centerData.students.forEach((student, index) => {
//                 if (rowsOnCurrentPage === 0) {
//                     const headerData = {
//                         districtName: districtName,
//                         centerCode: centerCode,
//                         centreName: centerData.centerName,
//                         generalPage: globalPageCounter.toString(),
//                         centrePage: centerPageCounter.toString(),
//                         totalCentrePages: totalCenterPages.toString(),
//                         resultDate: centerData.students[0]?.resultDate || 'N/A'
//                     };
//                     // Adjusted table positioning - reduced spacing by 15 points
//                     currentY = drawTableHeader(addHeader(headerData) + 55);
//                     drawMarksSubheader(currentY - 30);
//                 }
                
//                 currentY = drawTableRow(student, currentY - 5);
//                 rowsOnCurrentPage++;

//                 if (rowsOnCurrentPage >= ROWS_PER_PAGE && index < centerData.students.length - 1) {
//                     doc.addPage();
//                     globalPageCounter++;
//                     centerPageCounter++;
//                     rowsOnCurrentPage = 0;
//                 }
//             });
//             globalPageCounter++;
//         }
//     }
//     doc.end();
// };

// exports.generateStudentRegister = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ message: "No Excel file uploaded." });
//         }

//         const excelFilePath = req.file.path;
//         console.log("Received file:", excelFilePath);

//         const workbook = xlsx.readFile(excelFilePath);
//         const targetSheetName = 'Final Result';
//         let worksheet;
        
//         if (workbook.SheetNames.includes(targetSheetName)) {
//             worksheet = workbook.Sheets[targetSheetName];
//         } else {
//             const matchingSheet = workbook.SheetNames.find(sheet =>
//                 sheet.toLowerCase() === targetSheetName.toLowerCase()
//             );
//             worksheet = workbook.Sheets[matchingSheet] || workbook.Sheets[workbook.SheetNames[0]];
//         }
        
//         if (!worksheet) {
//             fs.unlinkSync(excelFilePath); // Clean up temp file
//             return res.status(400).json({ message: "No valid worksheet found in the Excel file." });
//         }

//         const data = xlsx.utils.sheet_to_json(worksheet);

//         if (data.length === 0) {
//             fs.unlinkSync(excelFilePath); // Clean up temp file
//             return res.status(400).json({ message: "Excel file is empty or contains no data." });
//         }

//         // Call the PDF generation function
//         await generatePdf(res, data, excelFilePath);

//         // Clean up the temporary file after the response has been piped.
//         // The `doc.end()` call above will finish the response.
//         res.on('finish', () => {
//             if (fs.existsSync(excelFilePath)) {
//                 fs.unlinkSync(excelFilePath);
//                 console.log("Deleted temporary file:", excelFilePath);
//             }
//         });

//     } catch (error) {
//         console.error('💥 Error in generateStudentRegister:', error);
//         // Ensure the temporary file is deleted even if an error occurs
//         if (req.file && fs.existsSync(req.file.path)) {
//             fs.unlinkSync(req.file.path);
//         }
//         res.status(500).json({
//             message: "Failed to generate PDF.",
//             details: error.message
//         });
//     }
// };



const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Helper function for PDF generation
const generatePdf = (res, data, tempFilePath) => {
    // This is a direct copy of your existing index.js logic,
    // adapted to take the data and response object as parameters.
    const results = new Map();
    let globalSrNo = 1;

    // Process the Excel data - grouped by district first, then center
    data.forEach((row, index) => {
        if (!row['CENTERNO'] || !row['INSTID'] || !row['Seatno']) {
            console.log(`⚠️ Row ${index + 2} may have missing data:`, {
                CENTERNO: row['CENTERNO'],
                INSTID: row['INSTID'],
                Seatno: row['Seatno']
            });
        }
        
        const centerCode = row['CENTERNO'];
        const centerName = row['CenterName'] ? row['CenterName'].toString().toUpperCase() : 'UNKNOWN CENTER';
        const districtName = row['DistName'] ? row['DistName'].toString().toUpperCase() : 'UNKNOWN DISTRICT';

        if (!results.has(districtName)) {
            results.set(districtName, new Map());
        }
        
        const districtCenters = results.get(districtName);
        
        if (!districtCenters.has(centerCode)) {
            districtCenters.set(centerCode, {
                centerName: centerName,
                districtName: districtName,
                students: []
            });
        }
        
        const sec1Value = row['SEC1'] !== undefined ? row['SEC1'] : (row['SEC1GRACE'] || 0);
        const sec2Value = row['SEC2'] !== undefined ? row['SEC2'] : (row['SEC2GRACE'] || 0);
        const marksValue = row['MARKS'] !== undefined ? row['MARKS'] : (row['GRACEMARKS'] || 0);
        
        let resultDate = 'N/A';
        if (row['DATEOFRESULT']) {
            if (typeof row['DATEOFRESULT'] === 'string' && row['DATEOFRESULT'].includes('/')) {
                const [day, month, year] = row['DATEOFRESULT'].split('/');
                resultDate = `${day}/${month}/${year}`;
            } else if (row['DATEOFRESULT'] instanceof Date) {
                resultDate = row['DATEOFRESULT'].toLocaleDateString();
            } else {
                resultDate = row['DATEOFRESULT'].toString();
            }
        }
        
        let certificateNo = 'N/A';
        if (row['CertificateNo'] && row['CertificateNo'] !== '#N/A') {
            certificateNo = row['CertificateNo'];
        } else if (row['MarkSheetNo'] && row['MarkSheetNo'] !== '#N/A') {
            certificateNo = row['MarkSheetNo'];
        } else if (row['CertificateNo1'] && row['CertificateNo1'] !== '#N/A') {
            certificateNo = row['CertificateNo1'];
        }
        
        let resultStatus = 'PENDING';
        if (row['RESULT']) {
            resultStatus = row['RESULT'].toString().toUpperCase();
        } else if (marksValue > 0) {
            resultStatus = 'PASS';
        }
        
        let grade = '-';
        if (row['Grade']) {
            grade = row['Grade'].toString().toUpperCase();
        } else if (marksValue >= 60) {
            grade = 'A';
        } else if (marksValue >= 50) {
            grade = 'B';
        } else if (marksValue >= 40) {
            grade = 'C';
        } else if (marksValue > 0) {
            grade = 'D';
        }
        
        districtCenters.get(centerCode).students.push({
            srNo: globalSrNo.toString(),
            instCode: row['INSTID'] ? row['INSTID'].toString() : 'N/A',
            seatNo: row['Seatno'] ? row['Seatno'].toString() : 'N/A',
            subject: (row['SUBJECTNO'] ? row['SUBJECTNO'].toString() : '') + " - " + (row['SUBNAME'] ? row['SUBNAME'].toString() : ''),
            name: row['NAME'] ? row['NAME'].toString() : 'N/A',
            mother_name: row['MOTHERNAME'] ? row['MOTHERNAME'].toString() : 'N/A',
            secI: sec1Value.toString(),
            secII: sec2Value.toString(),
            total: marksValue.toString(),
            result: resultStatus,
            grade: grade,
            genRegNo: "GCC-SH-" + certificateNo,
            remark: row['Remark'] ? row['Remark'].toString() : ' ',
            resultDate: resultDate
        });
        globalSrNo++;
    });

    let totalStudents = 0;
    for (const [, districtCenters] of results) {
        for (const [, centerData] of districtCenters) {
            totalStudents += centerData.students.length;
        }
    }

    if (totalStudents === 0) {
        throw new Error('No valid student data found in the Excel file');
    }

    const doc = new PDFDocument({
        size: 'A3',
        layout: 'landscape',
        margins: { top: 25, bottom: 25, left: 20, right: 20 }
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=result_register.pdf');

    doc.pipe(res);

    const ROWS_PER_PAGE = 15;
    let globalPageCounter = 1;
    let totalPages = 0;
    for (const [, districtCenters] of results) {
        for (const [, centerData] of districtCenters) {
            totalPages += Math.ceil(centerData.students.length / ROWS_PER_PAGE);
        }
    }

    const tableHeaders = [
        'SR.NO', 'INST. CODE', 'SEAT NO.', 'SUBJECT', 'NAME OF STUDENT', 
        "MOTHER NAME", 'SEC I', 'SEC II', 'TOTAL', 'RESULT', 
        'GRADE', 'CER.NO/M.SHEET.NO', 'REMARK'
    ];

    const colWidths = {
        'SR.NO': 35, 'INST. CODE': 60, 'SEAT NO.': 70, 'SUBJECT': 90, 
        'NAME OF STUDENT': 270, 'MOTHER NAME': 115, 'SEC I': 43, 
        'SEC II': 40, 'TOTAL': 40, 'RESULT': 65, 'GRADE': 65, 
        'CER.NO/M.SHEET.NO': 110, 'REMARK': 115
    };

    // *** CHANGES MADE HERE - All Y coordinates moved up by additional 20 points ***
    function addHeader(headerData) {
        const pageWidth = doc.page.width;
        const pageCenter = pageWidth / 2;
        const logoWidth = 70;
        const logoHeight = 75;
        const titleWidth = 400;
        const spacing = 0;
        const titleX = pageCenter - (titleWidth / 2) + 50;
        const logoX = titleX - logoWidth - spacing;

        // Header content moved up by additional 20 points (was 90, now 70)
        doc.fontSize(16).font('fonts/NotoSansDevanagari-Bold.ttf')
            .text('महाराष्ट्र राज्य परीक्षा परिषद, पुणे', titleX, 60, { width: titleWidth, align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold')
            .text('GCC COMPUTER SHORTHAND EXAMINATION, JUNE 2025', titleX, 88, { width: titleWidth + 50, align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold')
            .text('CENTREWISE & SUBJECT WISE RESULT REGISTER', titleX, 110, { width: titleWidth, align: 'center' });

        // Logo moved up by additional 20 points (was 80, now 60)
        if (fs.existsSync('./logo.png')) {
            doc.image('./logo.png', logoX, 50, { width: logoWidth, height: logoHeight });
        } else {
            console.log('⚠️ Logo file not found: ./logo.png');
        }

        // District and Centre info moved up by additional 20 points (was 170/185, now 150/165)
        doc.fontSize(10).font('Helvetica-Bold')
            .text('DISTRICT: ', 40, 130)
            .font('Helvetica')
            .text(headerData.districtName, 100, 130);
        doc.fontSize(10).font('Helvetica-Bold')
            .text('CENTRE: ', 40, 145)
            .font('Helvetica')
            .text(`${headerData.centerCode} - ${headerData.centreName}`, 100, 145);
        
        // Page info moved up by additional 20 points (was 155/170/185, now 135/150/165)
        doc.fontSize(10).font('Helvetica')
            .text(`General Page: ${headerData.generalPage} of ${totalPages}`, pageWidth - 150, 115, { align: 'left' });
        doc.fontSize(10).font('Helvetica')
            .text(`Centre Page: ${headerData.centrePage} of ${headerData.totalCentrePages}`, pageWidth - 150, 130, { align: 'left' });
        doc.fontSize(10).font('Helvetica')
            .text(`Result Date: ${headerData.resultDate}`, pageWidth - 150, 145, { align: 'left' });
        
        return 140; // Reduced from 160 to 140 (additional 20 points up)
    }

    // *** CHANGE MADE HERE - Modified drawTableHeader function for proper text alignment ***
    function drawTableHeader(y) {
        let x = 40;
        const cellHeight = 25;
        doc.fontSize(10).font('Helvetica-Bold');
        
        tableHeaders.forEach((header) => {
            let headerText = '';
            let yOffset = 0; // For vertical centering adjustment
            
            // Handle specific headers with proper line breaks and centering
            if (header === 'CER.NO/M.SHEET.NO') {
                headerText = "CER.NO/\nM.SHEET.NO";
                yOffset = 2; // Adjust for two-line text
            } else if (header === 'SR.NO') {
                headerText = "SR.\nNO.";
                yOffset = 2; // Adjust for two-line text
            } else if (header === 'INST. CODE') {
                headerText = "INST.\nCODE";
                yOffset = 2; // Adjust for two-line text
            } else if (header === 'SEAT NO.') {
                headerText = "SEAT\nNO.";
                yOffset = 2; // Adjust for two-line text
            } else if (header === 'MOTHER NAME') {
                headerText = "MOTHER\nNAME";
                yOffset = 2; // Adjust for two-line text
            } else if (header === 'NAME OF STUDENT') {
                headerText = "NAME \nOF STUDENT";
                yOffset = 2; // Adjust for two-line text
            } else {
                // Single line headers
                headerText = header;
                yOffset = 7; // Center single line text vertically
            }

            // Draw text with proper vertical centering between lines
            doc.text(headerText, x + 2, y + yOffset, { 
                width: colWidths[header], 
                align: 'center' 
            });
            x += colWidths[header];
        });

        // Draw horizontal lines (unchanged)
        doc.lineWidth(1).moveTo(40, y-10).lineTo(doc.page.width - 40, y-10).stroke();
        doc.lineWidth(1).moveTo(40, y + cellHeight + 5).lineTo(doc.page.width - 40, y + cellHeight + 5).stroke();

        return y + cellHeight + 5;
    }

    function drawMarksSubheader(y) {
        const marksStartX = colWidths['SR.NO'] + colWidths['INST. CODE'] + colWidths['SEAT NO.'] + colWidths['NAME OF STUDENT'] + colWidths['MOTHER NAME'] + colWidths['SUBJECT'] + 40;
        const marksWidth = colWidths['SEC I'] + colWidths['SEC II'] + colWidths['TOTAL'];
        doc.fontSize(10).font('Helvetica-Bold').text('MARKS', marksStartX, y - 5, { width: marksWidth, align: 'center' });
    }

    function drawTableRow(data, y) {
        let x = 40;
        const rowHeight = 35;
        doc.fontSize(10).font('Helvetica');
        Object.keys(colWidths).forEach((key, index) => {
            let value = '';
            switch(index) {
                case 0: value = data.srNo; break;
                case 1: value = data.instCode; break;
                case 2: value = data.seatNo; break;
                case 3: value = data.subject; break;
                case 4: value = data.name; break;
                case 5: value = data.mother_name; break;
                case 6: value = data.secI; break;
                case 7: value = data.secII; break;
                case 8: value = data.total; break;
                case 9: value = data.result; break;
                case 10: value = data.grade; break;
                case 11: value = data.genRegNo; break;
                // COMMENTED OUT: Remarks data rendering - column header remains but no data is displayed
                // case 12: value = data.remark; break;
                case 12: value = ''; break; // Empty value for remarks column
            }
            const align = index === 4 || index === 5 ? 'left' : 'center';
            const xOffset = index === 4 || index === 5 ? 10 : 2;
            
            // Text positioning moved up by 5 points for better alignment
            doc.text(value.toString(), x + xOffset, y + (rowHeight/2) - 5, { width: colWidths[key], align: align });
            x += colWidths[key];
        });
        doc.lineWidth(0.5).moveTo(40, y + rowHeight + 5).lineTo(doc.page.width - 40, y + rowHeight + 5).stroke();
        return y + rowHeight + 5;
    }

    for (const [districtName, districtCenters] of results) {
        for (const [centerCode, centerData] of districtCenters) {
            let centerPageCounter = 1;
            const totalCenterPages = Math.ceil(centerData.students.length / ROWS_PER_PAGE);

            if (globalPageCounter > 1) {
                doc.addPage();
            }

            let currentY;
            let rowsOnCurrentPage = 0;

            centerData.students.forEach((student, index) => {
                if (rowsOnCurrentPage === 0) {
                    const headerData = {
                        districtName: districtName,
                        centerCode: centerCode,
                        centreName: centerData.centerName,
                        generalPage: globalPageCounter.toString(),
                        centrePage: centerPageCounter.toString(),
                        totalCentrePages: totalCenterPages.toString(),
                        resultDate: centerData.students[0]?.resultDate || 'N/A'
                    };
                    // Adjusted table positioning - reduced spacing by additional 20 points (was +55, now +35)
                    currentY = drawTableHeader(addHeader(headerData) + 35);
                    drawMarksSubheader(currentY - 30);
                }
                
                currentY = drawTableRow(student, currentY - 5);
                rowsOnCurrentPage++;

                if (rowsOnCurrentPage >= ROWS_PER_PAGE && index < centerData.students.length - 1) {
                    doc.addPage();
                    globalPageCounter++;
                    centerPageCounter++;
                    rowsOnCurrentPage = 0;
                }
            });
            globalPageCounter++;
        }
    }
    doc.end();
};

exports.generateStudentRegister = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No Excel file uploaded." });
        }

        const excelFilePath = req.file.path;
        console.log("Received file:", excelFilePath);

        const workbook = xlsx.readFile(excelFilePath);
        const targetSheetName = 'Final Result';
        let worksheet;
        
        if (workbook.SheetNames.includes(targetSheetName)) {
            worksheet = workbook.Sheets[targetSheetName];
        } else {
            const matchingSheet = workbook.SheetNames.find(sheet =>
                sheet.toLowerCase() === targetSheetName.toLowerCase()
            );
            worksheet = workbook.Sheets[matchingSheet] || workbook.Sheets[workbook.SheetNames[0]];
        }
        
        if (!worksheet) {
            fs.unlinkSync(excelFilePath); // Clean up temp file
            return res.status(400).json({ message: "No valid worksheet found in the Excel file." });
        }

        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            fs.unlinkSync(excelFilePath); // Clean up temp file
            return res.status(400).json({ message: "Excel file is empty or contains no data." });
        }

        // Call the PDF generation function
        await generatePdf(res, data, excelFilePath);

        // Clean up the temporary file after the response has been piped.
        // The `doc.end()` call above will finish the response.
        res.on('finish', () => {
            if (fs.existsSync(excelFilePath)) {
                fs.unlinkSync(excelFilePath);
                console.log("Deleted temporary file:", excelFilePath);
            }
        });

    } catch (error) {
        console.error('💥 Error in generateStudentRegister:', error);
        // Ensure the temporary file is deleted even if an error occurs
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            message: "Failed to generate PDF.",
            details: error.message
        });
    }
};
