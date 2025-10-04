// // // // controllers/superAdminController/excelDataController.js
// // // const XLSX = require('xlsx');
// // // const fs = require('fs');

// // // // Use your existing database connection - similar to HallticketsGeneration
// // // const connection = require("../../config/db1");

// // // // Get all available tables from database
// // // const getAvailableTables = async (req, res) => {
// // //   try {
// // //     console.log('Fetching available tables...');
    
// // //     // Using promise-based query with your mysql2/promise connection
// // //     const query = `
// // //       SELECT TABLE_NAME as tableName 
// // //       FROM INFORMATION_SCHEMA.TABLES 
// // //       WHERE TABLE_SCHEMA = DATABASE() 
// // //       AND TABLE_TYPE = 'BASE TABLE'
// // //     `;
    
// // //     // Use promise-based query execution
// // //     const [results] = await connection.query(query);
    
// // //     const tableNames = results.map(table => table.tableName);
// // //     console.log('Found tables:', tableNames);
    
// // //     res.json({
// // //       success: true,
// // //       tables: tableNames
// // //     });
    
// // //   } catch (error) {
// // //     console.error('Error in getAvailableTables:', error);
// // //     res.status(500).json({
// // //       success: false,
// // //       error: 'Failed to fetch available tables',
// // //       message: error.message
// // //     });
// // //   }
// // // };


// // // // Process and upload Excel data
// // // const processExcelData = async (req, res) => {
// // //   try {
// // //     // Validate request
// // //     if (!req.file) {
// // //       return res.status(400).json({
// // //         success: false,
// // //         error: 'No Excel file uploaded'
// // //       });
// // //     }

// // //     const { targetTable } = req.body;
    
// // //     if (!targetTable) {
// // //       return res.status(400).json({
// // //         success: false,
// // //         error: 'Target table is required'
// // //       });
// // //     }

// // //     // Read Excel file - use first sheet automatically
// // //     const workbook = XLSX.readFile(req.file.path);
// // //     const sheet = workbook.SheetNames[0]; // Always use first sheet
    
// // //     const worksheet = workbook.Sheets[sheet];
// // //     const excelData = XLSX.utils.sheet_to_json(worksheet);

// // //     if (excelData.length === 0) {
// // //       // Clean up file
// // //       fs.unlinkSync(req.file.path);
// // //       return res.status(400).json({
// // //         success: false,
// // //         error: 'Excel file is empty or has no data'
// // //       });
// // //     }

// // //     // Check if target table exists and get its structure
// // //     const tableCheckQuery = `
// // //       SELECT TABLE_NAME 
// // //       FROM INFORMATION_SCHEMA.TABLES 
// // //       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
// // //     `;

// // //     const [tableResults] = await connection.query(tableCheckQuery, [targetTable]);

// // //     if (tableResults.length === 0) {
// // //       // Clean up file
// // //       fs.unlinkSync(req.file.path);
// // //       return res.status(400).json({
// // //         success: false,
// // //         error: `Table '${targetTable}' does not exist in the database`
// // //       });
// // //     }

// // //     // Get table columns
// // //     const columnsQuery = `
// // //       SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
// // //       FROM INFORMATION_SCHEMA.COLUMNS 
// // //       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
// // //     `;

// // //     const [columnsResults] = await connection.query(columnsQuery, [targetTable]);

// // //     const columnNames = columnsResults.map(col => col.COLUMN_NAME);
    
// // //     // Validate Excel columns against table columns
// // //     const excelHeaders = Object.keys(excelData[0]);
// // //     const missingColumns = excelHeaders.filter(header => !columnNames.includes(header));
    
// // //     if (missingColumns.length > 0) {
// // //       // Clean up file
// // //       fs.unlinkSync(req.file.path);
// // //       return res.status(400).json({
// // //         success: false,
// // //         error: `Excel columns not found in table: ${missingColumns.join(', ')}`,
// // //         availableColumns: columnNames
// // //       });
// // //     }

// // //     // Check for duplicates
// // //     const duplicateErrors = await checkDuplicateEntries(targetTable, excelData, columnsResults);
// // //     if (duplicateErrors.length > 0) {
// // //       // Clean up file
// // //       fs.unlinkSync(req.file.path);
// // //       return res.status(400).json({
// // //         success: false,
// // //         error: 'Duplicate entries found',
// // //         duplicates: duplicateErrors
// // //       });
// // //     }

// // //     // Insert data into table
// // //     const insertedCount = await insertExcelData(targetTable, excelData, columnNames);

// // //     // Clean up uploaded file
// // //     fs.unlinkSync(req.file.path);

// // //     res.json({
// // //       success: true,
// // //       message: 'Excel data uploaded successfully',
// // //       insertedCount: insertedCount,
// // //       table: targetTable,
// // //       totalRecords: excelData.length
// // //     });

// // //   } catch (error) {
// // //     console.error('Error processing Excel upload:', error);
    
// // //     // Clean up uploaded file in case of error
// // //     if (req.file && fs.existsSync(req.file.path)) {
// // //       fs.unlinkSync(req.file.path);
// // //     }
    
// // //     res.status(500).json({
// // //       success: false,
// // //       error: 'Failed to process Excel file',
// // //       message: error.message
// // //     });
// // //   }
// // // };

// // // // Keep other functions the same...

// // // // Check for duplicate entries in database
// // // const checkDuplicateEntries = (tableName, data, tableColumns) => {
// // //   return new Promise((resolve, reject) => {
// // //     const duplicates = [];
    
// // //     try {
// // //       // Get unique columns (primary keys)
// // //       const uniqueQuery = `
// // //         SELECT COLUMN_NAME 
// // //         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
// // //         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? 
// // //         AND CONSTRAINT_NAME = 'PRIMARY'
// // //       `;

// // //       connection.query(uniqueQuery, [tableName], (uniqueError, uniqueResults) => {
// // //         if (uniqueError) {
// // //           console.error('Unique query error:', uniqueError);
// // //           return resolve(duplicates); // Continue without duplicate check
// // //         }

// // //         // If no unique constraints, check common unique fields
// // //         const checkColumns = uniqueResults.length > 0 
// // //           ? uniqueResults.map(col => col.COLUMN_NAME)
// // //           : ['id', 'student_id', 'email', 'username', 'seat_no', 'institute_id'];

// // //         const availableCheckColumns = checkColumns.filter(col => 
// // //           tableColumns.some(tableCol => tableCol.COLUMN_NAME === col) && 
// // //           data[0].hasOwnProperty(col)
// // //         );

// // //         if (availableCheckColumns.length === 0) {
// // //           return resolve(duplicates); // No unique columns to check
// // //         }

// // //         let processedColumns = 0;
        
// // //         // Check each column for duplicates
// // //         availableCheckColumns.forEach(column => {
// // //           const columnValues = data.map(row => row[column]).filter(value => value != null);
          
// // //           if (columnValues.length > 0) {
// // //             const placeholders = columnValues.map(() => '?').join(',');
// // //             const duplicateQuery = `SELECT ${column} FROM ${tableName} WHERE ${column} IN (${placeholders})`;
            
