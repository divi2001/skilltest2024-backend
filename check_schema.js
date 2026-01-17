require('dotenv').config();
const connection = require('./config/db1');

async function check() {
    try {
        console.log("Checking pcregistration schema...");
        const [rows] = await connection.query('DESCRIBE pcregistration');
        console.log("Schema:", rows);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
check();
