// const connection = require('../../config/db1');
// const fs = require('fs');
// const path = require('path');
// const archiver = require('archiver');

// // Path to the typing_passage_logs folder (corrected name)
// const LOGS_FOLDER_PATH = path.join(__dirname, '../../typing_passage_logs');

// // Ensure the logs folder exists
// if (!fs.existsSync(LOGS_FOLDER_PATH)) {
//     console.warn('Warning: typing_passage_logs folder does not exist at:', LOGS_FOLDER_PATH);
//     // Create the directory if it doesn't exist
//     fs.mkdirSync(LOGS_FOLDER_PATH, { recursive: true });
//     console.log('Created typing_passage_logs folder at:', LOGS_FOLDER_PATH);
// } else {
//     console.log('typing_passage_logs folder found at:', LOGS_FOLDER_PATH);
// }

// exports.getDepartments = async (req, res) => {
//     try {
//         const [departments] = await connection.query(
//             'SELECT departmentId, departmentName FROM departmentdb WHERE departmentStatus = 1 ORDER BY departmentName'
//         );
//         res.json({
//             message: "Departments retrieved successfully",
//             data: departments
//         });
//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getBatchesByDepartment = async (req, res) => {
//     const { departmentId } = req.params;

//     try {
//         console.log('Fetching batches for department:', departmentId);
        
//         const [batches] = await connection.query(
//             `SELECT DISTINCT batchNo, batchdate 
//              FROM batchdb 
//              WHERE departmentId = ? 
//              ORDER BY batchNo DESC`,
//             [departmentId]
//         );

//         console.log('Found batches:', batches);
        
//         res.json({
//             message: "Batches retrieved successfully",
//             data: batches
//         });
//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.getStudentsByBatch = async (req, res) => {
//     const { departmentId, batchNo } = req.params;

//     try {
//         console.log('Fetching students for department:', departmentId, 'batch:', batchNo);
        
//         const [students] = await connection.query(
//             `SELECT student_id, fullname 
//              FROM students 
//              WHERE departmentId = ? AND batchNo = ? 
//              ORDER BY student_id`,
//             [departmentId, batchNo]
//         );

//         console.log('Found students:', students);
        
//         res.json({
//             message: "Students retrieved successfully",
//             data: students
//         });
//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

// exports.downloadStudentZip = async (req, res) => {
//     const { studentIds } = req.body;

//     if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
//         return res.status(400).json({ message: "No student IDs provided" });
//     }

//     try {
//         // Check if trackrecord table exists
//         const [tableCheck] = await connection.query(
//             `SELECT COUNT(*) as count FROM information_schema.tables 
//              WHERE table_schema = DATABASE() AND table_name = 'trackrecord'`
//         );

//         if (tableCheck[0].count === 0) {
//             return res.status(404).json({ message: "Trackrecord table not found in database" });
//         }

//         // Check if zip_file_name column exists in trackrecord
//         const [columnCheck] = await connection.query(
//             `SELECT COUNT(*) as count FROM information_schema.columns 
//              WHERE table_schema = DATABASE() AND table_name = 'trackrecord' AND column_name = 'zip_file_name'`
//         );

//         if (columnCheck[0].count === 0) {
//             return res.status(404).json({ message: "zip_file_name column not found in trackrecord table" });
//         }

//         // Get zip file names from trackrecord table
//         const placeholders = studentIds.map(() => '?').join(',');
//         const query = `
//             SELECT student_id, zip_file_name 
//             FROM trackrecord 
//             WHERE student_id IN (${placeholders}) AND zip_file_name IS NOT NULL AND zip_file_name != ''
//         `;
        
//         const [trackRecords] = await connection.query(query, studentIds);

//         if (trackRecords.length === 0) {
//             return res.status(404).json({ 
//                 message: "No zip file records found for the selected students in trackrecord table" 
//             });
//         }

