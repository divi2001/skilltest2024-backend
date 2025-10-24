// // controllers/newDepartment_Controller.js
// const connection = require('../config/db1');

// // Department Controllers
// exports.createDepartment = async (req, res) => {
//     const { departmentId, departmentName, departmentPassword, logo, departmentStatus = true } = req.body;

//     if (!departmentId || !departmentName || !departmentPassword) {
//         return res.status(400).json({ 
//             message: "Department ID, Name, and Password are required" 
//         });
//     }

//     try {
//         // Check if department already exists
//         const [existing] = await connection.query(
//             'SELECT * FROM departmentdb WHERE departmentId = ?',
//             [departmentId]
//         );

//         if (existing.length > 0) {
//             return res.status(400).json({ 
//                 message: "Department ID already exists" 
//             });
//         }

//         // Insert new department
//         const [result] = await connection.query(
//             'INSERT INTO departmentdb (departmentId, departmentName, departmentPassword, logo, departmentStatus) VALUES (?, ?, ?, ?, ?)',
//             [departmentId, departmentName, departmentPassword, logo, departmentStatus]
//         );

//         res.json({
//             message: "Department created successfully",
//             data: {
//                 departmentId,
//                 departmentName,
//                 departmentStatus
//             }
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getAllDepartments = async (req, res) => {
//     try {
//         const [results] = await connection.query(
//             'SELECT departmentId, departmentName, departmentStatus FROM departmentdb ORDER BY departmentId'
//         );

//         res.json({
//             message: "Departments retrieved successfully",
//             data: results,
//             count: results.length
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getDepartmentById = async (req, res) => {
//     const { id } = req.params;

//     try {
//         const [results] = await connection.query(
//             'SELECT departmentId, departmentName, departmentStatus FROM departmentdb WHERE departmentId = ?',
//             [id]
//         );

//         if (results.length === 0) {
//             return res.status(404).json({ 
//                 message: "Department not found" 
//             });
//         }

//         res.json({
//             message: "Department retrieved successfully",
//             data: results[0]
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// // Exam Center Controllers
// exports.createExamCenter = async (req, res) => {
//     const { center, center_name, center_address, pc_count, max_pc } = req.body;

//     if (!center || !center_name || !center_address || !pc_count || !max_pc) {
//         return res.status(400).json({ 
//             message: "All exam center fields are required" 
//         });
//     }

//     try {
//         // Check if center already exists
//         const [existing] = await connection.query(
//             'SELECT * FROM examcenterdb WHERE center = ?',
//             [center]
//         );

//         if (existing.length > 0) {
//             return res.status(400).json({ 
//                 message: "Exam center ID already exists" 
//             });
//         }

//         // Insert new exam center
//         const [result] = await connection.query(
//             'INSERT INTO examcenterdb (center, center_name, center_address, pc_count, max_pc) VALUES (?, ?, ?, ?, ?)',
//             [center, center_name, center_address, pc_count, max_pc]
//         );

//         res.json({
//             message: "Exam center created successfully",
//             data: {
//                 center,
//                 center_name,
//                 center_address,
//                 pc_count,
//                 max_pc
//             }
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getAllExamCenters = async (req, res) => {
//     try {
//         const [results] = await connection.query(
//             'SELECT center, center_name, center_address, pc_count, max_pc FROM examcenterdb ORDER BY center'
//         );

//         res.json({
//             message: "Exam centers retrieved successfully",
//             data: results,
//             count: results.length
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// // Batch Controllers
// exports.createBatch = async (req, res) => {
//     const { departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus = true } = req.body;

//     if (!departmentId || !batchNo || !batchdate || !reporting_time || !start_time || !end_time) {
//         return res.status(400).json({ 
//             message: "All batch fields are required" 
//         });
//     }

//     try {
//         // Check if department exists
//         const [deptExists] = await connection.query(
//             'SELECT * FROM departmentdb WHERE departmentId = ?',
//             [departmentId]
//         );

//         if (deptExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Department does not exist" 
//             });
//         }

//         // Check if batch already exists for this department
//         const [existingBatch] = await connection.query(
//             'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
//             [departmentId, batchNo]
//         );

//         if (existingBatch.length > 0) {
//             return res.status(400).json({ 
//                 message: "Batch number already exists for this department" 
//             });
//         }

//         // Insert new batch
//         const [result] = await connection.query(
//             'INSERT INTO batchdb (departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
//             [departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus]
//         );

//         res.json({
//             message: "Batch created successfully",
//             data: {
//                 departmentId,
//                 batchNo,
//                 batchdate,
//                 reporting_time,
//                 start_time,
//                 end_time,
//                 batchstatus
//             }
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getAllBatches = async (req, res) => {
//     try {
//         const [results] = await connection.query(
//             `SELECT b.departmentId, b.batchNo, b.batchdate, b.reporting_time, b.start_time, b.end_time, b.batchstatus, 
//                     d.departmentName 
//              FROM batchdb b 
//              LEFT JOIN departmentdb d ON b.departmentId = d.departmentId 
//              ORDER BY b.departmentId, b.batchNo`
//         );

//         res.json({
//             message: "Batches retrieved successfully",
//             data: results,
//             count: results.length
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getBatchesByDepartment = async (req, res) => {
//     const { departmentId } = req.params;

//     try {
//         const [results] = await connection.query(
//             `SELECT b.departmentId, b.batchNo, b.batchdate, b.reporting_time, b.start_time, b.end_time, b.batchstatus,
//                     d.departmentName 
//              FROM batchdb b 
//              LEFT JOIN departmentdb d ON b.departmentId = d.departmentId 
//              WHERE b.departmentId = ? 
//              ORDER BY b.batchNo`,
//             [departmentId]
//         );

//         res.json({
//             message: "Batches retrieved successfully",
//             data: results,
//             count: results.length
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// // Controller Controllers
// exports.assignController = async (req, res) => {
//     const { center, batchNo, departmentId, controller_name, controller_contact, controller_email, district } = req.body;

//     if (!center || !batchNo || !departmentId || !controller_name) {
//         return res.status(400).json({ 
//             message: "Center, Batch No, Department ID, and Controller Name are required" 
//         });
//     }

//     try {
//         // Check if center exists
//         const [centerExists] = await connection.query(
//             'SELECT * FROM examcenterdb WHERE center = ?',
//             [center]
//         );

//         if (centerExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Exam center does not exist" 
//             });
//         }

//         // Check if batch exists
//         const [batchExists] = await connection.query(
//             'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
//             [departmentId, batchNo]
//         );

//         if (batchExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Batch does not exist for this department" 
//             });
//         }

//         // Check if controller already assigned to this batch+center
//         const [existingController] = await connection.query(
//             'SELECT * FROM controllerdb WHERE center = ? AND batchNo = ? AND departmentId = ?',
//             [center, batchNo, departmentId]
//         );

//         if (existingController.length > 0) {
//             return res.status(400).json({ 
//                 message: "Controller already assigned to this batch and center" 
//             });
//         }

//         // Auto-generate controller code and password
//         const controller_code = Math.floor(1000 + Math.random() * 9000); // 4-digit code
//         const controller_pass = `${batchNo}${center}`; // batchNo + center combination

//         // Insert controller
//         const [result] = await connection.query(
//             'INSERT INTO controllerdb (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
//             [center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district]
//         );

//         res.json({
//             message: "Controller assigned successfully",
//             data: {
//                 center,
//                 batchNo,
//                 departmentId,
//                 controller_code,
//                 controller_name,
//                 controller_pass // Sending back for reference
//             }
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getAllControllers = async (req, res) => {
//     try {
//         const [results] = await connection.query(
//             `SELECT c.center, c.batchNo, c.departmentId, c.controller_code, c.controller_name, c.controller_contact, 
//                     c.controller_email, c.district, ec.center_name, d.departmentName 
//              FROM controllerdb c 
//              LEFT JOIN examcenterdb ec ON c.center = ec.center 
//              LEFT JOIN departmentdb d ON c.departmentId = d.departmentId 
//              ORDER BY c.departmentId, c.batchNo, c.center`
//         );

//         res.json({
//             message: "Controllers retrieved successfully",
//             data: results,
//             count: results.length
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// // Student Controllers
// exports.registerStudent = async (req, res) => {
//     const {
//         student_id, password, fullname, departmentId, center, batchNo, subjectsId,
//         qset, reporting_time, start_time, end_time, photo, base64, sign_base64,
//         IsShorthand = false, IsTypewriting = false, disability = false
//     } = req.body;

//     if (!student_id || !password || !fullname || !departmentId || !center || !batchNo || !subjectsId) {
//         return res.status(400).json({ 
//             message: "Student ID, Password, Full Name, Department, Center, Batch, and Subject are required" 
//         });
//     }

//     try {
//         // Check if student already exists
//         const [existingStudent] = await connection.query(
//             'SELECT * FROM students WHERE student_id = ?',
//             [student_id]
//         );

//         if (existingStudent.length > 0) {
//             return res.status(400).json({ 
//                 message: "Student ID already exists" 
//             });
//         }

//         // Check if department exists
//         const [deptExists] = await connection.query(
//             'SELECT * FROM departmentdb WHERE departmentId = ?',
//             [departmentId]
//         );

//         if (deptExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Department does not exist" 
//             });
//         }

//         // Check if center exists
//         const [centerExists] = await connection.query(
//             'SELECT * FROM examcenterdb WHERE center = ?',
//             [center]
//         );

//         if (centerExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Exam center does not exist" 
//             });
//         }

//         // Check if batch exists
//         const [batchExists] = await connection.query(
//             'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
//             [departmentId, batchNo]
//         );

//         if (batchExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Batch does not exist for this department" 
//             });
//         }

//         // Get batch date from batchdb
//         const [batchData] = await connection.query(
//             'SELECT batchdate FROM batchdb WHERE departmentId = ? AND batchNo = ?',
//             [departmentId, batchNo]
//         );

//         const batchdate = batchData[0]?.batchdate;

//         // Insert student
//         const [result] = await connection.query(
//             `INSERT INTO students 
//              (student_id, password, fullname, departmentId, center, batchNo, batchdate, subjectsId, qset, 
//               reporting_time, start_time, end_time, photo, base64, sign_base64, IsShorthand, IsTypewriting, disability) 
//              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [student_id, password, fullname, departmentId, center, batchNo, batchdate, subjectsId, qset,
//              reporting_time, start_time, end_time, photo, base64, sign_base64, IsShorthand, IsTypewriting, disability]
//         );

//         res.json({
//             message: "Student registered successfully",
//             data: {
//                 student_id,
//                 fullname,
//                 departmentId,
//                 center,
//                 batchNo,
//                 subjectsId
//             }
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getAllStudents = async (req, res) => {
//     try {
//         const [results] = await connection.query(
//             `SELECT s.student_id, s.fullname, s.departmentId, s.center, s.batchNo, s.subjectsId, s.qset,
//                     d.departmentName, ec.center_name 
//              FROM students s 
//              LEFT JOIN departmentdb d ON s.departmentId = d.departmentId 
//              LEFT JOIN examcenterdb ec ON s.center = ec.center 
//              ORDER BY s.departmentId, s.batchNo, s.student_id`
//         );

//         res.json({
//             message: "Students retrieved successfully",
//             data: results,
//             count: results.length
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// // Add batches to existing department
// exports.addBatchesToExistingDepartment = async (req, res) => {
//     const { departmentId, batches } = req.body;

//     if (!departmentId || !batches || !Array.isArray(batches) || batches.length === 0) {
//         return res.status(400).json({ 
//             message: "Department ID and batches array are required" 
//         });
//     }

//     try {
//         // Check if department exists
//         const [deptExists] = await connection.query(
//             'SELECT * FROM departmentdb WHERE departmentId = ?',
//             [departmentId]
//         );

//         if (deptExists.length === 0) {
//             return res.status(400).json({ 
//                 message: "Department does not exist" 
//             });
//         }

//         const results = [];
//         const errors = [];

//         // Process each batch
//         for (const batch of batches) {
//             const { batchNo, batchdate, reporting_time, start_time, end_time, batchstatus = true } = batch;

//             // Validate batch data
//             if (!batchNo || !batchdate || !reporting_time || !start_time || !end_time) {
//                 errors.push(`Batch ${batchNo}: Missing required fields`);
//                 continue;
//             }

//             try {
//                 // Check if batch already exists for this department
//                 const [existingBatch] = await connection.query(
//                     'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
//                     [departmentId, batchNo]
//                 );

//                 if (existingBatch.length > 0) {
//                     errors.push(`Batch ${batchNo}: Already exists for this department`);
//                     continue;
//                 }

//                 // Insert new batch
//                 const [result] = await connection.query(
//                     'INSERT INTO batchdb (departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
//                     [departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus]
//                 );

//                 results.push({
//                     departmentId,
//                     batchNo,
//                     batchdate,
//                     reporting_time,
//                     start_time,
//                     end_time,
//                     batchstatus,
//                     status: 'created'
//                 });

//             } catch (batchError) {
//                 errors.push(`Batch ${batchNo}: ${batchError.message}`);
//             }
//         }

//         res.json({
//             message: `Batch creation completed. Success: ${results.length}, Errors: ${errors.length}`,
//             data: results,
//             errors: errors.length > 0 ? errors : undefined,
//             summary: {
//                 totalProcessed: batches.length,
//                 successful: results.length,
//                 failed: errors.length
//             }
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };


// controllers/newDepartment_Controller.js
const connection = require('../config/db1');

const XLSX = require('xlsx');
const csv = require('csv-parser');
const { Readable } = require('stream');

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
            'SELECT departmentId, departmentName, departmentStatus, logo FROM departmentdb ORDER BY departmentId DESC'
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
            'SELECT departmentId, departmentName, departmentStatus, logo FROM departmentdb WHERE departmentId = ?',
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
    const { departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus = false } = req.body;

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
             ORDER BY b.departmentId DESC, b.batchNo DESC`
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
             ORDER BY b.batchNo DESC`,
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





// Enhanced Controller Management
exports.addControllers = async (req, res) => {
  const { departmentId, batchNo, controllers } = req.body;

  // Validate required fields
  if (!departmentId || !batchNo || !controllers || !Array.isArray(controllers)) {
    return res.status(400).json({
      success: false,
      message: 'Department ID, Batch Number, and controllers array are required'
    });
  }

  // Field validation
  for (let i = 0; i < controllers.length; i++) {
    const controller = controllers[i];
    if (!controller.controller_name || !controller.center) {
      return res.status(400).json({
        success: false,
        message: `Controller ${i + 1}: controller_name and center are required`
      });
    }
  }

  try {
    // Check if batch exists
    const [batchExists] = await connection.query(
      'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ? AND batchstatus = 1',
      [departmentId, batchNo]
    );

    if (batchExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or inactive'
      });
    }

    // Check for duplicate controller codes if provided
    const controllersWithCodes = controllers.filter(
      (c) => c.controller_code && c.controller_code.toString().trim() !== ''
    );

    if (controllersWithCodes.length > 0) {
      const controllerCodes = controllersWithCodes.map((c) => c.controller_code);
      const placeholders = controllerCodes.map(() => '?').join(',');
      const [existingCodes] = await connection.query(
        `SELECT controller_code FROM controllerdb 
         WHERE departmentId = ? AND batchNo = ? AND controller_code IN (${placeholders})`,
        [departmentId, batchNo, ...controllerCodes]
      );

      if (existingCodes.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Controller codes already exist: ${existingCodes
            .map((c) => c.controller_code)
            .join(', ')}`
        });
      }
    }

    const insertedControllers = [];

    // Loop through each controller
    for (const controller of controllers) {
      // Check if center exists
      const [centerExists] = await connection.query(
        'SELECT * FROM examcenterdb WHERE center = ?',
        [controller.center]
      );

      if (centerExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Center with ID ${controller.center} does not exist`
        });
      }

      // Set default contact/email if missing
      const contactValue =
        controller.controller_contact && controller.controller_contact.toString().trim() !== ''
          ? controller.controller_contact
          : '0123456789';

      const emailValue =
        controller.controller_email && controller.controller_email.toString().trim() !== ''
          ? controller.controller_email
          : 'abc123@gmail.com';

      // Generate password
      let controllerPass;
      if (batchNo === 100) {
        controllerPass = `${batchNo}${controller.center}`;
      } else {
        const randomTwoDigits = Math.floor(10 + Math.random() * 90);
        controllerPass = `${batchNo}${departmentId}${controller.center}${randomTwoDigits}`;
      }

      // Handle optional fields
      const controllerCode =
        controller.controller_code && controller.controller_code.toString().trim() !== ''
          ? controller.controller_code
          : null;

      const districtValue =
        controller.district && controller.district.toString().trim() !== ''
          ? controller.district
          : null;

      // Insert into DB
      const [result] = await connection.query(
        `INSERT INTO controllerdb 
         (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          controller.center,
          batchNo,
          departmentId,
          controllerCode,
          controller.controller_name,
          contactValue,
          emailValue,
          controllerPass,
          districtValue
        ]
      );

      insertedControllers.push({
        ...controller,
        controller_code: controllerCode,
        controller_contact: contactValue,
        controller_email: emailValue,
        controller_pass: controllerPass,
        district: districtValue,
        departmentId,
        batchNo,
        insertId: result.insertId
      });
    }

    res.status(201).json({
      success: true,
      message: `${controllers.length} controller(s) added successfully`,
      data: insertedControllers,
      count: insertedControllers.length
    });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};



// Get all controllers with enhanced data
exports.getAllControllers = async (req, res) => {
    try {
        const [results] = await connection.query(
            `SELECT c.center, c.batchNo, c.departmentId, c.controller_code, c.controller_name, 
                    c.controller_contact, c.controller_email, c.district, 
                    ec.center_name, d.departmentName, b.batchdate, b.reporting_time, b.start_time, b.end_time
             FROM controllerdb c 
             LEFT JOIN examcenterdb ec ON c.center = ec.center 
             LEFT JOIN departmentdb d ON c.departmentId = d.departmentId 
             LEFT JOIN batchdb b ON c.departmentId = b.departmentId AND c.batchNo = b.batchNo
             ORDER BY c.departmentId DESC, c.batchNo DESC, c.controller_code DESC`
        );

        res.json({
            success: true,
            message: "Controllers retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Get controllers by department
exports.getControllersByDepartment = async (req, res) => {
    const { departmentId } = req.params;
    
    try {
        const [results] = await connection.query(
            `SELECT c.center, c.batchNo, c.departmentId, c.controller_code, c.controller_name, 
                    c.controller_contact, c.controller_email, c.district, 
                    ec.center_name, d.departmentName, b.batchdate, b.reporting_time, b.start_time, b.end_time
             FROM controllerdb c 
             LEFT JOIN examcenterdb ec ON c.center = ec.center 
             LEFT JOIN departmentdb d ON c.departmentId = d.departmentId 
             LEFT JOIN batchdb b ON c.departmentId = b.departmentId AND c.batchNo = b.batchNo
             WHERE c.departmentId = ?
             ORDER BY c.batchNo DESC, c.controller_code DESC`,
            [departmentId]
        );

        res.json({
            success: true,
            message: "Controllers retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Get controllers by department and batch
exports.getControllersByDepartmentAndBatch = async (req, res) => {
    const { departmentId, batchNo } = req.params;
    
    try {
        const [results] = await connection.query(
            `SELECT c.center, c.batchNo, c.departmentId, c.controller_code, c.controller_name, 
                    c.controller_contact, c.controller_email, c.district, 
                    ec.center_name, d.departmentName, b.batchdate, b.reporting_time, b.start_time, b.end_time
             FROM controllerdb c 
             LEFT JOIN examcenterdb ec ON c.center = ec.center 
             LEFT JOIN departmentdb d ON c.departmentId = d.departmentId 
             LEFT JOIN batchdb b ON c.departmentId = b.departmentId AND c.batchNo = b.batchNo
             WHERE c.departmentId = ? AND c.batchNo = ?
             ORDER BY c.controller_code DESC`,
            [departmentId, batchNo]
        );

        res.json({
            success: true,
            message: "Controllers retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Get available batches for controller assignment
exports.getAvailableBatches = async (req, res) => {
    try {
        const [results] = await connection.query(
            `SELECT b.departmentId, b.batchNo, b.batchdate, b.reporting_time, b.start_time, b.end_time, b.batchstatus,
                    d.departmentName
             FROM batchdb b
             LEFT JOIN departmentdb d ON b.departmentId = d.departmentId
             WHERE b.batchstatus = 1
             ORDER BY b.departmentId DESC, b.batchNo DESC`
        );

        res.json({
            success: true,
            message: "Available batches retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Get available batches by department
exports.getAvailableBatchesByDepartment = async (req, res) => {
    const { departmentId } = req.params;
    
    try {
        const [results] = await connection.query(
            `SELECT b.departmentId, b.batchNo, b.batchdate, b.reporting_time, b.start_time, b.end_time, b.batchstatus,
                    d.departmentName
             FROM batchdb b
             LEFT JOIN departmentdb d ON b.departmentId = d.departmentId
             WHERE b.departmentId = ? AND b.batchstatus = 1
             ORDER BY b.batchNo DESC`,
            [departmentId]
        );

        res.json({
            success: true,
            message: "Available batches retrieved successfully",
            data: results,
            count: results.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Update controller
exports.updateController = async (req, res) => {
    const { controllerId } = req.params;
    const { controller_name, controller_contact, controller_email, controller_pass, district, center } = req.body;

    try {
        const [result] = await connection.query(
            `UPDATE controllerdb 
             SET controller_name = ?, controller_contact = ?, controller_email = ?, controller_pass = ?, district = ?, center = ?
             WHERE controller_code = ?`,
            [controller_name, controller_contact, controller_email, controller_pass, district, center, controllerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Controller not found'
            });
        }

        res.json({
            success: true,
            message: 'Controller updated successfully'
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Delete controller
exports.deleteController = async (req, res) => {
    const { controllerId } = req.params;

    try {
        const [result] = await connection.query(
            'DELETE FROM controllerdb WHERE controller_code = ?',
            [controllerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Controller not found'
            });
        }

        res.json({
            success: true,
            message: 'Controller deleted successfully'
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

// Legacy function (keeping for backward compatibility)
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

//for uploading excel file

// NEW: Complete Bulk Upload Batches from Excel/CSV (with departmentId in file)
// exports.bulkUploadBatchesComplete = async (req, res) => {
//     try {
//         const file = req.file;

//         // Validate file
//         if (!file) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'File is required'
//             });
//         }

//         let batches = [];

//         try {
//             // Parse file based on type
//             if (file.mimetype === 'text/csv') {
//                 batches = await parseCSV(file.buffer);
//             } else {
//                 batches = await parseExcel(file.buffer);
//             }
//         } catch (parseError) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Error parsing file: ' + parseError.message
//             });
//         }

//         if (batches.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'No valid batch data found in file'
//             });
//         }

//         // Process batches
//         const results = [];
//         const errors = [];
//         const processedDepartments = new Set();

//         for (let i = 0; i < batches.length; i++) {
//             const batch = batches[i];
//             const rowNum = i + 2; // Assuming row 1 is header

//             try {
//                 // Validate batch data including departmentId
//                 const validation = validateCompleteBatchData(batch, rowNum);
//                 if (!validation.isValid) {
//                     errors.push(validation.error);
//                     continue;
//                 }

//                 // Check if department exists (only once per department)
//                 if (!processedDepartments.has(batch.departmentid)) {
//                     const [deptExists] = await connection.query(
//                         'SELECT * FROM departmentdb WHERE departmentId = ?',
//                         [batch.departmentid]
//                     );

//                     if (deptExists.length === 0) {
//                         errors.push(`Row ${rowNum}: Department ID ${batch.departmentid} does not exist`);
//                         continue;
//                     }
//                     processedDepartments.add(batch.departmentid);
//                 }

//                 // Check if batch already exists
//                 const [existingBatch] = await connection.query(
//                     'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ?',
//                     [batch.departmentid, batch.batchno]
//                 );

//                 if (existingBatch.length > 0) {
//                     errors.push(`Row ${rowNum}: Batch ${batch.batchno} already exists for department ${batch.departmentid}`);
//                     continue;
//                 }

//                 // Insert batch
//                 const [result] = await connection.query(
//                     'INSERT INTO batchdb (departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
//                     [
//                         batch.departmentid,
//                         batch.batchno,
//                         batch.batchdate,
//                         batch.reporting_time,
//                         batch.start_time,
//                         batch.end_time,
//                         batch.batchstatus !== undefined ? batch.batchstatus : true
//                     ]
//                 );

//                 results.push({
//                     departmentId: batch.departmentid,
//                     batchNo: batch.batchno,
//                     batchdate: batch.batchdate,
//                     reporting_time: batch.reporting_time,
//                     start_time: batch.start_time,
//                     end_time: batch.end_time,
//                     batchstatus: batch.batchstatus !== undefined ? batch.batchstatus : true,
//                     status: 'created',
//                     row: rowNum
//                 });

//             } catch (batchError) {
//                 errors.push(`Row ${rowNum}: ${batchError.message}`);
//             }
//         }

//         res.json({
//             success: true,
//             message: `Batch upload completed. ${results.length} successful, ${errors.length} failed.`,
//             data: results,
//             errors: errors.length > 0 ? errors : undefined,
//             summary: {
//                 totalProcessed: batches.length,
//                 successful: results.length,
//                 failed: errors.length
//             }
//         });

//     } catch (err) {
//         console.error('Complete bulk upload batches error:', err);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error during bulk upload',
//             error: err.message
//         });
//     }
// };

//==============================================================================================

// UPDATED: Backend batch bulk upload with proper manual department handling and underscore DB columns
exports.bulkUploadBatchesComplete = async (req, res) => {
    try {
        const file = req.file;
        const manualDepartmentId = req.body.manualDepartmentId; // Get manual department ID

        console.log('Manual Department ID received:', manualDepartmentId);

        // Validate file
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        let batches = [];

        try {
            // Parse file based on type
            if (file.mimetype === 'text/csv') {
                batches = await parseCSV(file.buffer);
            } else {
                batches = await parseExcel(file.buffer);
            }
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'Error parsing file: ' + parseError.message
            });
        }

        if (batches.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid batch data found in file'
            });
        }

        // Check if Excel has departmentId column
        const hasExcelDepartmentId = batches.some(batch =>
            batch.hasOwnProperty('departmentid') ||
            batch.hasOwnProperty('departmentId') ||
            batch.hasOwnProperty('department_id')
        );

        console.log('Excel has departmentId:', hasExcelDepartmentId);
        console.log('First batch sample:', batches[0]);

        // Require either Excel departmentId or manualDepartmentId
        if (!hasExcelDepartmentId && !manualDepartmentId) {
            return res.status(400).json({
                success: false,
                message: 'Excel file does not contain departmentId column. Please select a department manually from the dropdown.'
            });
        }

        // Process batches
        const results = [];
        const errors = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const rowNum = i + 2; // Assuming row 1 is header

            try {
                // Resolve departmentId first (priority: Excel -> manual)
                let departmentId;
                if (batch.departmentid || batch.departmentId || batch.department_id) {
                    departmentId = batch.departmentid || batch.departmentId || batch.department_id;
                } else {
                    departmentId = manualDepartmentId;
                }

                // Validate batch data against underscore keys (as produced by parseExcel/parseCSV)
                const validation = validateBatchDataOnly(batch, rowNum);
                if (!validation.isValid) {
                    errors.push(validation.error);
                    continue;
                }

                // Normalize values from multiple possible header variants
                const batchNo       = batch.batchno      ?? batch.batchNo      ?? batch.batch_no;
                const batchDate     = batch.batchdate    ?? batch.batchDate    ?? batch.batch_date;
                const reportingTime = batch.reporting_time ?? batch.reportingtime ?? batch.reportingTime;
                const startTime     = batch.start_time   ?? batch.starttime    ?? batch.startTime;
                const endTime       = batch.end_time     ?? batch.endtime      ?? batch.endTime;

                // Department must exist
                const [departmentExists] = await connection.query(
                    'SELECT departmentId FROM departmentdb WHERE departmentId = ?',
                    [departmentId]
                );
                if (departmentExists.length === 0) {
                    errors.push(`Row ${rowNum}: Department ID ${departmentId} not found`);
                    continue;
                }

                // Duplicate check
                const [batchExists] = await connection.query(
                    'SELECT batchNo FROM batchdb WHERE departmentId = ? AND batchNo = ?',
                    [departmentId, batchNo]
                );
                if (batchExists.length > 0) {
                    errors.push(`Row ${rowNum}: Batch ${batchNo} already exists for department ${departmentId}`);
                    continue;
                }

                // INSERT using correct DB column names with underscores
                const [result] = await connection.query(
                    `INSERT INTO batchdb 
                     (departmentId, batchNo, batchdate, reporting_time, start_time, end_time, batchstatus)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        departmentId,
                        batchNo,
                        batchDate,
                        reportingTime,
                        startTime,
                        endTime,
                        1 // Default active status
                    ]
                );

                results.push({
                    departmentId,
                    batchNo,
                    batchdate: batchDate,
                    reporting_time: reportingTime,
                    start_time: startTime,
                    end_time: endTime,
                    status: 'created',
                    row: rowNum,
                    insertId: result.insertId,
                    source: (batch.departmentid || batch.departmentId || batch.department_id) ? 'excel' : 'manual_selection'
                });

            } catch (batchError) {
                errors.push(`Row ${rowNum}: ${batchError.message}`);
            }
        }

        res.json({
            success: true,
            message: `Batch upload completed. ${results.length} successful, ${errors.length} failed.`,
            data: results,
            errors: errors.length > 0 ? errors : undefined,
            summary: {
                totalProcessed: batches.length,
                successful: results.length,
                failed: errors.length,
                usedManualDepartment: !hasExcelDepartmentId && manualDepartmentId ? true : false
            }
        });

    } catch (err) {
        console.error('Complete bulk upload batches error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error during bulk upload',
            error: err.message
        });
    }
};


