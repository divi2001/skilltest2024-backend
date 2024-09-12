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
  try {
    // First, connect without specifying a database
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);

    // Use the database
    await connection.query(`USE ${config.database}`);

    // Create or alter tables
    for (const [tableName, tableSchema] of Object.entries(schema)) {
      const columns = Object.entries(tableSchema).map(([columnName, columnType]) => {
        if (columnName === 'UNIQUE') {
          return `UNIQUE KEY ${columnType}`;
        } else if (columnName === 'INDEX') {
          return `INDEX ${columnType}`;
        } else {
          return `${columnName} ${columnType}`;
        }
      }).join(', ');

      // Check if table exists
      const [rows] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      
      if (rows.length === 0) {
        // Table doesn't exist, create it
        const createTableQuery = `CREATE TABLE ${tableName} (${columns})`;
        await connection.query(createTableQuery);
        console.log(`Table ${tableName} created.`);
      } else {
        // Table exists, alter it
        for (const [columnName, columnType] of Object.entries(tableSchema)) {
          if (columnName !== 'UNIQUE' && columnName !== 'INDEX') {
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
        console.log(`Table ${tableName} updated.`);
      }
    }

    // Add foreign key constraints
    await addForeignKeyConstraints(connection);

    console.log('All tables have been created or updated successfully.');
  } catch (error) {
    console.error('Error creating or updating database or tables:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function addForeignKeyConstraints(connection) {
  try {
    // Add foreign key for feedbackdb referencing students
    await connection.query(`
      ALTER TABLE feedbackdb 
      ADD CONSTRAINT fk_feedbackdb_students 
      FOREIGN KEY (student_id) REFERENCES students(student_id)
    `);
    console.log('Foreign key constraint added: feedbackdb -> students');

    // Add foreign key for feedbackdb referencing studentlogs
    await connection.query(`
      ALTER TABLE feedbackdb 
      ADD CONSTRAINT fk_feedbackdb_studentlogs 
      FOREIGN KEY (student_id) REFERENCES studentlogs(student_id)
    `);
    console.log('Foreign key constraint added: feedbackdb -> studentlogs');

    // Add more foreign key constraints here if needed

  } catch (error) {
    if (error.code === 'ER_CANT_CREATE_TABLE') {
      console.log('Foreign key constraint already exists or referenced table is missing.');
    } else {
      throw error;
    }
  }
}

createDatabaseAndTables();