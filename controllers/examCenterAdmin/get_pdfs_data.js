const connection = require('../../config/db1');
const PdfToDownloadDTO = require('../../dto/pdfsToDownloadDTO');
const moment = require('moment-timezone');

exports.getPdfFromExamCenterDb = async (req, res) => {
    
    const centerCode = req.session.centerId;

    const query = 'SELECT attendanceroll, absenteereport, answersheet, blankanswersheet FROM examcenterdb where center = ?';
    try{
        const [results] = await connection.query(query, [centerCode]);
        
        if (results.length > 0) {
            console.log("result: "+results);
            const pdfToDownloadDTO = results.map(result => {
                const pdfToDownload = new PdfToDownloadDTO(
                    result.attendanceroll,
                    result.absenteereport,
                    result.answersheet,
                    result.blankanswersheet
                );
                return pdfToDownload;
            });
            res.status(200).json(pdfToDownloadDTO);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
},
exports.getBatches = async(req,res) =>{
        const today = moment().format('YYYY-MM-DD');
        getTodaysBatches(today)
        res.send("DOne");
}
async function getTodaysBatches(date){
    try {
        console.log(date);
        const query = 'SELECT * FROM batchdb WHERE batchdate = 2024-06-25;'
        const [rows] = await connection.execute(query);
        console.log(rows);
    } catch (error) {
        console.error('Error in fetchTodayBatches:', error);
        throw error;
    }
}