const { encrypt, decrypt } = require('./config/encrypt');
const connection = require('./config/db1');
require('dotenv').config();

async function updateDepartmentPassword() {
    try {
        const deptId = 10;
        const newPassword = 'GCCSH@Jan26';

        console.log(`Updating password for Department ID: ${deptId}`);
        console.log(`New Password (Plain): ${newPassword}`);

        // 1. Encrypt the new password
        const encryptedPassword = encrypt(newPassword);
        console.log(`New Password (Encrypted): ${encryptedPassword}`);

        // 2. Update the database
        const [result] = await connection.query(
            'UPDATE departmentdb SET departmentPassword = ? WHERE departmentId = ?',
            [encryptedPassword, deptId]
        );

        console.log(`Update Result: Changed ${result.changedRows} rows.`);

        // 3. Verify
        console.log('\n--- Verifying Update ---');
        const [rows] = await connection.query(
            'SELECT departmentPassword FROM departmentdb WHERE departmentId = ?',
            [deptId]
        );

        if (rows.length > 0) {
            const storedEncrypted = rows[0].departmentPassword;
            const storedDecrypted = decrypt(storedEncrypted);
            console.log(`Stored Encrypted: ${storedEncrypted}`);
            console.log(`Stored Decrypted: ${storedDecrypted}`);

            if (storedDecrypted === newPassword) {
                console.log('SUCCESS: Password updated and verified correctly.');
            } else {
                console.log('FAILURE: Decrypted password does not match original.');
            }
        } else {
            console.log('Error: Could not retrieve record for verification.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

updateDepartmentPassword();