//         console.log('Found track records:', trackRecords);
//         console.log('Looking for files in folder:', LOGS_FOLDER_PATH);

//         // Check which files actually exist in the typing_passage_logs folder
//         const existingFiles = [];
//         const missingFiles = [];

//         for (const record of trackRecords) {
//             const filePath = path.join(LOGS_FOLDER_PATH, record.zip_file_name);
            
//             if (fs.existsSync(filePath)) {
//                 existingFiles.push({
//                     student_id: record.student_id,
//                     zip_file_name: record.zip_file_name,
//                     filePath: filePath,
//                     fileSize: fs.statSync(filePath).size
//                 });
//             } else {
//                 missingFiles.push({
//                     student_id: record.student_id,
//                     zip_file_name: record.zip_file_name,
//                     reason: 'File not found in typing_passage_logs folder',
//                     searchedPath: filePath
//                 });
//                 console.warn('File not found:', filePath);
//             }
//         }

//         if (existingFiles.length === 0) {
//             return res.status(404).json({ 
//                 message: "No zip files found in the typing_passage_logs folder",
//                 details: {
//                     requestedStudents: studentIds.length,
//                     foundInDatabase: trackRecords.length,
//                     missingFiles: missingFiles,
//                     storageFolder: LOGS_FOLDER_PATH
//                 }
//             });
//         }

//         console.log('Existing files found:', existingFiles.map(f => ({
//             file: f.zip_file_name,
//             size: f.fileSize
//         })));

//         // Single file download
//         if (existingFiles.length === 1) {
//             const fileRecord = existingFiles[0];
//             const filePath = path.join(LOGS_FOLDER_PATH, fileRecord.zip_file_name);
            
//             // Set headers for file download
//             res.setHeader('Content-Type', 'application/zip');
//             res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.zip_file_name}"`);
//             res.setHeader('Content-Length', fs.statSync(filePath).size);
            
//             // Stream the file directly from typing_passage_logs folder
//             const fileStream = fs.createReadStream(filePath);
//             fileStream.pipe(res);
            
//             fileStream.on('error', (err) => {
//                 console.error('File stream error:', err);
//                 if (!res.headersSent) {
//                     res.status(500).json({ message: 'Error streaming file', error: err.message });
//                 }
//             });
            
//             return;
//         }

//         // Multiple files - create merged zip
//         const archive = archiver('zip', {
//             zlib: { level: 9 }
//         });

//         // Set headers for zip download
//         res.setHeader('Content-Type', 'application/zip');
//         res.setHeader('Content-Disposition', 'attachment; filename="student_typed_passages.zip"');

//         archive.on('warning', (err) => {
//             if (err.code === 'ENOENT') {
//                 console.warn('Archive warning:', err);
//             } else {
//                 throw err;
//             }
//         });

//         archive.on('error', (err) => {
//             console.error('Archive error:', err);
//             if (!res.headersSent) {
//                 res.status(500).json({ message: 'Error creating zip archive', error: err.message });
//             }
//         });

//         // Pipe archive to response
//         archive.pipe(res);

//         // Add each file to the archive from typing_passage_logs folder
//         existingFiles.forEach(record => {
//             archive.file(record.filePath, { name: record.zip_file_name });
//         });

//         // Finalize the archive
//         archive.finalize();

//     } catch (err) {
//         console.error('Download error:', err);
//         if (!res.headersSent) {
//             res.status(500).json({ message: 'Internal server error', error: err.message });
//         }
//     }
// };

// // Helper function to check folder and trackrecord status
// exports.checkStorageStatus = async (req, res) => {
//     try {
//         // Check if folder exists
//         const folderExists = fs.existsSync(LOGS_FOLDER_PATH);
//         let folderInfo = {
//             exists: folderExists,
//             path: LOGS_FOLDER_PATH
//         };

