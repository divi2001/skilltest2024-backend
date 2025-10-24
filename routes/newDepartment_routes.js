// // routes/newDepartment_routes.js
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
// const newDepartmentController = require('../controllers/newDepartment_Controller');

// // Department Routes
// router.post('/departments', newDepartmentController.createDepartment);
// router.get('/departments', newDepartmentController.getAllDepartments);
// router.get('/departments/:id', newDepartmentController.getDepartmentById);

// // Exam Center Routes
// router.post('/exam-centers', newDepartmentController.createExamCenter);
// router.get('/exam-centers', newDepartmentController.getAllExamCenters);

// // Batch Routes
// router.post('/batches', newDepartmentController.createBatch);
// router.get('/batches', newDepartmentController.getAllBatches);
// router.get('/batches/:departmentId', newDepartmentController.getBatchesByDepartment);

// // Controller Routes
// router.post('/controllers', newDepartmentController.assignController);
// router.get('/controllers', newDepartmentController.getAllControllers);

// // Student Routes
// router.post('/students', newDepartmentController.registerStudent);
// router.get('/students', newDepartmentController.getAllStudents);

// // Add batches to existing department
// router.post('/existing-department/batches', newDepartmentController.addBatchesToExistingDepartment);

// // Add these with your other routes
// router.post('/exam-centers-new/bulk-upload', upload.single('excelFile'), newDepartmentController.bulkUploadExamCentersNew);
// router.get('/exam-centers-new/download-template', newDepartmentController.downloadExamCenterTemplateNew);

// module.exports = router;

// routes/newDepartment_routes.js
const express = require('express');
const router = express.Router();

const newDepartmentController = require('../controllers/newDepartment_Controller');
const { uploadExcelFile, handleMulterError } = require('../middleware/uploadExcel');

// Department Routes
router.post('/departments', newDepartmentController.createDepartment);
router.get('/departments', newDepartmentController.getAllDepartments);
router.get('/departments/:id', newDepartmentController.getDepartmentById);

// Exam Center Routes
router.post('/exam-centers', newDepartmentController.createExamCenter);
router.get('/exam-centers', newDepartmentController.getAllExamCenters);

// Batch Routes
router.post('/batches', newDepartmentController.createBatch);
router.get('/batches', newDepartmentController.getAllBatches);
router.get('/batches/:departmentId', newDepartmentController.getBatchesByDepartment);

// Controller Routes
router.post('/controllers', newDepartmentController.assignController);
router.get('/controllers', newDepartmentController.getAllControllers);

// Student Routes
router.post('/students', newDepartmentController.registerStudent);
router.get('/students', newDepartmentController.getAllStudents);

// Add batches to existing department
router.post('/existing-department/batches', newDepartmentController.addBatchesToExistingDepartment);

// NEW: Exam Center Bulk Upload Routes with proper error handling
router.post('/exam-centers-new/bulk-upload', 
    uploadExcelFile, 
    handleMulterError,
    newDepartmentController.bulkUploadExamCentersNew
);

router.get('/exam-centers-new/download-template', newDepartmentController.downloadExamCenterTemplateNew);

// Debug route (optional - remove in production)
router.post('/exam-centers-new/debug-upload', 
    uploadExcelFile, 
    handleMulterError,
    (req, res) => {
        console.log('=== DEBUG UPLOAD ===');
        console.log('Headers:', req.headers);
        console.log('File received:', req.file);
        console.log('Body:', req.body);
        console.log('=== END DEBUG ===');
        
        if (!req.file) {
            return res.status(400).json({
                message: 'No file received in debug endpoint',
                receivedHeaders: req.headers,
                receivedBody: req.body
            });
        }
        
        res.json({
            message: 'Debug upload successful',
            fileInfo: {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                filename: req.file.filename,
                path: req.file.path
            },
            headers: req.headers
        });
    }
);


// NEW: Controller Generation Routes
router.post('/generate-controllers', newDepartmentController.generateControllers);
router.get('/controllers', newDepartmentController.getAllControllers);


module.exports = router;