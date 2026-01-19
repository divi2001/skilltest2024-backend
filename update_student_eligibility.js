const connection = require('./config/db1');

async function updateStudentEligibility() {
    try {
        console.log('Updating all students to be eligible for Shorthand only (IsShorthand=1, IsTypewriting=0)...');

        const updateQuery = 'UPDATE students SET IsShorthand = 1, IsTypewriting = 0';
        const [result] = await connection.query(updateQuery);

        console.log(`Updated ${result.affectedRows} students.`);
        process.exit(0);

    } catch (error) {
        console.error('Error updating student eligibility:', error);
        process.exit(1);
    }
}

updateStudentEligibility();
