// routes\students\typingRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const isAuthenticated = require('../../middleware/isAuthStudent');

const typingController = require('../../controllers/students/typingController')

router.get('/exam_passages', isAuthenticated,typingController.getpassages); 
router.get('/get_final_passage_logs', isAuthenticated, typingController.getFinalPassageLogs);


router.post('/update_passage',isAuthenticated,typingController.insertTypingPassageLog)
router.post('/update_passage_final',isAuthenticated,typingController.updateTypingPassageText)
router.post('/updateStudentLog',isAuthenticated,typingController.updateStudentLog)


module.exports = router;