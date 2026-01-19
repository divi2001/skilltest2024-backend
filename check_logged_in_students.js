const connection = require('./config/db1');

async function checkLoggedInStudents() {
    try {
        const excludedBatch = '100';
        console.log(`Checking for logged in students EXCEPT Batch: ${excludedBatch}...`);

        const query = 'SELECT student_id FROM students WHERE batchNo != ? AND loggedin = 1';
        const [rows] = await connection.query(query, [excludedBatch]);

        const currentLoggedIn = rows.map(r => String(r.student_id));
        const expectedIds = [
            '5151504538', '5151504539', '5151504716', '5151504717', '5151514751', '5151514752',
            '5151514825', '5151514826', '5151524885', '5151524886', '5151525054', '5151525055',
            '5151535124', '5151535125', '5151535164', '5151535165', '5151545243', '5151545244',
            '5151605250', '5151605251', '5151615340', '5151615341', '5151625397', '5151625398',
            '5151635455', '5151635456', '5151705504', '7151708262', '7151728278', '7151728279',
            '5551606473', '5551606474'
        ];

        const extraStudents = currentLoggedIn.filter(id => !expectedIds.includes(id));

        console.log(`Total logged in (excluding batch ${excludedBatch}): ${currentLoggedIn.length}`);
        console.log(`Expected count: ${expectedIds.length}`);

        if (extraStudents.length > 0) {
            console.log('Extra Student IDs (Logged in but not in your list):');
            console.log(extraStudents.join(', '));
        } else {
            console.log('No extra students found.');
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkLoggedInStudents();