//         if (folderExists) {
//             // Get folder contents
//             try {
//                 const files = fs.readdirSync(LOGS_FOLDER_PATH);
//                 const zipFiles = files.filter(file => file.endsWith('.zip'));
//                 folderInfo.fileCount = files.length;
//                 folderInfo.zipFileCount = zipFiles.length;
//                 folderInfo.sampleFiles = zipFiles.slice(0, 5); // First 5 zip files
//             } catch (readError) {
//                 folderInfo.readError = readError.message;
//             }
//         }

//         // Check trackrecord table
//         const [tableExists] = await connection.query(
//             `SELECT COUNT(*) as count FROM information_schema.tables 
//              WHERE table_schema = DATABASE() AND table_name = 'trackrecord'`
//         );

//         let trackrecordInfo = {
//             tableExists: tableExists[0].count > 0
//         };

//         if (trackrecordInfo.tableExists) {
//             const [hasZipColumn] = await connection.query(
//                 `SELECT COUNT(*) as count FROM information_schema.columns 
//                  WHERE table_schema = DATABASE() AND table_name = 'trackrecord' AND column_name = 'zip_file_name'`
//             );

//             trackrecordInfo.hasZipColumn = hasZipColumn[0].count > 0;

//             if (trackrecordInfo.hasZipColumn) {
//                 const [rowCount] = await connection.query(
//                     'SELECT COUNT(*) as count FROM trackrecord WHERE zip_file_name IS NOT NULL AND zip_file_name != ""'
//                 );
//                 trackrecordInfo.recordCount = rowCount[0].count;

//                 // Get sample records
//                 const [sampleRecords] = await connection.query(
//                     'SELECT student_id, zip_file_name FROM trackrecord WHERE zip_file_name IS NOT NULL LIMIT 5'
//                 );
//                 trackrecordInfo.sampleRecords = sampleRecords;
//             }
//         }

//         res.json({
//             storageFolder: folderInfo,
//             trackrecordTable: trackrecordInfo,
//             message: "Storage status check completed"
//         });

//     } catch (err) {
//         console.error('Storage status check error:', err);
//         res.status(500).json({ message: 'Error checking storage status', error: err.message });
//     }
// };

const connection = require('../../config/db1');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Path to the typing_passage_logs folder
const LOGS_FOLDER_PATH = path.join(__dirname, '../../typing_passage_logs');

// Ensure the logs folder exists
if (!fs.existsSync(LOGS_FOLDER_PATH)) {
    console.warn('Warning: typing_passage_logs folder does not exist at:', LOGS_FOLDER_PATH);
    fs.mkdirSync(LOGS_FOLDER_PATH, { recursive: true });
    console.log('Created typing_passage_logs folder at:', LOGS_FOLDER_PATH);
} else {
    console.log('typing_passage_logs folder found at:', LOGS_FOLDER_PATH);
}

