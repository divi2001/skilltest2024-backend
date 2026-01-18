require('dotenv').config();
const connection = require('./config/db1');

async function getUniqueCombinations() {
    try {
        const query = `
            SELECT DISTINCT subjectsId, qset 
            FROM students 
            ORDER BY subjectsId, qset
        `;

        console.log("Fetching unique combinations of subjectsId and qset...");
        const [results] = await connection.query(query);

        console.log("\nUnique Combinations found:", results.length);
        console.log("----------------------------------------");
        console.table(results);
        console.log("----------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("Error executing query:", error);
        process.exit(1);
    }
}

getUniqueCombinations();
