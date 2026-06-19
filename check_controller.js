const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkController() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        const center = 1251;
        const batch = 100;
        const department = 10;

        console.log(`Checking controller for Center: ${center}, Batch: ${batch}, Department: ${department}`);

        // Check specific record
        const [controllers] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ? AND departmentId = ?',
            [center, batch, department]
        );

        if (controllers.length > 0) {
            console.log('Controller Found:', controllers[0]);
        } else {
            console.log('Controller NOT Found.');
        }

        // List all controllers for this center
        console.log(`\nAll controllers for Center ${center}:`);
        const [allControllers] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = ?',
            [center]
        );
        console.table(allControllers);

        // List all controllers for this center and batch
        console.log(`\nAll controllers for Center ${center} and Batch ${batch}:`);
        const [batchControllers] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ?',
            [center, batch]
        );
        console.table(batchControllers);


    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkController();