exports.getDepartments = async (req, res) => {
    try {
        const [departments] = await connection.query(
            'SELECT departmentId, departmentName FROM departmentdb WHERE departmentStatus = 1 ORDER BY departmentName'
        );
        res.json({
            message: "Departments retrieved successfully",
            data: departments
        });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getDepartmentBatchesForZip = async (req, res) => {
    const { departmentId } = req.params;

    try {
        console.log('Fetching batches for department:', departmentId);
        
        const [batches] = await connection.query(
            `SELECT DISTINCT batchNo, batchdate 
             FROM batchdb 
             WHERE departmentId = ? AND batchstatus = 0 
             ORDER BY batchNo DESC`,
            [departmentId]
        );

        console.log('Found batches:', batches);
        
        res.json({
            message: "Batches retrieved successfully",
            data: batches
        });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.getStudentsByBatch = async (req, res) => {
    const { departmentId, batchNo } = req.params;

    try {
        console.log('Fetching students for department:', departmentId, 'batch:', batchNo);
        
        const [students] = await connection.query(
            `SELECT student_id, fullname 
             FROM students 
             WHERE departmentId = ? AND batchNo = ? 
             ORDER BY student_id`,
            [departmentId, batchNo]
        );

        console.log('Found students:', students);
        
        res.json({
            message: "Students retrieved successfully",
            data: students
        });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.downloadStudentZip = async (req, res) => {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "No student IDs provided" });
    }

    try {
        // Check if trackrecord table exists
        const [tableCheck] = await connection.query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = 'trackrecord'`
        );

        if (tableCheck[0].count === 0) {
            return res.status(404).json({ message: "Trackrecord table not found in database" });
        }

        // Get PA_filename and PB_filename from trackrecord table
        const placeholders = studentIds.map(() => '?').join(',');
        const query = `
            SELECT student_id, PA_filename, PB_filename 
            FROM trackrecord 
            WHERE student_id IN (${placeholders})
        `;
        
        const [trackRecords] = await connection.query(query, studentIds);

        if (trackRecords.length === 0) {
            return res.status(404).json({ 
                message: "No records found for the selected students in trackrecord table" 
            });
        }

        console.log('Found track records:', trackRecords);

        // Collect all unique filenames from both PA and PB
        const allFilenames = [];
        trackRecords.forEach(record => {
            if (record.PA_filename) allFilenames.push(record.PA_filename);
            if (record.PB_filename) allFilenames.push(record.PB_filename);
        });

        if (allFilenames.length === 0) {
            return res.status(404).json({ 
                message: "No passage files found for the selected students" 
            });
        }

        console.log('Looking for files in folder:', LOGS_FOLDER_PATH);

        // Check which files actually exist in the typing_passage_logs folder
        const existingFiles = [];
        const missingFiles = [];

        allFilenames.forEach(filename => {
            const filePath = path.join(LOGS_FOLDER_PATH, filename);
            
            if (fs.existsSync(filePath)) {
                existingFiles.push({
                    filename: filename,
                    filePath: filePath,
                    fileSize: fs.statSync(filePath).size
                });
            } else {
                missingFiles.push({
                    filename: filename,
                    reason: 'File not found in typing_passage_logs folder',
                    searchedPath: filePath
                });
                console.warn('File not found:', filePath);
            }
        });

        if (existingFiles.length === 0) {
            return res.status(404).json({ 
                message: "No zip files found in the typing_passage_logs folder",
                details: {
                    requestedStudents: studentIds.length,
                    foundInDatabase: trackRecords.length,
                    totalFilenames: allFilenames.length,
                    missingFiles: missingFiles,
                    storageFolder: LOGS_FOLDER_PATH
                }
            });
        }

        console.log('Existing files found:', existingFiles.map(f => ({
            file: f.filename,
            size: f.fileSize
        })));

        // Single file download (if only one file exists for one student)
        if (existingFiles.length === 1 && studentIds.length === 1) {
            const fileRecord = existingFiles[0];
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.filename}"`);
            res.setHeader('Content-Length', fileRecord.fileSize);
            
            // Stream the file directly from typing_passage_logs folder
            const fileStream = fs.createReadStream(fileRecord.filePath);
            fileStream.pipe(res);
            
            fileStream.on('error', (err) => {
                console.error('File stream error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error streaming file', error: err.message });
                }
            });
            
            return;
        }

        // Multiple files - create merged zip
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Set headers for zip download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="student_passages.zip"');

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archive warning:', err);
            } else {
                throw err;
            }
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error creating zip archive', error: err.message });
            }
        });

        // Pipe archive to response
        archive.pipe(res);

        // Add each file to the archive from typing_passage_logs folder
        existingFiles.forEach(file => {
            archive.file(file.filePath, { name: file.filename });
        });

        // Finalize the archive
        archive.finalize();

    } catch (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    }
};

