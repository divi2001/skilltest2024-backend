const ControllerPasswordDTO = require('../../dto/controllerPasswordDTO');
const connection = require('../../config/db1');
const encryptionInterface = require('../../config/encrypt');
const moment = require('moment');
const { decrypt } = require('../../config/encrypt');

function checkDownloadAllowedStudentLoginPass(startTime, batchDate) {
    const kolkataZone = 'Asia/Kolkata';
    const batchDateKolkata = moment(batchDate).tz(kolkataZone);
    const startDateTime = moment.tz(
        `${batchDateKolkata.format('YYYY-MM-DD')} ${startTime}`,
        'YYYY-MM-DD hh:mm A',
        kolkataZone
    );
    const now = moment().tz(kolkataZone);
    const differenceInMinutes = startDateTime.diff(now, 'minutes');
    
    console.log('Batch Date (UTC):', batchDate);
    console.log('Batch Date (Kolkata):', batchDateKolkata.format('YYYY-MM-DD'));
    console.log('Current Time (Kolkata):', now.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Start Time (Kolkata):', startDateTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Difference in Minutes:', differenceInMinutes);

    return differenceInMinutes <= 30;
}

exports.getControllerPassForCenter = async (req, res) => {
    const centerCode = req.session.centerId;
    const { batchNo, departmentId } = req.body; // Add departmentId filter

    console.log("CenterCode: " + centerCode);
    console.log("Department Filter: " + departmentId);

    let query = `SELECT 
            c.center, 
            c.batchNo, 
            c.controller_pass, 
            b.Start_time, 
            b.End_Time, 
            b.batchstatus, 
            b.batchdate,
            b.departmentId,
            d.departmentName,
            COUNT(s.batchNo) as studentCount
        FROM controllerdb c
        INNER JOIN batchdb b ON c.batchNo = b.batchNo 
        LEFT JOIN students s ON b.batchNo = s.batchNo AND s.center = c.center AND s.departmentId = b.departmentId
        INNER JOIN departmentdb d ON b.departmentId = d.departmentId
        WHERE c.center = ? AND d.departmentStatus = 1`;

    let queryParams = [centerCode];

    // Add department filter if provided
    if (departmentId && departmentId !== 'all') {
        query += ` AND b.departmentId = ?`;
        queryParams.push(departmentId);
    }

    query += ` GROUP BY c.center, c.batchNo, c.controller_pass, b.Start_time, b.End_Time, b.batchstatus, b.batchdate, b.departmentId, d.departmentName
        HAVING studentCount > 0
        ORDER BY b.batchNo DESC, b.departmentId ASC;`;

    try {
        const [results] = await connection.query(query, queryParams);
        console.log("Raw query results:", results);
        
        if (results.length > 0) {
            console.log("Controller passwords found in database:");
            results.forEach((result, index) => {
                console.log(`Batch ${index + 1}: BatchNo: ${result.batchNo}, DepartmentId: ${result.departmentId}, Department: ${result.departmentName}, Controller Password: ${result.controller_pass}, Batch Date: ${result.batchdate}`);
            });

            const filteredResults = results.filter(result => {
                const isAllowed = checkDownloadAllowedStudentLoginPass(result.Start_time, result.batchdate);
                console.log(`BatchNo ${result.batchNo} (Dept: ${result.departmentId}): Download allowed: ${isAllowed}`);
                return isAllowed;
            });

            if (filteredResults.length > 0) {
                console.log("===== CONTROLLER PASSWORDS WILL BE RETURNED =====");
                let controller_pass_decrypted;
                filteredResults.forEach((result, index) => {
                    console.log(`Filtered Batch ${index + 1}:`);
                    console.log(`  BatchNo: ${result.batchNo}`);
                    console.log(`  DepartmentId: ${result.departmentId}`);
                    console.log(`  Department: ${result.departmentName}`);
                    console.log(`  Center: ${result.center}`);

                    console.log(`  Controller Password: ${result.controller_pass}`);
                    controller_pass_decrypted = decrypt(result.controller_pass);
                    console.log(`  Controller Password Decrypted : ${controller_pass_decrypted}`);
                    console.log(`  Start Time: ${result.Start_time}`);
                    console.log(`  Batch Date: ${result.batchdate}`);
                    console.log("---");
                });

                const controllerPassDto = filteredResults.map(result => {
                    const formattedBatchDate = moment(result.batchdate).format('YYYY-MM-DD');
                    return {
                        ...new ControllerPasswordDTO(
                            result.center,
                            result.batchNo,
                            controller_pass_decrypted,
                            result.Start_time,
                            result.End_Time,
                            result.batchstatus
                        ),
                        departmentId: result.departmentId,
                        departmentName: result.departmentName,
                        batchDate: formattedBatchDate  // Added batch date
                    };
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

// Add new endpoint to get departments
exports.getDepartmentsForCenter = async (req, res) => {
    const centerCode = req.session.centerId;
    
    try {
        const query = `SELECT DISTINCT d.departmentId, d.departmentName 
                      FROM departmentdb d 
                      INNER JOIN batchdb b ON d.departmentId = b.departmentId
                      INNER JOIN controllerdb c ON b.batchNo = c.batchNo
                      WHERE c.center = ? AND d.departmentStatus = 1
                      ORDER BY d.departmentName ASC`;
        
        const [results] = await connection.query(query, [centerCode]);
        res.status(200).json({departments: results});
    } catch (err) {
        console.error("Error in getDepartmentsForCenter:", err);
        res.status(500).send(err.message);
    }
};

exports.getBatchwiseControllerPassForCenter = async(req, res) => {
    const center = req.session.centerId;
    const {batchNo, departmentId} = req.body; // Add departmentId

    console.log(`===== GETTING CONTROLLER PASSWORD FOR SPECIFIC BATCH =====`);
    console.log(`Center: ${center}, BatchNo: ${batchNo}, DepartmentId: ${departmentId}`);

    try {
        const batchQuery = 'SELECT batchdate, start_time FROM batchdb WHERE batchNo = ? AND departmentId = ?';
        const [batchData] = await connection.query(batchQuery, [batchNo, departmentId]);
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
        
        const query = `SELECT c.controller_pass, d.departmentName, b.batchdate 
                      FROM controllerdb c
                      INNER JOIN batchdb b ON c.batchNo = b.batchNo
                      INNER JOIN departmentdb d ON b.departmentId = d.departmentId
                      WHERE c.center = ? AND c.batchNo = ? AND b.departmentId = ?`;
        const [results] = await connection.query(query, [center, batchNo, departmentId]);

        if (results && results.length > 0) {
            console.log("===== CONTROLLER PASSWORD FOUND =====");
            console.log(`BatchNo: ${batchNo}`);
            console.log(`DepartmentId: ${departmentId}`);
            console.log(`Department: ${results[0].departmentName}`);
            console.log(`Center: ${center}`);
            console.log(`Controller Password: ${results[0].controller_pass}`);
            console.log(`Batch Date: ${results[0].batchdate}`);
            console.log("=====================================");
        } else {
            console.log("No controller password found for this batch, center and department");
        }

        res.status(200).json({results});
    } catch (error) {
        console.error("Error in getBatchwiseControllerPassForCenter:", error);
        res.status(500).json({"Error":error});
    }
};

const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
function checkIfIsInTimeLimit(startTime) {
    const startMoment = moment.tz(startTime, 'hh:mm A', 'Asia/Kolkata');
    const now = moment();

    if (startMoment.isAfter(now)) {
        startMoment.subtract(1, 'day');
    }

    const differenceInMinutes = now.diff(startMoment, 'minutes');
    return differenceInMinutes <= 15;
}