// // //             connection.query(duplicateQuery, columnValues, (dupError, dupResults) => {
// // //               if (dupError) {
// // //                 console.error(`Duplicate check error for ${column}:`, dupError);
// // //               } else if (dupResults.length > 0) {
// // //                 const duplicateValues = dupResults.map(record => record[column]);
// // //                 duplicates.push({
// // //                   column: column,
// // //                   duplicateValues: duplicateValues
// // //                 });
// // //               }
              
// // //               processedColumns++;
// // //               if (processedColumns === availableCheckColumns.length) {
// // //                 resolve(duplicates);
// // //               }
// // //             });
// // //           } else {
// // //             processedColumns++;
// // //             if (processedColumns === availableCheckColumns.length) {
// // //               resolve(duplicates);
// // //             }
// // //           }
// // //         });
// // //       });

// // //     } catch (error) {
// // //       console.error('Error in checkDuplicateEntries:', error);
// // //       resolve(duplicates); // Continue even if duplicate check fails
// // //     }
// // //   });
// // // };

// // // // Insert Excel data into database table
// // // const insertExcelData = (tableName, data, columnNames) => {
// // //   return new Promise((resolve, reject) => {
// // //     let insertedCount = 0;
// // //     let processedRows = 0;
    
// // //     try {
// // //       // Filter columns that exist in both Excel and table
// // //       const validColumns = columnNames.filter(col => data[0].hasOwnProperty(col));
      
// // //       if (validColumns.length === 0) {
// // //         return reject(new Error('No matching columns found between Excel and database table'));
// // //       }

// // //       const placeholders = validColumns.map(() => '?').join(',');
// // //       const columns = validColumns.join(',');
      
// // //       // Insert records one by one
// // //       data.forEach((row, index) => {
// // //         const values = validColumns.map(col => {
// // //           const value = row[col];
// // //           // Handle empty values
// // //           if (value === null || value === undefined || value === '' || value === 'NULL') {
// // //             return null;
// // //           }
// // //           return value;
// // //         });

// // //         const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        
// // //         connection.query(insertQuery, values, (insertError, insertResults) => {
// // //           if (insertError) {
// // //             console.error(`Error inserting row ${index}:`, insertError);
// // //             // Continue with next record even if one fails
// // //           } else {
// // //             insertedCount++;
// // //           }
          
// // //           processedRows++;
// // //           if (processedRows === data.length) {
// // //             resolve(insertedCount);
// // //           }
// // //         });
// // //       });

// // //     } catch (error) {
// // //       console.error('Error in insertExcelData:', error);
// // //       reject(error);
// // //     }
// // //   });
// // // };

// // // module.exports = {
// // //   getAvailableTables,
// // //   processExcelData
// // // };





// // controllers/superAdminController/excelDataController.js
// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');

// // Database connection
// const connection = require("../../config/db1");

// // Utility function to safely delete uploaded files
// function safeFileCleanup(filePath) {
//   try {
//     if (filePath && fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//       console.log('[INFO] Cleaned up uploaded file:', filePath);
//     }
//   } catch (error) {
//     console.error('[ERROR] Failed to cleanup file:', error);
//   }
// }

// // Enhanced validation function with detailed error reporting
// function validateDataWithDetails(data, columnInfo) {
//   const errors = [];
//   const warnings = [];
//   const validatedData = [];
//   const emptyRowsInfo = [];
//   const missingDataInfo = [];

//   console.log(`[INFO] Starting detailed validation for ${data.length} rows`);

//   data.forEach((row, rowIndex) => {
//     const actualRowNumber = rowIndex + 2; // +2 because Excel starts from 1 and we skip header
//     const validatedRow = {};
//     const rowErrors = [];
//     const missingFields = [];
//     let totalEmptyFields = 0;
//     let totalFields = 0;

//     // Check if entire row is empty
//     const rowValues = Object.values(row);
//     const nonEmptyValues = rowValues.filter(value => 
//       value !== null && value !== undefined && value !== '' && value !== 'NULL'
//     );

//     if (nonEmptyValues.length === 0) {
//       emptyRowsInfo.push({
//         rowNumber: actualRowNumber,
//         message: `Row ${actualRowNumber} is completely empty`
//       });
//       return; // Skip completely empty rows
//     }

//     // Validate each column
//     Object.keys(row).forEach(column => {
//       const value = row[column];
//       const columnDef = columnInfo.find(col => col.COLUMN_NAME === column);
//       totalFields++;

//       if (!columnDef) {
//         rowErrors.push(`Unknown column: ${column}`);
//         return;
//       }

//       // Check for empty/null values
//       if (value === null || value === undefined || value === '' || value === 'NULL') {
//         totalEmptyFields++;
        
//         if (columnDef.IS_NULLABLE === 'NO' && !columnDef.COLUMN_DEFAULT) {
//           rowErrors.push(`Column '${column}' cannot be empty (required field)`);
//           missingFields.push(column);
//         } else {
//           validatedRow[column] = null;
//           // Log missing optional field
//           missingFields.push(`${column} (optional)`);
//         }
//         return;
//       }

//       // Validate data types
//       const dataType = columnDef.DATA_TYPE.toLowerCase();
//       let validatedValue = value;

//       try {
//         switch (dataType) {
//           case 'int':
//           case 'bigint':
//           case 'tinyint':
//           case 'smallint':
//           case 'mediumint':
//             validatedValue = parseInt(value);
//             if (isNaN(validatedValue)) {
//               rowErrors.push(`Column '${column}' must be a number, got: ${value}`);
//             }
//             break;
          
//           case 'decimal':
//           case 'float':
//           case 'double':
//             validatedValue = parseFloat(value);
//             if (isNaN(validatedValue)) {
//               rowErrors.push(`Column '${column}' must be a decimal number, got: ${value}`);
//             }
//             break;
          
//           case 'varchar':
//           case 'text':
//           case 'longtext':
//           case 'mediumtext':
//           case 'char':
//             validatedValue = String(value).trim();
//             // Check length constraints
//             if (columnDef.CHARACTER_MAXIMUM_LENGTH && validatedValue.length > columnDef.CHARACTER_MAXIMUM_LENGTH) {
//               rowErrors.push(`Column '${column}' exceeds maximum length of ${columnDef.CHARACTER_MAXIMUM_LENGTH} characters`);
//             }
//             break;
          
//           case 'date':
//           case 'datetime':
//           case 'timestamp':
//             const date = new Date(value);
//             if (isNaN(date.getTime())) {
//               rowErrors.push(`Column '${column}' must be a valid date, got: ${value}`);
//             } else {
//               validatedValue = date.toISOString().slice(0, 19).replace('T', ' ');
//             }
//             break;
          
//           case 'json':
//             if (typeof value === 'object') {
//               validatedValue = JSON.stringify(value);
//             } else if (typeof value === 'string') {
//               try {
//                 JSON.parse(value);
//                 validatedValue = value;
//               } catch {
//                 rowErrors.push(`Column '${column}' must be valid JSON, got: ${value}`);
//               }
//             }
//             break;
          
//           default:
//             validatedValue = String(value);
//         }
        
//         validatedRow[column] = validatedValue;
//       } catch (error) {
//         rowErrors.push(`Data type validation failed for column '${column}': ${error.message}`);
//       }
//     });

//     // Record missing data information
//     if (missingFields.length > 0) {
//       missingDataInfo.push({
//         rowNumber: actualRowNumber,
//         missingFields: missingFields,
//         emptyFieldCount: totalEmptyFields,
//         totalFieldCount: totalFields,
//         completenessPercentage: Math.round(((totalFields - totalEmptyFields) / totalFields) * 100)
//       });
//     }

