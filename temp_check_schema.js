const fs = require('fs');
const connection = require('./config/db1');

async function checkSchema() {
    try {
        const [rows] = await connection.query("SHOW COLUMNS FROM students");
        const columns = rows.map(r => r.Field);
        fs.writeFileSync('columns.txt', columns.join('\n'));
        console.log("Wrote to columns.txt");
    } catch (error) {
        console.error("Error showing columns:", error);
    } finally {
        process.exit();
    }
}
checkSchema();
