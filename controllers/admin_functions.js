const connection = require('../config/db1');
const moment = require('moment-timezone');

exports.loginadmin = async (req, res) => {
    const { userId, password } = req.body;
    console.log('Login attempt - UserID:', userId);

    const query1 = 'SELECT * FROM admindb WHERE adminid = ?';

    try {
        const [results] = await connection.query(query1, [userId]);

        console.log(results)

        if (results.length > 0) {
            const admin = results[0];
            console.log('Admin found in database:', admin.adminid);

            let decryptedStoredPassword;
            try {
                decryptedStoredPassword = (admin.password);
                console.log('Stored password:', decryptedStoredPassword);
                console.log('Provided password:', password);
            } catch (error) {
                console.error('Error decrypting stored password:', error);
                res.status(500).send('Error decrypting stored password');
                return;
            }

            // Ensure both passwords are treated as strings
            const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
            const providedPasswordStr = String(password).trim();

            console.log('Comparing passwords:');
            console.log('Stored (after trim):', decryptedStoredPasswordStr);
            console.log('Provided (after trim):', providedPasswordStr);
            console.log('Passwords match:', decryptedStoredPasswordStr === providedPasswordStr);

            if (decryptedStoredPasswordStr === providedPasswordStr) {
                console.log('Login successful for admin:', admin.adminid);
                req.session.adminid = admin.adminid;
                res.send('Logged in successfully as an admin!');
            } else {
                console.log('Password mismatch for admin:', admin.adminid);
                res.status(401).send('Invalid credentials for admin');
            }
        } else {
            console.log('Admin ID not found:', userId);
            res.status(404).send('admin not found');
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send(err.message);
    }
};

const mysql = require('mysql2/promise');

exports.fetchTableData = async (req, res) => {
    console.log("Fetching table data for admin");
    const { tableName } = req.body;
    const adminId = req.session.adminid;

    if (!adminId) {
        return res.status(401).send('Unauthorized: Admin not logged in');
    }

    try {
        console.log(`Fetching column information for table: ${tableName}`);
        // First, get the column information for the table
        const [columns] = await connection.query(`
              SELECT COLUMN_NAME, DATA_TYPE 
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
          `, [tableName]);

        console.log(`Columns found:`, columns);

        if (columns.length === 0) {
            return res.status(404).send('Table not found or has no columns');
        }

        // Construct the SELECT part of the query, formatting DATE and DATETIME columns
        const selectParts = columns.map(column => {
            if (column.DATA_TYPE === 'date') {
                return `DATE_FORMAT(${mysql.escapeId(column.COLUMN_NAME)}, '%Y-%m-%d') AS ${mysql.escapeId(column.COLUMN_NAME)}`;
            } else if (column.DATA_TYPE === 'datetime') {
                return `DATE_FORMAT(${mysql.escapeId(column.COLUMN_NAME)}, '%Y-%m-%d %H:%i:%s') AS ${mysql.escapeId(column.COLUMN_NAME)}`;
            } else if (column.DATA_TYPE === 'timestamp') {
                return `DATE_FORMAT(${mysql.escapeId(column.COLUMN_NAME)}, '%Y-%m-%d %H:%i:%s') AS ${mysql.escapeId(column.COLUMN_NAME)}`;
            } else {
                return mysql.escapeId(column.COLUMN_NAME);
            }
        });

        const query = `SELECT ${selectParts.join(', ')} FROM ${mysql.escapeId(tableName)}`;
        console.log('Executing query:', query);

        const [results] = await connection.query(query);
        console.log(`Query executed successfully. Rows returned: ${results.length}`);

        res.json(results);
    } catch (err) {
        console.error('Error fetching table data:', err);
        if (err.code === 'ER_NO_SUCH_TABLE') {
            res.status(404).send('Table not found');
        } else if (err.sql) {
            console.error('SQL that caused the error:', err.sql);
            res.status(500).send('Error executing SQL query');
        } else {
            res.status(500).send('Error fetching table data');
        }
    }
};

exports.fetchTableNames = async (req, res) => {
    console.log("Fetching all table names for admin");
    const adminId = req.session.adminid;

    if (!adminId) {
        return res.status(401).send('Unauthorized: Admin not logged in');
    }

    const query = `SHOW TABLES`;

    try {
        const [results] = await connection.query(query);
        const tableNames = results.map(row => Object.values(row)[0]);
        res.json(tableNames);
    } catch (err) {
        console.error('Error fetching table names:', err);
        res.status(500).send('Error fetching table names');
    }
};


exports.updateTableData = async (req, res) => {
    console.log("Updating table data for admin");
    const adminId = req.session.adminid;

    if (!adminId) {
        return res.status(401).send('Unauthorized: Admin not logged in');
    }

    const { tableName, updatedRows } = req.body;

    if (!tableName || !updatedRows || !Array.isArray(updatedRows)) {
        return res.status(400).send('Invalid request: tableName and updatedRows array are required');
    }

    try {
        // Start a transaction
        await connection.query('START TRANSACTION');

        // First, fetch the primary key column name for the table
        const [tableInfo] = await connection.query(`SHOW KEYS FROM ${tableName} WHERE Key_name = 'PRIMARY'`);
        if (tableInfo.length === 0) {
            throw new Error(`No primary key found for table ${tableName}`);
        }
        const primaryKeyColumn = tableInfo[0].Column_name;

        for (const row of updatedRows) {
            const columns = Object.keys(row).filter(key => key !== 'key' && key !== primaryKeyColumn);
            const values = columns.map(col => row[col]);

            const updateQuery = `
                UPDATE ${tableName}
                SET ${columns.map(col => `${col} = ?`).join(', ')}
                WHERE ${primaryKeyColumn} = ?
            `;

            await connection.query(updateQuery, [...values, row[primaryKeyColumn]]);
        }

        // Commit the transaction
        await connection.query('COMMIT');

        res.json({ success: true, message: 'Table data updated successfully' });
    } catch (err) {
        // If there's an error, rollback the transaction
        await connection.query('ROLLBACK');
        console.error('Error updating table data:', err);
        res.status(500).json({ success: false, message: 'Error updating table data', error: err.message });
    }
};

exports.deleteTable = async (req, res) => {
    const tableName = req.params.tableName;

    // Disallow deletion of the 'admindb' table
    if (tableName === 'admindb') {
        return res.status(400).send('Deletion of admindb table is not allowed');
    }

    // Validate the table name format to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return res.status(400).send('Invalid table name');
    }

    const deleteTableQuery = `DROP TABLE IF EXISTS ??`;

    try {
        await connection.query(deleteTableQuery, [tableName]);
        res.send(`Table ${tableName} deleted successfully`);
    } catch (err) {
        console.error(`Failed to delete table ${tableName}:`, err);
        res.status(500).send(err.message);
    }
};

