const connection = require('./config/db1');
require('dotenv').config();

async function checkControllerBatch101() {
    // Connection is already a pool from db1.js, so we can use it directly or get a connection from it.
    // However, db1.js exports the pool directly which supports .query()
    // No need to create connection here.


    try {
        const batch = 101;

        console.log(`Checking controller for Batch: ${batch}`);

        // List all controllers for this batch
        console.log(`\nAll controllers for Batch ${batch}:`);
        const [batchControllers] = await connection.query(
            'SELECT * FROM controllerdb WHERE batchNo = ?',
            [batch]
        );

        if (batchControllers.length === 0) {
            console.log('No controllers found for batch 101.');
        } else {
            console.table(batchControllers);

            // Explicitly logging passwords 
            console.log('\nStrict Password Check:');
            batchControllers.forEach(c => {
                console.log(`Center: ${c.center}, Dept: ${c.departmentId}, Password: ${c.controller_pass}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkControllerBatch101();
