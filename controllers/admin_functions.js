
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

  exports.fetchTableData = async (req, res) => {
    console.log("Fetching table data for admin");
    const { tableName } = req.body;
    const adminId = req.session.adminid;

    if (!adminId) {
        return res.status(401).send('Unauthorized: Admin not logged in');
    }

    const query = `SELECT * FROM ${tableName}`;

    try {
        const [results] = await connection.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error fetching table data:', err);
        if (err.code === 'ER_NO_SUCH_TABLE') {
            res.status(404).send('Table not found');
        } else {
            res.status(500).send('Error fetching table data');
        }
    }
};exports.fetchTableNames = async (req, res) => {
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


