const { decrypt } = require('./config/encrypt');
const connection = require('./config/db1');
require('dotenv').config();

async function checkPasswords() {
    try {
        const batch = 101;
        console.log(`Checking controller passwords for Batch: ${batch}`);

        const [batchControllers] = await connection.query(
            'SELECT * FROM controllerdb WHERE batchNo = ?',
            [batch]
        );

        if (batchControllers.length === 0) {
            console.log('No controllers found for batch 101.');
        } else {
            console.log('\nStrict Password Check (Decrypted):');
            console.log('--------------------------------------------------');
            console.log('Center | Dept | Encrypted (Prefix) | Decrypted');
            console.log('--------------------------------------------------');

            batchControllers.forEach(c => {
                let decryptedPass = '[Error]';
                try {
                    if (c.controller_pass) {
                        decryptedPass = decrypt(c.controller_pass);
                    } else {
                        decryptedPass = '[NULL]';
                    }
                } catch (e) {
                    decryptedPass = `[Failed: ${e.message}]`;
                }
                const encPrefix = c.controller_pass ? c.controller_pass.substring(0, 10) + '...' : 'NULL';
                console.log(`${c.center}   | ${c.departmentId}   | ${encPrefix} | ${decryptedPass}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkPasswords();
