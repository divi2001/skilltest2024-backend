const mysql = require('mysql2/promise');
const { encrypt } = require('./config/encrypt');
require('dotenv').config();

async function syncBatch100Controllers() {
    console.log('Starting synchronization for Batch 100 Controller Passwords...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        const batchNo = 100;
        const departmentId = 10;
        const passwordPlain = 'mock';
        const passwordEncrypted = encrypt(passwordPlain);

        // 1. Get all valid centers from examcenterdb
        console.log('Fetching all centers from examcenterdb...');
        const [allCentersRows] = await connection.query('SELECT center, center_name FROM examcenterdb');
        const allCentersMap = new Map();
        allCentersRows.forEach(r => allCentersMap.set(r.center, r.center_name));
        console.log(`Total centers in examcenterdb: ${allCentersMap.size}`);

        // 2. Get existing controllers for batch 100
        console.log(`Fetching existing controllers for batch ${batchNo}, department ${departmentId}...`);
        const [existingRows] = await connection.query(
            'SELECT center FROM controllerdb WHERE batchNo = ? AND departmentId = ?',
            [batchNo, departmentId]
        );
        const existingCenters = new Set(existingRows.map(r => r.center));
        console.log(`Existing controllers for batch 100: ${existingCenters.size}`);

        // 3. Identify missing centers
        const missingCenters = [];
        for (const [center, name] of allCentersMap) {
            if (!existingCenters.has(center)) {
                missingCenters.push({ center, name });
            }
        }

        console.log(`Found ${missingCenters.length} centers missing for batch 100.`);

        if (missingCenters.length === 0) {
            console.log('No missing controllers found. All centers have records for batch 100.');
            return;
        }

        // 4. Insert missing records
        console.log('Inserting missing records...');
        let insertedCount = 0;

        // Prepare bulk insert or loop. Loop is safer for error handling per row, though slower. given ~40 centers, loop is fine.
        for (const missing of missingCenters) {
            const { center, name } = missing;

            // Construct dummy/default values
            const controllerCode = parseInt(`${center}`); // Use center code as controller code
            const controllerName = `Controller ${center}`; // Simple name
            const controllerContact = 9999999999; // Dummy contact
            const controllerEmail = `controller${center}@example.com`; // Unique dummy email
            const district = 'Auto-Generated';

            try {
                await connection.query(
                    `INSERT INTO controllerdb 
                    (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        center,
                        batchNo,
                        departmentId,
                        controllerCode,
                        controllerName,
                        controllerContact,
                        controllerEmail,
                        passwordEncrypted,
                        district
                    ]
                );
                // console.log(`Inserted controller for center ${center} (${name})`);
                insertedCount++;
            } catch (insertErr) {
                console.error(`Failed to insert center ${center}:`, insertErr.message);
            }
        }

        console.log(`\nOperation Complete. Successfully inserted ${insertedCount} new controller records.`);

        // 5. Verify total count now
        const [finalCount] = await connection.query(
            'SELECT COUNT(*) as count FROM controllerdb WHERE batchNo = ? AND departmentId = ?',
            [batchNo, departmentId]
        );
        console.log(`Total controller records for batch 100 now: ${finalCount[0].count}`);

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await connection.end();
    }
}

syncBatch100Controllers();
