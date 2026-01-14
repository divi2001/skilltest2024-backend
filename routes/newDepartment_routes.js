// routes/newDepartment_routes.js
const express = require('express');
const router = express.Router();
const { upload, handleMulterError: multerConfigError } = require('../config/multerConfig');
const newDepartmentController = require('../controllers/newDepartment_Controller');

console.log('✅ Routes loaded successfully');

// ========================================
// DEPARTMENT ROUTES
// ========================================

// ✅ Create department
router.post('/departments', newDepartmentController.createDepartment);

// ✅ Get all departments
router.get('/departments', newDepartmentController.getDepartments);

// ========================================
// BATCH ROUTES
// ========================================


// ✅ NEW: Check batch duplicates (BEFORE upload)
router.post('/check-batch-duplicates', newDepartmentController.checkBatchDuplicates);

// ✅ Bulk upload batches (with department verification)
router.post(
    '/batches/bulk-upload-complete',
    upload.single('file'),
    newDepartmentController.bulkUploadBatchesComplete
);

// ✅ Get batches by department
router.get('/batches/department/:departmentId', newDepartmentController.getBatchesByDepartment);

// ✅ Get all batches
router.get('/batches', newDepartmentController.getBatches);

// ✅ Add batches to existing department
router.post('/existing-department/batches', newDepartmentController.addBatchesToExistingDepartment);

// ========================================
// CONTROLLER ROUTES
// ========================================

// ✅ NEW: Check controller duplicates (BEFORE upload)
router.post('/check-controller-duplicates', newDepartmentController.checkControllerDuplicates);

// ✅ Add controllers manually
router.post('/controllers', newDepartmentController.addControllers);

// ✅ Get all controllers
router.get('/controllers', newDepartmentController.getControllers);

// ✅ Bulk upload controllers (with department verification)
router.post(
    '/controllers/bulk-upload-complete',
    upload.single('file'),
    newDepartmentController.bulkUploadControllersComplete
);
router.post('/validate-controller-references', newDepartmentController.validateControllerReferences);


// ========================================
//auto generate and save controllers
router.post('/generate-controllers', newDepartmentController.generateControllers);
router.post('/generate-save-controllers', newDepartmentController.generateAndSaveControllers);

// ========================================
// ARCHIVE ROUTES
// ========================================

const archiveController = require('../controllers/superAdminController/departmentArchiveController');

// Download Department Data Dump
router.get('/departments/:departmentId/archive/download', archiveController.downloadDepartmentArchive);

// Delete Department Data (Use with caution)
router.post('/departments/archive/delete', archiveController.deleteDepartmentData);

// Restore Department Data Dump
router.post('/departments/archive/restore', archiveController.restoreDepartmentArchive);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler for undefined routes
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
});

module.exports = router;
