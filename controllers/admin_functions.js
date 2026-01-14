const connection = require('../config/db1');
const moment = require('moment-timezone');
const { encrypt, decrypt } = require('../config/encrypt');
const mysql = require('mysql2/promise');
// exports.loginadmin = async (req, res) => {
//     const { userId, password } = req.body;
//     console.log('Login attempt - UserID:', userId);

//     const query1 = 'SELECT * FROM admindb WHERE adminid = ?';

//     try {
//         const [results] = await connection.query(query1, [userId]);
//         console.log(results);

//         if (results.length > 0) {
//             const admin = results[0];
//             console.log('Admin found in database:', admin.adminid);

//             // Direct comparison since database has plain text password
//             const storedPassword = admin.password;

//             console.log('Stored password:', storedPassword);
//             const storedDecryptedPassword = decrypt(storedPassword);
//             console.log('Provided password:', password);

//             if (storedDecryptedPassword === password) {
//                 console.log('Login successful for admin:', admin.adminid);
//                 req.session.adminid = admin.adminid;
//                 res.send('Logged in successfully as an admin!');
//             } else {
//                 console.log('Password mismatch for admin:', admin.adminid);
//                 res.status(401).send('Invalid credentials for admin');
//             }
//         } else {
//             console.log('Admin ID not found:', userId);
//             res.status(404).send('admin not found');
//         }
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).send(err.message);
//     }
// };


