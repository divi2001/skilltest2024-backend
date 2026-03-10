 const mysql = require('mysql2/promise');
const { encrypt } = require('./config/encrypt');
require('dotenv').config();

// Generate a random 6-digit password using digits 1-9, no repetition
function generatePassword() {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    // Shuffle and pick first 6
    for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 6).join('');
}

async function updatePasswordsExceptBatch100() {
    console.log('Starting password update for all batches EXCEPT batch 100...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        // Fetch all controllers except batch 100
        const [rows] = await connection.query(
            'SELECT center, batchNo, departmentId, controller_name FROM controllerdb WHERE batchNo != ?',
            [100]
        );

        console.log(`Found ${rows.length} controller records (excluding batch 100).\n`);

        if (rows.length === 0) {
            console.log('No records found to update.');
            return;
        }

        let updated = 0;

        for (const row of rows) {
            const plainPassword = generatePassword();
            const encryptedPassword = encrypt(plainPassword);

            await connection.query(
                'UPDATE controllerdb SET controller_pass = ? WHERE center = ? AND batchNo = ? AND departmentId = ?',
                [encryptedPassword, row.center, row.batchNo, row.departmentId]
            );

            console.log(`Updated: Center=${row.center}, Batch=${row.batchNo}, Dept=${row.departmentId}, Name=${row.controller_name}, NewPass=${plainPassword}`);
            updated++;
        }

        console.log(`\nSuccessfully updated ${updated} controller passwords.`);
        console.log('Batch 100 controllers were NOT touched.');

    } catch (err) {
        console.error('Error updating passwords:', err);
    } finally {
        await connection.end();
        console.log('Database connection closed.');
    }
}

updatePasswordsExceptBatch100();
