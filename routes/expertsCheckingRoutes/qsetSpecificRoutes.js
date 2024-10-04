const express = require('express');
const router = express.Router();
const examExpertAdminQsetSpecificController = require('../../controllers/expertAuthentication/QsetSpecific-Stage1/qsetSpecific');

// Subject and QSet management routes
router.get('/all-subjects', examExpertAdminQsetSpecificController.getAllSubjects);
router.get('/qsets/:subjectId', examExpertAdminQsetSpecificController.getQSetsForSubject);

// Expert assignment and passage retrieval routes
router.get('/expert-assigned-passages/:subjectId/:qset', examExpertAdminQsetSpecificController.getExpertAssignedPassages);
router.post('/assignStudent/:subjectId/:qset', examExpertAdminQsetSpecificController.assignStudentForQSet);

// Ignore list management routes
router.post('/active-passage', examExpertAdminQsetSpecificController.getIgnoreList);
router.post('/student-active-passage', examExpertAdminQsetSpecificController.getStudentIgnoreList);
router.post('/add-ignore-word', examExpertAdminQsetSpecificController.addToIgnoreList);
router.post('/student-add-ignore-word', examExpertAdminQsetSpecificController.addToStudentIgnoreList);
router.post('/undo-word', examExpertAdminQsetSpecificController.removeFromIgnoreList);
router.post('/student-undo-word', examExpertAdminQsetSpecificController.removeFromStudentIgnoreList);
router.post('/clear-ignore-list', examExpertAdminQsetSpecificController.clearIgnoreList);  // New route
router.post('/student-clear-ignore-list', examExpertAdminQsetSpecificController.clearStudentIgnoreList)

// Passage review submission route
router.post('/submit-passage-review/:subjectId/:qset', examExpertAdminQsetSpecificController.submitPassageReview);

module.exports = router;