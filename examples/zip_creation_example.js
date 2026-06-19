const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const connection = require('../config/db1'); // Adjust path as needed

// 1. Function to create a ZIP file from source files and save it to disk
const createAndStoreZip = async (sourceFiles, outputFileName, storageFolder) => {
    return new Promise((resolve, reject) => {
        // Ensure storage directory exists
        if (!fs.existsSync(storageFolder)) {
            fs.mkdirSync(storageFolder, { recursive: true });
        }

        const outputPath = path.join(storageFolder, outputFileName);
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // Listen for all archive data to be written
        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('Archiver has been finalized and the output file descriptor has closed.');
            resolve({
                filename: outputFileName,
                path: outputPath,
                size: archive.pointer()
            });
        });

        // Good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                console.warn(err);
            } else {
                reject(err);
            }
        });

        // Good practice to catch this error explicitly
        archive.on('error', function (err) {
            reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Append files from stream or path
        sourceFiles.forEach(file => {
            // Check if file exists before adding
            if (fs.existsSync(file.path)) {
                archive.file(file.path, { name: file.name });
            } else {
                console.warn(`File not found: ${file.path}`);
            }
        });

        // Finalize the archive (ie we are done appending files but streams have to finish yet)
        archive.finalize();
    });
};

// 2. Function to save the record in the database
const saveZipRecordToDb = async (filename, filePath, batchNo, departmentId) => {
    try {
        const query = `INSERT INTO zip_records (filename, file_path, batchNo, departmentId, created_at) VALUES (?, ?, ?, ?, NOW())`;
        const [result] = await connection.query(query, [filename, filePath, batchNo, departmentId]);
        console.log("Record saved to DB with ID:", result.insertId);
        return result.insertId;
    } catch (error) {
        console.error("Error saving to DB:", error);
        throw error;
    }
};

// --- USAGE EXAMPLE ---
const runExample = async () => {
    try {
        // Define files to zip (example)
        const filesToZip = [
            { path: path.join(__dirname, '../controllers/admin_functions.js'), name: 'admin_functions.js' },
            { path: path.join(__dirname, '../server.js'), name: 'server.js' }
        ];

        const outputFolder = path.join(__dirname, '../public/zips');
        const zipName = `backup_${Date.now()}.zip`;

        console.log("Creating zip...");
        const zipInfo = await createAndStoreZip(filesToZip, zipName, outputFolder);
        console.log("Zip created at:", zipInfo.path);

        console.log("Saving to DB...");
        // Assuming you have a table 'zip_records' - you might needs to create it first!
        // await saveZipRecordToDb(zipInfo.filename, zipInfo.path, '101', 'DEPT_001');

        console.log("Done!");

    } catch (error) {
        console.error("Example failed:", error);
    }
};

// Uncomment to run if db is configured
// runExample();

module.exports = { createAndStoreZip, saveZipRecordToDb };
