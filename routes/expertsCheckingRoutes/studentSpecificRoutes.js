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
router.post('/hold-passage-review/:subjectId/:qset/:departmentId', examExpertAdminStudentSpecificController.holdPassageReview);
router.post('/release-passage-review/:subjectId/:qset/:departmentId', examExpertAdminStudentSpecificController.releasePassageReview);

// Get student passages with filters
router.get('/student-passages-with-filters', examExpertAdminStudentSpecificController.getStudentPassagesWithFilters);

// Distinct values for the filter dropdowns, without downloading any passage text
router.get('/student-passages-filter-options', examExpertAdminStudentSpecificController.getStudentPassageFilterOptions);

// Marks calculation runs server-side: the browser gets per-row scalars, never the
// comparison payload. Detail and the student-wise report are served from the spool.
const marksCalculationController = require('../../controllers/marksCalculationController');
router.post('/calculate-marks', marksCalculationController.calculateMarks);
router.get('/marks-detail/:jobId/:rowId', marksCalculationController.getMarksDetail);
router.get('/marks-report/student-wise/:jobId', marksCalculationController.downloadStudentWiseReport);

module.exports = router;