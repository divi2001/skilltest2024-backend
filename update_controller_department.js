const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateControllerDepartment() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log('Checking for records with departmentId 6...');
        const [records] = await connection.query('SELECT * FROM controllerdb WHERE departmentId = 6');
        console.log(`Found ${records.length} records with departmentId 6.`);

        if (records.length > 0) {
            console.log('Updating departmentId from 6 to 10...');
            const [result] = await connection.query(
                'UPDATE controllerdb SET departmentId = 10 WHERE departmentId = 6'
            );
            console.log(`Updated ${result.affectedRows} rows.`);
        } else {
            console.log('No records found to update.');
        }

        // Verify the update
        console.log('\nVerifying records for Center 1251, Batch 100, Department 10:');
        const [updatedRecords] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = 1251 AND batchNo = 100 AND departmentId = 10'
        );
        console.table(updatedRecords);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

updateControllerDepartment();
