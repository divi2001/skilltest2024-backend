const connection = require("../config/db1");
const QRCode = require('qrcode');
const moment = require('moment-timezone');

async function createAnswerSheet(doc, data) {
    // Constants for layout
    const headerHeight = 60;
    const lineGap = 30;
    const rightPhotoWidth = 50;
    const leftPhotoWidth = 80;
    const photoHeight = 60;
    const margin = 40;
    const availableWidth = doc.page.width - 2 * margin - rightPhotoWidth - leftPhotoWidth;
    
    function createHeader(doc, text1, text2) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(text1, { align: 'center' })
           .fontSize(12)
           .text(text2, { align: 'center' });
    }
    
    function createField(doc, label, value = '', x, y, width) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`${label}`, x, y, { continued: true, width: width })
           .font('Helvetica')
           .text(`: ${value}`);
    }
    
    function drawLines(doc, startY, endY, gap) {
        for (let y = startY; y <= endY; y += gap) {
            doc.moveTo(margin, y)
               .lineTo(doc.page.width - margin, y)
               .stroke();
        }
    }
    
    async function generateQRCode(text) {
        try {
            return await QRCode.toDataURL(text, {
                errorCorrectionLevel: 'H',
                type: 'image/jpeg',
                quality: 0.92,
                margin: 1
            });
        } catch (err) {
            console.error("Error generating QR code:", err);
            return null;
        }
    }

    async function addPhoto(x, y, width, height, path, isQRCode = false, qrCodeUrl) {
        doc.rect(x, y-1, width, height+2).stroke();

        
        try {
            if (isQRCode) {
                const qrDataURL = await generateQRCode(qrCodeUrl);
                if (qrDataURL) {
                    doc.image(qrDataURL, x, y, {
                        fit: [width, height],
                        align: 'center',
                        valign: 'center'
                    });
                } else {
                    throw new Error('QR code generation failed');
                }
            } else if (path) {
                doc.image(path, x, y, {
                    fit: [width, height],
                    align: 'center',
                    valign: 'center'
                });
            } else {
                console.log("Image path is null");
                throw new Error('Image path is null');
            }
        } catch (error) {
            console.error('Error loading image:', error);
            doc.fontSize(8).text('Image Not Available', x, y + height / 2, {
                width: width,
                align: 'center'
            });
        }
    }
    
    async function createPage(doc, student, isFirstPage, qrCodeUrl) {
        createHeader(doc, data.departmentName, 'GCC COMPUTER SHORTHAND EXAMINATION FEBRUARY 2025');
        
        let startY = headerHeight+15;
      
        if (isFirstPage) {
            const rightPhotoX = doc.page.width - margin - rightPhotoWidth;
            const leftPhotoX = margin;
            const photoY = startY;
      
            doc.moveTo(margin, startY)
           .lineTo(doc.page.width - margin, startY)
           .stroke();
      
            await addPhoto(leftPhotoX, photoY+7, leftPhotoWidth, photoHeight, null, true, qrCodeUrl);
            
            // Check if student photo exists before trying to use it
            if (student.photoBase64 && student.photoBase64.trim() !== " ") {
                try {
                    await addPhoto(rightPhotoX, photoY+7, rightPhotoWidth, photoHeight, Buffer.from(student.photoBase64, 'base64'));
                } catch (error) {
                    console.error('Error processing student photo:', error);
                    // Just draw the rectangle without an image
                    doc.rect(rightPhotoX, photoY+7-1, rightPhotoWidth, photoHeight+2).stroke();
                    doc.fontSize(8).text('Photo Not Available', rightPhotoX, photoY+7 + photoHeight / 2, {
                        width: rightPhotoWidth,
                        align: 'center'
                    });
                }
            } else {
                // Just draw the rectangle without an image
                doc.rect(rightPhotoX, photoY+7-1, rightPhotoWidth, photoHeight+2).stroke();
                doc.fontSize(8).text('Photo Not Available', rightPhotoX, photoY+7 + photoHeight / 2, {
                    width: rightPhotoWidth,
                    align: 'center'
                });
            }
      
            const fieldStartX = margin + leftPhotoWidth + 10;
            const fieldWidth = (availableWidth - 10) / 2;
            const fieldHeight = 20;
      
            function addField(label, value, x, y, width, height) {
                createField(doc, label, value, x + 5, y + 5, width - 10);
            }
      
            addField('Seat No', student.seatNo, fieldStartX, startY + 5, fieldWidth, fieldHeight);
            addField('Name', student.name, fieldStartX + fieldWidth - 10, startY + 5, fieldWidth, fieldHeight);
    
            // Second row
            addField('Subject', student.subject, fieldStartX, startY + fieldHeight + 10, fieldWidth, fieldHeight);
            addField('Batch', data.batch, fieldStartX + fieldWidth - 10, startY + fieldHeight + 10, fieldWidth, fieldHeight);
    
            // Third row (new)
            addField('Date', data.examDate, fieldStartX, startY + 2 * fieldHeight + 15, fieldWidth, fieldHeight);
            addField('Time', data.start_time, fieldStartX + fieldWidth - 10, startY + 2 * fieldHeight + 15, fieldWidth, fieldHeight);
      
            startY += 2 * fieldHeight + 20;
        } else {
            startY += 10;
        }
      
        drawLines(doc, startY+20, doc.page.height - margin, lineGap);
    }
    
    for (const student of data.students) {
        await createPage(doc, student, true, `https://www.shorthandonlineexam.in/student_info/${student.seatNo}`);
        doc.addPage();
        await createPage(doc, student, false);
        if (student !== data.students[data.students.length - 1]) {
            doc.addPage();
        }
    }
}