//     // Add row-level warnings for incomplete data
//     if (totalEmptyFields > 0 && rowErrors.length === 0) {
//       warnings.push({
//         type: 'incomplete_data',
//         rowNumber: actualRowNumber,
//         message: `Row ${actualRowNumber} has ${totalEmptyFields} empty fields out of ${totalFields} total fields`
//       });
//     }

//     if (rowErrors.length > 0) {
//       errors.push({
//         rowNumber: actualRowNumber,
//         errors: rowErrors,
//         missingFields: missingFields
//       });
//     } else {
//       validatedData.push(validatedRow);
//     }
//   });

//   console.log(`[INFO] Validation completed: ${validatedData.length} valid rows, ${errors.length} error rows, ${emptyRowsInfo.length} empty rows`);

//   return { 
//     validatedData, 
//     errors, 
//     warnings,
//     emptyRowsInfo,
//     missingDataInfo,
//     summary: {
//       totalRows: data.length,
//       validRows: validatedData.length,
//       errorRows: errors.length,
//       emptyRows: emptyRowsInfo.length,
//       incompleteRows: missingDataInfo.length
//     }
//   };
// }

// // Enhanced function to read and validate Excel data
// async function loadAndValidateExcelData(filePath) {
//   console.log('[INFO] Starting Excel file processing:', filePath);
  
//   try {
//     // Check if file exists
//     if (!fs.existsSync(filePath)) {
//       throw new Error('Excel file not found at specified path');
//     }

//     // Read the workbook
//     const workbook = XLSX.readFile(filePath);
//     console.log('[INFO] Excel workbook loaded successfully');
    
//     if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
//       throw new Error('Excel file contains no sheets');
//     }

//     // Use first sheet by default
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     console.log('[INFO] Processing sheet:', sheetName);

//     if (!worksheet) {
//       throw new Error(`Sheet '${sheetName}' not found in Excel file`);
//     }

//     // Convert to JSON with options for better data handling
//     const excelData = XLSX.utils.sheet_to_json(worksheet, {
//       header: 1, // Get array of arrays first
//       defval: null, // Use null for empty cells
//       raw: false // Don't use raw values to avoid date issues
//     });

//     if (excelData.length === 0) {
//       throw new Error('Excel sheet is empty');
//     }

//     // Extract headers and data rows
//     const headers = excelData[0];
//     const dataRows = excelData.slice(1);

//     if (!headers || headers.length === 0) {
//       throw new Error('Excel sheet has no headers');
//     }

//     if (dataRows.length === 0) {
//       throw new Error('Excel sheet has no data rows');
//     }

//     // Convert back to object format with proper header mapping
//     const processedData = dataRows.map((row, index) => {
//       const rowObject = {};
//       headers.forEach((header, colIndex) => {
//         if (header && header.trim()) {
//           rowObject[header.trim()] = row[colIndex] || null;
//         }
//       });
//       return rowObject;
//     }).filter(row => {
//       // Remove completely empty rows
//       return Object.values(row).some(value => value !== null && value !== '');
//     });

//     console.log(`[INFO] Excel processing completed: ${processedData.length} data rows found`);
    
//     return {
//       data: processedData,
//       headers: headers.filter(h => h && h.trim()),
//       originalRowCount: dataRows.length,
//       processedRowCount: processedData.length
//     };

//   } catch (error) {
//     console.error('[ERROR] Excel processing failed:', error);
//     throw new Error(`Excel processing failed: ${error.message}`);
//   }
// }

// // Enhanced duplicate checking with detailed reporting
// const checkDuplicateEntries = async (tableName, data, tableColumns) => {
//   console.log('[INFO] Checking for duplicate entries with detailed reporting...');
  
//   try {
//     // Get primary key columns
//     const uniqueQuery = `
//       SELECT COLUMN_NAME 
//       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
//       WHERE TABLE_SCHEMA = DATABASE() 
//       AND TABLE_NAME = ? 
//       AND CONSTRAINT_NAME = 'PRIMARY'
//     `;

//     const [uniqueResults] = await connection.query(uniqueQuery, [tableName]);
    
//     // Get unique constraints
//     const uniqueConstraintsQuery = `
//       SELECT COLUMN_NAME, CONSTRAINT_NAME
//       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
//       WHERE TABLE_SCHEMA = DATABASE() 
//       AND TABLE_NAME = ? 
//       AND CONSTRAINT_NAME != 'PRIMARY'
//     `;

//     const [uniqueConstraints] = await connection.query(uniqueConstraintsQuery, [tableName]);
    
//     // Define columns to check for duplicates
//     const primaryKeys = uniqueResults.map(col => col.COLUMN_NAME);
//     const uniqueKeys = uniqueConstraints.map(col => col.COLUMN_NAME);
//     const commonUniqueFields = ['id', 'student_id', 'email', 'username', 'seat_no', 'institute_id', 'phone'];
    
//     const checkColumns = [...new Set([...primaryKeys, ...uniqueKeys, ...commonUniqueFields])];
    
//     // Filter to only columns that exist in both table and data
//     const availableCheckColumns = checkColumns.filter(col => {
//       const existsInTable = tableColumns.some(tableCol => tableCol.COLUMN_NAME === col);
//       const existsInData = data.length > 0 && data[0].hasOwnProperty(col);
//       return existsInTable && existsInData;
//     });

//     if (availableCheckColumns.length === 0) {
//       console.log('[INFO] No unique columns found for duplicate checking');
//       return { duplicates: [], internalDuplicates: [] };
//     }

//     console.log(`[INFO] Checking duplicates for columns: ${availableCheckColumns.join(', ')}`);

//     const duplicates = [];
//     const internalDuplicates = [];

//     // Check for duplicates within the Excel data itself
//     for (const column of availableCheckColumns) {
//       const columnValues = data
//         .map((row, index) => ({ value: row[column], rowNumber: index + 2 }))
//         .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
      
//       // Find internal duplicates
//       const valueOccurrences = {};
//       columnValues.forEach(item => {
//         if (!valueOccurrences[item.value]) {
//           valueOccurrences[item.value] = [];
//         }
//         valueOccurrences[item.value].push(item.rowNumber);
//       });

//       const internalDuplicatesForColumn = Object.entries(valueOccurrences)
//         .filter(([value, rows]) => rows.length > 1)
//         .map(([value, rows]) => ({
//           column: column,
//           value: value,
//           rowNumbers: rows,
//           count: rows.length
//         }));

//       if (internalDuplicatesForColumn.length > 0) {
//         internalDuplicates.push(...internalDuplicatesForColumn);
//       }

//       // Check against existing database records
//       const uniqueValues = [...new Set(columnValues.map(item => item.value))];
      
//       if (uniqueValues.length > 0) {
//         const placeholders = uniqueValues.map(() => '?').join(',');
//         const duplicateQuery = `SELECT ${column} FROM ${tableName} WHERE ${column} IN (${placeholders})`;
        
//         const [dupResults] = await connection.query(duplicateQuery, uniqueValues);
        
//         if (dupResults.length > 0) {
//           const duplicateValues = dupResults.map(record => record[column]);
          
