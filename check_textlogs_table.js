// Check if textlogs table exists
const connection = require('./config/db1');

async function checkTextlogsTable() {
    try {
        // Check if textlogs table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'textlogs'");

        if (tables.length > 0) {
            console.log('✅ textlogs table exists\n');
            const [columns] = await connection.query('DESCRIBE textlogs');
            console.log('textlogs columns:');
            columns.forEach(col => {
                console.log(`  ${col.Field.padEnd(30)} ${col.Type}`);
            });
        } else {
            console.log('❌ textlogs table does NOT exist');
            console.log('\nChecking studentlogs for text columns...\n');

            const [columns] = await connection.query('DESCRIBE studentlogs');
            const textColumns = columns.filter(col =>
                col.Field.toLowerCase().includes('text') ||
                col.Field.toLowerCase().includes('passage')
            );

            console.log('Text/Passage-related columns in studentlogs:');
            textColumns.forEach(col => {
                console.log(`  ${col.Field.padEnd(30)} ${col.Type}`);
            });
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
        await connection.end();
    }
}

checkTextlogsTable();
