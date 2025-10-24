// config/multerConfig.js
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept Excel and CSV files only
    const allowedMimes = [
        'application/vnd.ms-excel',                    // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx  
        'text/csv',                                    // .csv
        'application/csv',                             // .csv (alternative mime)
        'text/x-csv',                                  // .csv (alternative mime)
        'application/x-csv'                            // .csv (alternative mime)
    ];
    
    // Check file extension as backup
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed. Received: ${file.mimetype}`), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 5MB limit
        files: 1,                   // Only 1 file at a time
        fields: 10                  // Limit form fields
    },
    fileFilter: fileFilter
});

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size too large. Maximum allowed size is 5MB.'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Only 1 file is allowed.'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected file field. Please use "file" as the field name.'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${error.message}`
                });
        }
    } else if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleMulterError
};