exports.updateAndRetrieveAudioLogs = async (req, res) => {
    const { studentId, trial, passageA, passageB, reset } = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    try {
        if (reset) {
            // Reset (remove) the entry for the student
            const deleteQuery = `
                DELETE FROM audiologs
                WHERE student_id = ?
            `;
            const [deleteResult] = await connection.query(deleteQuery, [studentId]);

            if (deleteResult.affectedRows === 0) {
                return res.status(404).send(`No audio logs found for student ID ${studentId}`);
            }

            return res.send(`Successfully removed audio logs for student ID ${studentId}`);
        }

        // Update or insert logic
        let updateFields = [];
        let queryParams = [];

        if (trial !== undefined) {
            updateFields.push('trial = ?');
            queryParams.push(trial);
        }
        if (passageA !== undefined) {
            updateFields.push('passageA = ?');
            queryParams.push(passageA);
        }
        if (passageB !== undefined) {
            updateFields.push('passageB = ?');
            queryParams.push(passageB);
        }

        if (updateFields.length > 0) {
            // Use INSERT ... ON DUPLICATE KEY UPDATE
            const updateQuery = `
                INSERT INTO audiologs (student_id, trial, passageA, passageB, created_at)
                VALUES (?, ${queryParams.map(() => '?').join(', ')}, NOW())
                ON DUPLICATE KEY UPDATE
                ${updateFields.join(', ')},
                created_at = NOW()
            `;

            queryParams.unshift(studentId); // Add studentId at the beginning of queryParams

            await connection.query(updateQuery, queryParams);
        }

        // Retrieve current log
        const retrieveQuery = `
            SELECT * FROM audiologs
            WHERE student_id = ?
        `;

        const [logs] = await connection.query(retrieveQuery, [studentId]);

        if (logs.length === 0) {
            return res.status(404).send(`No audio logs found for student ID ${studentId}`);
        }

        res.json({
            message: updateFields.length > 0 ? `Successfully updated audio logs for student ID ${studentId}` : `Retrieved audio logs for student ID ${studentId}`,
            audioLogs: logs[0]
        });
    } catch (err) {
        console.error('Failed to manage audio logs:', err);
        res.status(500).send('Internal server error');
    }
};

