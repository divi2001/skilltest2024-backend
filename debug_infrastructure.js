const connection = require('./config/db1');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const archiver = require('archiver');

async function checkInfrastructure() {
    try {
        console.log("Checking DB connection...");
        // Test query
        const [rows] = await connection.query('SELECT 1');
        console.log("DB Connection OK");

        console.log("Checking finalPassageSubmit table...");
        try {
            const [columns] = await connection.query('SHOW COLUMNS FROM finalPassageSubmit');
            console.log("finalPassageSubmit columns:", columns.map(c => c.Field));
        } catch (e) {
            console.error("finalPassageSubmit table MISSING or error:", e.message);
        }

        console.log("Checking trackrecord table...");
        try {
            const [columns] = await connection.query('SHOW COLUMNS FROM trackrecord');
            console.log("trackrecord columns:", columns.map(c => c.Field));
        } catch (e) {
            console.error("trackrecord table MISSING or error:", e.message);
        }

        console.log("Checking folder access...");
        const folderName = 'typing_passage_logs';
        const folderPath = path.join(__dirname, folderName);
        console.log("Expected folder path:", folderPath);

        if (!fs.existsSync(folderPath)) {
            console.log("Folder does not exist. Attempting to create...");
            try {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log("Folder created successfully.");
            } catch (e) {
                console.error("Failed to create folder:", e.message);
            }
        } else {
            console.log("Folder exists.");
        }

        console.log("Checking write access...");
        const testFile = path.join(folderPath, 'test.txt');
        try {
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log("Write/Delete access OK");
        } catch (e) {
            console.error("Write access denied:", e.message);
        }

    } catch (err) {
        console.error("Critical error:", err);
    } finally {
        process.exit();
    }
}

checkInfrastructure();
