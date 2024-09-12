const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const studentController = require('../controllers/student_exam');
const studentController1 = require('../controllers/students/studentController')




router.post('/student_login', studentController1.loginStudent);

router.post('/audiologs',isAuthenticated, studentController.updateAudioLogs);
router.post('/finalpassagelogs',isAuthenticated, studentController.updatePassageFinalLogs);
router.post('/feedback',isAuthenticated, studentController.feedback);
router.get('/student_details',isAuthenticated, studentController.getStudentDetails);

router.get('/audios', isAuthenticated,studentController.getaudios);

router.get('/controller_pass',isAuthenticated, studentController.getcontrollerpass);
router.get('/audioProgress', isAuthenticated,studentController.getAudioLogs); 

router.post('/textlogs', isAuthenticated,studentController.logTextInput); 
router.post('/passageprogress', isAuthenticated,studentController.getPassageProgress); 
router.post('/audiotime', isAuthenticated,studentController.updateAudioLogTime);





module.exports = router;
