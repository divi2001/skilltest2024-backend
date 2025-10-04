// //skilltest2024-backend\routes\superAdmin_updateDb.js
// const express = require('express');
// const router = express.Router();

// const fetchUpdateTableController = require('../controllers/superAdminController/fetchUpdate');
// const updateTableController = require('../controllers/superAdminController/updateTable');
// const resetStudentLogs = require("../controllers/superAdminController/resetStudentLogs");
// const { populateExpertReviewLog } = require("../controllers/superAdminController/populateExpertReviewLog");
// const { populateModReviewLog } = require("../controllers/superAdminController/populateModReviewLog");
// const { getAllStudentsTrack, getCurrentStudentDetailsDepartmentWise } = require('../controllers/superAdminController/superAdminTrackDashboard');
// const { getStudentsFromExpertReviewlog, getStudentsFromModReviewlog } = require('../controllers/superAdminController/fetchStudentsForChecking');
// const { getAllExperts, updateExpertsdb, insertExpert, getStudentsforExperts, assignExpertToStudents, assignedStudentsSummary ,unassignExpertFromStudents,submmitedByExperts ,copyQsetToModqset } = require('../controllers/superAdminController/experts_functions');
// const HallticketsGeneration = require('../controllers/superAdminController/HallticketsGeneration');
// const { expertdb } = require('../schema/schema');
// const { getAllBatches, updateBatchStatus } = require('../controllers/superAdminController/batchController');
// const excelUploadController = require('../controllers/superAdminController/ExcelUploadController');
// const submdoneController = require('../controllers/superAdminController/submDone');
// const backupController = require('../controllers/superAdminController/backupController');
// const downloadZipController = require('../controllers/superAdminController/downloadZipController');

// router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);
// router.put('/update-table/:table_name/:id', updateTableController.updateTable);
// router.post('/super-admin-student-track-dashboard', getAllStudentsTrack);
// router.get('/get-super-admin-student-count', getCurrentStudentDetailsDepartmentWise);
// router.post('/super-admin-reset-student-logs', resetStudentLogs.resetStudentProgress);
// router.get('/get-pending-requests',resetStudentLogs.getResetRequests);
// router.get("/reset-centers",resetStudentLogs.getResetCenters);
// router.post("/reject-reset-request",resetStudentLogs.rejectResetRequest);

// //Paper-checking related routes
// router.post('/populate-expert-review-log', populateExpertReviewLog);
// router.post('/populate-mod-review-log', populateModReviewLog);
// router.post('/update-experts', updateExpertsdb);
// router.post('/insert-expert', insertExpert);
// router.post('/assign-expert', assignExpertToStudents);
// router.post('/unassign-expert', unassignExpertFromStudents);
// router.post("/qset-to-modqset",copyQsetToModqset);
// router.post("/update-batch-status",updateBatchStatus);

// router.get('/get-expert-review-logs', getStudentsFromExpertReviewlog);
// router.get('/get-mod-review-logs', getStudentsFromModReviewlog);
// router.get("/get-experts", getAllExperts);
// router.get('/get-student-count-expert', getStudentsforExperts);
// router.get('/get-student-summary-expert', assignedStudentsSummary);
// router.get("/checked-students", submmitedByExperts);
// router.get("/get-all-batches", getAllBatches)

// // Halltickets Generation
// router.get('/download-hall-tickets/:instituteId', HallticketsGeneration.downloadHallTicketsForInstitute);
// router.get('/download-all-hall-tickets', HallticketsGeneration.downloadAllHallTickets);
// router.get('/download-student-hall-ticket/:seatNo', HallticketsGeneration.downloadHallTicketForStudent);

// // Excel file upload routes
// router.post('/upload-student-data', excelUploadController.uploadStudentData);
// router.post('/validate-student-data', excelUploadController.validateStudentData);

// // skilltest2024-backend\routes\superAdmin_updateDb.js
// // Expert Review Log Routes
// router.get('/expert-review-logs', submdoneController.getExpertReviewLogs);
// router.post('/expert-review-logs/reset', submdoneController.resetExpertReviewLogs);

// // Moderator Review Log Routes  
// router.get('/moderator-review-logs', submdoneController.getModReviewLogs);
// router.post('/moderator-review-logs/reset', submdoneController.resetModReviewLogs);

// // Common Routes
// router.get('/review-logs/filter-options', submdoneController.getReviewFilterOptions);


// // for download sql dump backup 
// router.get('/download-backup', backupController.downloadBackup);
// router.get('/backup-status', backupController.getBackupStatus);

// // for download zip files
// router.get('/download-zip/departments', downloadZipController.getDepartments);
// router.get('/download-zip/department/:departmentId/batches', downloadZipController.getBatchesByDepartment);
// router.get('/download-zip/department/:departmentId/batch/:batchNo/students', downloadZipController.getStudentsByBatch);
// router.post('/download-zip/files', downloadZipController.downloadStudentZip);
// router.get('/download-zip/student/:studentId/files', downloadZipController.getStudentPassageFiles); // New route
// router.get('/download-zip/check-storage', downloadZipController.checkStorageStatus);

// module.exports = router;



