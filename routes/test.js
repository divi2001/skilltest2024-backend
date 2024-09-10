const { generateReports } = require('../Reports/generateReports');

const router = require('express').Router();

router.post("/testing",generateReports);

module.exports = router;