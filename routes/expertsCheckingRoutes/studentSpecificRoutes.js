// routes/expertsCheckingRoutes/studentSpecificRoutes.js
const express = require('express');
const router = express.Router();
const examExpertAdminStudentSpecificController = require('../../controllers/expertAuthentication/studentSpecific');

// Subject and QSet management routes
router.get('/all-subjects', examExpertAdminStudentSpecificController.getAllSubjects);
router.get('/qsets/:subjectId', examExpertAdminStudentSpecificController.getQSetsForSubject);

// Expert assignment and passage retrieval routes (updated to include departmentId)
router.get('/expert-assigned-passages/:subjectId/:qset/:departmentId', examExpertAdminStudentSpecificController.getExpertAssignedPassages);
router.get('/get-subject-qset-audio/:subjectId/:qset/:departmentId', examExpertAdminStudentSpecificController.modelAnswerAudio);
router.get('/get-student-audio-id/:subjectId/:qset/:studentId/:departmentId', examExpertAdminStudentSpecificController.modelAnswerAudioById)

// Updated assignStudent route to include departmentId and examType as path parameters
router.post('/assignStudent/:subjectId/:qset/:departmentId/:examType', examExpertAdminStudentSpecificController.assignStudentForQSet);

// Ignore list management routes
router.post('/active-passage', examExpertAdminStudentSpecificController.getIgnoreList);
router.post('/student-active-passage', examExpertAdminStudentSpecificController.getStudentIgnoreList);
router.post('/add-ignore-word', examExpertAdminStudentSpecificController.addToIgnoreList);
router.post('/student-add-ignore-word', examExpertAdminStudentSpecificController.addToStudentIgnoreList);
router.post('/undo-word', examExpertAdminStudentSpecificController.removeFromIgnoreList);
router.post('/student-undo-word', examExpertAdminStudentSpecificController.removeFromStudentIgnoreList);
router.post('/clear-ignore-list', examExpertAdminStudentSpecificController.clearIgnoreList);
router.post('/student-clear-ignore-list', examExpertAdminStudentSpecificController.clearStudentIgnoreList)

// Passage review submission route (updated to include departmentId)
router.post('/submit-passage-review/:subjectId/:qset/:departmentId', examExpertAdminStudentSpecificController.submitPassageReview);

module.exports = router;