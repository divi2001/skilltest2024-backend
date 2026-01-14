const connection = require('./config/db1');

async function copyDepartment() {
    try {
        const sourceId = 6;
        const targetId = 10;

        console.log(`Copying Department ${sourceId} to ${targetId}...`);

        // 1. Get source data
        const [rows] = await connection.query('SELECT * FROM departmentdb WHERE departmentId = ?', [sourceId]);

        if (rows.length === 0) {
            console.error(`Source department ${sourceId} not found!`);
            process.exit(1);
        }

        const sourceData = rows[0];

        // Adjust data for target
        sourceData.departmentId = targetId;

        // Remove internal fields if necessary? No, usually fine to clone all.

        const columns = Object.keys(sourceData);
        const placeholders = columns.map(() => '?').join(', ');
        const updateClause = columns.map(col => `${col} = VALUES(${col})`).join(', ');

        const query = `INSERT INTO departmentdb (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
        const values = columns.map(col => sourceData[col]);

        const [result] = await connection.query(query, values);

        console.log(`Department ${targetId} created/updated successfully.`);
        console.log('Result:', result);

        process.exit(0);

    } catch (err) {
        console.error('Error copying department:', err);
        process.exit(1);
    }
}

copyDepartment();