const getData = async(center, batchNo, student_id) => {
    try {
        console.log(center, batchNo, student_id);
        let query, response, queryParams = [center, batchNo];
        
        if(student_id) {
            query = "SELECT s.fullname, s.student_id, s.base64, sub.subject_name FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId WHERE s.center = ? AND s.batchNo = ? AND s.student_id = ?;";
            queryParams.push(student_id);
        } else {
            query = 'SELECT s.fullname, s.student_id, s.base64, sub.subject_name, d.departmentName, d.logo FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId JOIN departmentdb d ON s.departmentId = d.departmentId WHERE s.center = ? AND s.batchNo = ?';
        }
        
        response = await connection.query(query, queryParams);
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const batchData = await connection.query(batchquery, [batchNo]);
        
        return { 
            response: response[0], 
            batchData: batchData[0]
        };
        
    } catch (error) {
        console.error('Error in getData:', error);
        throw error;
    }
}

function checkDownloadAllowed(batchDate) {
    const today = moment().startOf('day');
    const batchMoment = moment(batchDate).startOf('day');
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

    // Check if current date is after or equal to 1 day before the batch date
    return nowKolkata.isSameOrAfter(oneDayBefore);
}

function getTextBeforePlus(inputText) {
    if (!inputText) return '';
    
    const plusIndex = inputText.indexOf('+');
    if (plusIndex !== -1) {
        return inputText.substring(0, plusIndex).trim();
    }
    return inputText; // Return original text if '+' not found
}

const generateAnswerSheets = async(doc, center, batchNo, student_id) => {
    try {
        const Data = await getData(center, batchNo, student_id);
        
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
            batch: batchNo,
            examDate: examDate,
            start_time: batchInfo.start_time,
            students: response.map(student => ({
                seatNo: student.student_id?.toString() || '',
                name: student.fullname || '',
                subject: getTextBeforePlus(student.subject_name),
                photoBase64: student.base64 || " "
            })),
            departmentName: response[0]?.departmentName || 'GCC Examination',
            departmentLogo: response[0]?.logo || null
        };

        await createAnswerSheet(doc, data);
        console.log('Answer sheets generated successfully!');
    } catch (error) {
        console.error("Error generating answer sheets:", error);
        throw error;
    }
};

module.exports = { generateAnswerSheets };