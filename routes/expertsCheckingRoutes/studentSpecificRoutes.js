const express = require('express');
const router = express.Router();
const examExpertAdminStudentSpecificController = require('../../controllers/expertAuthentication/studentSpecific');

// Subject and QSet management routes
router.get('/all-subjects', examExpertAdminStudentSpecificController.getAllSubjects);
router.get('/qsets/:subjectId', examExpertAdminStudentSpecificController.getQSetsForSubject);

// Expert assignment and passage retrieval routes
router.get('/expert-assigned-passages/:subjectId/:qset', examExpertAdminStudentSpecificController.getExpertAssignedPassages);
router.get('/get-subject-qset-audio/:subjectId/:qset', examExpertAdminStudentSpecificController.modelAnswerAudio);
router.get('/get-student-audio-id/:subjectId/:qset/:studentId', examExpertAdminStudentSpecificController.modelAnswerAudioById)
router.post('/assignStudent/:subjectId/:qset', examExpertAdminStudentSpecificController.assignStudentForQSet);

// Ignore list management routes
router.post('/active-passage', examExpertAdminStudentSpecificController.getIgnoreList);
router.post('/student-active-passage', examExpertAdminStudentSpecificController.getStudentIgnoreList);
router.post('/add-ignore-word', examExpertAdminStudentSpecificController.addToIgnoreList);
router.post('/student-add-ignore-word', examExpertAdminStudentSpecificController.addToStudentIgnoreList);
router.post('/undo-word', examExpertAdminStudentSpecificController.removeFromIgnoreList);
router.post('/student-undo-word', examExpertAdminStudentSpecificController.removeFromStudentIgnoreList);
router.post('/clear-ignore-list', examExpertAdminStudentSpecificController.clearIgnoreList);  // New route
router.post('/student-clear-ignore-list', examExpertAdminStudentSpecificController.clearStudentIgnoreList)

// Passage review submission route
router.post('/submit-passage-review/:subjectId/:qset', examExpertAdminStudentSpecificController.submitPassageReview);


module.exports = router;