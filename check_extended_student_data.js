const connection = require('./config/db1');
require('dotenv').config();

async function checkMoreTables(studentId) {
    try {
        console.log(`Checking extended tables for Student ID: ${studentId}`);

        // Check studentlogs (timers/timestamps)
        const [studentlogs] = await connection.query(
            'SELECT * FROM studentlogs WHERE student_id = ?',
            [studentId]
        );
        console.log('\n--- studentlogs ---');
        if (studentlogs.length > 0) {
            console.log(studentlogs[0]);
        } else {
            console.log('No studentlogs found.');
        }

        // Check typingpassage
        const [typingpassage] = await connection.query(
            'SELECT * FROM typingpassage WHERE student_id = ?',
            [studentId]
        );
        console.log('\n--- typingpassage ---');
        if (typingpassage.length > 0) {
            console.table(typingpassage);
        } else {
            console.log('No typingpassage found.');
        }

        // Check typingpassagelogs
        const [typingpassagelogs] = await connection.query(
            'SELECT * FROM typingpassagelogs WHERE student_id = ?',
            [studentId]
        );
        console.log('\n--- typingpassagelogs ---');
        if (typingpassagelogs.length > 0) {
            console.table(typingpassagelogs);
        } else {
            console.log('No typingpassagelogs found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkMoreTables('6551507626');
