// controllers/newDepartment_Controller.js

const connection = require('../config/db1');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { Readable } = require('stream');

// ========================================
// DEPARTMENT CONTROLLERS
// ========================================

exports.createDepartment = async (req, res) => {
    const { departmentId, departmentName, departmentPassword, logo, departmentStatus = true } = req.body;

    if (!departmentId || !departmentName || !departmentPassword) {
        return res.status(400).json({ 
            message: "Department ID, Name, and Password are required" 
        });
    }

    try {
        const [existing] = await connection.query(
            'SELECT * FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                message: "Department ID already exists" 
            });
        }

        const [result] = await connection.query(
            `INSERT INTO departmentdb (departmentId, departmentName, departmentPassword, logo, departmentStatus) 
             VALUES (?, ?, ?, ?, ?)`,
            [departmentId, departmentName, departmentPassword, logo, departmentStatus ? 1 : 0]
        );

        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: {
                departmentId,
                departmentName,
                departmentPassword,
                departmentStatus
            }
        });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ 
            success: false,
            message: "Error creating department", 
            error: error.message 
        });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const [departments] = await connection.query('SELECT * FROM departmentdb');
        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ 
            success: false,
            message: "Error fetching departments", 
            error: error.message 
        });
    }
};

// ========================================
// BATCH CONTROLLERS
// ========================================

