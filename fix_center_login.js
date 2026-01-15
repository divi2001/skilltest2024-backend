const connection = require('./config/db1');
const { encrypt } = require('./config/encrypt');
require('dotenv').config();

async function resetCenterPassword() {
    const centerId = '1251';
    const plainPassword = '34139$259';

    console.log(`Resetting password for Center ID: ${centerId}`);

    try {
        // 1. Encrypt the password using the current SECRET_KEY
        const encryptedPassword = encrypt(plainPassword);
        console.log(`Encrypted password: ${encryptedPassword}`);

        // 2. Update the database
        const updateQuery = 'UPDATE examcenterdb SET centerpass = ? WHERE center = ?';
        const [result] = await connection.query(updateQuery, [encryptedPassword, centerId]);

        if (result.affectedRows > 0) {
            console.log(`✅ Success! Password updated for center ${centerId}.`);
        } else {
            console.log(`⚠️ Warning: No rows updated. Center ${centerId} might not exist.`);

            // Check if center exists
            const [check] = await connection.query('SELECT * FROM examcenterdb WHERE center = ?', [centerId]);
            if (check.length === 0) {
                console.log(`❌ Verified: Center ${centerId} does not exist in examcenterdb.`);
            }
        }

    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        process.exit();
    }
}

resetCenterPassword();