//           // Find which rows contain these duplicate values
//           const affectedRows = data
//             .map((row, index) => ({ value: row[column], rowNumber: index + 2 }))
//             .filter(item => duplicateValues.includes(item.value))
//             .map(item => item.rowNumber);

//           duplicates.push({
//             column: column,
//             duplicateValues: duplicateValues,
//             count: duplicateValues.length,
//             affectedRows: affectedRows
//           });
//         }
//       }
//     }

//     console.log(`[INFO] Duplicate check completed: ${duplicates.length} database conflicts, ${internalDuplicates.length} internal conflicts`);
//     return { duplicates, internalDuplicates };

//   } catch (error) {
//     console.error('[ERROR] Duplicate check failed:', error);
//     return { duplicates: [], internalDuplicates: [], error: error.message };
//   }
// };

// // Enhanced function to insert Excel data using bulk operations
// const insertExcelData = async (tableName, data, columnNames) => {
//   console.log(`[INFO] Starting bulk insert for table: ${tableName}`);
  
//   try {
//     // Filter columns that exist in both Excel and table
//     const validColumns = columnNames.filter(col => 
//       data.length > 0 && data[0].hasOwnProperty(col)
//     );
    
//     if (validColumns.length === 0) {
//       throw new Error('No matching columns found between Excel and database table');
//     }

//     console.log(`[INFO] Valid columns for insert: ${validColumns.join(', ')}`);

//     // Prepare bulk insert data
//     const insertValues = data.map(row => 
//       validColumns.map(col => {
//         const value = row[col];
//         return (value === null || value === undefined || value === '' || value === 'NULL') ? null : value;
//       })
//     );

//     // Use batch processing for large datasets
//     const batchSize = 100;
//     let totalInserted = 0;
//     const batches = [];
    
//     for (let i = 0; i < insertValues.length; i += batchSize) {
//       batches.push(insertValues.slice(i, i + batchSize));
//     }

//     console.log(`[INFO] Processing ${batches.length} batches of ${batchSize} records each`);

//     // Process each batch
//     for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
//       const batch = batches[batchIndex];
      
//       try {
//         const placeholders = batch.map(() => `(${validColumns.map(() => '?').join(',')})`).join(',');
//         const flatValues = batch.flat();
        
//         const insertQuery = `
//           INSERT INTO ${tableName} (${validColumns.join(',')}) 
//           VALUES ${placeholders}
//         `;

//         const [result] = await connection.query(insertQuery, flatValues);
//         totalInserted += result.affectedRows;
        
//         console.log(`[INFO] Batch ${batchIndex + 1}/${batches.length} completed: ${result.affectedRows} records inserted`);
        
//       } catch (batchError) {
//         console.error(`[ERROR] Batch ${batchIndex + 1} failed:`, batchError);
        
//         // Try individual inserts for failed batch
//         for (const row of batch) {
//           try {
//             const singleInsertQuery = `
//               INSERT INTO ${tableName} (${validColumns.join(',')}) 
//               VALUES (${validColumns.map(() => '?').join(',')})
//             `;
            
//             const [singleResult] = await connection.query(singleInsertQuery, row);
//             if (singleResult.affectedRows > 0) {
//               totalInserted++;
//             }
//           } catch (singleError) {
//             console.error('[ERROR] Individual insert failed:', singleError.message);
//           }
//         }
//       }
//     }

//     console.log(`[INFO] Bulk insert completed: ${totalInserted} total records inserted`);
//     return totalInserted;

//   } catch (error) {
//     console.error('[ERROR] Bulk insert failed:', error);
//     throw error;
//   }
// };

// // Get all available tables from database
// const getAvailableTables = async (req, res) => {
//   try {
//     console.log('[INFO] Fetching available tables...');
    
//     const query = `
//       SELECT 
//         TABLE_NAME as tableName,
//         TABLE_COMMENT as tableComment,
//         TABLE_ROWS as estimatedRows
//       FROM INFORMATION_SCHEMA.TABLES 
//       WHERE TABLE_SCHEMA = DATABASE() 
//       AND TABLE_TYPE = 'BASE TABLE'
//       ORDER BY TABLE_NAME
//     `;
    
//     const [results] = await connection.query(query);
    
//     console.log(`[INFO] Found ${results.length} tables`);
    
//     res.json({
//       success: true,
//       tables: results,
//       count: results.length
//     });
    
//   } catch (error) {
//     console.error('[ERROR] Failed to fetch tables:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch available tables',
//       message: error.message
//     });
//   }
// };

// // Main function to process Excel data with comprehensive validation
// const processExcelData = async (req, res) => {
//   let uploadedFilePath = null;
  
//   try {
//     console.log('[INFO] Excel data processing request received with enhanced validation');

//     // Validate request
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         error: 'No Excel file uploaded. Please select a file.',
//         code: 'NO_FILE'
//       });
//     }

//     uploadedFilePath = req.file.path;
//     const { targetTable } = req.body;
    
//     if (!targetTable || targetTable.trim() === '') {
//       safeFileCleanup(uploadedFilePath);
//       return res.status(400).json({
//         success: false,
//         error: 'Target table is required. Please select a table.',
//         code: 'NO_TARGET_TABLE'
//       });
//     }

//     console.log(`[INFO] Processing file: ${req.file.filename} for table: ${targetTable}`);

//     // Load and validate Excel data
//     const excelResult = await loadAndValidateExcelData(uploadedFilePath);
//     const { data: excelData, headers: excelHeaders } = excelResult;

//     // Verify target table exists and get structure
//     const tableCheckQuery = `
//       SELECT TABLE_NAME, TABLE_COMMENT 
//       FROM INFORMATION_SCHEMA.TABLES 
//       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
//     `;

//     const [tableResults] = await connection.query(tableCheckQuery, [targetTable]);

//     if (tableResults.length === 0) {
//       safeFileCleanup(uploadedFilePath);
//       return res.status(400).json({
//         success: false,
//         error: `Table '${targetTable}' does not exist in the database`,
//         code: 'TABLE_NOT_FOUND'
//       });
//     }

//     // Get detailed table column information
//     const columnsQuery = `
//       SELECT 
//         COLUMN_NAME, 
//         DATA_TYPE, 
//         IS_NULLABLE, 
//         COLUMN_DEFAULT,
//         CHARACTER_MAXIMUM_LENGTH,
//         NUMERIC_PRECISION,
//         COLUMN_KEY
//       FROM INFORMATION_SCHEMA.COLUMNS 
//       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
//       ORDER BY ORDINAL_POSITION
//     `;

//     const [columnsResults] = await connection.query(columnsQuery, [targetTable]);
//     const columnNames = columnsResults.map(col => col.COLUMN_NAME);
    
//     console.log(`[INFO] Table structure loaded: ${columnNames.length} columns`);

//     // Validate Excel columns against table columns
//     const missingColumns = excelHeaders.filter(header => !columnNames.includes(header));
//     const availableColumns = excelHeaders.filter(header => columnNames.includes(header));
    
//     if (availableColumns.length === 0) {
//       safeFileCleanup(uploadedFilePath);
//       return res.status(400).json({
//         success: false,
//         error: 'No matching columns found between Excel file and database table',
//         code: 'NO_MATCHING_COLUMNS',
//         details: {
//           excelColumns: excelHeaders,
//           tableColumns: columnNames,
//           missingColumns: missingColumns
//         }
//       });
//     }

