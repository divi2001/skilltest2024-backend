const express = require('express');
const router = express.Router();
const mockController = require('../controllers/mockController');

// Preview mock students
router.post('/preview', mockController.previewMockData);

// Insert mock students (replace old)
router.post('/replace', mockController.insertMockDataReplace);

// Insert mock students (append)
router.post('/append', mockController.insertMockDataAppend);

module.exports = router;
