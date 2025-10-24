// middleware/uploadExcel.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads with proper settings
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'exam-center-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = function (req, file, cb) {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only .xlsx, .xls, and .csv files are allowed.'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    } else if (error) {
        return res.status(400).json({
            message: error.message
        });
    }
    next();
};

// Middleware for single file upload
const uploadExcelFile = upload.single('excelFile');

module.exports = {
    uploadExcelFile,
    handleMulterError
};