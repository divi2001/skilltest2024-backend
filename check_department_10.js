const { decrypt } = require('./config/encrypt');
const connection = require('./config/db1');
require('dotenv').config();

async function checkDepartment10() {
    try {
        const deptId = 10;
        console.log(`Checking departmentdb for departmentId: ${deptId}`);

        const [rows] = await connection.query(
            'SELECT * FROM departmentdb WHERE departmentId = ?',
            [deptId]
        );

        if (rows.length === 0) {
            console.log('No department found with ID 10.');
        } else {
            console.log('Department Record:', rows[0]);
            const dept = rows[0];

            // Check for potential password columns (containing 'pass' or just print commonly used ones)
            // Also printing all keys to be sure
            console.log('\n--- Column Details ---');
            Object.keys(dept).forEach(key => {
                const val = dept[key];
                // simple heuristic to identify password fields
                if (key.toLowerCase().includes('pass') || key.toLowerCase().includes('pwd')) {
                    console.log(`Possible Password Field [${key}]: ${val}`);
                    try {
                        const decrypted = decrypt(val);
                        console.log(`   -> Decrypted: ${decrypted}`);
                    } catch (e) {
                        console.log(`   -> Plain/Failed: ${val} (Error: ${e.message})`);
                    }
                }
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        // connection is a pool, end it
        await connection.end();
    }
}

checkDepartment10();
