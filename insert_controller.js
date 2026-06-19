const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertController() {
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

        console.log(`Checking for existing controller...`);
        const [existing] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ? AND departmentId = ?',
            [center, batch, department]
        );

        if (existing.length > 0) {
            console.log('Controller already exists. Updating password to "12345"...');
            await connection.query(
                'UPDATE controllerdb SET controller_pass = ? WHERE center = ? AND batchNo = ? AND departmentId = ?',
                ['12345', center, batch, department]
            );
            console.log('Controller updated.');
        } else {
            console.log('Inserting new controller record...');
            const insertQuery = `
                INSERT INTO controllerdb 
                (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.query(insertQuery, [
                center,
                batch,
                department,
                1001, // dummy controller_code
                'Test Controller',
                9999999999,
                'controller@example.com',
                '12345', // Plain text password "12345"
                'Test District'
            ]);
            console.log('Controller inserted successfully.');
        }

        // Verify insertion
        const [controllers] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ? AND departmentId = ?',
            [center, batch, department]
        );
        console.log('Current Record:', controllers[0]);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

insertController();
