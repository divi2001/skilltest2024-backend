// src/utils/createTableIfNotExists.js
const schema = require("../schema/schema");

module.exports = async function createTableIfNotExists(connection, tableName) {
    const [rows] = await connection.query(
        `SHOW TABLES LIKE ?`,
        [tableName]
    );

    if (rows.length > 0) {
        return;
    }

    const tableSchema = schema[tableName];

    if (!tableSchema) {
        throw new Error(`Schema not found for table: ${tableName}`);
    }

    const columnsSql = Object.entries(tableSchema)
        .map(([column, definition]) => `${column} ${definition}`)
        .join(",\n");

    const createTableSQL = `
        CREATE TABLE ${tableName} (
            ${columnsSql}
        )
    `;

    await connection.query(createTableSQL);
    console.log(`Table '${tableName}' created successfully`);
};
