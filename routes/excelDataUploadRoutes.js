// routes/excelDataUploadRoutes.js
const express = require('express');
const router = express.Router();
const excelDataController = require('../controllers/superAdminController/excelDataController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer with comprehensive validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'excel-data-' + uniqueSuffix + fileExtension);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('[INFO] File validation started for:', file.originalname);
  
  // Check MIME type
  const allowedMimeTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  // Check file extension
  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    console.log('[INFO] File validation passed');
    cb(null, true);
  } else {
    console.warn('[WARN] File validation failed:', {
      mimetype: file.mimetype,
      extension: fileExtension
    });
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  }
});

// Enhanced error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.error('[ERROR] Multer error:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum allowed size is 10MB.',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field. Please use the correct field name.',
          code: 'UNEXPECTED_FILE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only one file is allowed.',
          code: 'TOO_MANY_FILES'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'File upload error: ' + error.message,
          code: 'UPLOAD_ERROR'
        });
    }
  }
  
  if (error.message.includes('Only Excel files')) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error during file upload',
    code: 'INTERNAL_ERROR'
  });
};

// Routes with comprehensive error handling
router.get('/available-tables', excelDataController.getAvailableTables);

// NEW ROUTE: Get table schema fields
router.get('/table-schema/:tableName', excelDataController.getTableSchema);

router.post('/upload-excel-data', 
  upload.single('excelFile'),
  handleMulterError,
  excelDataController.processExcelData
);

module.exports = router;
