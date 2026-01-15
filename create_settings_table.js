const connection = require('./config/db1');

async function createSettingsTable() {
    try {
        console.log("Creating system_settings table...");
        const createQuery = `
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT
            )
        `;
        await connection.query(createQuery);
        console.log("Table created successfully.");

        // Insert default values if not exist
        const defaults = {
            'REPORT_PASSWORD_PDF': JSON.stringify({ enabled: false, type: 'minutes_before', value: 105 }),
            'REPORT_ATTENDANCE': JSON.stringify({ enabled: false, type: 'days_before', value: 4 }),
            'REPORT_ANSWER_SHEET': JSON.stringify({ enabled: false, type: 'days_before', value: 5 }),
            'REPORT_SEATING': JSON.stringify({ enabled: false, type: 'days_before', value: 3 }),
            'REPORT_ABSENTEE': JSON.stringify({ enabled: false, type: 'days_before', value: 3 })
        };

        for (const [key, value] of Object.entries(defaults)) {
            const insertQuery = `
                INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)
            `;
            await connection.query(insertQuery, [key, value]);
        }
        console.log("Default settings initialized.");

        process.exit();
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

createSettingsTable();
