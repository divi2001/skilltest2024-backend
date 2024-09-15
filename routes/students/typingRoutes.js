const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const isAuthenticated = require('../../middleware/isAuthStudent');

const typingController = require('../../controllers/students/typingController')

router.get('/exam_passages', isAuthenticated,typingController.getpassages); 
router.post('/update_passage',isAuthenticated,typingController.insertTypingPassageLog)


module.exports = router;