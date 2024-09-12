
exports.updateAudioLogTime = async (req, res) => {
    const { audioType } = req.body;
    const studentId = req.session.studentId;
    console.log(studentId,audioType)

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!audioType) {
        return res.status(400).send('Audio type is required');
    }

    // Map audioType to database column names
    const audioTypeMap = {
        trial: 'trial_time',
        passageA: 'audio1_time',
        passageB: 'audio2_time'
    };

    const columnName = audioTypeMap[audioType];

    if (!columnName) {
        return res.status(400).send('Invalid audio type');
    }

    // Get the current time in Kolkata, India
    const currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    try {
        const updateAudioLogQuery = `
            UPDATE studentlogs
            SET ${columnName} = ?
            WHERE student_id = ?
        `;

        await connection.query(updateAudioLogQuery, [currentTime, studentId]);

        res.send(`Updated ${columnName} for student ${studentId} successfully!`);
    } catch (err) {
        // console.error('Failed to update audio log time:', err);
        res.status(500).send('Internal server error');
    }
};
