const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.downloadBackup = async (req, res) => {
    try {
        const { filename } = req.query;
        
        // Validate filename
        if (!filename || !filename.endsWith('.sql')) {
            return res.status(400).json({ 
                message: "Filename is required and must end with .sql" 
            });
        }

        // Sanitize filename to prevent directory traversal
        const sanitizedFilename = path.basename(filename);
        const backupPath = path.join(__dirname, '..', '..', 'backups', sanitizedFilename);
        
        // Ensure backups directory exists
        const backupsDir = path.dirname(backupPath);
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        // Database credentials from environment
        const dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        };

        // Build mysqldump command
        const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} --default-character-set=utf8mb4 ${dbConfig.database} > "${backupPath}"`;

        // Execute mysqldump command
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup error:', error);
                return res.status(500).json({ 
                    message: 'Failed to create backup', 
                    error: error.message 
                });
            }

            if (stderr && !stderr.includes('Using a password on the command line interface can be insecure')) {
                console.error('Backup stderr:', stderr);
            }

            // Check if file was created
            if (!fs.existsSync(backupPath)) {
                return res.status(500).json({ 
                    message: 'Backup file was not created' 
                });
            }

            // Set headers for file download
            res.setHeader('Content-Type', 'application/sql');
            res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
            res.setHeader('Content-Length', fs.statSync(backupPath).size);

            // Stream the file to response
            const fileStream = fs.createReadStream(backupPath);
            fileStream.pipe(res);

            // Clean up file after download
            fileStream.on('close', () => {
                fs.unlink(backupPath, (err) => {
                    if (err) console.error('Error deleting backup file:', err);
                });
            });

            fileStream.on('error', (err) => {
                console.error('File stream error:', err);
                res.status(500).json({ message: 'Error streaming backup file' });
            });
        });

    } catch (err) {
        console.error('Backup controller error:', err);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: err.message 
        });
    }
};

exports.getBackupStatus = async (req, res) => {
    try {
        // Check if mysqldump is available
        exec('mysqldump --version', (error) => {
            if (error) {
                return res.json({
                    available: false,
                    message: 'mysqldump is not installed or not in PATH'
                });
            }
            
            res.json({
                available: true,
                message: 'Backup functionality is ready'
            });
        });
    } catch (err) {
        console.error('Backup status error:', err);
        res.status(500).json({ 
            message: 'Error checking backup status', 
            error: err.message 
        });
    }
};