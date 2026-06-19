// Check students table schema
const connection = require('./config/db1');

async function checkSchema() {
    try {
        const [columns] = await connection.query('DESCRIBE students');
        console.log('Students table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });

        console.log('\n');

        const [logColumns] = await connection.query('DESCRIBE studentlogs');
        console.log('Studentlogs table columns:');
        logColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
        await connection.end();
    }
}

checkSchema();
