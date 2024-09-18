
const connection = require('../config/db1');

const xl = require('excel4node');

const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;

const { encrypt, decrypt } =require('../config/encrypt');
const { request } = require('http');

exports.loginadmin= async (req, res) => {
    console.log("Trying admin login");
    const { userId, password } = req.body;
    console.log(userId,password)
  
    const query1 = 'SELECT * FROM admindb WHERE adminid = ?';
  
    try {
        const [results] = await connection.query(query1, [userId]);
        if (results.length > 0) {
            const admin = results[0];
            console.log(admin);
            let decryptedStoredPassword;
            try {
                decryptedStoredPassword = (admin.password);
                console.log(`Decrypted stored password: '${decryptedStoredPassword}'`);   
            } catch (error) {
                console.error('Error decrypting stored password:', error);
                res.status(500).send('Error decrypting stored password');
                return;
            }

            // Ensure both passwords are treated as strings
            const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
            const providedPasswordStr = String(password).trim();
         
            if (decryptedStoredPasswordStr === providedPasswordStr) {
                // Set institute session
                req.session.adminid = admin.adminid;
                res.send('Logged in successfully as an admin!');
            } else {
                res.status(401).send('Invalid credentials for admin');
            }
        } else {
            res.status(404).send('admin not found');
        }
    } catch (err) {
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