//     // Enhanced validation with detailed error reporting
//     const validationResult = validateDataWithDetails(excelData, columnsResults);
    
//     if (validationResult.errors.length > 0) {
//       safeFileCleanup(uploadedFilePath);
//       return res.status(400).json({
//         success: false,
//         error: 'Data validation failed',
//         code: 'VALIDATION_FAILED',
//         validationDetails: {
//           errors: validationResult.errors.slice(0, 20), // Limit to first 20 errors
//           warnings: validationResult.warnings,
//           emptyRows: validationResult.emptyRowsInfo,
//           missingData: validationResult.missingDataInfo.slice(0, 20), // Limit to first 20
//           summary: validationResult.summary,
//           totalErrors: validationResult.errors.length,
//           totalWarnings: validationResult.warnings.length
//         }
//       });
//     }

//     // Enhanced duplicate checking
//     const duplicateResult = await checkDuplicateEntries(targetTable, validationResult.validatedData, columnsResults);
    
//     if (duplicateResult.duplicates.length > 0 || duplicateResult.internalDuplicates.length > 0) {
//       safeFileCleanup(uploadedFilePath);
//       return res.status(400).json({
//         success: false,
//         error: 'Duplicate entries found',
//         code: 'DUPLICATE_ENTRIES',
//         duplicateDetails: {
//           databaseDuplicates: duplicateResult.duplicates,
//           internalDuplicates: duplicateResult.internalDuplicates,
//           summary: {
//             databaseConflicts: duplicateResult.duplicates.length,
//             internalConflicts: duplicateResult.internalDuplicates.length
//           }
//         }
//       });
//     }

//     // Insert validated data
//     console.log(`[INFO] Starting data insertion: ${validationResult.validatedData.length} records`);
//     const insertedCount = await insertExcelData(targetTable, validationResult.validatedData, columnNames);

//     // Clean up uploaded file
//     safeFileCleanup(uploadedFilePath);

//     console.log(`[INFO] Excel processing completed successfully: ${insertedCount} records inserted`);

//     res.json({
//       success: true,
//       message: 'Excel data uploaded and processed successfully',
//       summary: {
//         fileName: req.file.originalname,
//         targetTable: targetTable,
//         totalExcelRows: excelResult.originalRowCount,
//         processedRows: excelResult.processedRowCount,
//         validatedRows: validationResult.validatedData.length,
//         insertedRecords: insertedCount,
//         matchedColumns: availableColumns.length,
//         skippedColumns: missingColumns,
//         warnings: validationResult.warnings,
//         emptyRowsSkipped: validationResult.emptyRowsInfo.length,
//         incompleteDataRows: validationResult.missingDataInfo.length
//       }
//     });

//   } catch (error) {
//     console.error('[ERROR] Excel processing failed:', error);
    
//     // Ensure file cleanup on any error
//     safeFileCleanup(uploadedFilePath);
    
//     let errorCode = 'PROCESSING_ERROR';
//     let statusCode = 500;
    
//     if (error.message.includes('Excel processing failed')) {
//       errorCode = 'EXCEL_PARSING_ERROR';
//       statusCode = 400;
//     } else if (error.message.includes('Database')) {
//       errorCode = 'DATABASE_ERROR';
//     } else if (error.message.includes('validation')) {
//       errorCode = 'VALIDATION_ERROR';
//       statusCode = 400;
//     }
    
//     res.status(statusCode).json({
//       success: false,
//       error: 'Failed to process Excel file',
//       message: error.message,
//       code: errorCode
//     });
//   }
// };

// module.exports = {
//   getAvailableTables,
//   processExcelData
// };



// controllers/superAdminController/excelDataController.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Database connection and schema import
const connection = require("../../config/db1");
const schema = require("../../schema/schema");

// Utility function to safely delete uploaded files
function safeFileCleanup(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[INFO] Cleaned up uploaded file:', filePath);
    }
  } catch (error) {
    console.error('[ERROR] Failed to cleanup file:', error);
  }
}

// Function to parse schema field definitions and extract field info
function parseSchemaFields(tableName) {
  if (!schema[tableName]) {
    return null;
  }

  const tableSchema = schema[tableName];
  const fields = [];

  Object.entries(tableSchema).forEach(([fieldName, fieldDefinition]) => {
    const field = {
      name: fieldName,
      definition: fieldDefinition,
      required: false,
      isPrimary: false,
      hasDefault: false,
      dataType: '',
      maxLength: null,
      references: null
    };

    // Parse field definition to extract information
    const def = fieldDefinition.toUpperCase();
    
    // Check if field is required (no DEFAULT and not AUTO_INCREMENT)
    if (!def.includes('DEFAULT') && !def.includes('AUTO_INCREMENT') && !def.includes('NULL')) {
      field.required = true;
    }
    
    // Check if primary key
    if (def.includes('PRIMARY KEY')) {
      field.isPrimary = true;
      field.required = false; // Primary keys with AUTO_INCREMENT don't need to be provided
    }

    // Check for AUTO_INCREMENT
    if (def.includes('AUTO_INCREMENT')) {
      field.required = false;
      field.hasDefault = true;
    }

    // Check for DEFAULT values
    if (def.includes('DEFAULT')) {
      field.hasDefault = true;
      field.required = false;
    }

    // Extract data type
    if (def.includes('BIGINT')) {
      field.dataType = 'BIGINT';
    } else if (def.includes('INT')) {
      field.dataType = 'INTEGER';
    } else if (def.includes('VARCHAR')) {
      field.dataType = 'VARCHAR';
      const match = def.match(/VARCHAR\((\d+)\)/);
      if (match) {
        field.maxLength = parseInt(match[1]);
      }
    } else if (def.includes('LONGTEXT')) {
      field.dataType = 'LONGTEXT';
    } else if (def.includes('TEXT')) {
      field.dataType = 'TEXT';
    } else if (def.includes('DATE')) {
      field.dataType = 'DATE';
    } else if (def.includes('TIME')) {
      field.dataType = 'TIME';
    } else if (def.includes('TIMESTAMP')) {
      field.dataType = 'TIMESTAMP';
    } else if (def.includes('DATETIME')) {
      field.dataType = 'DATETIME';
    } else if (def.includes('DECIMAL')) {
      field.dataType = 'DECIMAL';
    } else if (def.includes('BOOLEAN')) {
      field.dataType = 'BOOLEAN';
    } else if (def.includes('ENUM')) {
      field.dataType = 'ENUM';
    }

    // Extract REFERENCES information
    const referencesMatch = fieldDefinition.match(/REFERENCES\s+(\w+)\((\w+)\)/i);
    if (referencesMatch) {
      field.references = {
        table: referencesMatch[1],
        column: referencesMatch[2]
      };
    }

    fields.push(field);
  });

  return fields;
}

