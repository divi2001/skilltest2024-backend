const connection = require('../config/db1')
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const { encrypt, decrypt } = require('../config/encrypt');

exports.loginCenter = async (req, res) => {
    console.log("Trying center login");
    const { centerId, centerPass, ipAddress, diskIdentifier, macAddress, processor, os, ram, totalStorage, availableStorage } = req.body;
    console.log(`Received data - centerId: ${centerId}, centerPass: ${centerPass}, ipAddress: ${ipAddress}, diskIdentifier: ${diskIdentifier}, macAddress: ${macAddress}, processor: ${processor}, os: ${os}, ram: ${ram}, totalStorage: ${totalStorage}, availableStorage: ${availableStorage}`);

    try {
        // Check if PC registration feature is enabled
        const checkFeatureQuery = 'SELECT status FROM features WHERE feature = "pc_registration"';
        const [featureResult] = await connection.query(checkFeatureQuery);

        if (featureResult.length === 0 || featureResult[0].status === 0) {
            console.log("PC registration feature is not available");
            return res.status(403).send('PC registration is not available at this time');
        }

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
                mac_address VARCHAR(255) NOT NULL,
                processor VARCHAR(255),
                os VARCHAR(255),
                ram VARCHAR(255),
                total_storage VARCHAR(255),
                available_storage VARCHAR(255)
            )
        `;
        await connection.query(createTableQuery);

        // Attempt to add columns if they don't exist (for existing tables)
        const alterQueries = [
            "ALTER TABLE pcregistration ADD COLUMN processor VARCHAR(255)",
            "ALTER TABLE pcregistration ADD COLUMN os VARCHAR(255)",
            "ALTER TABLE pcregistration ADD COLUMN ram VARCHAR(255)",
            "ALTER TABLE pcregistration ADD COLUMN total_storage VARCHAR(255)",
            "ALTER TABLE pcregistration ADD COLUMN available_storage VARCHAR(255)"
        ];

        for (const query of alterQueries) {
            try {
                await connection.query(query);
            } catch (err) {
                // Ignore error if column already exists
                if (err.code !== 'ER_DUP_FIELDNAME') {
                    console.log(`Note: Column addition skipped or failed: ${err.message}`);
                }
            }
        }

        console.log("pcregistration table ensured and updated");

        console.log("Querying examcenterdb for centerId");
        const [results] = await connection.query(query1, [centerId]);
        if (results.length > 0) {
            const center = results[0];
            console.log(`Center found: ${JSON.stringify(center)}`);

            // centerpass is stored encrypted in examcenterdb
            const decryptedStoredCenterPassStr = String(decrypt(center.centerpass)).trim();
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
                        INSERT INTO pcregistration (center, ip_address, disk_id, mac_address, processor, os, ram, total_storage, available_storage)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    await connection.query(insertLogQuery, [centerId, ipAddress, diskIdentifier, macAddress, processor, os, ram, totalStorage, availableStorage]);
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
                if (newRequest && newRequest[0] && newRequest[0].time) {
                    newRequest[0].time = moment(newRequest[0].time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                }

                return res.status(201).json(newRequest[0]);
            } else {
                return res.status(500).json({ message: "Failed to create new request" });
            }
        }

        // Format the time for each request
        if (requests && requests.length > 0) {
            requests.forEach(request => {
                if (request.time) {
                    request.time = moment(request.time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                }
            });
        }

        res.json(requests);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.getCenterBatchNumbers = async (req, res) => {
    console.log("Fetching center batch numbers");
    const centerId = req.session.centerId;

    if (!centerId) {
        return res.status(401).json({ message: 'Unauthorized: No center ID in session' });
    }

    try {
        const query = `
            SELECT DISTINCT 
                s.batchNo, 
                s.batchdate, 
                b.start_time, 
                b.end_time,
                COUNT(s.student_id) as student_count
            FROM students s
            LEFT JOIN batchdb b ON s.batchNo = b.batchNo
            WHERE s.center = ?
            GROUP BY s.batchNo, s.batchdate, b.start_time, b.end_time
            HAVING COUNT(s.student_id) > 0
            ORDER BY s.batchNo`;

        const [batches] = await connection.query(query, [centerId]);

        // Format dates and times if needed
        const formattedBatches = batches.map(batch => ({
            ...batch,
            batchdate: moment(batch.batchdate).format('YYYY-MM-DD'),
            start_time: moment(batch.start_time, 'HH:mm:ss').format('HH:mm:ss'),
            end_time: moment(batch.end_time, 'HH:mm:ss').format('HH:mm:ss')
        }));

        console.log("Formatted batches:", formattedBatches);

        if (formattedBatches.length === 0) {
            return res.status(404).json({
                message: "No batches found for this center",
                centerId: centerId
            });
        }

        res.json(formattedBatches);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            message: 'Internal server error',
            error: err.message
        });
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

// FIXED uploadAttendanceReport function
exports.uploadAttendanceReport = async (req, res) => {
    const center = req.session.centerId;
    const { batchNo, departmentId, present_count, absent_count, report_date } = req.body;

    console.log('Upload attendance input values:', {
        center,
        batchNo,
        departmentId,
        present_count,
        absent_count,
        report_date
    });

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate required fields including departmentId
    if (!batchNo || !departmentId || !present_count || !absent_count) {
        return res.status(400).json({
            success: false,
            message: "All fields are required: batchNo, departmentId, present_count, absent_count"
        });
    }

    const attendance_report = req.file;

    try {
        // Validate that departmentId exists and is active
        const [deptCheck] = await connection.query(
            'SELECT departmentId, departmentName FROM departmentdb WHERE departmentId = ? AND departmentStatus = 1',
            [departmentId]
        );

        if (deptCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or inactive department selected"
            });
        }

        const checkQuery = 'SELECT * from attendance_reports where center = ? AND batchNo = ? AND departmentId = ?;';
        const [check] = await connection.query(checkQuery, [center, batchNo, departmentId]);
        if (check.length > 0) {
            return res.status(403).json({
                "message": "Already added the data for this batch and department. Please Check!!"
            });
        }

        // UPDATED: Include department in filename
        const departmentName = deptCheck[0].departmentName.replace(/[^a-zA-Z0-9]/g, '_'); // Clean department name for filename
        const newFileName = `${center}_dept_${departmentId}_${departmentName}_batch_${batchNo}_attendance_report.pdf`;

        // Date handling for MySQL DATETIME column
        let mysqlDateTime;

        if (report_date) {
            console.log('Processing report_date:', report_date);

            const parsedDate = moment(report_date, [
                'YYYY-MM-DD', 'MM/DD/YYYY', 'YYYY-MM-DD',
                'DD/MM/YYYY', 'MM-DD-YYYY', 'YYYY/MM/DD'
            ], true);

            if (!parsedDate.isValid()) {
                console.log('Invalid date format provided:', report_date);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Please use YYYY-MM-DD, MM/DD/YYYY, or YYYY-MM-DD format'
                });
            }

            mysqlDateTime = parsedDate.tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        } else {
            mysqlDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
        }

        // UPDATED: Include departmentId in the insert query
        const insertQuery = `INSERT INTO attendance_reports 
        (center, batchNo, departmentId, report_date, present_count, absent_count, attendance_pdf) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const oldPath = attendance_report.path;
        const newPath = path.join(path.dirname(oldPath), newFileName);
        fs.renameSync(oldPath, newPath);
        const url = `/uploads/${newFileName}`;

        console.log('Executing SQL query:', insertQuery);
        console.log('Query parameters:', [
            center,
            batchNo,
            departmentId,  // Include departmentId
            mysqlDateTime,
            present_count,
            absent_count,
            url
        ]);

        const [result] = await connection.query(insertQuery, [
            center,
            batchNo,
            departmentId,  // Include departmentId
            mysqlDateTime,
            present_count,
            absent_count,
            url
        ]);

        if (result.affectedRows > 0) {
            res.status(200).json({
                success: true,
                message: 'Attendance report uploaded successfully',
                reportId: result.insertId,
                filename: newFileName
            });
        } else {
            throw new Error('Failed to insert attendance report');
        }

    } catch (error) {
        console.error('Error uploading attendance report:', error);

        // Clean up file if there was an error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('Cleaned up uploaded file due to error');
            } catch (unlinkError) {
                console.error('Error cleaning up uploaded file:', unlinkError);
            }
        }

        res.status(500).json({ "message": error.message });
    }
}

