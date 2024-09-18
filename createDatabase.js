require('dotenv').config();
const mysql = require('mysql2/promise');
const schema = require('./schema/schema');

const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

console.log('Database configuration:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    // Don't log the password for security reasons
});

async function createDatabaseAndTables() {
  let connection;
  const updatedTables = [];
  try {
    // First, connect without specifying a database
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    // Create the database if it doesn't exist with UTF-8 support
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    // Use the database
    await connection.query(`USE ${config.database}`);

    // Create or alter tables
    for (const [tableName, tableSchema] of Object.entries(schema)) {
      const columns = Object.entries(tableSchema)
        .filter(([columnName]) => columnName !== 'options')
        .map(([columnName, columnType]) => {
          if (columnName === 'UNIQUE') {
            return `UNIQUE KEY ${columnType}`;
          } else if (columnName === 'INDEX') {
            return `INDEX ${columnType}`;
          } else {
            return `${columnName} ${columnType}`;
          }
        }).join(', ');

      const options = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

      // Check if table exists
      const [rows] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      
      if (rows.length === 0) {
        // Table doesn't exist, create it
        const createTableQuery = `CREATE TABLE ${tableName} (${columns}) ${options}`;
        await connection.query(createTableQuery);
        console.log(`Table ${tableName} created with UTF-8 support.`);
        updatedTables.push(tableName);
      } else {
        // Table exists, check its current charset
        const [tableInfo] = await connection.query(`SHOW TABLE STATUS LIKE '${tableName}'`);
        const currentCharset = tableInfo[0].Collation.split('_')[0];
        
        if (currentCharset !== 'utf8mb4') {
          // Update table options to ensure UTF-8 support
          const alterTableOptionsQuery = `ALTER TABLE ${tableName} ${options}`;
          await connection.query(alterTableOptionsQuery);
          console.log(`Table ${tableName} updated with UTF-8 support.`);
          updatedTables.push(tableName);
        }

        // Alter table to add new columns
        for (const [columnName, columnType] of Object.entries(tableSchema)) {
          if (columnName !== 'UNIQUE' && columnName !== 'INDEX' && columnName !== 'options') {
            try {
              const alterTableQuery = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
              await connection.query(alterTableQuery);
              console.log(`Column ${columnName} added to ${tableName}.`);
            } catch (error) {
              if (error.code === 'ER_DUP_FIELDNAME') {
                console.log(`Column ${columnName} already exists in ${tableName}.`);
              } else {
                throw error;
              }
            }
          }
        }
      }
    }

    // Add foreign key constraints
    await addForeignKeyConstraints(connection);

    console.log('All tables have been processed.');
    console.log('Tables updated with UTF-8 support:', updatedTables);
  } catch (error) {
    console.error('Error creating or updating database or tables:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function addForeignKeyConstraints(connection) {
  const constraints = [
    {
      table: 'feedbackdb',
      constraint: 'fk_feedbackdb_students',
      foreignKey: 'student_id',
      referencedTable: 'students',
      referencedColumn: 'student_id'
    },
    {
      table: 'feedbackdb',
      constraint: 'fk_feedbackdb_studentlogs',
      foreignKey: 'student_id',
      referencedTable: 'studentlogs',
      referencedColumn: 'student_id'
    },
    // Add more constraints here if needed
  ];

  for (const constraint of constraints) {
    try {
      // Check if the constraint already exists
      const [rows] = await connection.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
      `, [config.database, constraint.table, constraint.constraint]);

      if (rows.length === 0) {
        // Constraint doesn't exist, add it
        await connection.query(`
          ALTER TABLE ${constraint.table} 
          ADD CONSTRAINT ${constraint.constraint} 
          FOREIGN KEY (${constraint.foreignKey}) 
          REFERENCES ${constraint.referencedTable}(${constraint.referencedColumn})
        `);
        console.log(`Foreign key constraint added: ${constraint.table} -> ${constraint.referencedTable}`);
      } else {
        console.log(`Foreign key constraint already exists: ${constraint.table} -> ${constraint.referencedTable}`);
      }
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log(`Cannot add foreign key constraint: ${constraint.table} -> ${constraint.referencedTable}. Referenced table might be empty or missing.`);
      } else {
        console.error(`Error adding foreign key constraint: ${constraint.table} -> ${constraint.referencedTable}`, error);
      }
    }
  }
}

createDatabaseAndTables();