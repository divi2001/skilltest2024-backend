const connection = require("../config/db1");
const moment = require('moment');
const QRCode = require('qrcode');

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
        doc.rect(x, y, width, height).stroke();
        try {
            if (isQRCode) {
                const qrDataURL = await generateQRCode(qrCodeUrl);
                if (qrDataURL) {
                    doc.image(qrDataURL, x, y, {
                        fit: [width, height],
                        align: 'center',
                        valign: 'center'
                    });
                }
            } else {
                doc.image(path, x, y, {
                    fit: [width, height],
                    align: 'center',
                    valign: 'center'
                });
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
        createHeader(doc, 'MAHARASHTRA STATE COUNCIL OF EXAMINATION, PUNE', 'COMPUTER SHORTHAND EXAMINATION SEPTEMBER 2024');
        
        let startY = headerHeight;
      
        if (isFirstPage) {
            const rightPhotoX = doc.page.width - margin - rightPhotoWidth;
            const leftPhotoX = margin;
            const photoY = startY;
      
            doc.moveTo(margin + leftPhotoWidth, startY)
               .lineTo(rightPhotoX, startY)
               .stroke();
      
            await addPhoto(leftPhotoX, photoY, leftPhotoWidth, photoHeight, null, true, qrCodeUrl);
            await addPhoto(rightPhotoX, photoY, rightPhotoWidth, photoHeight, student.photoPath);
      
            const fieldStartX = margin + leftPhotoWidth + 10;
            const fieldWidth = (availableWidth - 10) / 2;
            const fieldHeight = 20;
      
            function addField(label, value, x, y, width, height) {
                createField(doc, label, value, x + 5, y + 5, width - 10);
            }
      
            addField('Seat No', student.seatNo, fieldStartX, startY + 5, fieldWidth, fieldHeight);
            addField('Name', student.name, fieldStartX + fieldWidth + 10, startY + 5, fieldWidth, fieldHeight);
            addField('Subject', student.subject, fieldStartX, startY + fieldHeight + 10, fieldWidth, fieldHeight);
            addField('Batch', data.batch, fieldStartX + fieldWidth + 10, startY + fieldHeight + 10, fieldWidth, fieldHeight);
      
            startY += 2 * fieldHeight + 20;
        } else {
            startY += 10;
        }
      
        drawLines(doc, startY, doc.page.height - margin, lineGap);
    }
    
    for (const student of data.students) {
        await createPage(doc, student, true, `http://localhost:3001/student_info/${student.seatNo}`);
        doc.addPage();
        await createPage(doc, student, false);
        if (student !== data.students[data.students.length - 1]) {
            doc.addPage();
        }
    }
}

const getData = async(center, batchNo,student_id) => {
    try {
        console.log(center, batchNo,student_id);
        let query , response , queryParams = [center,batchNo];
        if(student_id){
           query = "SELECT s.fullname, s.student_id, sub.subject_name FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId WHERE s.center = ? AND s.batchNo = ? AND s.student_id = ?;";
           queryParams.push(student_id);
        }else{
         query = 'SELECT s.fullname, s.student_id, sub.subject_name FROM students s JOIN subjectsdb sub ON s.subjectsId = sub.subjectId WHERE s.center = ? AND s.batchNo = ?';
        }
        response = await connection.query(query, queryParams);
        const batchquery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const batchData = await connection.query(batchquery, [batchNo]);
        console.log(response[0], batchData[0]);

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
function checkDownloadAllowed(batchDate) {
    const today = moment().startOf('day');
    const batchMoment = moment(batchDate).startOf('day');
    const differenceInDays = batchMoment.diff(today, 'days');
    console.log(differenceInDays);
    // Allow download if it's the day of the batch or one day before
    return differenceInDays <= 1 && differenceInDays >= 0;
}


const generateAnswerSheets = async(doc, center, batchNo , student_id) => {
    const Data = await getData(center, batchNo , student_id);
    console.log(Data);

    const response = Data.response;
    if (!Array.isArray(response) || response.length === 0) {
        throw new Error('No data returned from getData');
    }

    if (!Array.isArray(Data.batchData) || Data.batchData.length === 0) {
        throw new Error('No batch data available');
    }

    const batchInfo = Data.batchData[0];
    const examDate = new Date(batchInfo.batchdate).toISOString().split('T')[0];

    const data = {
        centerCode: center,
        batch: batchNo,
        students: response.map(student => ({
            seatNo: student.student_id.toString(),
            name: student.fullname,
            subject: student.subject_name,
            photoPath: "./Reports/logo.png"
        }))
    };

    await createAnswerSheet(doc, data);
    console.log('Answer sheets generated successfully!');
};

module.exports = { generateAnswerSheets };