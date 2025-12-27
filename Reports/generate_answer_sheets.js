const connection = require("../config/db1");
const QRCode = require('qrcode');
const moment = require('moment-timezone');

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
    
      // Function to draw lines
      function drawLines(doc, startY, endY, gap) {
        for (let y = startY; y <= endY; y += gap) {
          doc.moveTo(40, y)
            .lineTo(doc.page.width - 40, y)
            .lineWidth(0.1)  // Thinner lines for writing
            .stroke();
        }
      }
  // Function to draw a single line
  function drawSingleLine(doc, y) {
    doc.moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .lineWidth(0.1)  // Thinner lines
      .stroke();
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
        createHeader(doc, data.departmentName, data.departmentExam);
        
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
    
            // Third row (new) - Time converted to 12-hour format
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

const getData = async(center, batchNo, student_id, departmentId) => {
    try {
        console.log(center, batchNo, student_id);
        let query, response, queryParams = [center, batchNo];
        
        if(student_id) {
            query = "SELECT s.fullname, s.student_id, s.base64, sub.subject_name FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId WHERE s.center = ? AND s.batchNo = ? AND s.student_id = ? AND s.departmentId = ?;";
            queryParams.push(student_id, departmentId);
        } else {
            query = 'SELECT s.fullname, s.student_id, s.base64, sub.subject_name, d.departmentName, d.departmentExam, d.logo FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId JOIN departmentdb d ON s.departmentId = d.departmentId WHERE s.center = ? AND s.batchNo = ? AND s.departmentId = ?';
            queryParams.push(departmentId);
        }
        
        response = await connection.query(query, queryParams);
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
    return differenceInDays >= -1 && differenceInDays <= 5;
}

function getTextBeforePlus(inputText) {
    if (!inputText) return '';
    
    const plusIndex = inputText.indexOf('+');
    if (plusIndex !== -1) {
        return inputText.substring(0, plusIndex).trim();
    }
    return inputText; // Return original text if '+' not found
}

const generateAnswerSheets = async(doc, center, batchNo, student_id, departmentId) => {
    try {
        const Data = await getData(center, batchNo, student_id, departmentId);
        
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
        
        // Updated to use 3-day validation instead of 1-day
        // if(!checkDownloadAllowed3Days(batchInfo.batchdate)) {
        //     throw new Error("Download is only allowed within 3 days before the batch date");
        // }
        
        // Convert start_time to 12-hour format
        const formattedStartTime = formatTime(batchInfo.start_time);
        
        const data = {
            centerCode: center,
            batch: batchNo,
            examDate: examDate,
            start_time: formattedStartTime, // Now in 12-hour format
            students: response.map(student => ({
                seatNo: student.student_id?.toString() || '',
                name: student.fullname || '',
                subject: getTextBeforePlus(student.subject_name),
                photoBase64: student.base64 || " "
            })),
            departmentName: response[0]?.departmentName || 'GCC Examination',
            departmentExam: response[0]?.departmentExam || '',
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