exports.manageTextLogs = async (req, res) => {
    const { studentId, mina, texta, minb, textb, reset } = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    try {
        if (reset) {
            // Reset (remove) the entry for the student
            const deleteQuery = `
                DELETE FROM textlogs
                WHERE student_id = ?
            `;
            const [deleteResult] = await connection.query(deleteQuery, [studentId]);

            if (deleteResult.affectedRows === 0) {
                return res.status(404).send(`No text logs found for student ID ${studentId}`);
            }

            return res.send(`Successfully removed text logs for student ID ${studentId}`);
        }

        // Update or insert logic
        let updateFields = [];
        let queryParams = [];

        if (mina !== undefined) {
            updateFields.push('mina = ?');
            queryParams.push(mina);
        }
        if (texta !== undefined) {
            updateFields.push('texta = ?');
            queryParams.push(texta);
        }
        if (minb !== undefined) {
            updateFields.push('minb = ?');
            queryParams.push(minb);
        }
        if (textb !== undefined) {
            updateFields.push('textb = ?');
            queryParams.push(textb);
        }

        if (updateFields.length > 0) {
            // Use INSERT ... ON DUPLICATE KEY UPDATE
            const updateQuery = `
                INSERT INTO textlogs (student_id, mina, texta, minb, textb, created_at)
                VALUES (?, ${queryParams.map(() => '?').join(', ')}, NOW())
                ON DUPLICATE KEY UPDATE
                ${updateFields.join(', ')},
                created_at = NOW()
            `;

            queryParams.unshift(studentId); // Add studentId at the beginning of queryParams

            await connection.query(updateQuery, queryParams);
        }

        // Retrieve current log
        const retrieveQuery = `
            SELECT * FROM textlogs
            WHERE student_id = ?
        `;

        const [logs] = await connection.query(retrieveQuery, [studentId]);

        if (logs.length === 0) {
            return res.status(404).send(`No text logs found for student ID ${studentId}`);
        }

        res.json({
            message: updateFields.length > 0 ? `Successfully updated text logs for student ID ${studentId}` : `Retrieved text logs for student ID ${studentId}`,
            textLogs: logs[0]
        });
    } catch (err) {
        console.error('Failed to manage text logs:', err);
        res.status(500).send('Internal server error');
    }
};


exports.manageFinalPassageSubmit = async (req, res) => {
    const { studentId, passageA, passageB, reset } = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    try {
        if (reset) {
            const deleteQuery = 'DELETE FROM finalPassageSubmit WHERE student_id = ?';
            const [deleteResult] = await connection.query(deleteQuery, [studentId]);

            if (deleteResult.affectedRows === 0) {
                return res.status(404).send(`No final passage submit found for student ID ${studentId}`);
            }

            return res.send(`Successfully removed final passage submit for student ID ${studentId}`);
        }

        let updateFields = [];
        let queryParams = [];

        if (passageA !== undefined) {
            updateFields.push('passageA = ?');
            queryParams.push(passageA);
        }
        if (passageB !== undefined) {
            updateFields.push('passageB = ?');
            queryParams.push(passageB);
        }

        if (updateFields.length > 0) {
            const updateQuery = `
                INSERT INTO finalPassageSubmit (student_id, passageA, passageB)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                ${updateFields.join(', ')}
            `;
            queryParams.unshift(studentId, passageA, passageB);
            await connection.query(updateQuery, queryParams);
        }

        const retrieveQuery = 'SELECT * FROM finalPassageSubmit WHERE student_id = ?';
        const [logs] = await connection.query(retrieveQuery, [studentId]);

        if (logs.length === 0) {
            return res.status(404).send(`No final passage submit found for student ID ${studentId}`);
        }

        res.json({
            message: `Successfully managed final passage submit for student ID ${studentId}`,
            finalPassageSubmit: logs[0]
        });
    } catch (err) {
        console.error('Failed to manage final passage submit:', err);
        res.status(500).send('Internal server error');
    }
};


