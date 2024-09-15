const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const isAuthenticated = require('../middleware/isAuthStudent');

const studentController = require('../controllers/student_exam');
const studentController1 = require('../controllers/students/studentController')

// Configure multer for disk storage

  
 
  
  // Route to handle photo upload
 




router.post('/student_login', studentController1.loginStudent);
router.post('/student_info',studentController1.getStudentDetails);
router.post('/audiologs',isAuthenticated, studentController.updateAudioLogs);
router.post('/finalpassagelogs',isAuthenticated, studentController.updatePassageFinalLogs);
router.post('/feedback',isAuthenticated, studentController.feedback);
router.get('/student_details',isAuthenticated, studentController.getStudentDetails);
router.get('/audios', isAuthenticated,studentController.getaudios);
router.get('/controller_pass',isAuthenticated, studentController.getcontrollerpass);
router.get('/audioProgress', isAuthenticated,studentController.getAudioLogs); 
router.post('/textlogs', isAuthenticated,studentController.logTextInput); 
router.post('/passageprogress', isAuthenticated,studentController.getPassageProgress); 
router.post('/passagetime', isAuthenticated,studentController.updatePassagewLogTime);
router.post('/audiotime', isAuthenticated,studentController.updateAudioLogTime);





module.exports = router;
