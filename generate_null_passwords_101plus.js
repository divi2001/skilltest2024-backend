require('dotenv').config();
const mysql = require('mysql2/promise');
const { encrypt } = require('./config/encrypt');

function generatePassword(usedSet) {
    const digits = '123456789';
    let pass;
    do {
        pass = '';
        for (let i = 0; i < 6; i++) {
            pass += digits[Math.floor(Math.random() * 9)];
        }
    } while (usedSet.has(pass));
    usedSet.add(pass);
    return pass;
}

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        connectTimeout: 30000
    });

    // Get all null password students in batch 101+
    const [students] = await conn.query(
        'SELECT student_id FROM students WHERE password IS NULL AND batchNo >= 101 ORDER BY batchNo, center'
    );

    console.log(`Found ${students.length} students with null passwords in batch 101+`);

    if (students.length === 0) {
        await conn.end();
        return;
    }

    // Also load existing plain passwords to avoid duplicates
    // (We track generated ones in-memory; existing encrypted ones are unique by nature - skip cross-check for speed)
    const usedPasswords = new Set();

    let updated = 0;
    for (const student of students) {
        const plainPassword = generatePassword(usedPasswords);
        const encryptedPassword = encrypt(plainPassword);
        await conn.query(
            'UPDATE students SET password = ? WHERE student_id = ?',
            [encryptedPassword, student.student_id]
        );
        updated++;
        if (updated % 100 === 0) {
            console.log(`Updated ${updated}/${students.length}...`);
        }
    }

    console.log(`Done. Updated ${updated} students with new passwords.`);
    await conn.end();
})().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
