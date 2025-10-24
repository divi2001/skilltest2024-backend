// controllers/newDepartment_Controller.js
const connection = require('../config/db1');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Department Controllers
exports.createDepartment = async (req, res) => {
    const { departmentId, departmentName, departmentPassword, logo, departmentStatus = true } = req.body;

    if (!departmentId || !departmentName || !departmentPassword) {
        return res.status(400).json({ 
            message: "Department ID, Name, and Password are required" 
        });
    }

    try {
        // Check if department already exists
        const [existing] = await connection.query(
            'SELECT * FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                message: "Department ID already exists" 
            });
        }

        // Insert new department
        const [result] = await connection.query(
            'INSERT INTO departmentdb (departmentId, departmentName, departmentPassword, logo, departmentStatus) VALUES (?, ?, ?, ?, ?)',
            [departmentId, departmentName, departmentPassword, logo, departmentStatus]
        );

        res.json({
            message: "Department created successfully",
            data: {
                departmentId,
                departmentName,
                departmentStatus
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getAllDepartments = async (req, res) => {
    try {
        const [results] = await connection.query(
            'SELECT departmentId, departmentName, departmentStatus FROM departmentdb ORDER BY departmentId'
        );

        res.json({
            message: "Departments retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getDepartmentById = async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await connection.query(
            'SELECT departmentId, departmentName, departmentStatus FROM departmentdb WHERE departmentId = ?',
            [id]
        );

        if (results.length === 0) {
            return res.status(404).json({ 
                message: "Department not found" 
            });
        }

        res.json({
            message: "Department retrieved successfully",
            data: results[0]
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Exam Center Controllers
exports.createExamCenter = async (req, res) => {
    const { center, center_name, center_address, pc_count, max_pc } = req.body;

    if (!center || !center_name || !center_address || !pc_count || !max_pc) {
        return res.status(400).json({ 
            message: "All exam center fields are required" 
        });
    }

    try {
        // Check if center already exists
        const [existing] = await connection.query(
            'SELECT * FROM examcenterdb WHERE center = ?',
            [center]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                message: "Exam center ID already exists" 
            });
        }

        // Insert new exam center
        const [result] = await connection.query(
            'INSERT INTO examcenterdb (center, center_name, center_address, pc_count, max_pc) VALUES (?, ?, ?, ?, ?)',
            [center, center_name, center_address, pc_count, max_pc]
        );

        res.json({
            message: "Exam center created successfully",
            data: {
                center,
                center_name,
                center_address,
                pc_count,
                max_pc
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getAllExamCenters = async (req, res) => {
    try {
        const [results] = await connection.query(
            'SELECT center, center_name, center_address, pc_count, max_pc FROM examcenterdb ORDER BY center'
        );

        res.json({
            message: "Exam centers retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Batch Controllers
exports.createBatch = async (req, res) => {
    const { departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus = true } = req.body;

    if (!departmentId || !batchNo || !batchdate || !reporting_time || !start_time || !end_time) {
        return res.status(400).json({ 
            message: "All batch fields are required" 
        });
    }

    try {
        // Check if department exists
        const [deptExists] = await connection.query(
            'SELECT * FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (deptExists.length === 0) {
            return res.status(400).json({ 
                message: "Department does not exist" 
            });
        }

        // Check if batch already exists for this department
        const [existingBatch] = await connection.query(
            'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
            [departmentId, batchNo]
        );

        if (existingBatch.length > 0) {
            return res.status(400).json({ 
                message: "Batch number already exists for this department" 
            });
        }

        // Insert new batch
        const [result] = await connection.query(
            'INSERT INTO batchdb (departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus]
        );

        res.json({
            message: "Batch created successfully",
            data: {
                departmentId,
                batchNo,
                batchdate,
                reporting_time,
                start_time,
                end_time,
                batchstatus
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getAllBatches = async (req, res) => {
    try {
        const [results] = await connection.query(
            `SELECT b.departmentId, b.batchNo, b.batchdate, b.reporting_time, b.start_time, b.end_time, b.batchstatus, 
                    d.departmentName 
             FROM batchdb b 
             LEFT JOIN departmentdb d ON b.departmentId = d.departmentId 
             ORDER BY b.departmentId, b.batchNo`
        );

        res.json({
            message: "Batches retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getBatchesByDepartment = async (req, res) => {
    const { departmentId } = req.params;

    try {
        const [results] = await connection.query(
            `SELECT b.departmentId, b.batchNo, b.batchdate, b.reporting_time, b.start_time, b.end_time, b.batchstatus,
                    d.departmentName 
             FROM batchdb b 
             LEFT JOIN departmentdb d ON b.departmentId = d.departmentId 
             WHERE b.departmentId = ? 
             ORDER BY b.batchNo`,
            [departmentId]
        );

        res.json({
            message: "Batches retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Controller Controllers
exports.assignController = async (req, res) => {
    const { center, batchNo, departmentId, controller_name, controller_contact, controller_email, district } = req.body;

    if (!center || !batchNo || !departmentId || !controller_name) {
        return res.status(400).json({ 
            message: "Center, Batch No, Department ID, and Controller Name are required" 
        });
    }

    try {
        // Check if center exists
        const [centerExists] = await connection.query(
            'SELECT * FROM examcenterdb WHERE center = ?',
            [center]
        );

        if (centerExists.length === 0) {
            return res.status(400).json({ 
                message: "Exam center does not exist" 
            });
        }

        // Check if batch exists
        const [batchExists] = await connection.query(
            'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
            [departmentId, batchNo]
        );

        if (batchExists.length === 0) {
            return res.status(400).json({ 
                message: "Batch does not exist for this department" 
            });
        }

        // Check if controller already assigned to this batch+center
        const [existingController] = await connection.query(
            'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ? AND departmentId = ?',
            [center, batchNo, departmentId]
        );

        if (existingController.length > 0) {
            return res.status(400).json({ 
                message: "Controller already assigned to this batch and center" 
            });
        }

        // Auto-generate controller code and password
        const controller_code = Math.floor(1000 + Math.random() * 9000); // 4-digit code
        const controller_pass = `${batchNo}${center}`; // batchNo + center combination

        // Insert controller
        const [result] = await connection.query(
            'INSERT INTO controllerdb (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district]
        );

        res.json({
            message: "Controller assigned successfully",
            data: {
                center,
                batchNo,
                departmentId,
                controller_code,
                controller_name,
                controller_pass // Sending back for reference
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getAllControllers = async (req, res) => {
    try {
        const [results] = await connection.query(
            `SELECT c.center, c.batchNo, c.departmentId, c.controller_code, c.controller_name, c.controller_contact, 
                    c.controller_email, c.district, ec.center_name, d.departmentName 
             FROM controllerdb c 
             LEFT JOIN examcenterdb ec ON c.center = ec.center 
             LEFT JOIN departmentdb d ON c.departmentId = d.departmentId 
             ORDER BY c.departmentId, c.batchNo, c.center`
        );

        res.json({
            message: "Controllers retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Student Controllers
exports.registerStudent = async (req, res) => {
    const {
        student_id, password, fullname, departmentId, center, batchNo, subjectsId,
        qset, reporting_time, start_time, end_time, photo, base64, sign_base64,
        IsShorthand = false, IsTypewriting = false, disability = false
    } = req.body;

    if (!student_id || !password || !fullname || !departmentId || !center || !batchNo || !subjectsId) {
        return res.status(400).json({ 
            message: "Student ID, Password, Full Name, Department, Center, Batch, and Subject are required" 
        });
    }

    try {
        // Check if student already exists
        const [existingStudent] = await connection.query(
            'SELECT * FROM students WHERE student_id = ?',
            [student_id]
        );

        if (existingStudent.length > 0) {
            return res.status(400).json({ 
                message: "Student ID already exists" 
            });
        }

        // Check if department exists
        const [deptExists] = await connection.query(
            'SELECT * FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (deptExists.length === 0) {
            return res.status(400).json({ 
                message: "Department does not exist" 
            });
        }

        // Check if center exists
        const [centerExists] = await connection.query(
            'SELECT * FROM examcenterdb WHERE center = ?',
            [center]
        );

        if (centerExists.length === 0) {
            return res.status(400).json({ 
                message: "Exam center does not exist" 
            });
        }

        // Check if batch exists
        const [batchExists] = await connection.query(
            'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
            [departmentId, batchNo]
        );

        if (batchExists.length === 0) {
            return res.status(400).json({ 
                message: "Batch does not exist for this department" 
            });
        }

        // Get batch date from batchdb
        const [batchData] = await connection.query(
            'SELECT batchdate FROM batchdb WHERE departmentId = ? AND batchNo = ?',
            [departmentId, batchNo]
        );

        const batchdate = batchData[0]?.batchdate;

        // Insert student
        const [result] = await connection.query(
            `INSERT INTO students 
             (student_id, password, fullname, departmentId, center, batchNo, batchdate, subjectsId, qset, 
              reporting_time, start_time, end_time, photo, base64, sign_base64, IsShorthand, IsTypewriting, disability) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, password, fullname, departmentId, center, batchNo, batchdate, subjectsId, qset,
             reporting_time, start_time, end_time, photo, base64, sign_base64, IsShorthand, IsTypewriting, disability]
        );

        res.json({
            message: "Student registered successfully",
            data: {
                student_id,
                fullname,
                departmentId,
                center,
                batchNo,
                subjectsId
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const [results] = await connection.query(
            `SELECT s.student_id, s.fullname, s.departmentId, s.center, s.batchNo, s.subjectsId, s.qset,
                    d.departmentName, ec.center_name 
             FROM students s 
             LEFT JOIN departmentdb d ON s.departmentId = d.departmentId 
             LEFT JOIN examcenterdb ec ON s.center = ec.center 
             ORDER BY s.departmentId, s.batchNo, s.student_id`
        );

        res.json({
            message: "Students retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Add batches to existing department
exports.addBatchesToExistingDepartment = async (req, res) => {
    const { departmentId, batches } = req.body;

    if (!departmentId || !batches || !Array.isArray(batches) || batches.length === 0) {
        return res.status(400).json({ 
            message: "Department ID and batches array are required" 
        });
    }

    try {
        // Check if department exists
        const [deptExists] = await connection.query(
            'SELECT * FROM departmentdb WHERE departmentId = ?',
            [departmentId]
        );

        if (deptExists.length === 0) {
            return res.status(400).json({ 
                message: "Department does not exist" 
            });
        }

        const results = [];
        const errors = [];

        // Process each batch
        for (const batch of batches) {
            const { batchNo, batchdate, reporting_time, start_time, end_time, batchstatus = true } = batch;

            // Validate batch data
            if (!batchNo || !batchdate || !reporting_time || !start_time || !end_time) {
                errors.push(`Batch ${batchNo}: Missing required fields`);
                continue;
            }

            try {
                // Check if batch already exists for this department
                const [existingBatch] = await connection.query(
                    'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
                    [departmentId, batchNo]
                );

                if (existingBatch.length > 0) {
                    errors.push(`Batch ${batchNo}: Already exists for this department`);
                    continue;
                }

                // Insert new batch
                const [result] = await connection.query(
                    'INSERT INTO batchdb (departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus]
                );

                results.push({
                    departmentId,
                    batchNo,
                    batchdate,
                    reporting_time,
                    start_time,
                    end_time,
                    batchstatus,
                    status: 'created'
                });

            } catch (batchError) {
                errors.push(`Batch ${batchNo}: ${batchError.message}`);
            }
        }

        res.json({
            message: `Batch creation completed. Success: ${results.length}, Errors: ${errors.length}`,
            data: results,
            errors: errors.length > 0 ? errors : undefined,
            summary: {
                totalProcessed: batches.length,
                successful: results.length,
                failed: errors.length
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Updated bulkUploadExamCentersNew function
exports.bulkUploadExamCentersNew = async (req, res) => {
    console.log('Bulk upload request received');
    console.log('Files:', req.files);
    console.log('File:', req.file);
    
    try {
        // Check if file exists (using multer)
        if (!req.file) {
            console.log('No file found in request');
            return res.status(400).json({ 
                message: "No Excel file uploaded. Please select a file." 
            });
        }

        const excelFile = req.file;
        console.log('Processing file:', excelFile.originalname);
        
        // Validate file type
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = path.extname(excelFile.originalname).toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            console.log('Invalid file type:', fileExtension);
            return res.status(400).json({ 
                message: "Invalid file type. Please upload .xlsx, .xls, or .csv files only." 
            });
        }

        // Read the uploaded file
        let workbook;
        try {
            if (fileExtension === '.csv') {
                // For CSV files
                const fileContent = fs.readFileSync(excelFile.path, 'utf8');
                workbook = xlsx.read(fileContent, { type: 'string' });
            } else {
                // For Excel files
                const fileBuffer = fs.readFileSync(excelFile.path);
                workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            }
        } catch (parseError) {
            console.error('Error parsing file:', parseError);
            return res.status(400).json({ 
                message: "Invalid file format. Please check the file and try again." 
            });
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);

        console.log('Parsed data rows:', jsonData.length);

        if (!jsonData.length) {
            return res.status(400).json({ 
                message: "Excel file is empty or has invalid format. Please check the file." 
            });
        }

        const results = [];
        const errors = [];

        // Process each row
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const rowNumber = i + 2; // +2 because Excel rows start at 1 and header is row 1

            try {
                console.log(`Processing row ${rowNumber}:`, row);

                // Validate required fields - check both exact and case-insensitive field names
                const requiredFields = ['center', 'center_name', 'center_address', 'pc_count', 'max_pc'];
                
                // Handle case-insensitive field names
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toLowerCase()] = row[key];
                });

                const missingFields = requiredFields.filter(field => {
                    const value = normalizedRow[field];
                    return value === undefined || value === null || value === '';
                });

                if (missingFields.length > 0) {
                    errors.push(`Row ${rowNumber}: Missing required fields - ${missingFields.join(', ')}`);
                    continue;
                }

                // Check if center already exists
                const centerId = parseInt(normalizedRow.center);
                if (isNaN(centerId)) {
                    errors.push(`Row ${rowNumber}: Center ID must be a number`);
                    continue;
                }

                const [existingCenter] = await connection.query(
                    'SELECT * FROM examcenterdb WHERE center = ?',
                    [centerId]
                );

                if (existingCenter.length > 0) {
                    errors.push(`Row ${rowNumber}: Center ID ${centerId} already exists`);
                    continue;
                }

                // Prepare data for insertion
                const centerData = {
                    center: centerId,
                    centerpass: normalizedRow.centerpass || normalizedRow.center_pass || '',
                    center_name: normalizedRow.center_name || normalizedRow.center_name,
                    center_address: normalizedRow.center_address || normalizedRow.center_address,
                    pc_count: parseInt(normalizedRow.pc_count) || 0,
                    max_pc: parseInt(normalizedRow.max_pc) || 0,
                    attendanceroll: normalizedRow.attendanceroll || normalizedRow.attendance_roll || '',
                    absenteereport: normalizedRow.absenteereport || normalizedRow.absentee_report || '',
                    answersheet: normalizedRow.answersheet || normalizedRow.answer_sheet || '',
                    blankanswersheet: normalizedRow.blankanswersheet || normalizedRow.blank_answer_sheet || ''
                };

                // Validate numeric fields
                if (centerData.pc_count <= 0) {
                    errors.push(`Row ${rowNumber}: PC count must be a positive number`);
                    continue;
                }

                if (centerData.max_pc <= 0) {
                    errors.push(`Row ${rowNumber}: Max PC capacity must be a positive number`);
                    continue;
                }

                if (centerData.pc_count > centerData.max_pc) {
                    errors.push(`Row ${rowNumber}: PC count cannot be greater than max PC capacity`);
                    continue;
                }

                // Insert into database
                const [result] = await connection.query(
                    'INSERT INTO examcenterdb SET ?',
                    [centerData]
                );

                results.push({
                    center: centerData.center,
                    center_name: centerData.center_name,
                    status: 'created'
                });

                console.log(`Row ${rowNumber}: Successfully created center ${centerData.center}`);

            } catch (rowError) {
                console.error(`Error processing row ${rowNumber}:`, rowError);
                errors.push(`Row ${rowNumber}: ${rowError.message}`);
            }
        }

        // Clean up uploaded file
        try {
            fs.unlinkSync(excelFile.path);
        } catch (cleanupError) {
            console.warn('Could not delete temporary file:', cleanupError);
        }

        console.log('Bulk upload completed:', {
            successful: results.length,
            failed: errors.length,
            total: jsonData.length
        });

        res.json({
            message: `Bulk upload completed. Success: ${results.length}, Errors: ${errors.length}`,
            data: results,
            errors: errors.length > 0 ? errors : undefined,
            summary: {
                totalProcessed: jsonData.length,
                successful: results.length,
                failed: errors.length
            }
        });

    } catch (err) {
        console.error('Bulk upload error:', err);
        
        // Clean up uploaded file in case of error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.warn('Could not delete temporary file:', cleanupError);
            }
        }

        res.status(500).json({ 
            message: 'Internal server error during bulk upload', 
            error: err.message 
        });
    }
};

// Download Excel template
exports.downloadExamCenterTemplateNew = async (req, res) => {
    try {
        // Create sample data for template
        const templateData = [
            {
                center: '1001',
                centerpass: 'center123',
                center_name: 'Mumbai Main Center',
                center_address: '123 Main Street, Mumbai, Maharashtra',
                pc_count: '50',
                max_pc: '100',
                attendanceroll: '',
                absenteereport: '',
                answersheet: '',
                blankanswersheet: ''
            },
            {
                center: '1002',
                centerpass: 'center456',
                center_name: 'Delhi North Center',
                center_address: '456 North Avenue, Delhi',
                pc_count: '75',
                max_pc: '150',
                attendanceroll: '',
                absenteereport: '',
                answersheet: '',
                blankanswersheet: ''
            }
        ];

        // Create workbook
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(templateData);
        
        // Add header style
        const headerStyle = {
            fill: { fgColor: { rgb: "4472C4" } },
            font: { color: { rgb: "FFFFFF" }, bold: true }
        };

        // Get the range of the worksheet
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        
        // Apply header style to first row
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) continue;
            worksheet[cellAddress].s = headerStyle;
        }

        xlsx.utils.book_append_sheet(workbook, worksheet, 'Exam Centers Template');

        // Generate buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=exam_centers_template.xlsx');
        
        res.send(buffer);

    } catch (err) {
        console.error('Template download error:', err);
        res.status(500).json({ 
            message: 'Error generating template', 
            error: err.message 
        });
    }
};


// // Generate Controller Data from Students
// exports.generateControllerData = async (req, res) => {
//     try {
//         // Get unique combinations of batchNo, center, departmentId from students table
//         const [results] = await connection.query(`
//             SELECT DISTINCT batchNo, center, departmentId 
//             FROM students 
//             WHERE batchNo IS NOT NULL 
//             AND center IS NOT NULL 
//             AND departmentId IS NOT NULL
//             ORDER BY batchNo, center, departmentId
//         `);

//         if (results.length === 0) {
//             return res.status(404).json({ 
//                 message: "No student data found to generate controller records" 
//             });
//         }

//         // Check which combinations already exist in controllerdb to avoid duplicates
//         const [existingControllers] = await connection.query(`
//             SELECT batchNo, center, departmentId 
//             FROM controllerdb 
//             WHERE batchNo IS NOT NULL 
//             AND center IS NOT NULL 
//             AND departmentId IS NOT NULL
//         `);

//         const existingSet = new Set(
//             existingControllers.map(ec => `${ec.batchNo}-${ec.center}-${ec.departmentId}`)
//         );

//         // Generate controller data with passwords
//         const generatedData = results.map(record => {
//             const uniqueKey = `${record.batchNo}-${record.center}-${record.departmentId}`;
            
//             // Skip if already exists in controllerdb
//             if (existingSet.has(uniqueKey)) {
//                 return null;
//             }

//             // Generate password based on batch number
//             let controller_pass;
//             if (record.batchNo === 100) {
//                 controller_pass = `mock${record.center}`;
//             } else {
//                 // Generate random 6-digit number
//                 controller_pass = Math.floor(100000 + Math.random() * 900000).toString();
//             }

//             return {
//                 batchNo: record.batchNo,
//                 center: record.center,
//                 departmentId: record.departmentId,
//                 controller_pass: controller_pass,
//                 controller_code: null,
//                 controller_name: null,
//                 controller_contact: null,
//                 controller_email: null,
//                 district: null
//             };
//         }).filter(record => record !== null); // Remove null records (duplicates)

//         if (generatedData.length === 0) {
//             return res.status(400).json({ 
//                 message: "All controller records already exist in the database" 
//             });
//         }

//         res.json({
//             message: "Controller data generated successfully",
//             data: generatedData,
//             count: generatedData.length,
//             totalCombinations: results.length,
//             duplicatesSkipped: results.length - generatedData.length
//         });

//     } catch (err) {
//         console.error('Database query error in generateControllerData:', err);
//         res.status(500).json({ 
//             message: 'Internal server error', 
//             error: err.message 
//         });
//     }
// };

// // Approve and Save Controller Data
// exports.approveControllerData = async (req, res) => {
//     const { controllers } = req.body;

//     if (!controllers || !Array.isArray(controllers) || controllers.length === 0) {
//         return res.status(400).json({ 
//             message: "Controller data is required and must be a non-empty array" 
//         });
//     }

//     try {
//         // Validate required fields
//         const invalidRecords = controllers.filter(controller => 
//             !controller.batchNo || !controller.center || !controller.departmentId || !controller.controller_pass
//         );

//         if (invalidRecords.length > 0) {
//             return res.status(400).json({ 
//                 message: "Some records are missing required fields (batchNo, center, departmentId, controller_pass)",
//                 invalidRecords: invalidRecords.length
//             });
//         }

//         // Check for duplicates in the incoming data
//         const uniqueKeys = new Set();
//         const duplicateIncoming = controllers.filter(controller => {
//             const key = `${controller.batchNo}-${controller.center}-${controller.departmentId}`;
//             if (uniqueKeys.has(key)) {
//                 return true;
//             }
//             uniqueKeys.add(key);
//             return false;
//         });

//         if (duplicateIncoming.length > 0) {
//             return res.status(400).json({ 
//                 message: "Duplicate records found in the submitted data",
//                 duplicateCount: duplicateIncoming.length
//             });
//         }

//         // Check for existing records in database
//         const [existingControllers] = await connection.query(`
//             SELECT batchNo, center, departmentId 
//             FROM controllerdb 
//             WHERE batchNo IS NOT NULL 
//             AND center IS NOT NULL 
//             AND departmentId IS NOT NULL
//         `);

//         const existingSet = new Set(
//             existingControllers.map(ec => `${ec.batchNo}-${ec.center}-${ec.departmentId}`)
//         );

//         // Filter out records that already exist
//         const recordsToInsert = controllers.filter(controller => {
//             const key = `${controller.batchNo}-${controller.center}-${controller.departmentId}`;
//             return !existingSet.has(key);
//         });

//         if (recordsToInsert.length === 0) {
//             return res.status(400).json({ 
//                 message: "All controller records already exist in the database" 
//             });
//         }

//         // Insert records
//         let insertedCount = 0;
//         const errors = [];

//         for (const controller of recordsToInsert) {
//             try {
//                 const [result] = await connection.query(
//                     `INSERT INTO controllerdb 
//                     (batchNo, center, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district) 
//                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//                     [
//                         controller.batchNo,
//                         controller.center,
//                         controller.departmentId,
//                         controller.controller_code,
//                         controller.controller_name,
//                         controller.controller_contact,
//                         controller.controller_email,
//                         controller.controller_pass,
//                         controller.district
//                     ]
//                 );
//                 insertedCount++;
//             } catch (err) {
//                 errors.push({
//                     record: controller,
//                     error: err.message
//                 });
//                 console.error('Error inserting controller record:', err);
//             }
//         }

//         if (errors.length > 0) {
//             return res.status(207).json({ // 207 Multi-Status
//                 message: `Partially completed. ${insertedCount} records inserted, ${errors.length} failed`,
//                 insertedCount: insertedCount,
//                 errorCount: errors.length,
//                 errors: errors,
//                 skippedDuplicates: controllers.length - recordsToInsert.length
//             });
//         }

//         res.json({
//             message: "Controller data approved and saved successfully",
//             insertedCount: insertedCount,
//             skippedDuplicates: controllers.length - recordsToInsert.length,
//             totalSubmitted: controllers.length
//         });

//     } catch (err) {
//         console.error('Database query error in approveControllerData:', err);
//         res.status(500).json({ 
//             message: 'Internal server error', 
//             error: err.message 
//         });
//     }
// };


exports.generateControllers = async (req, res) => {
  try {
    const { save = false, controllers = null } = req.body;

    // If save flag is true and controllers data is provided, save to database
    if (save && controllers && Array.isArray(controllers)) {
      // Insert controllers into database
      const insertQuery = `
        INSERT INTO controllers 
        (departmentId, batchNo, center, controller_code, controller_contact, controller_email, controller_name, controller_pass)
        VALUES ?
      `;

      const values = controllers.map(ctrl => [
        ctrl.departmentId,
        ctrl.batchNo,
        ctrl.center,
        ctrl.controller_code,
        ctrl.controller_contact,
        ctrl.controller_email,
        ctrl.controller_name,
        ctrl.controller_pass
      ]);

      const [insertResult] = await connection.query(insertQuery, [values]);

      return res.json({
        success: true,
        message: 'Controllers saved successfully to database',
        count: insertResult.affectedRows
      });
    }

    // Default behavior: Generate controllers for preview
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
    const controllerData = rows.map((row) => {
      return {
        departmentId: row.departmentId,
        batchNo: row.batchNo,
        center: row.center,
        controller_code: '',
        controller_contact: '',
        controller_email: '',
        controller_name: '',
        controller_pass: generatePassword(row.batchNo, row.center)
      };
    });

    res.json({
      success: true,
      message: 'Controllers generated successfully',
      count: controllerData.length,
      data: controllerData
    });

  } catch (err) {
    console.error('Error with controllers operation:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: err.message 
    });
  }
};

exports.getAllControllers = async (req, res) => {
  try {
    const [results] = await connection.query(
      'SELECT * FROM controllers ORDER BY departmentId, batchNo, center'
    );
    
    res.json({
      success: true,
      message: 'Controllers retrieved successfully',
      count: results.length,
      data: results
    });

  } catch (err) {
    console.error('Error fetching controllers:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: err.message 
    });
  }
};

// Helper function for password generation
function generatePassword(batchNo, center) {
  return `${batchNo}_${center}_${Math.random().toString(36).substring(2, 8)}`;
}
