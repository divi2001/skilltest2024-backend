const mysql = require('mysql2/promise');
const { encrypt } = require('./config/encrypt');
require('dotenv').config();

async function updateBatch100Passwords() {
    console.log('Starting password update for batch 100...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        const batchNo = 100;
        const newPasswordPlain = 'mock';
        const newPasswordEncrypted = encrypt(newPasswordPlain);

        console.log(`Target Batch: ${batchNo}`);
        console.log(`New Password (Plain): ${newPasswordPlain}`);
        console.log(`New Password (Encrypted): ${newPasswordEncrypted}`);

        // First, let's see how many records we are targeting
        const [rows] = await connection.query(
            'SELECT * FROM controllerdb WHERE batchNo = ?',
            [batchNo]
        );

        console.log(`Found ${rows.length} records for batch ${batchNo}.`);

        if (rows.length === 0) {
            console.log('No records found to update.');
            return;
        }

        // Update queries
        const [result] = await connection.query(
            'UPDATE controllerdb SET controller_pass = ? WHERE batchNo = ?',
            [newPasswordEncrypted, batchNo]
        );

        console.log(`Successfully updated ${result.affectedRows} records.`);

        // Verify one of them
        const [check] = await connection.query(
            'SELECT controller_pass FROM controllerdb WHERE batchNo = ? LIMIT 1',
            [batchNo]
        );

        if (check.length > 0) {
            console.log('Verification check - Sample updated password:', check[0].controller_pass);
        }

    } catch (err) {
        console.error('Error updating passwords:', err);
    } finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}

updateBatch100Passwords();