//==============================================================================================

// NEW: Validation function that does NOT require departmentId in Excel
function validateBatchDataOnly(batch, rowNum) {
    // Only validate batch-specific fields, NOT departmentId
    const requiredFields = ['batchno', 'batchdate', 'reporting_time', 'start_time', 'end_time'];
    
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

// Helper function to validate batch data (if not already exists)
function validateCompleteBatchData(batch, rowNum) {
    const requiredFields = ['batchno', 'batchdate', 'reportingtime', 'starttime', 'endtime'];
    
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




// NEW: Complete Bulk Upload Controllers from Excel/CSV (with departmentId and batchNo in file)
exports.bulkUploadControllersComplete = async (req, res) => {
    try {
        const file = req.file;

        // Validate file
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        let controllers = [];

        try {
            // Parse file based on type
            if (file.mimetype === 'text/csv') {
                controllers = await parseCSV(file.buffer);
            } else {
                controllers = await parseExcel(file.buffer);
            }
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'Error parsing file: ' + parseError.message
            });
        }

        if (controllers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid controller data found in file'
            });
        }

        // Process controllers
        const results = [];
        const errors = [];
        const processedBatches = new Set();

        for (let i = 0; i < controllers.length; i++) {
            const controller = controllers[i];
            const rowNum = i + 2; // Assuming row 1 is header

            try {
                // Validate controller data including departmentId and batchNo
                const validation = validateCompleteControllerData(controller, rowNum);
                if (!validation.isValid) {
                    errors.push(validation.error);
                    continue;
                }

                const batchKey = `${controller.departmentid}_${controller.batchno}`;

                // Check if batch exists (only once per batch)
                if (!processedBatches.has(batchKey)) {
                    const [batchExists] = await connection.query(
                        'SELECT * FROM batchdb WHERE departmentId = ? AND batchNo = ? AND batchstatus = 1',
                        [controller.departmentid, controller.batchno]
                    );

                    if (batchExists.length === 0) {
                        errors.push(`Row ${rowNum}: Batch ${controller.batchno} not found for department ${controller.departmentid} or inactive`);
                        continue;
                    }
                    processedBatches.add(batchKey);
                }

                // Check for duplicate controller codes if provided
                if (controller.controller_code && controller.controller_code.toString().trim() !== '') {
                    const [existingCode] = await connection.query(
                        'SELECT controller_code FROM controllerdb WHERE departmentId = ? AND batchNo = ? AND controller_code = ?',
                        [controller.departmentid, controller.batchno, controller.controller_code]
                    );

                    if (existingCode.length > 0) {
                        errors.push(`Row ${rowNum}: Controller code ${controller.controller_code} already exists for department ${controller.departmentid}, batch ${controller.batchno}`);
                        continue;
                    }
                }

                // Handle optional fields
                let controllerCode = null;
                if (controller.controller_code && controller.controller_code.toString().trim() !== '') {
                    controllerCode = controller.controller_code;
                }

                let districtValue = null;
                if (controller.district && controller.district.toString().trim() !== '') {
                    districtValue = controller.district;
                }

                // Insert controller
                const [result] = await connection.query(
                    `INSERT INTO controllerdb 
                    (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        controller.center,
                        controller.batchno,
                        controller.departmentid,
                        controllerCode,
                        controller.controller_name,
                        controller.controller_contact,
                        controller.controller_email,
                        controller.controller_pass,
                        districtValue
                    ]
                );

                results.push({
                    ...controller,
                    controller_code: controllerCode,
                    district: districtValue,
                    departmentId: controller.departmentid,
                    batchNo: controller.batchno,
                    status: 'created',
                    row: rowNum,
                    insertId: result.insertId
                });

            } catch (controllerError) {
                errors.push(`Row ${rowNum}: ${controllerError.message}`);
            }
        }

        res.json({
            success: true,
            message: `Controller upload completed. ${results.length} successful, ${errors.length} failed.`,
            data: results,
            errors: errors.length > 0 ? errors : undefined,
            summary: {
                totalProcessed: controllers.length,
                successful: results.length,
                failed: errors.length
            }
        });

    } catch (err) {
        console.error('Complete bulk upload controllers error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error during bulk upload',
            error: err.message
        });
    }
};

// Helper function to parse Excel files
async function parseExcel(buffer) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Use first row as header
            defval: '' // Default value for empty cells
        });

        if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least 2 rows (header + data)');
        }

        // Get headers from first row and normalize
        const headers = jsonData[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, '_'));
        
        // Convert rows to objects
        const data = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const obj = {};
            
            headers.forEach((header, index) => {
                if (row[index] !== undefined && row[index] !== '') {
                    obj[header] = row[index];
                }
            });
            
            // Skip empty rows
            if (Object.keys(obj).length > 0) {
                data.push(obj);
            }
        }

        return data;
    } catch (error) {
        throw new Error(`Excel parsing error: ${error.message}`);
    }
}

// Helper function to parse CSV files
async function parseCSV(buffer) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer.toString());
        
        stream
            .pipe(csv({
                mapHeaders: ({ header }) => header.toLowerCase().trim().replace(/\s+/g, '_')
            }))
            .on('data', (data) => {
                // Filter out completely empty rows
                const hasData = Object.values(data).some(value => 
                    value && value.toString().trim() !== ''
                );
                if (hasData) {
                    results.push(data);
                }
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(new Error(`CSV parsing error: ${error.message}`));
            });
    });
}

// NEW HELPER FUNCTION: Convert Excel time to HH:MM or HH:MM:SS format
function convertExcelTimeToHHMMSS(timeValue) {
    if (!timeValue && timeValue !== 0) {
        return null;
    }

    let timeStr = timeValue.toString().trim();
    
    // 1. Already in HH:MM:SS format - accept as is
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(timeStr)) {
        // Pad hour if needed (9:15:00 -> 09:15:00)
        const parts = timeStr.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2]}`;
    }
    
    // 2. Already in HH:MM format - accept as is
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
        // Pad hour if needed (9:15 -> 09:15)
        const parts = timeStr.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    }
    
    // 3. Excel serial time (decimal between 0 and 1)
    const timeNum = parseFloat(timeStr);
    if (!isNaN(timeNum) && timeNum >= 0 && timeNum < 1) {
        const totalSeconds = Math.round(timeNum * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            // Return with seconds if they exist, otherwise just HH:MM
            if (seconds > 0) {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        }
    }
    
    // 4. Excel time as hours (like 9.25 for 9:15)
    if (!isNaN(timeNum) && timeNum > 1 && timeNum < 24) {
        const hours = Math.floor(timeNum);
        const totalMinutes = Math.round((timeNum - hours) * 60);
        const minutes = totalMinutes % 60;
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }
    
    // 5. HHMM format (no colon) - like 0815 or 815
    if (/^[0-9]{3,4}$/.test(timeStr)) {
        const paddedTime = timeStr.padStart(4, '0');
        const hours = parseInt(paddedTime.substring(0, 2));
        const minutes = parseInt(paddedTime.substring(2, 4));
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }
    
    // 6. HHMMSS format (no colons) - like 081500
    if (/^[0-9]{5,6}$/.test(timeStr)) {
        const paddedTime = timeStr.padStart(6, '0');
        const hours = parseInt(paddedTime.substring(0, 2));
        const minutes = parseInt(paddedTime.substring(2, 4));
        const seconds = parseInt(paddedTime.substring(4, 6));
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    // 7. 12-hour format with AM/PM
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = parseInt(ampmMatch[2]);
        const seconds = parseInt(ampmMatch[3] || '0');
        const period = ampmMatch[4].toUpperCase();
        
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
            if (seconds > 0) {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        }
    }
    
    // 8. Just hours (like "9" meaning "09:00")
    if (/^[0-9]{1,2}$/.test(timeStr)) {
        const hours = parseInt(timeStr);
        if (hours >= 0 && hours <= 23) {
            return `${hours.toString().padStart(2, '0')}:00`;
        }
    }
    
    // 9. Try to parse as Date object (handles various formats)
    try {
        const dateObj = new Date(`1970-01-01 ${timeStr}`);
        if (!isNaN(dateObj.getTime())) {
            const hours = dateObj.getHours();
            const minutes = dateObj.getMinutes();
            const seconds = dateObj.getSeconds();
            
            if (seconds > 0) {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        }
    } catch (e) {
        // Ignore date parsing errors
    }
    
    console.error(`Unable to parse time value: "${timeValue}" (type: ${typeof timeValue})`);
    return null;
}

// UPDATED Helper function to validate complete batch data (including departmentId) - SUPPORTS HH:MM AND HH:MM:SS
function validateCompleteBatchData(batch, rowNum) {
    const requiredFields = ['departmentid', 'batchno', 'batchdate', 'reporting_time', 'start_time', 'end_time'];
    
    // Check required fields
    for (const field of requiredFields) {
        if (!batch[field] && batch[field] !== 0) { // Allow 0 values
            return {
                isValid: false,
                error: `Row ${rowNum}: Missing required field '${field}'`
            };
        }
    }

    // Validate departmentId is numeric
    if (isNaN(batch.departmentid)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Department ID must be numeric`
        };
    }

    // Validate batch number is numeric
    if (isNaN(batch.batchno)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Batch number must be numeric`
        };
    }

    // Validate date format
    const dateStr = batch.batchdate.toString();
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Invalid date format for batchdate`
        };
    }

    // UPDATED: Enhanced time validation for both HH:MM and HH:MM:SS formats
    const timeFields = ['reporting_time', 'start_time', 'end_time'];
    for (const timeField of timeFields) {
        const convertedTime = convertExcelTimeToHHMMSS(batch[timeField]);
        if (!convertedTime) {
            return {
                isValid: false,
                error: `Row ${rowNum}: Invalid time format for ${timeField}. Expected HH:MM or HH:MM:SS format. Received: ${batch[timeField]}`
            };
        }
        // Update the batch object with converted time
        batch[timeField] = convertedTime;
    }

    // Normalize field names and values
    batch.departmentid = parseInt(batch.departmentid);
    batch.batchno = parseInt(batch.batchno);
    batch.batchdate = new Date(dateStr).toISOString().split('T')[0]; // Format as YYYY-MM-DD

    return { isValid: true };
}

// UPDATED Helper function to validate complete controller data (NO CONTACT LENGTH VALIDATION)
function validateCompleteControllerData(controller, rowNum) {
    const requiredFields = ['departmentid', 'batchno', 'controller_name', 'controller_contact', 'controller_email', 'controller_pass', 'center'];
    
    // Check required fields
    for (const field of requiredFields) {
        if (!controller[field] || controller[field].toString().trim() === '') {
            return {
                isValid: false,
                error: `Row ${rowNum}: Missing required field '${field}'`
            };
        }
    }

    // Validate departmentId is numeric
    if (isNaN(controller.departmentid)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Department ID must be numeric`
        };
    }

    // Validate batchNo is numeric
    if (isNaN(controller.batchno)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Batch number must be numeric`
        };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(controller.controller_email)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Invalid email format`
        };
    }

    // REMOVED: Contact number validation - accept any value
    // Just keep the original value as is, no length validation
    const contactStr = controller.controller_contact.toString().trim();

    // Validate center is numeric
    if (isNaN(controller.center)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Center must be numeric`
        };
    }

    // Validate controller_code if provided
    if (controller.controller_code && isNaN(controller.controller_code)) {
        return {
            isValid: false,
            error: `Row ${rowNum}: Controller code must be numeric if provided`
        };
    }

    // Clean up data
    controller.departmentid = parseInt(controller.departmentid);
    controller.batchno = parseInt(controller.batchno);
    controller.controller_contact = contactStr; // Keep as string, no digit filtering
    controller.center = parseInt(controller.center);
    
    if (controller.controller_code) {
        controller.controller_code = parseInt(controller.controller_code);
    }

    return { isValid: true };
}



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
