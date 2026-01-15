const connection = require('../../config/db1');

exports.getReportSettings = async (req, res) => {
    try {
        const query = 'SELECT * FROM system_settings WHERE setting_key LIKE "REPORT_%"';
        const [results] = await connection.query(query);

        const settings = {};
        results.forEach(row => {
            try {
                settings[row.setting_key] = JSON.parse(row.setting_value);
            } catch (e) {
                console.error(`Error parsing setting ${row.setting_key}:`, e);
                settings[row.setting_key] = row.setting_value;
            }
        });

        res.status(200).json(settings);
    } catch (error) {
        console.error("Error fetching report settings:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.updateReportSetting = async (req, res) => {
    const { key, value } = req.body;

    if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
    }

    try {
        const query = 'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)';
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

        await connection.query(query, [key, stringValue]);

        res.status(200).json({ message: "Setting updated successfully" });
    } catch (error) {
        console.error("Error updating report setting:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