const express = require('express');
const router = express.Router();
const multer = require('multer'); // Import multer

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Files will be temporarily stored in the 'uploads' directory

const fetchUpdateTableController = require('../controllers/superAdminController/fetchUpdate');
const updateTableController = require('../controllers/superAdminController/updateTable');
const resetStudentLogs = require("../controllers/superAdminController/resetStudentLogs");
const { populateExpertReviewLog } = require("../controllers/superAdminController/populateExpertReviewLog");
const { populateModReviewLog } = require("../controllers/superAdminController/populateModReviewLog");
const { getAllStudentsTrack, getCurrentStudentDetailsDepartmentWise } = require('../controllers/superAdminController/superAdminTrackDashboard');
const { getStudentsFromExpertReviewlog, getStudentsFromModReviewlog } = require('../controllers/superAdminController/fetchStudentsForChecking');
const { getAllExperts, updateExpertsdb, insertExpert, getStudentsforExperts, assignExpertToStudents, assignedStudentsSummary ,unassignExpertFromStudents,submmitedByExperts ,copyQsetToModqset } = require('../controllers/superAdminController/experts_functions');
const HallticketsGeneration = require('../controllers/superAdminController/HallticketsGeneration');
const { expertdb } = require('../schema/schema');
const { getAllBatches, updateBatchStatus } = require('../controllers/superAdminController/batchController');
const excelUploadController = require('../controllers/superAdminController/ExcelUploadController');
const submdoneController = require('../controllers/superAdminController/submDone');
const backupController = require('../controllers/superAdminController/backupController');
const downloadZipController = require('../controllers/superAdminController/downloadZipController');
// Import the new controller
const studentRegisterController = require('../controllers/superAdminController/studentRegisterController');

router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);
router.put('/update-table/:table_name/:id', updateTableController.updateTable);
router.post('/super-admin-student-track-dashboard', getAllStudentsTrack);
router.get('/get-super-admin-student-count', getCurrentStudentDetailsDepartmentWise);
router.post('/super-admin-reset-student-logs', resetStudentLogs.resetStudentProgress);
router.get('/get-pending-requests',resetStudentLogs.getResetRequests);
router.get("/reset-centers",resetStudentLogs.getResetCenters);
router.post("/reject-reset-request",resetStudentLogs.rejectResetRequest);

//Paper-checking related routes
router.post('/populate-expert-review-log', populateExpertReviewLog);
router.post('/populate-mod-review-log', populateModReviewLog);
router.post('/update-experts', updateExpertsdb);
router.post('/insert-expert', insertExpert);
router.post('/assign-expert', assignExpertToStudents);
router.post('/unassign-expert', unassignExpertFromStudents);
router.post("/qset-to-modqset",copyQsetToModqset);
router.post("/update-batch-status",updateBatchStatus);

router.get('/get-expert-review-logs', getStudentsFromExpertReviewlog);
router.get('/get-mod-review-logs', getStudentsFromModReviewlog);
router.get("/get-experts", getAllExperts);
router.get('/get-student-count-expert', getStudentsforExperts);
router.get('/get-student-summary-expert', assignedStudentsSummary);
router.get("/checked-students", submmitedByExperts);
router.get("/get-all-batches", getAllBatches)

// Halltickets Generation
router.get('/download-hall-tickets/:instituteId', HallticketsGeneration.downloadHallTicketsForInstitute);
router.get('/download-all-hall-tickets', HallticketsGeneration.downloadAllHallTickets);
router.get('/download-student-hall-ticket/:seatNo', HallticketsGeneration.downloadHallTicketForStudent);

// Excel file upload routes
router.post('/upload-student-data', excelUploadController.uploadStudentData);
router.post('/validate-student-data', excelUploadController.validateStudentData);

// Expert Review Log Routes
router.get('/expert-review-logs', submdoneController.getExpertReviewLogs);
router.post('/expert-review-logs/reset', submdoneController.resetExpertReviewLogs);

// Moderator Review Log Routes  
router.get('/moderator-review-logs', submdoneController.getModReviewLogs);
router.post('/moderator-review-logs/reset', submdoneController.resetModReviewLogs);

// Common Routes
router.get('/review-logs/filter-options', submdoneController.getReviewFilterOptions);

// for download sql dump backup 
router.get('/download-backup', backupController.downloadBackup);
router.get('/backup-status', backupController.getBackupStatus);

// for download zip files
router.get('/download-zip/departments', downloadZipController.getDepartments);
router.get('/download-zip/department/:departmentId/batches', downloadZipController.getDepartmentBatchesForZip);
router.get('/download-zip/department/:departmentId/batch/:batchNo/students', downloadZipController.getStudentsByBatch);
router.post('/download-zip/files', downloadZipController.downloadStudentZip);
router.get('/download-zip/student/:studentId/files', downloadZipController.getStudentPassageFiles);
router.get('/download-zip/check-storage', downloadZipController.checkStorageStatus);

// ---------------------- NEW ROUTE ----------------------
router.post('/generate-student-register', upload.single('excelFile'), studentRegisterController.generateStudentRegister);
// -------------------------------------------------------

module.exports = router;