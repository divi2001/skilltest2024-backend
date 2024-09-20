const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const isAuthenticated = require('../middleware/isAuthStudent');

const studentController = require('../controllers/student_exam');
const studentController1 = require('../controllers/students/studentController')


router.post('/student_login', studentController1.loginStudent);
router.get('/student_logout',isAuthenticated, studentController1.logoutStudent);
router.post('/student_info',studentController1.getStudentDetails);
router.post('/audiologs',isAuthenticated, studentController.updateAudioLogs);
router.post('/feedback',isAuthenticated, studentController.feedback);

router.get('/student_details',isAuthenticated, studentController.getStudentDetails);
router.get('/audios', isAuthenticated,studentController.getaudios);
router.get('/controller_pass',isAuthenticated, studentController.getcontrollerpass);
router.get('/audioProgress', isAuthenticated,studentController.getAudioLogs); 
router.get('/typedtexta', isAuthenticated, studentController.getTypedTextA);
router.get('/passage', isAuthenticated, studentController.getPassage);
router.get('/finalpassagelogs', isAuthenticated, studentController.getPassageFinalLogs);
router.post('/total-login-count',studentController1.totalLoginCounts);

router.post('/textlogs', isAuthenticated,studentController.logTextInput); 
router.post('/finalpassagelogs',isAuthenticated, studentController.updatePassageFinalLogs);
router.post('/passageprogress', isAuthenticated,studentController.getPassageProgress); 
router.post('/passagetime', isAuthenticated,studentController.updatePassagewLogTime);
router.post('/audiotime', isAuthenticated,studentController.updateAudioLogTime);
router.post('/batchdate',studentController.updateStudentBatchDates)
router.post('/reset-student-login',studentController1.getStudentResetRequests)





module.exports = router;
