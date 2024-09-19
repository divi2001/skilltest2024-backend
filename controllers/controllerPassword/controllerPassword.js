const ControllerPasswordDTO = require('../../dto/controllerPasswordDTO');
const connection = require('../../config/db1');
const encryptionInterface = require('../../config/encrypt');
const moment = require('moment');

exports.getControllerPassForCenter = async (req, res) => {
    
    const centerCode = req.session.centerId;
    const {batchNo} = req.body;

    console.log("CenterCode: "+centerCode);

    const query = 'select controllerdb.center, controllerdb.batchNo, controllerdb.controller_pass, batchdb.Start_time, batchdb.End_Time, batchdb.batchstatus from controllerdb inner join batchdb on controllerdb.batchNo = batchdb.batchNo where batchdb.batchstatus = "active" and controllerdb.center = ?;';
    
    try{
        const [results] = await connection.query(query, [centerCode,batchNo]);
        
        console.log("result: "+results);
        if (results.length > 0) {
            const controllerPassDto = results.map(result => {
                const controllerPassDet = new ControllerPasswordDTO(
                    result.center,
                    result.batchNo,
                    result.controller_pass,
                    result.Start_time,
                    result.End_Time,
                    result.batchstatus
                    )                    
                    return controllerPassDet;
                }
            )
            
            res.status(200).json(controllerPassDto);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}
const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
function checkIfIsInTimeLimit(startTime) {
    // Parse the start time, assuming it's in 12-hour format with AM/PM
    const startMoment = moment.tz(startTime, 'hh:mm A', 'Asia/Kolkata');
    const now = moment();

    // If the start time is after the current time, assume it's for tomorrow
    if (startMoment.isAfter(now)) {
        startMoment.subtract(1, 'day');
    }

    const differenceInMinutes = now.diff(startMoment, 'minutes');
    
    console.log('Current Time:', now.format('hh:mm:ss A'));
    console.log('Start Time:', startMoment.format('YYYY-MM-DD hh:mm:ss A'));
    console.log('Difference in Minutes:', differenceInMinutes);

    return differenceInMinutes <= 15;
}

exports.getBatchwiseControllerPassForCenter = async(req,res)=>{
    const center = req.session.centerId;
    const {batchNo} = req.body;
    console.log(req.body);

    try {
        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchQuery,[batchNo]);

        if (!batchData || batchData.length === 0) {
            return res.status(404).json({ "message": "Batch not found" });
        }
        
        const today = moment().startOf('day');
        const batchDate = moment(batchData[0].batchdate).startOf('day');
        console.log(today,batchData);
        
        if (!today.isSame(batchDate)) {
            return res.status(403).json({ "message": "Download is only allowed on the day of the batch" });
        }

        // Check if download is allowed
        if (!checkIfIsInTimeLimit(batchData[0].start_time)) {
            return res.status(403).json({ "message": "Download not allowed at this time" });
        }

        // If download is allowed, proceed with getting student data
        const query = 'SELECT controller_pass  FROM controllerdb WHERE center = 1051 AND batchNo = 100';
        const [results] = await connection.query(query); //[center, batchNo ,batchData[0].batchdate]

        console.log(results[0]);
        res.status(200).json({results});
    } catch (error) {
        console.log(error);
        res.status(500).json({"Error":error});
    }
}