// New endpoint to get table schema fields
const getTableSchema = async (req, res) => {
  try {
    const { tableName } = req.params;
    
    console.log(`[INFO] Fetching schema for table: ${tableName}`);

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: 'Table name is required',
        code: 'NO_TABLE_NAME'
      });
    }

    // Parse schema fields from schema.js
    const schemaFields = parseSchemaFields(tableName);

    if (!schemaFields) {
      return res.status(404).json({
        success: false,
        error: `Table '${tableName}' not found in schema`,
        code: 'TABLE_NOT_IN_SCHEMA'
      });
    }

    // Also get actual database column information for comparison
    let databaseColumns = [];
    try {
      const columnsQuery = `
        SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          IS_NULLABLE, 
          COLUMN_DEFAULT,
          CHARACTER_MAXIMUM_LENGTH,
          COLUMN_KEY,
          EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `;

      const [columnsResults] = await connection.query(columnsQuery, [tableName]);
      databaseColumns = columnsResults;
    } catch (dbError) {
      console.warn(`[WARN] Could not fetch database schema for ${tableName}:`, dbError.message);
      // Continue with schema.js data only
    }

    // Combine schema.js information with database information
    const enhancedFields = schemaFields.map(field => {
      const dbColumn = databaseColumns.find(col => col.COLUMN_NAME === field.name);
      
      return {
        ...field,
        // Override with actual database information if available
        ...(dbColumn && {
          actualDataType: dbColumn.DATA_TYPE,
          actualNullable: dbColumn.IS_NULLABLE === 'YES',
          actualDefault: dbColumn.COLUMN_DEFAULT,
          actualMaxLength: dbColumn.CHARACTER_MAXIMUM_LENGTH,
          isPrimaryKey: dbColumn.COLUMN_KEY === 'PRI',
          isAutoIncrement: dbColumn.EXTRA?.includes('auto_increment') || false
        })
      };
    });

    // Categorize fields
    const requiredFields = enhancedFields.filter(field => 
      field.required && !field.isPrimary && !field.hasDefault && !field.isAutoIncrement
    );
    const optionalFields = enhancedFields.filter(field => 
      !field.required || field.hasDefault || (field.actualNullable && !field.isPrimary)
    );
    const systemFields = enhancedFields.filter(field => 
      field.isPrimary || field.isAutoIncrement || field.name.includes('_id') && field.isPrimary
    );

    console.log(`[INFO] Schema parsed for ${tableName}: ${enhancedFields.length} total fields, ${requiredFields.length} required, ${optionalFields.length} optional`);

    res.json({
      success: true,
      tableName: tableName,
      fields: enhancedFields,
      categorized: {
        required: requiredFields,
        optional: optionalFields,
        system: systemFields
      },
      summary: {
        totalFields: enhancedFields.length,
        requiredFields: requiredFields.length,
        optionalFields: optionalFields.length,
        systemFields: systemFields.length
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to get table schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table schema',
      message: error.message,
      code: 'SCHEMA_FETCH_ERROR'
    });
  }
};

// Enhanced validation function with detailed error reporting
function validateDataWithDetails(data, columnInfo) {
  const errors = [];
  const warnings = [];
  const validatedData = [];
  const emptyRowsInfo = [];
  const missingDataInfo = [];

  console.log(`[INFO] Starting detailed validation for ${data.length} rows`);

  data.forEach((row, rowIndex) => {
    const actualRowNumber = rowIndex + 2; // +2 because Excel starts from 1 and we skip header
    const validatedRow = {};
    const rowErrors = [];
    const missingFields = [];
    let totalEmptyFields = 0;
    let totalFields = 0;

    // Check if entire row is empty
    const rowValues = Object.values(row);
    const nonEmptyValues = rowValues.filter(value => 
      value !== null && value !== undefined && value !== '' && value !== 'NULL'
    );

    if (nonEmptyValues.length === 0) {
      emptyRowsInfo.push({
        rowNumber: actualRowNumber,
        message: `Row ${actualRowNumber} is completely empty`
      });
      return; // Skip completely empty rows
    }

    // Validate each column
    Object.keys(row).forEach(column => {
      const value = row[column];
      const columnDef = columnInfo.find(col => col.COLUMN_NAME === column);
      totalFields++;

      if (!columnDef) {
        rowErrors.push(`Unknown column: ${column}`);
        return;
      }

      // Check for empty/null values
      if (value === null || value === undefined || value === '' || value === 'NULL') {
        totalEmptyFields++;
        
        if (columnDef.IS_NULLABLE === 'NO' && !columnDef.COLUMN_DEFAULT) {
          rowErrors.push(`Column '${column}' cannot be empty (required field)`);
          missingFields.push(column);
        } else {
          validatedRow[column] = null;
          // Log missing optional field
          missingFields.push(`${column} (optional)`);
        }
        return;
      }

      // Validate data types
      const dataType = columnDef.DATA_TYPE.toLowerCase();
      let validatedValue = value;

      try {
        switch (dataType) {
          case 'int':
          case 'bigint':
          case 'tinyint':
          case 'smallint':
          case 'mediumint':
            validatedValue = parseInt(value);
            if (isNaN(validatedValue)) {
              rowErrors.push(`Column '${column}' must be a number, got: ${value}`);
            }
            break;
          
          case 'decimal':
          case 'float':
          case 'double':
            validatedValue = parseFloat(value);
            if (isNaN(validatedValue)) {
              rowErrors.push(`Column '${column}' must be a decimal number, got: ${value}`);
            }
            break;
          
          case 'varchar':
          case 'text':
          case 'longtext':
          case 'mediumtext':
          case 'char':
            validatedValue = String(value).trim();
            // Check length constraints
            if (columnDef.CHARACTER_MAXIMUM_LENGTH && validatedValue.length > columnDef.CHARACTER_MAXIMUM_LENGTH) {
              rowErrors.push(`Column '${column}' exceeds maximum length of ${columnDef.CHARACTER_MAXIMUM_LENGTH} characters`);
            }
            break;
          
          case 'date':
          case 'datetime':
          case 'timestamp':
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              rowErrors.push(`Column '${column}' must be a valid date, got: ${value}`);
            } else {
              validatedValue = date.toISOString().slice(0, 19).replace('T', ' ');
            }
            break;
          
          case 'json':
            if (typeof value === 'object') {
              validatedValue = JSON.stringify(value);
            } else if (typeof value === 'string') {
              try {
                JSON.parse(value);
                validatedValue = value;
              } catch {
                rowErrors.push(`Column '${column}' must be valid JSON, got: ${value}`);
              }
            }
            break;
          
          default:
            validatedValue = String(value);
        }
        
        validatedRow[column] = validatedValue;
      } catch (error) {
        rowErrors.push(`Data type validation failed for column '${column}': ${error.message}`);
      }
    });

    // Record missing data information
    if (missingFields.length > 0) {
      missingDataInfo.push({
        rowNumber: actualRowNumber,
        missingFields: missingFields,
        emptyFieldCount: totalEmptyFields,
        totalFieldCount: totalFields,
        completenessPercentage: Math.round(((totalFields - totalEmptyFields) / totalFields) * 100)
      });
    }

    // Add row-level warnings for incomplete data
    if (totalEmptyFields > 0 && rowErrors.length === 0) {
      warnings.push({
        type: 'incomplete_data',
        rowNumber: actualRowNumber,
        message: `Row ${actualRowNumber} has ${totalEmptyFields} empty fields out of ${totalFields} total fields`
      });
    }

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber: actualRowNumber,
        errors: rowErrors,
        missingFields: missingFields
      });
    } else {
      validatedData.push(validatedRow);
    }
  });

  console.log(`[INFO] Validation completed: ${validatedData.length} valid rows, ${errors.length} error rows, ${emptyRowsInfo.length} empty rows`);

  return { 
    validatedData, 
    errors, 
    warnings,
    emptyRowsInfo,
    missingDataInfo,
    summary: {
      totalRows: data.length,
      validRows: validatedData.length,
      errorRows: errors.length,
      emptyRows: emptyRowsInfo.length,
      incompleteRows: missingDataInfo.length
    }
  };
}

