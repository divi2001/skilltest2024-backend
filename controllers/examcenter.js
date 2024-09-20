const connection = require('../config/db1');
const xl = require('excel4node');
const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;
const archiver = require('archiver');
const moment = require('moment-timezone');

const { encrypt, decrypt } = require('../config/encrypt');
const { request } = require('http');
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
exports.getCenterResetRequests = async (req, res) => {
    const centerId = req.session.centerId;
    const { student_id, reason, reset_type } = req.body;

    if (!centerId) {
        return res.status(401).send('Unauthorized: No center ID in session');
    }

    try {
        // Base query with CASE statement for approval status
        let fetchRequestsQuery = `
            SELECT r.*, 
                   s.name as student_name,
                   CASE 
                       WHEN r.approved = 1 THEN 'Approved'
                       ELSE 'Not Approved'
                   END as approval_status
            FROM resetrequests r
            JOIN students s ON r.student_id = s.student_id
            WHERE r.center = ?
        `;

        // Array to hold query parameters
        const queryParams = [centerId];

        // Add conditions based on provided parameters
        if (student_id) {
            fetchRequestsQuery += ' AND r.student_id = ?';
            queryParams.push(student_id);
        }
        if (reason) {
            fetchRequestsQuery += ' AND r.reason = ?';
            queryParams.push(reason);
        }
        if (reset_type) {
            fetchRequestsQuery += ' AND r.reset_type = ?';
            queryParams.push(reset_type);
        }

        // Add ordering
        fetchRequestsQuery += ' ORDER BY r.id DESC';

        // Execute the query
        const [requests] = await connection.query(fetchRequestsQuery, queryParams);

        if (requests.length === 0) {
            return res.status(404).json({ message: "No reset requests found for the given criteria" });
        }

        res.json(requests);
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
        // Fetch center data
        const fetchCenterDataQuery = `
            SELECT *
            FROM centers
            WHERE center_id = ?
        `;
        const [centerData] = await connection.query(fetchCenterDataQuery, [centerId]);

        if (centerData.length === 0) {
            return res.status(404).send('Center not found');
        }

        res.json(centerData[0]);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};