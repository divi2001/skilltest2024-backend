const mysql = require('mysql2/promise');
const { encrypt } = require('./config/encrypt');
require('dotenv').config();

function generateUniquePassword(usedPasswords) {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let password;
    do {
        // Shuffle and pick 6 digits
        const shuffled = digits.sort(() => Math.random() - 0.5);
        password = shuffled.slice(0, 6).join('');
    } while (usedPasswords.has(password));
    usedPasswords.add(password);
    return password;
}

async function syncAllControllers(dryRun = false) {
    console.log(`Starting synchronization for ALL batches and departments... ${dryRun ? '[DRY RUN]' : '[LIVE]'}`);

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        const usedPasswords = new Set();

        // 1. Get all valid centers from examcenterdb
        console.log('Fetching all centers from examcenterdb...');
        const [allCentersRows] = await connection.query('SELECT center, center_name FROM examcenterdb');
        const allCentersMap = new Map();
        allCentersRows.forEach(r => allCentersMap.set(r.center, r.center_name));
        console.log(`Total centers in examcenterdb: ${allCentersMap.size}`);

        // 2. Get all batches from batchdb
        console.log('Fetching all batches from batchdb...');
        const [allBatches] = await connection.query('SELECT departmentId, batchNo FROM batchdb ORDER BY departmentId, batchNo');
        console.log(`Total batches in batchdb: ${allBatches.length}`);

        let totalInserted = 0;
        let totalSkipped = 0;

        // 3. Loop through every batch x center combination
        for (const { departmentId, batchNo } of allBatches) {
            // Get existing controllers for this batch+dept
            const [existingRows] = await connection.query(
                'SELECT center FROM controllerdb WHERE batchNo = ? AND departmentId = ?',
                [batchNo, departmentId]
            );
            const existingCenters = new Set(existingRows.map(r => r.center));

            const missingCenters = [];
            for (const [center, name] of allCentersMap) {
                if (!existingCenters.has(center)) {
                    missingCenters.push({ center, name });
                }
            }

            if (missingCenters.length === 0) {
                console.log(`  [dept ${departmentId} batch ${batchNo}] All centers already have controllers. Skipping.`);
                totalSkipped += allCentersMap.size;
                continue;
            }

            console.log(`  [dept ${departmentId} batch ${batchNo}] ${dryRun ? 'Would insert' : 'Inserting'} ${missingCenters.length} controllers...`);

            for (const { center, name } of missingCenters) {
                // batch 100 uses 'mock', all others get unique 6-digit password
                const plainPassword = batchNo === 100 ? 'mock' : generateUniquePassword(usedPasswords);
                const encryptedPassword = encrypt(plainPassword);

                console.log(`    center=${center} | batch=${batchNo} | dept=${departmentId} | pass_plain=${plainPassword} | pass_encrypted=${encryptedPassword.substring(0, 20)}...`);

                if (!dryRun) {
                    try {
                        await connection.query(
                            `INSERT INTO controllerdb 
                            (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                center,
                                batchNo,
                                departmentId,
                                center,
                                `Controller ${name}`,
                                9999999999,
                                `controller${center}@example.com`,
                                encryptedPassword,
                                'Auto-Generated'
                            ]
                        );
                        totalInserted++;
                    } catch (insertErr) {
                        console.error(`    Failed center ${center} [dept ${departmentId} batch ${batchNo}]:`, insertErr.message);
                    }
                } else {
                    totalInserted++;
                }
            }
        }

        console.log(`\n${dryRun ? '✅ Dry Run Complete!' : '✅ Sync Complete!'}`);
        console.log(`   ${dryRun ? 'Would insert' : 'Inserted'}: ${totalInserted}`);
        console.log(`   Skipped (already existed): ${totalSkipped}`);

        if (!dryRun) {
            const [finalCount] = await connection.query('SELECT COUNT(*) as count FROM controllerdb');
            console.log(`   Total controllers in DB: ${finalCount[0].count}`);
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await connection.end();
    }
}

// Change to false to actually insert
syncAllControllers(false);

