const connection = require('./config/db1');

async function deleteStudents() {
    try {
        const batchNo = '100';
        console.log(`Deleting students with batchNo = ${batchNo}...`);

        const [deleteResult] = await connection.query("DELETE FROM students WHERE batchNo = ?", [batchNo]);
        console.log(`Deleted ${deleteResult.affectedRows} students.`);

    } catch (error) {
        console.log("An error occurred:");
        console.log(error.message);
    } finally {
        process.exit();
    }
}
deleteStudents();
