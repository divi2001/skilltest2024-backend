const express = require('express');
const router = express.Router();
const { evaluateStudents, downloadExcel } = require('../controllers/evaluationController');

// POST route to start evaluation
router.post('/evaluate', evaluateStudents);

// GET route to download Excel report
router.get('/download/:filename', downloadExcel);

module.exports = router;