exports.manageTypingPassageLogs = async (req, res) => {
    const { studentId, trialTime, trialPassage, passageTime, passage, reset } = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    try {
        if (reset) {
            const deleteQuery = 'DELETE FROM typingpassagelogs WHERE student_id = ?';
            const [deleteResult] = await connection.query(deleteQuery, [studentId]);

            if (deleteResult.affectedRows === 0) {
                return res.status(404).send(`No typing passage logs found for student ID ${studentId}`);
            }

            return res.send(`Successfully removed typing passage logs for student ID ${studentId}`);
        }

        let updateFields = [];
        let queryParams = [];

        if (trialTime !== undefined) {
            updateFields.push('trial_time = ?');
            queryParams.push(trialTime);
        }
        if (trialPassage !== undefined) {
            updateFields.push('trial_passage = ?');
            queryParams.push(trialPassage);
        }
        if (passageTime !== undefined) {
            updateFields.push('passage_time = ?');
            queryParams.push(passageTime);
        }
        if (passage !== undefined) {
            updateFields.push('passage = ?');
            queryParams.push(passage);
        }

        if (updateFields.length > 0) {
            updateFields.push('time = NOW()');
            const updateQuery = `
                INSERT INTO typingpassagelogs (student_id, trial_time, trial_passage, passage_time, passage, time)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                ${updateFields.join(', ')}
            `;
            queryParams.unshift(studentId, trialTime, trialPassage, passageTime, passage);
            await connection.query(updateQuery, queryParams);
        }

        const retrieveQuery = 'SELECT * FROM typingpassagelogs WHERE student_id = ?';
        const [logs] = await connection.query(retrieveQuery, [studentId]);

        if (logs.length === 0) {
            return res.status(404).send(`No typing passage logs found for student ID ${studentId}`);
        }

        res.json({
            message: `Successfully managed typing passage logs for student ID ${studentId}`,
            typingpassagelogs: logs[0]
        });
    } catch (err) {
        console.error('Failed to manage typing passage logs:', err);
        res.status(500).send('Internal server error');
    }
};


exports.manageTypingPassage = async (req, res) => {
    const { studentId, trialPassage, passage, reset } = req.body;

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    try {
        if (reset) {
            const deleteQuery = 'DELETE FROM typingpassage WHERE student_id = ?';
            const [deleteResult] = await connection.query(deleteQuery, [studentId]);

            if (deleteResult.affectedRows === 0) {
                return res.status(404).send(`No typing passage found for student ID ${studentId}`);
            }

            return res.send(`Successfully removed typing passage for student ID ${studentId}`);
        }

        let updateFields = [];
        let queryParams = [];

        if (trialPassage !== undefined) {
            updateFields.push('trial_passage = ?');
            queryParams.push(trialPassage);
        }
        if (passage !== undefined) {
            updateFields.push('passage = ?');
            queryParams.push(passage);
        }

        if (updateFields.length > 0) {
            updateFields.push('time = NOW()');
            const updateQuery = `
                INSERT INTO typingpassage (student_id, trial_passage, passage, time)
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                ${updateFields.join(', ')}
            `;
            queryParams.unshift(studentId, trialPassage, passage);
            await connection.query(updateQuery, queryParams);
        }

        const retrieveQuery = 'SELECT * FROM typingpassage WHERE student_id = ?';
        const [logs] = await connection.query(retrieveQuery, [studentId]);

        if (logs.length === 0) {
            return res.status(404).send(`No typing passage found for student ID ${studentId}`);
        }

        res.json({
            message: `Successfully managed typing passage for student ID ${studentId}`,
            typingpassage: logs[0]
        });
    } catch (err) {
        console.error('Failed to manage typing passage:', err);
        res.status(500).send('Internal server error');
    }
};

exports.resetAllAudioLogs = async (req, res) => {
    const updateAudioLogQuery = `UPDATE audiologs SET trial = 0, passageA = 0, passageB = 0`;

    try {
        console.log('Resetting all audio logs to 0:', updateAudioLogQuery);
        const [result] = await connection.query(updateAudioLogQuery);

        const responseData = {
            message: 'All audio logs have been reset to 0',
            affectedRows: result.affectedRows
        };
        console.log('Audio logs reset:', responseData);

        res.send(responseData);
    } catch (err) {
        console.error('Failed to reset audio logs:', err);
        res.status(500).send(err.message);
    }
};