exports.loginadmin = async (req, res) => {
    const { userId, password } = req.body;
    console.log('Login attempt - UserID:', userId);

    const query1 = 'SELECT * FROM admindb WHERE adminid = ?';

    try {
        const [results] = await connection.query(query1, [userId]);
        console.log(results);

        if (results.length > 0) {
            const admin = results[0];
            console.log('Admin found in database:', admin.adminid);

            // Direct plain-text password comparison
            const storedPassword = admin.password;
            console.log('Stored password:', storedPassword);
            console.log('Provided password:', password);

            if (storedPassword === password) {
                console.log('✅ Login successful for admin:', admin.adminid);
                req.session.adminid = admin.adminid;
                res.send('Logged in successfully as an admin!');
            } else {
                console.log('❌ Password mismatch for admin:', admin.adminid);
                res.status(401).send('Invalid credentials for admin');
            }
        } else {
            console.log('⚠️ Admin ID not found:', userId);
            res.status(404).send('Admin not found');
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send(err.message);
    }
};


exports.fetchTableData = async (req, res) => {
    const { tableName } = req.body;

    try {
        // Validate table name to prevent SQL injection
        if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        // Fetch table data
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);

        // DECRYPT SENSITIVE DATA for departmentdb
        if (tableName === 'departmentdb') {
            rows.forEach(row => {
                if (row.departmentPassword) {
                    try {
                        // Only attempt decrypt if it looks like our format
                        if (row.departmentPassword.includes(':')) {
                            row.departmentPassword = decrypt(row.departmentPassword);
                        }
                    } catch (e) {
                        // Ignore decryption errors, display safe or original
                        // console.error('Decryption failed for row', row.departmentId);
                    }
                }
            });
        }

        // ✅ NEW: Fetch primary key(s) for the table
        const [primaryKeyRows] = await connection.query(
            `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND CONSTRAINT_NAME = 'PRIMARY'
       ORDER BY ORDINAL_POSITION`,
            [tableName]
        );

        // Extract primary key column name(s)
        const primaryKeys = primaryKeyRows.map(row => row.COLUMN_NAME);
        const primaryKey = primaryKeys.length > 0 ? primaryKeys[0] : null;

        // If composite key, return all keys
        const compositePrimaryKeys = primaryKeys.length > 1 ? primaryKeys : null;

        console.log(`Table: ${tableName}, Primary Key: ${primaryKey || 'None found'}`);

        // ✅ CHANGED: Return data with primary key information
        res.json({
            success: true,
            data: rows,
            primaryKey: primaryKey,  // ← Add this
            compositePrimaryKeys: compositePrimaryKeys,  // ← Add this
            metadata: {
                tableName: tableName,
                rowCount: rows.length
            }
        });

    } catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching table data',
            error: error.message
        });
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

    const conn = await connection.getConnection();
    try {
        await conn.beginTransaction();

        console.log(`[updateTableData] Processing ${updatedRows.length} rows for table: ${tableName}`);

        // Get detailed table information including primary key
        const [tableInfo] = await conn.query(`
            SELECT COLUMN_NAME, COLUMN_KEY, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ?
        `, [tableName]);

        if (tableInfo.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: `Table '${tableName}' not found`
            });
        }

        // Find primary key column
        const primaryKeyColumn = tableInfo.find(col => col.COLUMN_KEY === 'PRI');
        if (!primaryKeyColumn) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `No primary key found for table ${tableName}`
            });
        }

        const primaryKey = primaryKeyColumn.COLUMN_NAME;
        console.log(`[updateTableData] Using primary key: ${primaryKey}`);

        const results = [];
        let successfulUpdates = 0;

        for (const row of updatedRows) {
            console.log(`[updateTableData] Processing row:`, row);

            // Check if primary key exists in the row data
            if (!row[primaryKey] && row[primaryKey] !== 0) {
                console.error(`[updateTableData] Missing primary key value for ${primaryKey}`);
                results.push({
                    success: false,
                    message: `Missing primary key value for ${primaryKey}`,
                    rowData: row
                });
                continue;
            }

            // Filter out temporary fields and primary key from update fields
            const updateFields = {};
            for (const [key, value] of Object.entries(row)) {
                // Skip temporary fields and primary key
                if (key === '_temp_id' || key === 'key' || key === primaryKey) {
                    continue;
                }

                // Check if column exists in table
                const columnExists = tableInfo.find(col => col.COLUMN_NAME === key);
                if (!columnExists) {
                    console.warn(`[updateTableData] Column ${key} not found in table, skipping`);
                    continue;
                }

                // Handle data type conversion
                if (value === null || value === 'NULL' || value === '') {
                    if (columnExists.IS_NULLABLE === 'NO') {
                        console.warn(`[updateTableData] Column ${key} is not nullable, skipping null value`);
                        continue;
                    }
                    updateFields[key] = null;
                } else if (columnExists.DATA_TYPE.includes('int')) {
                    updateFields[key] = parseInt(value) || 0;
                } else if (columnExists.DATA_TYPE.includes('decimal') || columnExists.DATA_TYPE.includes('float')) {
                    updateFields[key] = parseFloat(value) || 0.0;
                } else {
                    updateFields[key] = value;
                }
            }

            // Check if there are any fields to update
            if (Object.keys(updateFields).length === 0) {
                console.warn(`[updateTableData] No valid fields to update for ${primaryKey}=${row[primaryKey]}`);
                results.push({
                    success: false,
                    message: `No valid fields to update`,
                    primaryKey: row[primaryKey],
                    rowData: row
                });
                continue;
            }

            try {
                // Build dynamic UPDATE query
                const setClause = Object.keys(updateFields)
                    .map(col => `${col} = ?`)
                    .join(', ');

                const values = [
                    ...Object.values(updateFields),
                    row[primaryKey] // WHERE clause value
                ];

                const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = ?`;
                console.log(`[updateTableData] Executing: ${updateQuery}`, values);

                const [result] = await conn.query(updateQuery, values);

                if (result.affectedRows > 0) {
                    successfulUpdates++;
                    results.push({
                        success: true,
                        primaryKey: row[primaryKey],
                        affectedRows: result.affectedRows,
                        updatedColumns: Object.keys(updateFields)
                    });
                    console.log(`[updateTableData] Successfully updated ${primaryKey}=${row[primaryKey]}`);
                } else {
                    results.push({
                        success: false,
                        primaryKey: row[primaryKey],
                        message: 'No rows affected - record may not exist'
                    });
                    console.warn(`[updateTableData] No rows affected for ${primaryKey}=${row[primaryKey]}`);
                }

            } catch (error) {
                console.error(`[updateTableData] Update failed for ${primaryKey}=${row[primaryKey]}:`, error);
                results.push({
                    success: false,
                    primaryKey: row[primaryKey],
                    error: error.message,
                    sqlMessage: error.sqlMessage
                });
            }
        }

        // Check if any updates were successful
        if (successfulUpdates === 0) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: 'No records were updated',
                details: results
            });
        }

        await conn.commit();
        console.log(`[updateTableData] Successfully updated ${successfulUpdates} records`);

        return res.json({
            success: true,
            message: `Updated ${successfulUpdates} of ${updatedRows.length} records in ${tableName}`,
            results: results,
            summary: {
                total: updatedRows.length,
                successful: successfulUpdates,
                failed: updatedRows.length - successfulUpdates
            }
        });

    } catch (error) {
        console.error('[updateTableData] Transaction error:', error);
        await conn.rollback();
        return res.status(500).json({
            success: false,
            message: 'Database error during update',
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    } finally {
        conn.release();
        console.log('[updateTableData] Connection released');
    }
};

// NEW: Add Table Record (Create)
exports.addTableRecord = async (req, res) => {
    console.log("Adding new record to table");
    const adminId = req.session.adminid;

    if (!adminId) {
        return res.status(401).send('Unauthorized: Admin not logged in');
    }

    const { tableName, newRecord } = req.body;
    const MAX_IMAGE_SIZE = 50 * 1024; // 50KB

    if (!tableName || !newRecord) {
        return res.status(400).send('Invalid request: tableName and newRecord are required');
    }

    try {
        // Validate table exists
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        if (!tableNames.includes(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        // Process and validate any base64 image data
        for (const [key, value] of Object.entries(newRecord)) {
            if (typeof value === 'string' && value.startsWith('data:image')) {
                // Calculate base64 string size
                const base64Size = Math.ceil((value.length * 3) / 4);

                if (base64Size > MAX_IMAGE_SIZE) {
                    return res.status(400).json({
                        success: false,
                        message: `Image size for field '${key}' exceeds maximum limit of 50KB. Current size: ${(base64Size / 1024).toFixed(2)}KB`
                    });
                }
            }
        }

        // Get table structure to handle auto-increment columns
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME, EXTRA 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
        `, [tableName]);

        // Filter out auto-increment columns from insert
        const filteredRecord = { ...newRecord };
        columns.forEach(col => {
            if (col.EXTRA.includes('auto_increment')) {
                delete filteredRecord[col.COLUMN_NAME];
            }
        });

        // Prepare columns and values
        const insertColumns = Object.keys(filteredRecord);
        const values = Object.values(filteredRecord);

        if (insertColumns.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid columns to insert'
            });
        }

        const placeholders = values.map(() => '?').join(', ');
        const query = `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`;

        const [result] = await connection.query(query, values);

        console.log("Record added successfully, ID:", result.insertId);

        res.status(200).json({
            success: true,
            message: 'Record added successfully',
            insertId: result.insertId
        });

    } catch (err) {
        console.error("Error adding record:", err);
        res.status(500).json({
            success: false,
            error: 'Failed to add record to DB',
            details: err.message
        });
    }
};

