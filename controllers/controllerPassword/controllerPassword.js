const ControllerPasswordDTO = require('../../dto/controllerPasswordDTO');
const connection = require('../../config/db1');
const encryptionInterface = require('../../config/encrypt');
const moment = require('moment'); // Import moment for time handling

function checkDownloadAllowedStudentLoginPass(startTime, batchDate) {
    // Set the timezone to Kolkata
    const kolkataZone = 'Asia/Kolkata';

    // Parse the batchDate (which is in UTC) and convert it to Kolkata timezone
    const batchDateKolkata = moment(batchDate).tz(kolkataZone);

    // Combine the Kolkata date with the provided startTime
    const startDateTime = moment.tz(
        `${batchDateKolkata.format('DD-MM-YYYY')} ${startTime}`,
        'DD-MM-YYYY hh:mm A',
        kolkataZone
    );
    
    // Get current time in Kolkata timezone
    const now = moment().tz(kolkataZone);

    const differenceInMinutes = startDateTime.diff(now, 'minutes');
    
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('DD-MM-YYYY'));
    console.log('Current Time (Kolkata):', now.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Start Time (Kolkata):', startDateTime.format('YYYY-MM-DD HH:mm:ss'));
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
        INNER JOIN departmentdb d ON s.departmentId = d.departmentId
        WHERE c.center = ? AND d.departmentStatus = 1
        GROUP BY c.center, c.batchNo, c.controller_pass, b.Start_time, b.End_Time, b.batchstatus, b.batchdate
        HAVING studentCount > 0
        ORDER BY b.batchNo DESC;`;

    try {
        const [results] = await connection.query(query, [centerCode]);
        console.log("Raw query results:", results);
        
        if (results.length > 0) {
            console.log("Controller passwords found in database:");
            results.forEach((result, index) => {
                console.log(`Batch ${index + 1}: BatchNo: ${result.batchNo}, Controller Password: ${result.controller_pass}`);
            });

            // Filter results to include only those where start_time is within 30 minutes
            const filteredResults = results.filter(result => {
                const isAllowed = checkDownloadAllowedStudentLoginPass(result.Start_time, result.batchdate);
                console.log(`BatchNo ${result.batchNo}: Download allowed: ${isAllowed}`);
                return isAllowed;
            });

            // If there are any valid records after filtering, return them
            if (filteredResults.length > 0) {
                console.log("===== CONTROLLER PASSWORDS WILL BE RETURNED =====");
                filteredResults.forEach((result, index) => {
                    console.log(`Filtered Batch ${index + 1}:`);
                    console.log(`  BatchNo: ${result.batchNo}`);
                    console.log(`  Center: ${result.center}`);
                    console.log(`  Controller Password: ${result.controller_pass}`);
                    console.log(`  Start Time: ${result.Start_time}`);
                    console.log(`  Batch Date: ${result.batchdate}`);
                    console.log("---");
                });

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

                console.log("Final DTO response:", controllerPassDto);
                res.status(200).json({controllerPassDto});
            } else {
                console.log("No batches are within the time limit for password access");
                res.status(404).send('No records found!');
            }
        } else {
            console.log("No controller passwords found in database for this center");
            res.status(404).send('No records found!');
        }
    } catch (err) {
        console.error("Error in getControllerPassForCenter:", err);
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
    return differenceInMinutes <= 150000;
}

exports.getBatchwiseControllerPassForCenter = async(req,res)=>{
    const center = req.session.centerId;
    const {batchNo} = req.body;

    console.log(`===== GETTING CONTROLLER PASSWORD FOR SPECIFIC BATCH =====`);
    console.log(`Center: ${center}, BatchNo: ${batchNo}`);

    try {
        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ?';
        const [batchData] = await connection.query(batchQuery,[batchNo]);
        console.log("Batch data found:", batchData);

        if (!batchData || batchData.length === 0) {
            console.log("Batch not found in database");
            return res.status(404).json({ "message": "Batch not found" });
        }
        
        const today = moment().startOf('day');
        const batchMoment = moment(batchData[0].batchdate).tz('Asia/Kolkata').startOf('day');
        
        console.log(`Today: ${today.format('YYYY-MM-DD')}`);
        console.log(`Batch Date: ${batchMoment.format('YYYY-MM-DD')}`);
        
        if (!today.isSame(batchMoment)) {
            console.log("Download not allowed - not the same day as batch");
            return res.status(403).json({ "message": "Download is only allowed on the day of the batch" });
        }

        const timeAllowed = checkIfIsInTimeLimit(batchData[0].start_time);
        console.log(`Time check result: ${timeAllowed}`);
        
        if (!timeAllowed) {
            console.log("Download not allowed - outside time limit");
            return res.status(403).json({ "message": "Download not allowed at this time" });
        }

        console.log("===== TIME CHECKS PASSED - FETCHING CONTROLLER PASSWORD =====");
        
        const query = 'SELECT controller_pass FROM controllerdb WHERE center = ? AND batchNo = ?';
        const [results] = await connection.query(query, [center, batchNo]);

        if (results && results.length > 0) {
            console.log("===== CONTROLLER PASSWORD FOUND =====");
            console.log(`BatchNo: ${batchNo}`);
            console.log(`Center: ${center}`);
            console.log(`Controller Password: ${results[0].controller_pass}`);
            console.log("=====================================");
        } else {
            console.log("No controller password found for this batch and center");
        }

        res.status(200).json({results});
    } catch (error) {
        console.error("Error in getBatchwiseControllerPassForCenter:", error);
        res.status(500).json({"Error":error});
    }
}