// Enhanced function to read and validate Excel data
async function loadAndValidateExcelData(filePath) {
  console.log('[INFO] Starting Excel file processing:', filePath);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('Excel file not found at specified path');
    }

    // Read the workbook
    const workbook = XLSX.readFile(filePath);
    console.log('[INFO] Excel workbook loaded successfully');
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }

    // Use first sheet by default
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('[INFO] Processing sheet:', sheetName);

    if (!worksheet) {
      throw new Error(`Sheet '${sheetName}' not found in Excel file`);
    }

    // Convert to JSON with options for better data handling
    const excelData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Get array of arrays first
      defval: null, // Use null for empty cells
      raw: false // Don't use raw values to avoid date issues
    });

    if (excelData.length === 0) {
      throw new Error('Excel sheet is empty');
    }

    // Extract headers and data rows
    const headers = excelData[0];
    const dataRows = excelData.slice(1);

    if (!headers || headers.length === 0) {
      throw new Error('Excel sheet has no headers');
    }

    if (dataRows.length === 0) {
      throw new Error('Excel sheet has no data rows');
    }

    // Convert back to object format with proper header mapping
    const processedData = dataRows.map((row, index) => {
      const rowObject = {};
      headers.forEach((header, colIndex) => {
        if (header && header.trim()) {
          rowObject[header.trim()] = row[colIndex] || null;
        }
      });
      return rowObject;
    }).filter(row => {
      // Remove completely empty rows
      return Object.values(row).some(value => value !== null && value !== '');
    });

    console.log(`[INFO] Excel processing completed: ${processedData.length} data rows found`);
    
    return {
      data: processedData,
      headers: headers.filter(h => h && h.trim()),
      originalRowCount: dataRows.length,
      processedRowCount: processedData.length
    };

  } catch (error) {
    console.error('[ERROR] Excel processing failed:', error);
    throw new Error(`Excel processing failed: ${error.message}`);
  }
}

// Enhanced duplicate checking with detailed reporting
const checkDuplicateEntries = async (tableName, data, tableColumns) => {
  console.log('[INFO] Checking for duplicate entries with detailed reporting...');
  
  try {
    // Get primary key columns
    const uniqueQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND CONSTRAINT_NAME = 'PRIMARY'
    `;

    const [uniqueResults] = await connection.query(uniqueQuery, [tableName]);
    
    // Get unique constraints
    const uniqueConstraintsQuery = `
      SELECT COLUMN_NAME, CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND CONSTRAINT_NAME != 'PRIMARY'
    `;

    const [uniqueConstraints] = await connection.query(uniqueConstraintsQuery, [tableName]);
    
    // Define columns to check for duplicates
    const primaryKeys = uniqueResults.map(col => col.COLUMN_NAME);
    const uniqueKeys = uniqueConstraints.map(col => col.COLUMN_NAME);
    const commonUniqueFields = ['id', 'student_id', 'email', 'username', 'seat_no', 'institute_id', 'phone'];
    
    const checkColumns = [...new Set([...primaryKeys, ...uniqueKeys, ...commonUniqueFields])];
    
    // Filter to only columns that exist in both table and data
    const availableCheckColumns = checkColumns.filter(col => {
      const existsInTable = tableColumns.some(tableCol => tableCol.COLUMN_NAME === col);
      const existsInData = data.length > 0 && data[0].hasOwnProperty(col);
      return existsInTable && existsInData;
    });

    if (availableCheckColumns.length === 0) {
      console.log('[INFO] No unique columns found for duplicate checking');
      return { duplicates: [], internalDuplicates: [] };
    }

    console.log(`[INFO] Checking duplicates for columns: ${availableCheckColumns.join(', ')}`);

    const duplicates = [];
    const internalDuplicates = [];

    // Check for duplicates within the Excel data itself
    for (const column of availableCheckColumns) {
      const columnValues = data
        .map((row, index) => ({ value: row[column], rowNumber: index + 2 }))
        .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
      
      // Find internal duplicates
      const valueOccurrences = {};
      columnValues.forEach(item => {
        if (!valueOccurrences[item.value]) {
          valueOccurrences[item.value] = [];
        }
        valueOccurrences[item.value].push(item.rowNumber);
      });

      const internalDuplicatesForColumn = Object.entries(valueOccurrences)
        .filter(([value, rows]) => rows.length > 1)
        .map(([value, rows]) => ({
          column: column,
          value: value,
          rowNumbers: rows,
          count: rows.length
        }));

      if (internalDuplicatesForColumn.length > 0) {
        internalDuplicates.push(...internalDuplicatesForColumn);
      }

      // Check against existing database records
      const uniqueValues = [...new Set(columnValues.map(item => item.value))];
      
      if (uniqueValues.length > 0) {
        const placeholders = uniqueValues.map(() => '?').join(',');
        const duplicateQuery = `SELECT ${column} FROM ${tableName} WHERE ${column} IN (${placeholders})`;
        
        const [dupResults] = await connection.query(duplicateQuery, uniqueValues);
        
        if (dupResults.length > 0) {
          const duplicateValues = dupResults.map(record => record[column]);
          
          // Find which rows contain these duplicate values
          const affectedRows = data
            .map((row, index) => ({ value: row[column], rowNumber: index + 2 }))
            .filter(item => duplicateValues.includes(item.value))
            .map(item => item.rowNumber);

          duplicates.push({
            column: column,
            duplicateValues: duplicateValues,
            count: duplicateValues.length,
            affectedRows: affectedRows
          });
        }
      }
    }

    console.log(`[INFO] Duplicate check completed: ${duplicates.length} database conflicts, ${internalDuplicates.length} internal conflicts`);
    return { duplicates, internalDuplicates };

  } catch (error) {
    console.error('[ERROR] Duplicate check failed:', error);
    return { duplicates: [], internalDuplicates: [], error: error.message };
  }
};

// Enhanced function to insert Excel data using bulk operations
const insertExcelData = async (tableName, data, columnNames) => {
  console.log(`[INFO] Starting bulk insert for table: ${tableName}`);
  
  try {
    // Filter columns that exist in both Excel and table
    const validColumns = columnNames.filter(col => 
      data.length > 0 && data[0].hasOwnProperty(col)
    );
    
    if (validColumns.length === 0) {
      throw new Error('No matching columns found between Excel and database table');
    }

    console.log(`[INFO] Valid columns for insert: ${validColumns.join(', ')}`);

    // Prepare bulk insert data
    const insertValues = data.map(row => 
      validColumns.map(col => {
        const value = row[col];
        return (value === null || value === undefined || value === '' || value === 'NULL') ? null : value;
      })
    );

    // Use batch processing for large datasets
    const batchSize = 100;
    let totalInserted = 0;
    const batches = [];
    
    for (let i = 0; i < insertValues.length; i += batchSize) {
      batches.push(insertValues.slice(i, i + batchSize));
    }

    console.log(`[INFO] Processing ${batches.length} batches of ${batchSize} records each`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        const placeholders = batch.map(() => `(${validColumns.map(() => '?').join(',')})`).join(',');
        const flatValues = batch.flat();
        
        const insertQuery = `
          INSERT INTO ${tableName} (${validColumns.join(',')}) 
          VALUES ${placeholders}
        `;

        const [result] = await connection.query(insertQuery, flatValues);
        totalInserted += result.affectedRows;
        
        console.log(`[INFO] Batch ${batchIndex + 1}/${batches.length} completed: ${result.affectedRows} records inserted`);
        
      } catch (batchError) {
        console.error(`[ERROR] Batch ${batchIndex + 1} failed:`, batchError);
        
        // Try individual inserts for failed batch
        for (const row of batch) {
          try {
            const singleInsertQuery = `
              INSERT INTO ${tableName} (${validColumns.join(',')}) 
              VALUES (${validColumns.map(() => '?').join(',')})
            `;
            
            const [singleResult] = await connection.query(singleInsertQuery, row);
            if (singleResult.affectedRows > 0) {
              totalInserted++;
            }
          } catch (singleError) {
            console.error('[ERROR] Individual insert failed:', singleError.message);
          }
        }
      }
    }

    console.log(`[INFO] Bulk insert completed: ${totalInserted} total records inserted`);
    return totalInserted;

  } catch (error) {
    console.error('[ERROR] Bulk insert failed:', error);
    throw error;
  }
};

// Get all available tables from database
const getAvailableTables = async (req, res) => {
  try {
    console.log('[INFO] Fetching available tables...');
    
    const query = `
      SELECT 
        TABLE_NAME as tableName,
        TABLE_COMMENT as tableComment,
        TABLE_ROWS as estimatedRows
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    
    const [results] = await connection.query(query);
    
    console.log(`[INFO] Found ${results.length} tables`);
    
    res.json({
      success: true,
      tables: results,
      count: results.length
    });
    
  } catch (error) {
    console.error('[ERROR] Failed to fetch tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available tables',
      message: error.message
    });
  }
};

