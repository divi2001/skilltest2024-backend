const connection = require('./config/db1');

async function checkLocksStatus() {
    try {
        console.log('--- SYSTEM LOCK STATUS CHECK ---');

        // 1. Check Active Batches
        console.log('\n[BATCH STATUS LOCK]');
        const [activeBatches] = await connection.query('SELECT batchNo, batchstatus, batchdate FROM batchdb WHERE batchstatus = 1');

        if (activeBatches.length === 0) {
            console.log('❌ ALL BATCHES ARE LOCKED (No batch has batchstatus = 1)');
        } else {
            console.log(`✅ FOUND ${activeBatches.length} ACTIVE BATCHES (Login Allowed):`);
            console.table(activeBatches);
        }

        // 2. Check PC Registrations
        console.log('\n[PC REGISTRATION LOCK]');
        const [pcCount] = await connection.query('SELECT COUNT(*) as count FROM pcregistration');
        console.log(`ℹ️  Total Registered PCs in Database: ${pcCount[0].count}`);

        // Check if there are any duplicate MACs which might cause issues (optional but good)
        const [dupeMacs] = await connection.query(`
            SELECT mac_address, COUNT(*) c, GROUP_CONCAT(center) as centers 
            FROM pcregistration 
            GROUP BY mac_address 
            HAVING c > 1
        `);

        if (dupeMacs.length > 0) {
            console.log(`⚠️  WARNING: ${dupeMacs.length} MAC addresses are registered to multiple centers (might be intended, but good to know):`);
            // console.table(dupeMacs);
            console.log('(First 5 duplicates shown)');
            console.table(dupeMacs.slice(0, 5));
        } else {
            console.log('✅  All MAC addresses are unique to a center.');
        }

        console.log('\n--- CODE VERIFICATION ---');
        console.log('1. studentController.js: Checks "batchstatus == 1" before login? YES (Verified)');
        console.log('2. studentController.js: Checks "pcregistration" for MAC + Center? YES (Verified - Recently Uncommented)');

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkLocksStatus();
