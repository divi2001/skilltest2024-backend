const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const examcontroller = require('../controllers/examcenter');




router.post('/center_login', examcontroller.loginCenter);
router.post('/centerrequest',examcontroller.getCenterResetRequests)


// Route for getting center data
router.get('/data', examcontroller.getCenterData);

module.exports = router;