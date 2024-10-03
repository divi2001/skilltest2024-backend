// expertsAuth.js
const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../../controllers/expertAuthentication/expertAuthentication');

// Authentication routes
router.post('/expert-login', examExpertAdminController.loginExpertAdmin);
router.post('/expert-logout-stage1', examExpertAdminController.logoutExpertStage1);
router.post('/expert-logout-stage3', examExpertAdminController.logoutExpertStage3);

router.get('/expert-details', examExpertAdminController.getExpertDetails);

// Expert assignment and passage retrieval routes
router.get('/expert-assigned-passages/:subjectId/:qset', examExpertAdminController.getExpertAssignedPassages);
router.get('/student-passages/:subjectId/:qset/:studentId', examExpertAdminController.getStudentPassages);
router.post('/get-student-passages', examExpertAdminController.getPassagesByStudentId);

module.exports = router;