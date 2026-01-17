const connection = require('./config/db1');

async function listTables() {
    try {
        const [rows] = await connection.query("SHOW TABLES");
        console.log("Tables:", rows.map(r => Object.values(r)[0]));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}
listTables();