// ✅ FIXED: Function to verify department exists in database
async function validateDepartmentExists(departmentId) {
    try {
        console.log(`🔍 Checking if department ${departmentId} exists...`);
        
        const [result] = await connection.query(
            'SELECT departmentId, departmentName FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );
        
        const exists = result.length > 0;
        console.log(`${exists ? '✅' : '❌'} Department ${departmentId} ${exists ? 'found' : 'not found'}`);
        
        // Return the expected object structure
        return {
            exists: exists,
            department: exists ? result[0] : null
        };
    } catch (error) {
        console.error('Error checking department:', error);
        return {
            exists: false,
            department: null
        };
    }
}

// ✅ Validation function for batch data
function validateBatchDataOnly(batch, rowNum) {
    const requiredFields = ['batchNo', 'batchdate', 'reporting_time', 'start_time', 'end_time'];
    
    console.log(`📋 Validating row ${rowNum}:`, {
        batchNo: batch.batchNo,
        batchdate: batch.batchdate,
        reporting_time: batch.reporting_time,
        start_time: batch.start_time,
        end_time: batch.end_time
    });
    
    for (const field of requiredFields) {
        if (!batch[field] || batch[field].toString().trim() === '') {
            return {
                isValid: false,
                error: `Row ${rowNum}: Missing or empty required field '${field}'`
            };
        }
    }
    
    return { isValid: true };
}

// ✅ Parse Excel file
function parseExcel(buffer) {
    return new Promise((resolve, reject) => {
        try {
            console.log('📊 Parsing Excel file...');
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            console.log(`✅ Excel parsed: ${data.length} rows found`);
            resolve(data);
        } catch (error) {
            console.error('❌ Error parsing Excel:', error);
            reject(error);
        }
    });
}

// ✅ Parse CSV file
function parseCSV(buffer) {
    return new Promise((resolve, reject) => {
        try {
            console.log('📄 Parsing CSV file...');
            const data = [];
            const readable = new Readable();
            readable.push(buffer);
            readable.push(null);

            readable
                .pipe(csv())
                .on('data', (row) => data.push(row))
                .on('end', () => {
                    console.log(`✅ CSV parsed: ${data.length} rows found`);
                    resolve(data);
                })
                .on('error', (error) => {
                    console.error('❌ Error parsing CSV:', error);
                    reject(error);
                });
        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            reject(error);
        }
    });
}

// ✅ Convert time format
function convertExcelTimeToHHMMSS(timeValue) {
    if (!timeValue) return null;
    
    // If already HH:MM or HH:MM:SS format
    if (typeof timeValue === 'string') {
        if (timeValue.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
            return timeValue;
        }
    }
    
    // Convert Excel time number to HH:MM
    const timeNum = parseFloat(timeValue);
    if (!isNaN(timeNum)) {
        const hours = Math.floor(timeNum * 24);
        const minutes = Math.floor((timeNum * 24 - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    return null;
}

// ✅ Enhanced bulk upload that checks departments first, then batches
exports.bulkUploadBatchesComplete = async (req, res) => {
    console.log('🚀 Starting bulk batch upload...');

    if (!req.file) {
        return res.status(400).json({
            message: "❌ No file uploaded",
            success: false
        });
    }

    const file = req.file;
    const manualDepartmentId = req.body.manualDepartmentId;

    try {
        let batches = [];

        // Parse file
        if (file.mimetype === 'text/csv') {
            batches = await parseCSV(file.buffer);
        } else {
            batches = await parseExcel(file.buffer);
        }

        if (!batches || batches.length === 0) {
            return res.status(400).json({
                success: false,
                message: "❌ No data found in uploaded file"
            });
        }

        console.log(`📋 Found ${batches.length} rows in Excel file\n`);

        // ✅ STEP 1: COLLECT AND VALIDATE ALL DEPARTMENTS FIRST
        console.log('🔐 STEP 1: Checking all departments from Excel...');

        const departmentErrors = [];
        const uniqueDepartments = new Set();
        let departmentIdToUse = null;
        let validatedDepartment = null;

        // If manual department ID provided, verify it first
        if (manualDepartmentId) {
            console.log(`\n🔍 Verifying manual department: ${manualDepartmentId}`);
            const deptCheck = await validateDepartmentExists(manualDepartmentId);
            if (!deptCheck.exists) {
                console.log(`❌ Manual department ${manualDepartmentId} not found!`);
                return res.status(400).json({
                    success: false,
                    message: `❌ Error: Department ID ${manualDepartmentId} does not exist in database.`,
                    departmentErrors: [{
                        departmentId: manualDepartmentId,
                        error: 'Department not found in database'
                    }],
                    summary: {
                        totalRows: batches.length,
                        departmentsChecked: 1,
                        validDepartments: 0,
                        invalidDepartments: 1
                    }
                });
            }
            departmentIdToUse = manualDepartmentId;
            validatedDepartment = deptCheck.department;
            console.log(`✅ Manual department verified: ${manualDepartmentId} - ${validatedDepartment.departmentName}`);
        } else {
            // Collect all unique departments from Excel
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const rowNum = i + 2;

                if (!batch.departmentId) {
                    departmentErrors.push({
                        row: rowNum,
                        error: 'Missing departmentId',
                        batchNo: batch.batchNo || batch.batchno || 'Unknown'
                    });
                } else {
                    uniqueDepartments.add(batch.departmentId);
                }
            }

            // If missing department errors, return early
            if (departmentErrors.length > 0) {
                console.log('❌ Missing department IDs in Excel:');
                departmentErrors.forEach(err => console.log(`   Row ${err.row}: ${err.error}`));

                return res.status(400).json({
                    success: false,
                    message: '❌ Missing department IDs in Excel file',
                    departmentErrors: departmentErrors,
                    summary: {
                        totalRows: batches.length,
                        rowsWithMissingDepartment: departmentErrors.length
                    }
                });
            }

            console.log(`📊 Found ${uniqueDepartments.size} unique departments in Excel:`, [...uniqueDepartments]);

            // Verify each department exists in database
            const departmentCheckResults = [];
            for (const deptId of uniqueDepartments) {
                console.log(`🔍 Verifying department: ${deptId}`);
                const deptCheck = await validateDepartmentExists(deptId);
                departmentCheckResults.push({
                    departmentId: deptId,
                    exists: deptCheck.exists,
                    department: deptCheck.department
                });

                if (!deptCheck.exists) {
                    console.log(`❌ Department ${deptId} not found in database!`);
                    departmentErrors.push({
                        departmentId: deptId,
                        error: 'Department not found in database'
                    });
                } else {
                    console.log(`✅ Department ${deptId} verified: ${deptCheck.department.departmentName}`);
                }
            }

            // If any departments are invalid, return early
            if (departmentErrors.length > 0) {
                console.log('\n❌ Some departments not found in database:');
                departmentErrors.forEach(err => console.log(`   - ${err.departmentId}`));

                return res.status(400).json({
                    success: false,
                    message: '❌ Some departments in Excel do not exist in database',
                    departmentErrors: departmentErrors,
                    validDepartments: departmentCheckResults.filter(r => r.exists).map(r => r.departmentId),
                    invalidDepartments: departmentCheckResults.filter(r => !r.exists).map(r => r.departmentId),
                    summary: {
                        totalRows: batches.length,
                        uniqueDepartments: uniqueDepartments.size,
                        validDepartments: departmentCheckResults.filter(r => r.exists).length,
                        invalidDepartments: departmentCheckResults.filter(r => !r.exists).length
                    }
                });
            }

            console.log(`\n✅ ALL DEPARTMENTS VERIFIED! All ${uniqueDepartments.size} departments exist in database.\n`);
        }

        // ✅ STEP 2: NOW VALIDATE AND PROCESS BATCHES
        console.log('📋 STEP 2: Validating and processing batches...\n');

        const batchErrors = [];
        const successful = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const rowNum = i + 2;

            try {
                console.log(`\n--- Processing Row ${rowNum} ---`);

                // Get the appropriate department ID
                const currentDepartmentId = departmentIdToUse || batch.departmentId;

                // ✅ FIXED: Use the corrected validation function that handles both field naming conventions
                const validation = validateBatchDataOnly(batch, rowNum);
                if (!validation.isValid) {
                    console.log(`❌ Batch validation failed: ${validation.error}`);
                    batchErrors.push({
                        row: rowNum,
                        error: validation.error,
                        batchNo: batch.batchNo || batch.batchno || 'Unknown',
                        departmentId: currentDepartmentId
                    });
                    continue;
                }

                // Get batch number using both possible field names
                const batchNoValue = batch.batchNo || batch.batchno;
                console.log(`✅ Batch validation passed for batch: ${batchNoValue}`);

                // Normalize batch data
                const normalizedBatch = {
                    batchNo: String(batchNoValue).trim(),
                    departmentId: currentDepartmentId,
                    batchdate: batch.batchdate || batch.batchDate,
                    reporting_time: convertExcelTimeToHHMMSS(batch.reporting_time || batch.reportingTime),
                    start_time: convertExcelTimeToHHMMSS(batch.start_time || batch.startTime),
                    end_time: convertExcelTimeToHHMMSS(batch.end_time || batch.endTime),
                    batchstatus: batch.batchstatus || batch.batchStatus || true
                };

                console.log(`📝 Normalized batch:`, normalizedBatch);

                // ✅ FIXED: Check if batch already exists using batchNo column (not id)
                const [existing] = await connection.query(
                    'SELECT batchNo FROM batchdb WHERE batchNo = ? AND departmentId = ?',
                    [normalizedBatch.batchNo, currentDepartmentId]
                );

                if (existing.length > 0) {
                    const errMsg = `Batch ${normalizedBatch.batchNo} already exists for department ${currentDepartmentId}`;
                    console.log(`⚠️ ${errMsg}`);
                    batchErrors.push({
                        row: rowNum,
                        error: errMsg,
                        batchNo: normalizedBatch.batchNo,
                        departmentId: currentDepartmentId
                    });
                    continue;
                }

                // Insert batch into database
                console.log(`💾 Inserting batch into database...`);

                const [result] = await connection.query(
                    `INSERT INTO batchdb 
                    (batchNo, departmentId, batchdate, reporting_time, start_time, end_time, batchstatus) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        normalizedBatch.batchNo,
                        currentDepartmentId,
                        normalizedBatch.batchdate,
                        normalizedBatch.reporting_time,
                        normalizedBatch.start_time,
                        normalizedBatch.end_time,
                        normalizedBatch.batchstatus ? 1 : 0
                    ]
                );

                // ✅ FIXED: Remove id from successful response since table doesn't have id column
                successful.push({
                    row: rowNum,
                    batchNo: normalizedBatch.batchNo,
                    departmentId: currentDepartmentId,
                    status: 'inserted'
                });

                console.log(`✅ Row ${rowNum}: Batch ${normalizedBatch.batchNo} inserted successfully for department ${currentDepartmentId}`);

            } catch (rowError) {
                console.error(`❌ Error processing row ${rowNum}:`, rowError.message);
                batchErrors.push({
                    row: rowNum,
                    error: rowError.message,
                    batchNo: batch.batchNo || batch.batchno || 'Unknown',
                    departmentId: departmentIdToUse || batch.departmentId
                });
            }
        }

        // ✅ Send final response
        const responseData = {
            success: batchErrors.length === 0,
            message: `Batch upload completed. ${successful.length} successful, ${batchErrors.length} failed.`,
            departmentCheck: {
                status: 'completed',
                method: manualDepartmentId ? 'manual' : 'from_excel',
                departmentsUsed: manualDepartmentId ? [manualDepartmentId] : [...uniqueDepartments]
            },
            data: successful,
            errors: batchErrors,
            summary: {
                totalRows: batches.length,
                successful: successful.length,
                failed: batchErrors.length,
                departmentsProcessed: manualDepartmentId ? 1 : uniqueDepartments.size
            }
        };

        console.log('\n📊 FINAL UPLOAD SUMMARY:');
        console.log(`   Total Rows: ${batches.length}`);
        console.log(`   Successful: ${successful.length}`);
        console.log(`   Failed: ${batchErrors.length}`);
        console.log(`   Departments: ${manualDepartmentId ? `Manual: ${manualDepartmentId}` : `From Excel: ${uniqueDepartments.size} departments`}`);
        console.log('✅ Bulk upload completed\n');

        res.json(responseData);

    } catch (error) {
        console.error('❌ Error in bulkUploadBatchesComplete:', error);
        res.status(500).json({
            success: false,
            message: '❌ Server error during batch upload',
            error: error.message
        });
    }
};



exports.addBatchesToExistingDepartment = async (req, res) => {
    const { departmentId, batches } = req.body;

    if (!departmentId || !batches || batches.length === 0) {
        return res.status(400).json({ 
            success: false,
            message: "Department ID and batches are required" 
        });
    }

    try {
        // Verify department exists
        const [deptCheck] = await connection.query(
            'SELECT departmentId FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (deptCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Department ID ${departmentId} does not exist`
            });
        }

        const insertedBatches = [];
        const errors = [];

        for (const batch of batches) {
            try {
                const [result] = await connection.query(
                    `INSERT INTO batchdb 
                    (batchNo, departmentId, batchdate, reporting_time, start_time, end_time, batchstatus) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        batch.batchNo,
                        departmentId,
                        batch.batchdate,
                        batch.reporting_time,
                        batch.start_time,
                        batch.end_time,
                        batch.batchstatus ? 1 : 0
                    ]
                );

                insertedBatches.push({
                    batchNo: batch.batchNo,
                    departmentId: departmentId,
                    id: result.insertId
                });
            } catch (error) {
                errors.push({
                    batchNo: batch.batchNo,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: errors.length === 0,
            message: `${insertedBatches.length} batches added successfully`,
            data: insertedBatches,
            errors: errors
        });
    } catch (error) {
        console.error('Error adding batches:', error);
        res.status(500).json({
            success: false,
            message: "Error adding batches",
            error: error.message
        });
    }
};

exports.getBatches = async (req, res) => {
    try {
        const [batches] = await connection.query('SELECT * FROM batchdb');
        res.json({
            success: true,
            data: batches
        });
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching batches",
            error: error.message
        });
    }
};

// ========================================
// CONTROLLER CONTROLLERS
// ========================================

// ✅ Validation function for controller data
function validateControllerData(controller, rowNum) {
    const requiredFields = ['controller_name', 'controller_contact', 'controller_email', 'controller_pass', 'center'];
    
    for (const field of requiredFields) {
        if (!controller[field] || controller[field].toString().trim() === '') {
            return {
                isValid: false,
                error: `Row ${rowNum}: Missing or empty required field '${field}'`
            };
        }
    }
    
    return { isValid: true };
}

// ✅ Bulk upload controllers with validation
exports.bulkUploadControllersComplete = async (req, res) => {
    console.log('🚀 Starting bulk controller upload...');
    
    if (!req.file) {
        return res.status(400).json({ 
            message: "❌ No file uploaded", 
            success: false 
        });
    }

    const file = req.file;

    try {
        let controllers = [];

        // Parse file
        if (file.mimetype === 'text/csv') {
            controllers = await parseCSV(file.buffer);
        } else {
            controllers = await parseExcel(file.buffer);
        }

        if (!controllers || controllers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "❌ No data found in uploaded file"
            });
        }

        const errors = [];
        const successful = [];

        console.log(`📋 Processing ${controllers.length} controller rows...\n`);

        for (let i = 0; i < controllers.length; i++) {
            const controller = controllers[i];
            const rowNum = i + 2;

            try {
                console.log(`\n--- Processing Row ${rowNum} ---`);

                // Validate required fields
                const validation = validateControllerData(controller, rowNum);
                if (!validation.isValid) {
                    console.log(`❌ ${validation.error}`);
                    errors.push({
                        row: rowNum,
                        error: validation.error,
                        controller_name: controller.controller_name || 'Unknown'
                    });
                    continue;
                }

                // Verify department exists
                const departmentId = controller.departmentId;
                if (!departmentId) {
                    const errMsg = `❌ Department ID missing in row ${rowNum}`;
                    console.log(errMsg);
                    errors.push({
                        row: rowNum,
                        error: errMsg,
                        controller_name: controller.controller_name
                    });
                    continue;
                }

                console.log(`🔍 Verifying department ${departmentId}...`);
                const deptExists = await validateDepartmentExists(departmentId);
                if (!deptExists) {
                    const errMsg = `❌ Department ID ${departmentId} does not exist`;
                    console.log(errMsg);
                    errors.push({
                        row: rowNum,
                        error: errMsg,
                        controller_name: controller.controller_name,
                        departmentId: departmentId
                    });
                    continue;
                }

                console.log(`✅ Department verified`);

                // Insert controller
                const [result] = await connection.query(
                    `INSERT INTO controllerdb 
                    (controller_code, controller_contact, controller_email, controller_name, 
                     controller_pass, district, center, departmentId, batchNo, createdAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        controller.controller_code || null,
                        controller.controller_contact,
                        controller.controller_email,
                        controller.controller_name,
                        controller.controller_pass,
                        controller.district || null,
                        controller.center,
                        departmentId,
                        controller.batchNo || null
                    ]
                );

                successful.push({
                    row: rowNum,
                    controller_name: controller.controller_name,
                    departmentId: departmentId,
                    status: 'inserted',
                    id: result.insertId
                });

                console.log(`✅ Row ${rowNum}: Controller inserted successfully`);

            } catch (rowError) {
                console.error(`❌ Error processing row ${rowNum}:`, rowError.message);
                errors.push({
                    row: rowNum,
                    error: rowError.message,
                    controller_name: controller.controller_name || 'Unknown'
                });
            }
        }

        const responseData = {
            success: errors.length === 0,
            message: `Controller upload completed. ${successful.length} successful, ${errors.length} failed.`,
            data: successful,
            errors: errors,
            summary: {
                totalProcessed: controllers.length,
                successful: successful.length,
                failed: errors.length
            }
        };

        console.log('\n📊 Upload Summary:', responseData.summary);

        res.json(responseData);

    } catch (error) {
        console.error('❌ Error in bulkUploadControllersComplete:', error);
        res.status(500).json({
            success: false,
            message: '❌ Server error during controller upload',
            error: error.message
        });
    }
};


// Validate controller database references (departmentId, batchNo, center)
exports.validateControllerReferences = async (req, res) => {
  try {
    const { controllers } = req.body;

    if (!controllers || !Array.isArray(controllers) || controllers.length === 0) {
      return res.status(400).json({
        isValid: false,
        message: 'No controller data provided'
      });
    }

    const errors = [];
    
    // Get all unique values from Excel
    const uniqueDepartmentIds = [...new Set(controllers.map(c => c.departmentId).filter(Boolean))];
    const uniqueBatches = [...new Set(controllers.map(c => `${c.departmentId}-${c.batchNo}`).filter(b => !b.includes('undefined')))];
    const uniqueCenters = [...new Set(controllers.map(c => c.center).filter(Boolean))];

    console.log('Validating controller references:', {
      departments: uniqueDepartmentIds,
      batches: uniqueBatches,
      centers: uniqueCenters
    });

    // 1. Validate Department IDs exist in departmentdb table
    const departments = await connection.query(
      'SELECT departmentId FROM departmentdb WHERE departmentId IN (?)',
      [uniqueDepartmentIds.length > 0 ? uniqueDepartmentIds : [0]]
    );
    const validDepartmentIds = new Set(departments.map(d => d.departmentId));
    console.log('Valid Department IDs:', Array.from(validDepartmentIds));

    // 2. Validate Batch Numbers exist in batchdb table with correct departmentId
    let validBatches = new Set();
    if (uniqueBatches.length > 0) {
      const batchConditions = uniqueBatches.map(b => {
        const [deptId, batchNo] = b.split('-');
        return `(departmentId = ${connection.escape(deptId)} AND batchNo = ${connection.escape(batchNo)})`;
      }).join(' OR ');

      const batches = await connection.query(
        `SELECT departmentId, batchNo FROM batchdb WHERE ${batchConditions}`
      );
      validBatches = new Set(batches.map(b => `${b.departmentId}-${b.batchNo}`));
      console.log('Valid Batches:', Array.from(validBatches));
    }

    // 3. Validate Centers exist in examcenterdb table
    const centers = await connection.query(
      'SELECT center FROM examcenterdb WHERE center IN (?)',
      [uniqueCenters.length > 0 ? uniqueCenters : [0]]
    );
    const validCenters = new Set(centers.map(c => c.center));
    console.log('Valid Centers:', Array.from(validCenters));

    // Validate each row from Excel
    controllers.forEach((controller, index) => {
      const rowNumber = index + 2; // Excel row number (header is row 1)
      const issues = [];

      // Check departmentId
      if (!controller.departmentId) {
        issues.push('Department ID is missing');
      } else if (!validDepartmentIds.has(controller.departmentId)) {
        issues.push(`Department ID '${controller.departmentId}' does not exist in departmentdb table`);
      }

      // Check batchNo (must be valid AND belong to the correct department)
      if (!controller.batchNo) {
        issues.push('Batch Number is missing');
      } else {
        const batchKey = `${controller.departmentId}-${controller.batchNo}`;
        if (!validBatches.has(batchKey)) {
          issues.push(`Batch '${controller.batchNo}' does not exist for Department '${controller.departmentId}' in batchdb table`);
        }
      }

      // Check center (must exist in examcenterdb)
      if (!controller.center) {
        issues.push('Center is missing');
      } else if (!validCenters.has(parseInt(controller.center))) {
        issues.push(`Center '${controller.center}' does not exist in examcenterdb table`);
      }

      if (issues.length > 0) {
        errors.push({
          rowNumber,
          departmentId: controller.departmentId,
          batchNo: controller.batchNo,
          center: controller.center,
          issues
        });
      }
    });

    // Return validation result
    if (errors.length > 0) {
      return res.json({
        isValid: false,
        errors,
        summary: {
          totalRows: controllers.length,
          invalidRows: errors.length,
          validRows: controllers.length - errors.length,
          message: `Found ${errors.length} row(s) with invalid database references`
        }
      });
    }

    return res.json({
      isValid: true,
      message: 'All database references are valid',
      summary: {
        totalRows: controllers.length,
        validRows: controllers.length,
        message: 'All department IDs, batch numbers, and centers exist in the database'
      }
    });

  } catch (error) {
    console.error('Error validating controller references:', error);
    res.status(500).json({
      isValid: false,
      message: 'Error validating controller references',
      error: error.message
    });
  }
};




exports.addControllers = async (req, res) => {
    const { departmentId, batchNo, controllers } = req.body;

    if (!departmentId || !controllers || controllers.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Department ID and controllers are required"
        });
    }

    try {
        // Verify department exists
        const [deptCheck] = await connection.query(
            'SELECT departmentId FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (deptCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Department ID ${departmentId} does not exist`
            });
        }

        const insertedControllers = [];
        const errors = [];

        for (const controller of controllers) {
            try {
                const [result] = await connection.query(
                    `INSERT INTO controllerdb 
                    (controller_code, controller_contact, controller_email, controller_name, 
                     controller_pass, district, center, departmentId, batchNo, createdAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        controller.controller_code,
                        controller.controller_contact,
                        controller.controller_email,
                        controller.controller_name,
                        controller.controller_pass,
                        controller.district,
                        controller.center,
                        departmentId,
                        batchNo
                    ]
                );

                insertedControllers.push({
                    controller_name: controller.controller_name,
                    departmentId: departmentId,
                    id: result.insertId
                });
            } catch (error) {
                errors.push({
                    controller_name: controller.controller_name,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: errors.length === 0,
            message: `${insertedControllers.length} controllers added successfully`,
            data: insertedControllers,
            errors: errors
        });
    } catch (error) {
        console.error('Error adding controllers:', error);
        res.status(500).json({
            success: false,
            message: "Error adding controllers",
            error: error.message
        });
    }
};

exports.getControllers = async (req, res) => {
    try {
        const [controllers] = await connection.query('SELECT * FROM controllerdb');
        res.json({
            success: true,
            data: controllers
        });
    } catch (error) {
        console.error('Error fetching controllers:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching controllers",
            error: error.message
        });
    }
};

exports.getBatchesByDepartment = async (req, res) => {
    const { departmentId } = req.params;

    try {
        const [batches] = await connection.query(
            'SELECT * FROM batchdb WHERE departmentId = ?',
            [departmentId]
        );

        res.json({
            success: true,
            data: batches
        });
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching batches",
            error: error.message
        });
    }
};



// Helper function to generate password based on batchNo and center
function generatePassword(batchNo, center) {
  if (batchNo === 100) {
    return `mock${center}`;
  } else {
    // Generate 6-digit number without zeros (digits 1-9 only)
    let password = '';
    for (let i = 0; i < 6; i++) {
      password += Math.floor(Math.random() * 9) + 1;
    }
    return password;
  }
}

// Controller function to generate and save controllers
exports.generateAndSaveControllers = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT departmentId, batchNo, center 
      FROM students 
      WHERE departmentId IS NOT NULL 
        AND batchNo IS NOT NULL 
        AND center IS NOT NULL
    `;
    
    const [rows] = await connection.query(query);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid student combinations found'
      });
    }
    
    const controllers = [];
    
    // Process inserts SEQUENTIALLY instead of parallel
    for (const row of rows) {
      const controllerData = {
        center: row.center,
        batchNo: row.batchNo,
        departmentId: row.departmentId,
        controller_code: null,
        controller_name: '',
        controller_contact: null,
        controller_email: '',
        controller_pass: generatePassword(row.batchNo, row.center),
        district: null
      };
      
      try {
        const insertQuery = `
          INSERT INTO controllerdb 
          (center, batchNo, departmentId, controller_code, controller_name, 
           controller_contact, controller_email, controller_pass, district)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await connection.query(insertQuery, [
          controllerData.center,
          controllerData.batchNo,
          controllerData.departmentId,
          controllerData.controller_code,
          controllerData.controller_name,
          controllerData.controller_contact,
          controllerData.controller_email,
          controllerData.controller_pass,
          controllerData.district
        ]);
        
        controllers.push(controllerData);
      } catch (insertErr) {
        // Skip duplicates
        if (insertErr.code === 'ER_DUP_ENTRY') {
          console.log(`Skipping duplicate: dept=${row.departmentId}, batch=${row.batchNo}, center=${row.center}`);
        } else {
          throw insertErr;
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Controllers generated and saved successfully',
      count: controllers.length,
      data: controllers
    });
    
  } catch (err) {
    console.error('Error generating/saving controllers:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: err.message 
    });
  }
};

// Controller function to preview controllers (without saving)
exports.generateControllers = async (req, res) => {
  try {
    // Get distinct combinations - exact query you specified
    const query = `
      SELECT DISTINCT departmentId, batchNo, center 
      FROM students 
      WHERE departmentId IS NOT NULL 
        AND batchNo IS NOT NULL 
        AND center IS NOT NULL
    `;
    
    const [rows] = await connection.query(query);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid student combinations found'
      });
    }
    
    // Generate controller data for preview
    const controllers = rows.map((row) => {
      return {
        departmentId: row.departmentId,
        batchNo: row.batchNo,
        center: row.center,
        controller_code: '',  // Empty string
        controller_contact: '',  // Empty string
        controller_email: '',  // Empty string
        controller_name: '',  // Empty string
        controller_pass: generatePassword(row.batchNo, row.center)  // Password logic
      };
    });
    
    res.json({
      success: true,
      message: 'Controllers generated successfully',
      count: controllers.length,
      data: controllers
    });
    
  } catch (err) {
    console.error('Error generating controllers:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: err.message 
    });
  }
};


// ========================================
// ✅ NEW: DUPLICATE CHECKING ROUTES
// ========================================

// Check batch duplicates BEFORE upload
exports.checkBatchDuplicates = async (req, res) => {
  try {
    const { batches } = req.body;
    
    if (!batches || !Array.isArray(batches)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid batches data',
        duplicates: [] 
      });
    }

    console.log('🔍 API: Checking batch duplicates for', batches.length, 'batches');
    
    const duplicates = [];

    // Check each batch against database
    for (const batch of batches) {
      try {
        const [existing] = await connection.query(
          'SELECT departmentId, batchNo FROM batchdb WHERE departmentId = ? AND batchNo = ?',
          [batch.departmentId, batch.batchNo]
        );

        if (existing.length > 0) {
          console.log(`  ❌ Found duplicate: Dept ${batch.departmentId}, Batch ${batch.batchNo}`);
          duplicates.push({
            departmentId: batch.departmentId,
            batchNo: batch.batchNo
          });
        }
      } catch (error) {
        console.error(`  ⚠️ Error checking batch ${batch.batchNo}:`, error.message);
      }
    }

    console.log(`✅ API: Found ${duplicates.length} database duplicates`);
    
    res.json({ 
      success: true, 
      duplicates: duplicates,
      totalChecked: batches.length,
      totalDuplicates: duplicates.length
    });
    
  } catch (error) {
    console.error('❌ API Error checking batch duplicates:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      duplicates: [] 
    });
  }
};

// Check controller duplicates BEFORE upload
exports.checkControllerDuplicates = async (req, res) => {
  try {
    const { controllers } = req.body;
    
    if (!controllers || !Array.isArray(controllers)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid controllers data',
        duplicates: [] 
      });
    }

    console.log('🔍 API: Checking controller duplicates for', controllers.length, 'controllers');
    
    const duplicates = [];

    // Check each controller against database
    for (const controller of controllers) {
      if (!controller.controller_email) continue;
      
      try {
        const [existing] = await connection.query(
          'SELECT controller_email FROM controllerdb WHERE LOWER(controller_email) = LOWER(?)',
          [controller.controller_email]
        );

        if (existing.length > 0) {
          console.log(`  ❌ Found duplicate email: ${controller.controller_email}`);
          duplicates.push({
            controller_email: controller.controller_email
          });
        }
      } catch (error) {
        console.error(`  ⚠️ Error checking email ${controller.controller_email}:`, error.message);
      }
    }

    console.log(`✅ API: Found ${duplicates.length} database duplicates`);
    
    res.json({ 
      success: true, 
      duplicates: duplicates,
      totalChecked: controllers.length,
      totalDuplicates: duplicates.length
    });
    
  } catch (error) {
    console.error('❌ API Error checking controller duplicates:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      duplicates: [] 
    });
  }
};


module.exports = exports;
