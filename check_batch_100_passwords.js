const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkBatch100Passwords() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('Connected to database.');

        // Query for batch 100
        const batchNo = 100;
        console.log(`Querying query for batchNo: ${batchNo}...`);

        const [rows] = await connection.query(
            'SELECT * FROM controllerdb WHERE batchNo = ?',
            [batchNo]
        );

        console.log(`Found ${rows.length} records for batch ${batchNo}.`);

        console.log('\n--- Checking for potential invalid passwords (no colon / plain text) ---');
        const invalidPass = rows.filter(r => r.controller_pass && !r.controller_pass.includes(':'));

        if (invalidPass.length > 0) {
            console.log(`Found ${invalidPass.length} records with potentially unencrypted passwords:`);
            invalidPass.forEach(r => {
                console.log(`[INVALID] Center: ${r.center}, Batch: ${r.batchNo}, Dept: ${r.departmentId}, Pass: '${r.controller_pass}'`);
            });
        } else {
            console.log('All 17 passwords appear to be in encrypted format (contain ":").');
        }

        console.log('\n--- All records for batch 100 (Center | Dept | Email | Password Start) ---');
        rows.forEach(r => {
            const passPreview = r.controller_pass ? r.controller_pass.substring(0, 20) + '...' : 'NULL';
            console.log(`Center: ${r.center}, Dept: ${r.departmentId}, Email: ${r.controller_email}, Pass: ${passPreview}`);
        });


    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkBatch100Passwords();