// Main function to process Excel data with comprehensive validation
const processExcelData = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    console.log('[INFO] Excel data processing request received with enhanced validation');

    // Validate request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No Excel file uploaded. Please select a file.',
        code: 'NO_FILE'
      });
    }

    uploadedFilePath = req.file.path;
    const { targetTable } = req.body;
    
    if (!targetTable || targetTable.trim() === '') {
      safeFileCleanup(uploadedFilePath);
      return res.status(400).json({
        success: false,
        error: 'Target table is required. Please select a table.',
        code: 'NO_TARGET_TABLE'
      });
    }

    console.log(`[INFO] Processing file: ${req.file.filename} for table: ${targetTable}`);

    // Load and validate Excel data
    const excelResult = await loadAndValidateExcelData(uploadedFilePath);
    const { data: excelData, headers: excelHeaders } = excelResult;

    // Verify target table exists and get structure
    const tableCheckQuery = `
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `;

    const [tableResults] = await connection.query(tableCheckQuery, [targetTable]);

    if (tableResults.length === 0) {
      safeFileCleanup(uploadedFilePath);
      return res.status(400).json({
        success: false,
        error: `Table '${targetTable}' does not exist in the database`,
        code: 'TABLE_NOT_FOUND'
      });
    }

    // Get detailed table column information
    const columnsQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const [columnsResults] = await connection.query(columnsQuery, [targetTable]);
    const columnNames = columnsResults.map(col => col.COLUMN_NAME);
    
    console.log(`[INFO] Table structure loaded: ${columnNames.length} columns`);

    // Validate Excel columns against table columns
    const missingColumns = excelHeaders.filter(header => !columnNames.includes(header));
    const availableColumns = excelHeaders.filter(header => columnNames.includes(header));
    
    if (availableColumns.length === 0) {
      safeFileCleanup(uploadedFilePath);
      return res.status(400).json({
        success: false,
        error: 'No matching columns found between Excel file and database table',
        code: 'NO_MATCHING_COLUMNS',
        details: {
          excelColumns: excelHeaders,
          tableColumns: columnNames,
          missingColumns: missingColumns
        }
      });
    }

    // Enhanced validation with detailed error reporting
    const validationResult = validateDataWithDetails(excelData, columnsResults);
    
    if (validationResult.errors.length > 0) {
      safeFileCleanup(uploadedFilePath);
      return res.status(400).json({
        success: false,
        error: 'Data validation failed',
        code: 'VALIDATION_FAILED',
        validationDetails: {
          errors: validationResult.errors.slice(0, 20), // Limit to first 20 errors
          warnings: validationResult.warnings,
          emptyRows: validationResult.emptyRowsInfo,
          missingData: validationResult.missingDataInfo.slice(0, 20), // Limit to first 20
          summary: validationResult.summary,
          totalErrors: validationResult.errors.length,
          totalWarnings: validationResult.warnings.length
        }
      });
    }

    // Enhanced duplicate checking
    const duplicateResult = await checkDuplicateEntries(targetTable, validationResult.validatedData, columnsResults);
    
    if (duplicateResult.duplicates.length > 0 || duplicateResult.internalDuplicates.length > 0) {
      safeFileCleanup(uploadedFilePath);
      return res.status(400).json({
        success: false,
        error: 'Duplicate entries found',
        code: 'DUPLICATE_ENTRIES',
        duplicateDetails: {
          databaseDuplicates: duplicateResult.duplicates,
          internalDuplicates: duplicateResult.internalDuplicates,
          summary: {
            databaseConflicts: duplicateResult.duplicates.length,
            internalConflicts: duplicateResult.internalDuplicates.length
          }
        }
      });
    }

    // Insert validated data
    console.log(`[INFO] Starting data insertion: ${validationResult.validatedData.length} records`);
    const insertedCount = await insertExcelData(targetTable, validationResult.validatedData, columnNames);

    // Clean up uploaded file
    safeFileCleanup(uploadedFilePath);

    console.log(`[INFO] Excel processing completed successfully: ${insertedCount} records inserted`);

    res.json({
      success: true,
      message: 'Excel data uploaded and processed successfully',
      summary: {
        fileName: req.file.originalname,
        targetTable: targetTable,
        totalExcelRows: excelResult.originalRowCount,
        processedRows: excelResult.processedRowCount,
        validatedRows: validationResult.validatedData.length,
        insertedRecords: insertedCount,
        matchedColumns: availableColumns.length,
        skippedColumns: missingColumns,
        warnings: validationResult.warnings,
        emptyRowsSkipped: validationResult.emptyRowsInfo.length,
        incompleteDataRows: validationResult.missingDataInfo.length
      }
    });

  } catch (error) {
    console.error('[ERROR] Excel processing failed:', error);
    
    // Ensure file cleanup on any error
    safeFileCleanup(uploadedFilePath);
    
    let errorCode = 'PROCESSING_ERROR';
    let statusCode = 500;
    
    if (error.message.includes('Excel processing failed')) {
      errorCode = 'EXCEL_PARSING_ERROR';
      statusCode = 400;
    } else if (error.message.includes('Database')) {
      errorCode = 'DATABASE_ERROR';
    } else if (error.message.includes('validation')) {
      errorCode = 'VALIDATION_ERROR';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to process Excel file',
      message: error.message,
      code: errorCode
    });
  }
};

module.exports = {
  getAvailableTables,
  getTableSchema,
  processExcelData
};
