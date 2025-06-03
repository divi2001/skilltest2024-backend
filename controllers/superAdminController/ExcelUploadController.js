// controllers\superAdminController\ExcelUploadController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use a fixed filename instead of a unique one
    cb(null, 'students_with_base64_final' + path.extname(file.originalname));
  }
});

// File filter to accept only excel files
// Enhanced file filter with MIME type fallback
const fileFilter = (req, file, cb) => {
  const filetypes = /xlsx|xls/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  // Debugging logs (you can remove these after testing)
  console.log('File upload debug:');
  console.log('Original name:', file.originalname);
  console.log('Extension:', path.extname(file.originalname));
  console.log('MIME type:', file.mimetype);

  // Primary check: Both MIME type and extension must match
  if (mimetype && extname) {
    return cb(null, true);
  }
  // Fallback check: If MIME type fails but extension is good
  else if (extname) {
    console.warn('MIME type check failed but extension is valid, allowing upload');
    return cb(null, true);
  }
  // Final fallback: Check for common Excel MIME types that might vary
  else if ([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream', // sometimes used for Excel
    'application/zip' // .xlsx is technically a zip file
  ].includes(file.mimetype) && extname) {
    console.warn('Non-standard but acceptable MIME type with valid extension');
    return cb(null, true);
  }
  else {
    const error = new Error('Only Excel files (.xlsx, .xls) are allowed!');
    error.uploadError = {
      receivedMime: file.mimetype,
      receivedExt: path.extname(file.originalname),
      allowedTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    };
    return cb(error);
  }
};

// Set up the multer middleware
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('excelFile');

// Controller method to handle file upload
exports.uploadStudentData = (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({ error: err.message });
    }
    
    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel file' });
    }
    
    try {
      // Process the Excel file
      const filePath = req.file.path;
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON to validate structure
      const excelData = XLSX.utils.sheet_to_json(worksheet);
      
      // Validate required fields
      const requiredFields = [
        'student_id', 'InstituteId', 'fullname', 'mothername', 
        'center', 'subjectsId', 'batchNo', 'batchdate', 
        'start_time', 'password', 'SUBNAME'
      ];
      
      if (excelData.length === 0) {
        return res.status(400).json({ error: 'Excel file is empty' });
      }
      
      const firstRow = excelData[0];
      const missingFields = requiredFields.filter(field => !(field in firstRow));
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }
      
      // Save the file path to use later if needed
      const relativeFilePath = path.relative(path.join(__dirname, '../../public'), filePath);
      
      return res.status(200).json({ 
        message: 'File uploaded successfully',
        filePath: '/public/' + relativeFilePath.replace(/\\/g, '/'),
        studentCount: excelData.length
      });
      
    } catch (error) {
      console.error('Error processing Excel file:', error);
      return res.status(500).json({ error: 'Failed to process Excel file' });
    }
  });
};

// Controller method to validate student data from an uploaded file
exports.validateStudentData = async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Get the absolute path
    const absolutePath = path.join(__dirname, '../../', filePath.replace(/^\/public\//, 'public/'));
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read and process the Excel file
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    // Extract unique institutes
    const institutes = [...new Set(excelData.map(row => row.InstituteId?.toString() || ''))];
    
    // Return summary of data
    return res.status(200).json({
      message: 'Data validation successful',
      totalStudents: excelData.length,
      institutes: institutes,
      sampleData: excelData.slice(0, 5) // Return first 5 records as sample
    });
    
  } catch (error) {
    console.error('Error validating student data:', error);
    return res.status(500).json({ error: 'Failed to validate student data' });
  }
};