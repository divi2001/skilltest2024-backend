// // routes/hallticketDepartment_routes.js
// const express = require('express');
// const router = express.Router();
// const hallticketDepartmentController = require('../controllers/hallticketDepartment_controller');

// // Route to get all departments for hall ticket generation
// router.get('/departments', hallticketDepartmentController.getDepartmentsForHallTickets);

// module.exports = router;


// routes/hallticketDepartment_routes.js
const express = require('express');
const router = express.Router();
const hallticketDepartmentController = require('../controllers/hallticketDepartment_controller');

// ========== EXISTING ROUTE ==========
// Route to get all departments for hall ticket generation
router.get('/departments', hallticketDepartmentController.getDepartmentsForHallTickets);

// ========== NEW ROUTES FOR DATABASE-BASED GENERATION ==========

// Get all centers for filtering
router.get('/db/centers', hallticketDepartmentController.getCentersForDB);

// Get all batches for filtering
router.get('/db/batches', hallticketDepartmentController.getBatchesForDB);

// Get students by filters (for preview/listing)
router.get('/db/students', hallticketDepartmentController.getStudentsByFilters);

// Download single hall ticket from database
router.get('/db/download-hall-ticket/:student_id', hallticketDepartmentController.downloadSingleHallTicketFromDB);

// Download all hall tickets from database (with filters)
router.get('/db/download-all-hall-tickets', hallticketDepartmentController.downloadAllHallTicketsFromDB);

// Check database data status
router.get('/db/check-data-status', hallticketDepartmentController.checkDBDataStatus);

module.exports = router;
