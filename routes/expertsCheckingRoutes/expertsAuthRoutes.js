// expertsAuth.js
const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../../controllers/expertAuthentication/expertAuthentication');

// Authentication routes
router.post('/expert-login', examExpertAdminController.loginExpertAdmin);
router.post('/expert-logout', examExpertAdminController.logoutExpert);
router.get('/expert-details', examExpertAdminController.getExpertDetails);

// Expert assignment and passage retrieval routes
router.get('/student-passages/:subjectId/:qset/:studentId', examExpertAdminController.getStudentPassages);
router.post('/get-student-passages', examExpertAdminController.getPassagesByStudentId);

module.exports = router;