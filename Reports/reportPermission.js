const connection = require("../config/db1");
const moment = require('moment-timezone');

async function checkReportPermission(settingKey, batchDate, startTime = null) {
    try {
        const [rows] = await connection.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [settingKey]);

        // Default to allowed if no setting found (or you can default to blocked, but user wants to enable/disable)
        if (rows.length === 0) return true;

        let setting;
        try {
            setting = JSON.parse(rows[0].setting_value);
        } catch (e) {
            console.error("Error parsing setting JSON", e);
            return true;
        }

        // If restriction is NOT enabled, allow download
        if (!setting.enabled) return true;

        const kolkataZone = 'Asia/Kolkata';
        const now = moment().tz(kolkataZone);

        // Parse batch date in Kolkata Data
        const batchDateKolkata = moment(batchDate).tz(kolkataZone);

        if (setting.type === 'days_before') {
            // Logic: Allow download if Current Date is within 'value' days before the Exam Date.
            // e.g. Value = 3. Exam = 20th. 
            // Allowed from 17th onwards.
            // batchDate - today <= value
            // Also usually allow for past exams (diff negative).

            const today = now.clone().startOf('day');
            const examDay = batchDateKolkata.clone().startOf('day');

            const diffDays = examDay.diff(today, 'days');
            // diffDays is positive if exam is in future.
            // e.g. Exam 20, Today 15. Diff = 5. if Value 3, 5 <= 3 is False. Blocked.
            // e.g. Exam 20, Today 17. Diff = 3. 3 <= 3 True. Allowed.
            // e.g. Exam 20, Today 21. Diff = -1. True. Allowed.

            return diffDays <= parseInt(setting.value);

        } else if (setting.type === 'minutes_before') {
            // Logic: Allow download if Current Time is within 'value' minutes before Exam Start Time.
            if (!startTime) return true; // Cannot check without start time

            // Parse Start Time
            // startTime is usually "HH:mm:ss" string in 24h format from DB
            const timeParts = startTime.split(':');
            const examDateTime = batchDateKolkata.clone().set({
                hour: parseInt(timeParts[0]),
                minute: parseInt(timeParts[1]),
                second: 0
            });

            const diffMinutes = examDateTime.diff(now, 'minutes');
            // exam is at 10:00. Now is 9:00. Diff = 60.
            // Value = 105. 60 <= 105. Allowed.
            // Now is 8:00. Diff = 120. 120 <= 105. False. Blocked.

            return diffMinutes <= parseInt(setting.value);
        }

        return true;
    } catch (error) {
        console.error("Error checking report permission:", error);
        // Default to OPEN in case of error to avoid locking out users during critical times
        return true;
    }
}

module.exports = checkReportPermission;
