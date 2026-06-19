const connection = require('./config/db1');

async function createTable() {
    try {
        console.log("Creating finalPassageSubmit table...");
        const createQuery = `
            CREATE TABLE IF NOT EXISTS finalPassageSubmit (
                student_id VARCHAR(255) PRIMARY KEY,
                passageA LONGTEXT,
                passageB LONGTEXT
            )
        `;
        await connection.query(createQuery);
        console.log("Table created successfully.");
        process.exit();
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

createTable();
