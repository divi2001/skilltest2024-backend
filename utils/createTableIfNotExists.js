const schema = require("../schema/schema");

const SPECIAL_SCHEMA_KEYS = new Set(["PRIMARY KEY", "UNIQUE", "INDEX"]);

module.exports = async function createTableIfNotExists(connection, tableName) {
    const [rows] = await connection.query(`SHOW TABLES LIKE ?`, [tableName]);
    const tableSchema = schema[tableName];

    if (!tableSchema) {
        throw new Error(`Schema not found for table: ${tableName}`);
    }

    if (rows.length === 0) {
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
        return;
    }

    const [existingColumns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingColumnNames = new Set(existingColumns.map((column) => column.Field));

    for (const [columnName, definition] of Object.entries(tableSchema)) {
        if (SPECIAL_SCHEMA_KEYS.has(columnName) || existingColumnNames.has(columnName)) {
            continue;
        }

        await connection.query(
            `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`
        );
        console.log(`Added missing column '${columnName}' to '${tableName}'`);
    }
};
