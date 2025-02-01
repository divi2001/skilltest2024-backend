const connection = require('../config/db1')
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const { encrypt, decrypt } = require('../config/encrypt');

exports.loginCenter = async (req, res) => {
    console.log("Trying center login");
    const { centerId, centerPass, ipAddress, diskIdentifier, macAddress } = req.body;
    console.log(`Received data - centerId: ${centerId}, centerPass: ${centerPass}, ipAddress: ${ipAddress}, diskIdentifier: ${diskIdentifier}, macAddress: ${macAddress}`);

    try {
        // Check if PC registration feature is enabled
        const checkFeatureQuery = 'SELECT status FROM features WHERE feature = "pc_registration"';
        const [featureResult] = await connection.query(checkFeatureQuery);
        
        if (featureResult.length === 0 || featureResult[0].status === 0) {
            console.log("PC registration feature is not available");
            return res.status(403).send('PC registration is not available at this time');
        }

        console.log("PC registration feature is enabled");

        console.log("PC registration feature is enabled");

        const query1 = 'SELECT * FROM examcenterdb WHERE center = ?';

        console.log("Ensuring pcregistration table exists");
        // Ensure pcregistration table exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS pcregistration (
                id INT AUTO_INCREMENT PRIMARY KEY,
                center VARCHAR(255) NOT NULL,
                ip_address VARCHAR(255) NOT NULL,
                disk_id VARCHAR(255) NOT NULL,
                mac_address VARCHAR(255) NOT NULL
            )
        `;
        await connection.query(createTableQuery);
        console.log("pcregistration table ensured");

        console.log("Querying examcenterdb for centerId");
        const [results] = await connection.query(query1, [centerId]);
        if (results.length > 0) {
            const center = results[0];
            console.log(`Center found: ${JSON.stringify(center)}`);

            // Decrypt the stored centerPass
            let decryptedStoredCenterPass;
            try {
                console.log("Decrypting stored center pass");
                decryptedStoredCenterPass = decrypt(center.centerpass);
                console.log(`Decrypted stored center pass: '${decryptedStoredCenterPass}'`);
            } catch (error) {
                console.error('Error decrypting stored center pass:', error);
                return res.status(500).send('Error decrypting stored center pass');
            }

            // Ensure both passwords are treated as strings
            const decryptedStoredCenterPassStr = String(decryptedStoredCenterPass).trim();
            const providedCenterPassStr = String(centerPass).trim();

            console.log(`Comparing passwords - stored: '${decryptedStoredCenterPassStr}', provided: '${providedCenterPassStr}'`);
            if (decryptedStoredCenterPassStr === providedCenterPassStr) {
                console.log("Passwords match");

                // Check if the PC is already registered
                const checkPcQuery = `
                    SELECT COUNT(*) AS pcExists FROM pcregistration 
                    WHERE center = ? AND ip_address = ? AND disk_id = ? AND mac_address = ?
                `;
                console.log("Checking if the PC is already registered");
                const [checkPcResults] = await connection.query(checkPcQuery, [centerId, ipAddress, diskIdentifier, macAddress]);
                const pcExists = checkPcResults[0].pcExists;

                if (pcExists > 0) {
                    console.log("PC is already registered for the center");
                    return res.status(403).send('This PC is already registered for the center');
                }

                console.log("PC is not already registered");

                // Check the number of registered PCs for the center
                const countQuery = 'SELECT COUNT(*) AS pcCount FROM pcregistration WHERE center = ?';
                console.log("Checking the number of registered PCs for the center");
                const [countResults] = await connection.query(countQuery, [centerId]);
                const pcCount = countResults[0].pcCount;

                // Get the maximum allowed PCs for the center
                const maxPcQuery = 'SELECT max_pc FROM examcenterdb WHERE center = ?';
                console.log("Getting the maximum allowed PCs for the center");
                const [maxPcResults] = await connection.query(maxPcQuery, [centerId]);
                const maxPcCount = maxPcResults[0].max_pc;

                console.log(`PC count: ${pcCount}, Max PC count: ${maxPcCount}`);
                if (pcCount < maxPcCount) {
                    console.log("Registering new PC");
                    // Insert PC registration log
                    const insertLogQuery = `
                        INSERT INTO pcregistration (center, ip_address, disk_id, mac_address)
                        VALUES (?, ?, ?, ?)
                    `;
                    await connection.query(insertLogQuery, [centerId, ipAddress, diskIdentifier, macAddress]);
                    console.log("PC registered successfully");
                    return res.status(200).send('PC registered successfully for the center!');
                } else {
                    console.log("The maximum number of PCs for this center has been reached");
                    return res.status(403).send('The maximum number of PCs for this center has been reached');
                }
            } else {
                console.log("Invalid credentials for center");
                return res.status(401).send('Invalid credentials for center');
            }
        } else {
            console.log("Center not found");
            return res.status(404).send('Center not found');
        }
    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).send('Internal server error');
    }
};


exports.deleteCenterResetRequest = async (req, res) => {
    const centerId = req.session.centerId;
    const requestId = req.params.id;

    if (!centerId) {
        return res.status(401).send('Unauthorized: No center ID in session');
    }

    try {
        // Delete query
        const deleteQuery = `
            DELETE FROM resetrequests
            WHERE id = ? AND center = ?
        `;

        // Execute the query
        const [result] = await connection.query(deleteQuery, [requestId, centerId]);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Request deleted successfully" });
        } else {
            res.status(404).json({ message: "Request not found or not authorized to delete" });
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.getCenterResetRequests = async (req, res) => {
    const centerId = req.session.centerId;
    const { student_id, reason, reset_type } = req.body;

    if (!centerId) {
        return res.status(401).send('Unauthorized: No center ID in session');
    }
    const status = 'Not Approved';

    try {
        // First, check if the student belongs to this center
        const [studentCheck] = await connection.query(
            'SELECT center FROM students WHERE student_id = ?',
            [student_id]
        );

        if (studentCheck.length === 0 || studentCheck[0].center !== centerId) {
            return res.status(400).json({ message: "Student is not from this center" });
        }

        // Base query
        let fetchRequestsQuery = `
            SELECT * 
            FROM resetrequests
            WHERE center = ?
        `;

        // Array to hold query parameters
        const queryParams = [centerId];

        // Add conditions based on provided parameters
        if (student_id) {
            fetchRequestsQuery += ' AND student_id = ?';
            queryParams.push(student_id);
        }
        if (reason) {
            fetchRequestsQuery += ' AND reason = ?';
            queryParams.push(reason);
        }
        if (reset_type) {
            fetchRequestsQuery += ' AND reset_type = ?';
            queryParams.push(reset_type);
        }
        if (status) {
            fetchRequestsQuery += ' AND approved = ?';
            queryParams.push(status);
        }

        // Add ordering
        fetchRequestsQuery += ' ORDER BY id DESC';

        // Execute the query
        const [requests] = await connection.query(fetchRequestsQuery, queryParams);

        if (requests.length === 0) {
            // Create a new request if no matching requests are found
            const insertQuery = `
                INSERT INTO resetrequests (student_id, reason, reset_type, center, reseted_by, approved, time)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            const insertParams = [
                student_id,
                reason,
                reset_type,
                centerId,
                req.session.username || 'Unknown', // Assuming the username is stored in the session
                'Pending' // Set initial approval status
            ];

            const [result] = await connection.query(insertQuery, insertParams);

            if (result.affectedRows > 0) {
                // Fetch the newly created request
                const [newRequest] = await connection.query('SELECT * FROM resetrequests WHERE id = ?', [result.insertId]);
                
                // Format the time for the new request
                const formattedRequest = {
                    ...newRequest[0],
                    time: moment(newRequest[0].time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
                };

                return res.status(201).json(formattedRequest);
            } else {
                return res.status(500).json({ message: "Failed to create new request" });
            }
        }

        // Format the time for each request
        const formattedRequests = requests.map(request => ({
            ...request,
            time: moment(request.time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
        }));

        res.json(formattedRequests);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.getCenterData = async (req, res) => {
    const centerId = req.session.centerId;

    if (!centerId) {
        return res.status(401).send('Unauthorized: No center ID in session');
    }

    try {
        // Fetch reset requests for the center
        const fetchResetRequestsQuery = `
            SELECT * 
            FROM resetrequests
            WHERE center = ?
            ORDER BY id DESC
        `;
        const [resetRequests] = await connection.query(fetchResetRequestsQuery, [centerId]);

        if (resetRequests.length === 0) {
            return res.status(404).json({ message: "No reset requests found for this center" });
        }

        // Format the time for each request
        const formattedRequests = resetRequests.map(request => ({
            ...request,
            time: moment(request.time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
        }));

        res.json(formattedRequests);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.uploadAttendanceReport = async (req, res) => {
    // req.session.centerId
    const center =  req.session.centerId;
    const { batchNo, present_count, absent_count } = req.body;
    const newFileName = `${center}_batch_${batchNo}_attendance_report.pdf`
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const attendance_report = req.file;

    try {
        const checkQuery = 'SELECT * from attendance_reports where center = ? AND batchNo = ?;';
        const [check] = await connection.query(checkQuery, [center, batchNo]);
        if (check.length > 0) return res.status(403).json({ "message": "Already added the data please Check!!" });
        
        const currentDate = moment().tz("Asia/Kolkata").format('DD/MM/YYYY');

        const insertQuery = `INSERT INTO attendance_reports 
        (center, batchNo, report_date, present_count, absent_count, attendance_pdf) 
        VALUES (?, ?, ?, ?, ?, ?)`;

        const oldPath = attendance_report.path;
        const newPath = path.join(path.dirname(oldPath), newFileName);
        fs.renameSync(oldPath, newPath);
        const url = `/uploads/${newFileName}`;
        const [result] = await connection.query(insertQuery, [
            center,
            batchNo,
            currentDate,
            present_count,
            absent_count,
            url 
        ]);

        if (result.affectedRows > 0) {
            res.status(200).json({ 
                success: true, 
                message: 'Attendance report uploaded successfully',
                reportId: result.insertId
            });
        } else {
            throw new Error('Failed to insert attendance report');
        }



    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": error.message });
    }
}

exports.deleteAttendanceReport = async (req,res)=>{
    const {batchNo} = req.body;
    const center =  req.session.centerId;
    if(!batchNo){
        return res.status(400).json({"message":"Please provide the batch no."})
    }
    if(!center){
        return res.status(400).json({"message":"Center admin is not logged in"})
    }
    try {
        const deleteQuery = `delete from attendance_reports where batchNo = ? and center = ?;`;
        const [response] = await connection.query(deleteQuery,[batchNo,center]);
        if(response.affectedRows === 0){
            return res.status(500).json({"message":"Failed to deletr. Try Again!!"})
        }

        res.status(201).json({"message":"Attendance report deleted successfully!!"})
    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": error.message });
    }
}

exports.getAllAttendanceReport = async (req,res) => {
    const center = req.session.centerId;
    
    try {
        const query = `SELECT * from attendance_reports WHERE center = ?;`;
        
        const [response] = await connection.query(query,[center]);

        if(response.length === 0){
            return res.status(404).json({"message":"Nothing Uploaded yet!!"})
        }
        console.log(response);
        res.status(201).json({"message":"Recieved all data successfully!!","Reports":response});

    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": error.message });
    }
    
}
