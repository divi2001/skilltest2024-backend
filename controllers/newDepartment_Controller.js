// controllers/newDepartment_Controller.js
const connection = require('../config/db1');

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