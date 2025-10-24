// routes/hallticketDepartment_routes.js
const express = require('express');
const router = express.Router();
const hallticketDepartmentController = require('../controllers/hallticketDepartment_controller');

// Route to get all departments for hall ticket generation
router.get('/departments', hallticketDepartmentController.getDepartmentsForHallTickets);

module.exports = router;