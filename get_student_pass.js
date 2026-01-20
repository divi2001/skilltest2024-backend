const connection = require('./config/db1');
const { decrypt } = require('./config/encrypt');

async function getDecryptedPassword() {
    const studentId = '5352616093';

    try {
        const query = 'SELECT password FROM students WHERE student_id = ?';
        const [rows] = await connection.query(query, [studentId]);

        if (rows.length === 0) {
            console.log(`Student ${studentId} not found.`);
            process.exit(0);
        }

        const encryptedPassword = rows[0].password;
        console.log('Encrypted Password:', encryptedPassword);

        try {
            const decryptedPassword = decrypt(encryptedPassword);
            console.log('\n-----------------------------------');
            console.log(`DECRYPTED PASSWORD: ${decryptedPassword}`);
            console.log('-----------------------------------\n');
        } catch (decryptError) {
            console.error('Decryption failed:', decryptError.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Database error:', err);
        process.exit(1);
    }
}

getDecryptedPassword();
