// Script to insert controller password timer setting into database
const connection = require('./config/db1');

async function insertControllerTimerSetting() {
    try {
        console.log('🔄 Connecting to database...');

        // Insert or update the controller password timer setting
        const insertQuery = `
            INSERT INTO system_settings (setting_key, setting_value) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        `;

        const settingKey = 'CONTROLLER_PASSWORD_TIMER';
        const settingValue = JSON.stringify({
            enabled: true,
            type: 'minutes_before',
            value: 30
        });

        console.log('📝 Inserting setting...');
        console.log('Key:', settingKey);
        console.log('Value:', settingValue);

        await connection.query(insertQuery, [settingKey, settingValue]);

        console.log('✅ Setting inserted successfully!');
        console.log('');

        // Verify the setting was inserted
        console.log('🔍 Verifying setting...');
        const [rows] = await connection.query(
            'SELECT * FROM system_settings WHERE setting_key = ?',
            [settingKey]
        );

        if (rows && rows.length > 0) {
            console.log('✅ Setting verified!');
            console.log('Setting Key:', rows[0].setting_key);
            console.log('Setting Value:', rows[0].setting_value);
            console.log('Parsed Value:', JSON.parse(rows[0].setting_value));
        } else {
            console.log('❌ Setting not found after insertion!');
        }

        console.log('');
        console.log('🎉 Controller password timer is now configurable!');
        console.log('Current setting: Passwords visible 30 minutes before batch start');
        console.log('');
        console.log('To change the timer, update the database:');
        console.log('UPDATE system_settings SET setting_value = \'{"enabled": true, "type": "minutes_before", "value": 60}\' WHERE setting_key = \'CONTROLLER_PASSWORD_TIMER\';');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

insertControllerTimerSetting();
