// controllers\dataImportExport\AppendExcel.js
const fs = require('fs');
const xlsx = require('xlsx');
const fastCsv = require('fast-csv');
const pool = require("../../config/db1");
const schema = require('../../schema/schema');
const moment = require('moment');
const {encrypt, decrypt} = require('./../../config/encrypt');

const appendExcel = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const results = [];

    for (const sheetName of sheetNames) {
      if (schema[sheetName]) {
        const worksheet = workbook.Sheets[sheetName];
        const csvData = xlsx.utils.sheet_to_csv(worksheet);
        const csvFilePath = `${filePath}_${sheetName}.csv`;
        
        fs.writeFileSync(csvFilePath, csvData);

        try {
          const result = await appendCSV(sheetName, csvFilePath);
          results.push(result);
        } catch (error) {
          console.error(`Error processing sheet ${sheetName}:`, error);
          results.push({ sheetName, error: error.message });
        }

        fs.unlinkSync(csvFilePath);
      } else {
        console.log(`Skipping sheet ${sheetName} as it's not defined in the schema.`);
      }
    }

    fs.unlinkSync(filePath);
    return { success: true, message: 'Excel data append completed.', results };
  } catch (error) {
    console.error('Error processing Excel:', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: false, error: error.message };
  }
};

const appendCSV = async (tableName, csvFilePath) => {
  try {
    let columns = Object.keys(schema[tableName]);

    // Check if table exists, if not create it
    await createTableIfNotExists(tableName, columns);

    const stream = fs.createReadStream(csvFilePath)
      .pipe(fastCsv.parse({ headers: true }))
      .on('error', (error) => {
        throw error;
      });

    const chunkSize = 100;
    let chunk = [];
    let totalInserted = 0;
    let isEmpty = true;
    let rowNumber = 1;
    let errors = [];

    for await (const row of stream) {
      rowNumber++;
      isEmpty = false;
      const filteredRow = {};
      for (const column of columns) {
        if (row.hasOwnProperty(column) && column.toLowerCase() !== 'id') {
          filteredRow[column] = row[column];
        }
      }
      
      try {
        validateRow(tableName, filteredRow, rowNumber);
        chunk.push(filteredRow);
        if (chunk.length >= chunkSize) {
          await insertOrUpdateChunk(tableName, columns.filter(col => col.toLowerCase() !== 'id'), chunk);
          totalInserted += chunk.length;
          chunk = [];
          console.log(`Inserted/Updated ${totalInserted} rows in '${tableName}' so far...`);
        }
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    if (isEmpty) {
      console.log(`The Excel sheet for '${tableName}' is empty. No data to insert/update.`);
      return { tableName, rowsProcessed: 0, errors };
    }

    if (chunk.length > 0) {
      try {
        await insertOrUpdateChunk(tableName, columns.filter(col => col.toLowerCase() !== 'id'), chunk);
        totalInserted += chunk.length;
      } catch (error) {
        errors.push(`Error inserting/updating final chunk: ${error.message}`);
      }
    }

    console.log(`Finished processing ${totalInserted} rows in '${tableName}'.`);
    if (errors.length > 0) {
      console.error(`Encountered ${errors.length} errors while processing '${tableName}':`);
      errors.forEach(error => console.error(error));
    }
    return { tableName, rowsProcessed: totalInserted, errors };
  } catch (error) {
    console.error(`Error processing CSV for '${tableName}':`, error);
    throw error;
  }
};

const createTableIfNotExists = async (tableName, columns) => {
  const checkTableQuery = `
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = ?
  `;
  const [result] = await executeQuery(checkTableQuery, [tableName]);
  
  if (result[0].count === 0) {
    const createTableQuery = `CREATE TABLE ?? (
      ${columns.map(column => {
        const fieldType = schema[tableName][column];
        if (column.toLowerCase() === 'id') {
          return `\`${column}\` ${fieldType} PRIMARY KEY AUTO_INCREMENT`;
        }
        return `\`${column}\` ${fieldType}`;
      }).join(', ')}
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

    await executeQuery(createTableQuery, [tableName]);
    console.log(`Table '${tableName}' created.`);
  } else {
    console.log(`Table '${tableName}' already exists.`);
  }
};

const insertOrUpdateChunk = async (tableName, columns, chunk) => {
    const insertQuery = `
      INSERT INTO ?? (${columns.map(column => `\`${column}\``).join(', ')}) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE 
      ${columns.map(column => `\`${column}\` = VALUES(\`${column}\`)`).join(', ')}
    `;
    
    const values = chunk.map(row => {
      return columns.map(column => {
        let value = row[column];
        const fieldType = schema[tableName][column];
  
        if (value === '' || value === null || value === undefined) {
          return null;
        }
  
        if (column === 'courseId' || column === 'subjectId') {
          if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
            value = parseInt(value.replace(/[\[\]\s]/g, ''), 10);
          }
        }
  
        if (column === 'loggedin' || column === 'done') {
          return value && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1');
        }
  
        if(column === 'centerpass' && tableName === 'examcenterdb'){
          return encrypt(value);
        }
  
        if(column === 'departmentPassword' && tableName === 'departmentdb'){
          return encrypt(value);
        }
  
        if(column === 'password' && tableName === 'students'){
          return encrypt(value);
        }
  
        if (fieldType === 'TIME') {
          if (value) {
            const time = moment(value, ['h:mm A', 'HH:mm']);
            return time.isValid() ? time.format('HH:mm:ss') : null;
          }
          return null;
        }
  
        if (fieldType === 'BOOLEAN') {
          return value && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1');
        } else if (fieldType === 'INT' || fieldType === 'BIGINT') {
          return isNaN(parseInt(value, 10)) ? null : parseInt(value, 10);
        } else if (fieldType === 'DECIMAL') {
          return isNaN(parseFloat(value)) ? null : parseFloat(value);
        } else if (fieldType === 'DATE') {
          return value ? new Date(value) : null;
        } else if (fieldType === 'TIMESTAMP') {
          return value ? new Date(value) : null;
        } else {
          return value;
        }
      });
    });
    
    await executeQuery(insertQuery, [tableName, values]);
  };
// Reuse the existing validateRow, executeQuery functions...



const validateRow = (tableName, row, rowNumber) => {
    if (tableName === 'students' && (!row.student_id || row.student_id.trim() === '')) {
      throw new Error(`Invalid student_id in row ${rowNumber}`);
    }
    // Add more validations as needed for other tables and fields
  };
  
  const executeQuery = async (query, params, retries = 3) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const connection = await pool.getConnection();
        try {
          const result = await connection.query(query, params);
          return result;
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error(`Query failed, attempt ${i + 1} of ${retries}:`, error);
        lastError = error;
        if (error.code === 'ECONNRESET') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  };
  


  
module.exports = {  appendExcel };