// Get individual student's passage files
exports.getStudentPassageFiles = async (req, res) => {
    const { studentId } = req.params;

    try {
        const [studentFiles] = await connection.query(
            `SELECT student_id, PA_filename, PB_filename, PA_datetime, PB_datetime
             FROM trackrecord 
             WHERE student_id = ?`,
            [studentId]
        );

        if (studentFiles.length === 0) {
            return res.status(404).json({ 
                message: "No passage files found for this student" 
            });
        }

        const studentData = studentFiles[0];
        const files = [];

        // Check if files exist
        if (studentData.PA_filename) {
            const filePath = path.join(LOGS_FOLDER_PATH, studentData.PA_filename);
            files.push({
                filename: studentData.PA_filename,
                type: 'Passage A',
                datetime: studentData.PA_datetime,
                exists: fs.existsSync(filePath),
                path: filePath
            });
        }

        if (studentData.PB_filename) {
            const filePath = path.join(LOGS_FOLDER_PATH, studentData.PB_filename);
            files.push({
                filename: studentData.PB_filename,
                type: 'Passage B',
                datetime: studentData.PB_datetime,
                exists: fs.existsSync(filePath),
                path: filePath
            });
        }

        res.json({
            message: "Student passage files retrieved successfully",
            data: {
                student_id: studentData.student_id,
                files: files
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Helper function to check folder and trackrecord status
exports.checkStorageStatus = async (req, res) => {
    try {
        // Check if folder exists
        const folderExists = fs.existsSync(LOGS_FOLDER_PATH);
        let folderInfo = {
            exists: folderExists,
            path: LOGS_FOLDER_PATH
        };

        if (folderExists) {
            try {
                const files = fs.readdirSync(LOGS_FOLDER_PATH);
                const zipFiles = files.filter(file => file.endsWith('.zip'));
                folderInfo.fileCount = files.length;
                folderInfo.zipFileCount = zipFiles.length;
                folderInfo.sampleFiles = zipFiles.slice(0, 5);
            } catch (readError) {
                folderInfo.readError = readError.message;
            }
        }

        // Check trackrecord table structure
        const [tableExists] = await connection.query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = 'trackrecord'`
        );

        let trackrecordInfo = {
            tableExists: tableExists[0].count > 0
        };

        if (trackrecordInfo.tableExists) {
            // Check for PA_filename column
            const [hasPAColumn] = await connection.query(
                `SELECT COUNT(*) as count FROM information_schema.columns 
                 WHERE table_schema = DATABASE() AND table_name = 'trackrecord' AND column_name = 'PA_filename'`
            );

            // Check for PB_filename column
            const [hasPBColumn] = await connection.query(
                `SELECT COUNT(*) as count FROM information_schema.columns 
                 WHERE table_schema = DATABASE() AND table_name = 'trackrecord' AND column_name = 'PB_filename'`
            );

            trackrecordInfo.hasPAFilename = hasPAColumn[0].count > 0;
            trackrecordInfo.hasPBFilename = hasPBColumn[0].count > 0;

            if (trackrecordInfo.hasPAFilename || trackrecordInfo.hasPBFilename) {
                const [rowCount] = await connection.query(
                    `SELECT COUNT(*) as count FROM trackrecord 
                     WHERE PA_filename IS NOT NULL OR PB_filename IS NOT NULL`
                );
                trackrecordInfo.recordCount = rowCount[0].count;

                // Get sample records
                const [sampleRecords] = await connection.query(
                    `SELECT student_id, PA_filename, PB_filename 
                     FROM trackrecord 
                     WHERE PA_filename IS NOT NULL OR PB_filename IS NOT NULL 
                     LIMIT 5`
                );
                trackrecordInfo.sampleRecords = sampleRecords;
            }
        }

        res.json({
            storageFolder: folderInfo,
            trackrecordTable: trackrecordInfo,
            message: "Storage status check completed"
        });

    } catch (err) {
        console.error('Storage status check error:', err);
        res.status(500).json({ message: 'Error checking storage status', error: err.message });
    }
};