// Check studentlogs table for passage-related columns
const connection = require('./config/db1');

async function checkPassageColumns() {
    try {
        const [columns] = await connection.query('DESCRIBE studentlogs');
        console.log('All studentlogs table columns:\n');
        columns.forEach(col => {
            console.log(`  ${col.Field.padEnd(30)} ${col.Type}`);
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
        await connection.end();
    }
}

checkPassageColumns();
