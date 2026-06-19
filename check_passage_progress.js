const connection = require('./config/db1');

async function checkPassageProgress() {
    const studentId = '5352616093';

    try {
        // Check textlogs table
        const textlogsQuery = 'SELECT * FROM textlogs WHERE student_id = ?';
        const [textlogs] = await connection.query(textlogsQuery, [studentId]);

        console.log('\n📊 Textlogs (Progress Tracking):');
        if (textlogs.length > 0) {
            const log = textlogs[0];
            console.log('Passage A - Time Left:', log.mina, 'minutes');
            console.log('Passage A - Text Length:', log.texta ? log.texta.length : 0, 'characters');
            console.log('Passage B - Time Left:', log.minb, 'minutes');
            console.log('Passage B - Text Length:', log.textb ? log.textb.length : 0, 'characters');

            if (log.minb === 0) {
                console.log('\n⚠️  WARNING: Passage B time left is 0!');
                console.log('This means the passage timer was logged as 0.');
            }
        } else {
            console.log('No records found');
        }

        // Check studentlogs for passage times
        const studentlogsQuery = 'SELECT passage1_time, passage2_time FROM studentlogs WHERE student_id = ?';
        const [studentlogs] = await connection.query(studentlogsQuery, [studentId]);

        console.log('\n📋 Studentlogs (Passage Start Times):');
        if (studentlogs.length > 0) {
            const log = studentlogs[0];
            console.log('Passage A Start Time:', log.passage1_time);
            console.log('Passage B Start Time:', log.passage2_time);
        } else {
            console.log('No records found');
        }

        console.log('\n');
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkPassageProgress();
