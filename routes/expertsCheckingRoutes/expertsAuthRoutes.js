// routes/expertsCheckingRoutes/expertsAuthRoutes.js
const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../../controllers/expertAuthentication/expertAuthentication');

// Authentication routes
router.post('/expert-login', examExpertAdminController.loginExpertAdmin);
router.post('/expert-logout', examExpertAdminController.logoutExpert);
router.get('/expert-details', examExpertAdminController.getExpertDetails);

// Expert assignment and passage retrieval routes
router.get('/student-passages/:subjectId/:qset/:studentId/:departmentId', examExpertAdminController.getStudentPassages); // Added departmentId
router.post('/get-student-passages', examExpertAdminController.getPassagesByStudentId);
router.post('/update-student-marks/:subjectId/:qset/:departmentId', examExpertAdminController.updateStudentMarks); // Added departmentId

module.exports = router;