exports.createResetRequest = async (req, res) => {
    const { student_id, reason, reset_type } = req.body;

    if (!student_id || !reason || !reset_type) {
        return res.status(400).send('Missing required fields');
    }

    try {
        // Check if the student exists and get their center
        const checkStudentQuery = 'SELECT student_id, center FROM students WHERE student_id = ?';
        const [studentResults] = await connection.query(checkStudentQuery, [student_id]);

        if (studentResults.length === 0) {
            return res.status(404).send('Student not found');
        }

        const studentCenter = studentResults[0].center;

        // Insert the reset request
        const insertResetRequestQuery = `
            INSERT INTO resetrequests (student_id, reason, reset_type, center, approved)
            VALUES (?, ?, ?, ?, 'pending')
        `;
        const [result] = await connection.query(insertResetRequestQuery, [student_id, reason, reset_type, studentCenter]);

        res.status(201).json({
            message: 'Reset request created successfully',
            requestId: result.insertId
        });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.approveResetRequest = async (req, res) => {
    const { requestId } = req.params;
    const { approved, reseted_by } = req.body;

    if (!requestId || !approved || !reseted_by) {
        return res.status(400).send('Missing required fields');
    }

    try {
        // Update the reset request
        const updateResetRequestQuery = `
            UPDATE resetrequests 
            SET approved = ?, reseted_by = ?
            WHERE id = ?
        `;
        const [result] = await connection.query(updateResetRequestQuery, [approved, reseted_by, requestId]);

        if (result.affectedRows === 0) {
            return res.status(404).send('Reset request not found');
        }

        res.json({
            message: 'Reset request updated successfully'
        });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.approveResetRequest = async (req, res) => {
    const adminId = req.session.adminId;

    const { requestId, action } = req.body;

    if (!adminId) {
        return res.status(401).send('Unauthorized: No admin ID in session');
    }

    if (!requestId || !action || (action !== 'approve' && action !== 'reject')) {
        return res.status(400).json({ message: "Invalid request parameters" });
    }

    try {
        // Check if the request exists and its current status
        const [requestCheck] = await connection.query(
            'SELECT * FROM resetrequests WHERE id = ?',
            [requestId]
        );

        if (requestCheck.length === 0) {
            return res.status(404).json({ message: "Reset request not found" });
        }

        if (requestCheck[0].approved !== 'Not Approved') {
            return res.status(400).json({ message: "This request has already been processed" });
        }

        // Update the request status
        const newStatus = action === 'approve' ? 'Approved' : 'Not Approved';
        const updateQuery = `
            UPDATE resetrequests 
            SET approved = ?, reseted_by = ?
            WHERE id = ?
        `;
        const updateParams = [newStatus, adminUsername, requestId];

        const [result] = await connection.query(updateQuery, updateParams);

        if (result.affectedRows > 0) {
            // Fetch the updated request
            const [updatedRequest] = await connection.query('SELECT * FROM resetrequests WHERE id = ?', [requestId]);

            // Format the time for the updated request
            const formattedRequest = {
                ...updatedRequest[0],
                time: updatedRequest[0].time ? moment(updatedRequest[0].time).tz('Asia/Kolkata').format('DD/MM/YYYY HH:mm:ss') : null
            };

            return res.status(200).json({
                message: action === 'approve' ? "Request approved successfully" : "Request rejected",
                request: formattedRequest
            });
        } else {
            return res.status(500).json({ message: "Failed to update request status" });
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

exports.getRequestData = async (req, res) => {
    const centerId = req.session.centerId;

    if (!centerId) {
        return res.status(401).send('Unauthorized: No center ID in session');
    }

    try {
        // Fetch reset requests
        let fetchResetRequestsQuery = `
            SELECT * 
            FROM resetrequests
        `;

        // Uncomment the following line if you want to filter by center ID
        // fetchResetRequestsQuery += ' WHERE center_id = ?';

        fetchResetRequestsQuery += ' ORDER BY id DESC';

        // Uncomment the following line if you want to filter by center ID
        // const [resetRequests] = await connection.query(fetchResetRequestsQuery, [centerId]);

        // Use this line if you're not filtering by center ID
        const [resetRequests] = await connection.query(fetchResetRequestsQuery);

        if (resetRequests.length === 0) {
            return res.status(404).json({ message: "No reset requests found" });
        }

        // Format the time for each request
        const formattedRequests = resetRequests.map(request => ({
            ...request,
            time: request.time ? moment(request.time).tz('Asia/Kolkata').format('DD/MM/YYYY HH:mm:ss') : null
        }));

        res.json(formattedRequests);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }

};
const formatDate = (date) => {
    if (!date) return null;
    return moment(date).tz('Asia/Kolkata').format('DD/MM/YYYY hh:mm:ss A')
}
exports.getStudentData = async (req, res) => {

    const { student_id } = req.body;
    console.log(student_id);
    try {
        let studentQuery = `select student_id , base64 , batchNo , center , batchdate , fullname from students where student_id = ?`;
        let shorthandPassageQuery = `select tl.texta AS passage_a_log , tl.textb as passage_b_log , tl.mina , tl.minb , fps.passageA  AS final_passageA ,fps.passageB  AS final_passageB FROM 
                                       students s
                                       LEFT JOIN textlogs tl ON s.student_id = tl.student_id
                                       LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
                                       where s.student_id = ?;`;
        let typingPassageQuery = `select tpl.passage AS typing_passage_log ,tp.passage AS final_typing_passage,tpl.time FROM 
                                       students s
                                       LEFT JOIN typingpassagelogs tpl ON s.student_id = tpl.student_id
                                       LEFT JOIN typingpassage tp ON s.student_id = tp.student_id
                                       where s.student_id = ?;`
        let audioLogsQuery = `select trial , passageA , passageB from audiologs where student_id = ?`
        let examStagesQuery = `select * from exam_stages where StudentId = ?`
        let studentLogsQuery = `select * from studentlogs where student_id = ?`

        const [shorthandPassage] = await connection.query(shorthandPassageQuery, [student_id]);
        const [studentResults] = await connection.query(studentQuery, [student_id]);
        const [typingPassage] = await connection.query(typingPassageQuery, [student_id]);
        const [audioLogs] = await connection.query(audioLogsQuery, [student_id]);
        const [examStages] = await connection.query(examStagesQuery, [student_id]);
        const [studentLogs] = await connection.query(studentLogsQuery, [student_id]);
        // console.log(results);
        if (studentResults.length === 0) {
            return res.status(404).json({ "Message": "No Student Found for this id!!!" })
        }
        console.log(studentLogs);
        studentLogs[0].loginTime = formatDate(studentLogs[0].loginTime);
        studentLogs[0].trial_time = formatDate(studentLogs[0].trial_time);
        studentLogs[0].audio1_time = formatDate(studentLogs[0].audio1_time);
        studentLogs[0].passage1_time = formatDate(studentLogs[0].passage1_time);
        studentLogs[0].audio2_time = formatDate(studentLogs[0].audio2_time);
        studentLogs[0].passage2_time = formatDate(studentLogs[0].passage2_time);
        studentLogs[0].trial_passage_time = formatDate(studentLogs[0].trial_passage_time);
        studentLogs[0].typing_passage_time = formatDate(studentLogs[0].typing_passage_time);
        studentLogs[0].feedback_time = formatDate(studentLogs[0].feedback_time);


        studentResults[0].batchdate = formatDate(studentResults[0].batchdate);
        typingPassage[0].time = formatDate(typingPassage[0].time);
        res.status(201).json({ shorthandPassage, typingPassage, studentResults, audioLogs, examStages, studentLogs });
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).send('Internal server error');
    }

}

exports.getAttendaceReports = async (req, res) => {
    const { center, batch } = req.query;
    try {
        let queryParams = []
        let filter = "";
        if (center) {
            filter += " AND center = ?";
            queryParams.push(center);
        }
        if (batch) {
            filter += " AND batchNo = ?"
            queryParams.push(batch);
        }
        let query = `select * from attendance_reports where 1=1 ${filter} ORDER BY center `
        console.log(query);

        const [reports] = await connection.query(query,queryParams);

        if(reports.length === 0) {
           return res.status(404).json({"message":"Attendance reports not uploaded yet!!"});
        }
        res.status(201).json({"message":"Attendance reports fetched successfully!!",attendance_reports:reports});
        
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).send('Internal server error');
    }
}