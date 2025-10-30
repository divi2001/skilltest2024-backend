// // routes/newDepartment_routes.js
// const express = require('express');
// const router = express.Router();
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

// module.exports = router;

// routes/newDepartment_routes.js
const express = require('express');
const router = express.Router();
const { upload, handleMulterError: multerConfigError } = require('../config/multerConfig');
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

// Batch Bulk Upload Routes
router.post('/batches/bulk-upload-complete', 
    upload.single('file'), 
    handleMulterError,
    newDepartmentController.bulkUploadBatchesComplete
);

// Enhanced Controller Routes
router.post('/controllers', newDepartmentController.addControllers);
router.get('/controllers', newDepartmentController.getAllControllers);
router.get('/controllers/department/:departmentId', newDepartmentController.getControllersByDepartment);
router.get('/controllers/department/:departmentId/batch/:batchNo', newDepartmentController.getControllersByDepartmentAndBatch);
router.get('/controllers/batches/available', newDepartmentController.getAvailableBatches);
router.get('/controllers/batches/department/:departmentId', newDepartmentController.getAvailableBatchesByDepartment);
router.put('/controllers/:controllerId', newDepartmentController.updateController);
router.delete('/controllers/:controllerId', newDepartmentController.deleteController);

// Controller Bulk Upload Routes
router.post('/controllers/bulk-upload-complete', 
    upload.single('file'), 
    handleMulterError,
    newDepartmentController.bulkUploadControllersComplete
);

// Student Routes
router.post('/students', newDepartmentController.registerStudent);
router.get('/students', newDepartmentController.getAllStudents);

// Add batches to existing department
router.post('/existing-department/batches', newDepartmentController.addBatchesToExistingDepartment);

// Legacy route (keeping for compatibility)
router.post('/assign-controller', newDepartmentController.assignController);


router.post('/generate-controllers', newDepartmentController.generateControllers);
router.post('/generate-save-controllers', newDepartmentController.generateAndSaveControllers);

module.exports = router;