// NEW: Delete Table Record
exports.deleteTableRecord = async (req, res) => {
    console.log("Deleting record from table");
    const adminId = req.session.adminid;

    if (!adminId) {
        return res.status(401).send('Unauthorized: Admin not logged in');
    }

    const { tableName, rowData } = req.body;

    if (!tableName || !rowData) {
        return res.status(400).json({
            success: false,
            message: 'Table name and row data are required'
        });
    }

    try {
        // Validate table exists
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        if (!tableNames.includes(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        const conn = await connection.getConnection();

        try {
            // Get table structure to find primary key
            const [tableInfo] = await conn.query(`
                SELECT COLUMN_NAME, COLUMN_KEY 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
            `, [tableName]);

            if (tableInfo.length === 0) {
                conn.release();
                return res.status(404).json({
                    success: false,
                    message: 'Table not found'
                });
            }

            // Find primary key or use first column as fallback
            const primaryKeyColumn = tableInfo.find(col => col.COLUMN_KEY === 'PRI') || tableInfo[0];
            const primaryKey = primaryKeyColumn.COLUMN_NAME;

            if (!rowData[primaryKey]) {
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: `Missing primary key value for column: ${primaryKey}`
                });
            }

            // Delete the record
            const [result] = await conn.query(
                `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`,
                [rowData[primaryKey]]
            );

            conn.release();

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No matching record found to delete'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Record deleted successfully',
                affectedRows: result.affectedRows
            });

        } catch (dbError) {
            if (conn) conn.release();
            throw dbError;
        }

    } catch (err) {
        console.error('Delete operation failed:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete record',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.enhancedUpdateTableData = async (req, res) => {
    const { tableName, updates } = req.body;

    try {
        // Validate inputs
        if (!tableName || !updates || !Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request data'
            });
        }

        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        // ✅ NEW: Fetch primary key dynamically for the table
        const [primaryKeyRows] = await connection.query(
            `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND CONSTRAINT_NAME = 'PRIMARY'
       ORDER BY ORDINAL_POSITION`,
            [tableName]
        );

        if (primaryKeyRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: `No primary key found for table: ${tableName}`
            });
        }

        const primaryKeyColumn = primaryKeyRows[0].COLUMN_NAME;
        console.log(`Using primary key: ${primaryKeyColumn} for table: ${tableName}`);

        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Process each update
        for (const updateData of updates) {
            try {
                // ✅ CHANGED: Use dynamic primary key
                const primaryKeyValue = updateData[primaryKeyColumn];

                if (!primaryKeyValue && primaryKeyValue !== 0) {
                    results.push({
                        success: false,
                        error: `Missing primary key value: ${primaryKeyColumn}`,
                        data: updateData
                    });
                    failCount++;
                    continue;
                }

                // Build UPDATE query dynamically
                const fieldsToUpdate = { ...updateData };
                delete fieldsToUpdate[primaryKeyColumn]; // Don't update primary key

                const setClause = Object.keys(fieldsToUpdate)
                    .map(key => `\`${key}\` = ?`)
                    .join(', ');

                const values = [...Object.values(fieldsToUpdate), primaryKeyValue];

                const updateQuery = `
          UPDATE \`${tableName}\` 
          SET ${setClause} 
          WHERE \`${primaryKeyColumn}\` = ?
        `;

                console.log('Executing update:', updateQuery);
                console.log('Values:', values);

                const [result] = await connection.query(updateQuery, values);

                if (result.affectedRows > 0) {
                    results.push({
                        success: true,
                        primaryKey: primaryKeyColumn,
                        primaryKeyValue: primaryKeyValue,
                        affectedRows: result.affectedRows
                    });
                    successCount++;
                } else {
                    results.push({
                        success: false,
                        error: 'No rows affected - record may not exist',
                        primaryKey: primaryKeyColumn,
                        primaryKeyValue: primaryKeyValue
                    });
                    failCount++;
                }

            } catch (updateError) {
                console.error('Update error for record:', updateError);
                results.push({
                    success: false,
                    error: updateError.message,
                    data: updateData
                });
                failCount++;
            }
        }

        // Determine response status
        if (failCount === 0) {
            res.json({
                success: true,
                message: `All ${successCount} updates completed successfully`,
                results: results
            });
        } else if (successCount === 0) {
            res.status(400).json({
                success: false,
                message: `All ${failCount} updates failed`,
                results: results
            });
        } else {
            res.status(207).json({
                success: false,
                message: `${successCount} of ${updates.length} updates succeeded, ${failCount} failed`,
                results: results
            });
        }

    } catch (error) {
        console.error('Error in enhanced update:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating table data',
            error: error.message
        });
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
                time: updatedRequest[0].time ? moment(updatedRequest[0].time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null
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
            time: request.time ? moment(request.time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null
        }));

        res.json(formattedRequests);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }

};
const formatDate = (date) => {
    if (!date) return null;
    return moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD hh:mm:ss A')
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

        // Handle typingPassage query separately with error handling
        let typingPassage = [];
        try {
            const [typingPassageResult] = await connection.query(typingPassageQuery, [student_id]);
            typingPassage = typingPassageResult;
        } catch (typingError) {
            console.log('Typing passage query failed, ignoring:', typingError.message);
            // typingPassage remains empty array
        }

        const [audioLogs] = await connection.query(audioLogsQuery, [student_id]);
        const [examStages] = await connection.query(examStagesQuery, [student_id]);
        const [studentLogs] = await connection.query(studentLogsQuery, [student_id]);

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

        // Only format time if typingPassage has data
        if (typingPassage.length > 0 && typingPassage[0].time) {
            typingPassage[0].time = formatDate(typingPassage[0].time);
        }

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

        const [reports] = await connection.query(query, queryParams);

        if (reports.length === 0) {
            return res.status(404).json({ "message": "Attendance reports not uploaded yet!!" });
        }
        res.status(201).json({ "message": "Attendance reports fetched successfully!!", attendance_reports: reports });

    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).send('Internal server error');
    }
}