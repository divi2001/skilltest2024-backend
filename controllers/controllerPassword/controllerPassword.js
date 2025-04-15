const ControllerPasswordDTO = require('../../dto/controllerPasswordDTO');
const connection = require('../../config/db1');
const encryptionInterface = require('../../config/encrypt');
// const moment = require('moment-timezone');

const moment = require('moment'); // Import moment for time handling


// function checkDownloadAllowedStudentLoginPass(startTime) {
//     const startMoment = moment(startTime, 'HH:mm');
//     const now = moment();

//     const differenceInMinutes = startMoment.diff(now, 'minutes'); // Compute difference from startTime to now
    
//     console.log('Current Time:', now.format('YYYY-MM-DD HH:mm:ss'));
//     console.log('Start Time:', startMoment.format('YYYY-MM-DD HH:mm:ss'));
//     console.log('Difference in Minutes:', differenceInMinutes);

//     // Return true if startTime is between 0 and 30 minutes ahead of the current time
//     return differenceInMinutes <= 30 && differenceInMinutes > 0;
// }
function checkDownloadAllowedStudentLoginPass(startTime, batchDate) {
    // Set the timezone to Kolkata
    const kolkataZone = 'Asia/Kolkata';

    // Parse the batchDate (which is in UTC) and convert it to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone);

    // Combine the Kolkata date with the provided startTime
    const startDateTime = moment.tz(
        `${batchDateKolkata.format('YYYY-MM-DD')} ${startTime}`,
        'YYYY-MM-DD hh:mm A',
        kolkataZone
    );
    
    // Get current time in Kolkata timezone
    const now = moment().tz(kolkataZone);

    const differenceInMinutes = startDateTime.diff(now, 'minutes');
    
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Time (Kolkata):', now.format('YYYY-MM-DD hh:mm A'));
    console.log('Start Time (Kolkata):', startDateTime.format('YYYY-MM-DD hh:mm A'));
    console.log('Difference in Minutes:', differenceInMinutes);

    // Return true if startTime is between 0 and 30 minutes ahead of the current time
    return  differenceInMinutes <= 30;
}


exports.getControllerPassForCenter = async (req, res) => {
    const centerCode = req.session.centerId;
    const { batchNo } = req.body;

    console.log("CenterCode: " + centerCode);

    const query = ` SELECT 
            c.center, 
            c.batchNo, 
            c.controller_pass, 
            b.Start_time, 
            b.End_Time, 
            b.batchstatus, 
            b.batchdate,
            COUNT(s.batchNo) as studentCount
        FROM controllerdb c
        INNER JOIN batchdb b ON c.batchNo = b.batchNo 
        LEFT JOIN students s ON b.batchNo = s.batchNo AND s.center = c.center
        WHERE c.center = ? AND s.departmentId = 2
        GROUP BY c.center, c.batchNo, c.controller_pass, b.Start_time, b.End_Time, b.batchstatus, b.batchdate
        HAVING studentCount > 0
        ORDER BY b.batchNo DESC;`;

    try {
        const [results] = await connection.query(query, [centerCode]);
        console.log(results);
        if (results.length > 0) {
            // Filter results to include only those where start_time is within 30 minutes
            // const currentTime = moment();
            const filteredResults = results.filter(result => {
                return checkDownloadAllowedStudentLoginPass(result.Start_time,result.batchdate)
            });

            // If there are any valid records after filtering, return them
            if (filteredResults.length > 0) {
                const controllerPassDto = filteredResults.map(result => {
                    return new ControllerPasswordDTO(
                        result.center,
                        result.batchNo,
                        result.controller_pass,
                        result.Start_time,
                        result.End_Time,
                        result.batchstatus
                    );
                });

                console.log(controllerPassDto);
                res.status(200).json({controllerPassDto});
            } else {
                res.status(404).send('No records found!');
            }
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

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
    // console.log(req.body);

    try {
        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchQuery,[batchNo]);

        if (!batchData || batchData.length === 0) {
            return res.status(404).json({ "message": "Batch not found" });
        }
        
        const today = moment().startOf('day');
        const batchDate = moment(batchData.batchdate).tz('Asia/Kolkata').format('DD-MM-YYYY')
        // console.log(today,batchData);
        
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

        // console.log(results[0]);
        res.status(200).json({results});
    } catch (error) {
        console.log(error);
        res.status(500).json({"Error":error});
    }
}