exports.deleteAttendanceReport = async (req, res) => {
    const { batchNo, departmentId } = req.body;  // Include departmentId
    const center = req.session.centerId;

    if (!batchNo || !departmentId) {
        return res.status(400).json({
            "message": "Please provide both batch number and department ID"
        })
    }
    if (!center) {
        return res.status(400).json({ "message": "Center admin is not logged in" })
    }

    try {
        // Updated query to include departmentId
        const getFileQuery = `SELECT attendance_pdf FROM attendance_reports WHERE batchNo = ? AND departmentId = ? AND center = ?`;
        const [fileResult] = await connection.query(getFileQuery, [batchNo, departmentId, center]);

        if (fileResult.length === 0) {
            return res.status(404).json({ "message": "Attendance report not found" });
        }

        const deleteQuery = `DELETE FROM attendance_reports WHERE batchNo = ? AND departmentId = ? AND center = ?`;
        const [response] = await connection.query(deleteQuery, [batchNo, departmentId, center]);

        if (response.affectedRows === 0) {
            return res.status(500).json({ "message": "Failed to delete. Try Again!!" })
        }

        // Delete the PDF file if it exists
        if (fileResult[0].attendance_pdf) {
            const filePath = path.join(__dirname, '..', fileResult[0].attendance_pdf);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('Attendance PDF file deleted:', filePath);
                }
            } catch (fileError) {
                console.error('Error deleting attendance PDF file:', fileError);
            }
        }

        res.status(200).json({ "message": "Attendance report deleted successfully!!" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": error.message });
    }
}
exports.getAllAttendanceReport = async (req, res) => {
    const center = req.session.centerId;

    try {
        // Updated query to include department information
        const query = `
            SELECT 
                ar.*,
                d.departmentName,
                d.departmentId
            FROM attendance_reports ar
            LEFT JOIN departmentdb d ON ar.departmentId = d.departmentId
            WHERE ar.center = ? 
            ORDER BY ar.report_date DESC
        `;

        const [response] = await connection.query(query, [center]);

        if (response.length === 0) {
            return res.status(404).json({ "message": "Nothing Uploaded yet!!" })
        }

        // Format dates for display and ensure department info is included
        const formattedResponse = response.map(report => ({
            ...report,
            report_date: moment(report.report_date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
            departmentName: report.departmentName || 'Unknown Department',
            departmentId: report.departmentId || 'N/A'
        }));

        console.log("Formatted attendance reports with departments:", formattedResponse);
        res.status(200).json({
            "message": "Received all data successfully!!",
            "Reports": formattedResponse
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ "message": error.message });
    }
}