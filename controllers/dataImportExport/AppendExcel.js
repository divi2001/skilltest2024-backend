// controllers\dataImportExport\AppendExcel.js
const fs = require('fs');
const xlsx = require('xlsx');
const fastCsv = require('fast-csv');
const pool = require("../../config/db1");
const schema = require('../../schema/schema');
const moment = require('moment');
const { encrypt, decrypt } = require('./../../config/encrypt');

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

/**
 * Convert Excel date serial number to JavaScript Date
 * Excel stores dates as numbers (days since 1900-01-01)
 */
const convertExcelDate = (value) => {
  // If it's already a valid date string, try parsing it
  if (typeof value === 'string') {
    // Try dd-mm-yyyy format first
    const ddmmyyyyMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try yyyy-mm-dd format
    const yyyymmddMatch = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try standard date parsing
    const standardDate = new Date(value);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }
  }
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number' && value > 0) {
    // Excel date serial number (days since 1900-01-01)
    // Note: Excel incorrectly treats 1900 as a leap year
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};

/**
 * Convert various boolean representations to true/false
 */
const convertBoolean = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  // Handle string values
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return lowerValue === 'yes' || 
           lowerValue === 'true' || 
           lowerValue === '1' || 
           lowerValue === 'y' ||
           lowerValue === 'enabled' ||
           lowerValue === 'active';
  }
  
  // Handle numeric values
  if (typeof value === 'number') {
    return value === 1 || value > 0;
  }
  
  // Handle boolean values
  return Boolean(value);
};

/**
 * Convert various numeric representations to integers
 */
const convertInteger = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If it's already a number
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  
  // If it's a string, clean it up
  if (typeof value === 'string') {
    // Remove any whitespace and special characters except digits, minus, and decimal point
    const cleaned = value.trim().replace(/[^\d.-]/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Convert various numeric representations to decimals/floats
 */
const convertDecimal = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If it's already a number
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string, clean it up
  if (typeof value === 'string') {
    // Remove any whitespace and special characters except digits, minus, and decimal point
    const cleaned = value.trim().replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
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

      // Handle empty values
      if (value === '' || value === null || value === undefined) {
        return null;
      }

      // Special handling for specific columns
      if (column === 'courseId' || column === 'subjectId') {
        if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
          value = parseInt(value.replace(/[\[\]\s]/g, ''), 10);
        }
      }

      // Encryption for password fields
      if (column === 'centerpass' && tableName === 'examcenterdb') {
        return encrypt(value);
      }

      if (column === 'departmentPassword' && tableName === 'departmentdb') {
        return encrypt(value);
      }

      if (column === 'password' && tableName === 'students') {
        return encrypt(value);
      }
      
      if (column === 'controller_pass' && tableName === 'controllerdb') {
        return encrypt(value);
      }

      // Handle different field types with improved converters
      if (fieldType === 'TIME') {
        if (value) {
          const time = moment(value, ['h:mm A', 'HH:mm', 'h:mm:ss A', 'HH:mm:ss']);
          return time.isValid() ? time.format('HH:mm:ss') : null;
        }
        return null;
      }

      if (fieldType === 'BOOLEAN') {
        return convertBoolean(value);
      } else if (fieldType === 'INT' || fieldType === 'BIGINT') {
        return convertInteger(value);
      } else if (fieldType === 'DECIMAL') {
        return convertDecimal(value);
      } else if (fieldType === 'DATE') {
        return convertExcelDate(value);
      } else if (fieldType === 'TIMESTAMP') {
        const date = convertExcelDate(value);
        return date || null;
      } else {
        // String fields - just trim whitespace
        return typeof value === 'string' ? value.trim() : value;
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




module.exports = { appendExcel };