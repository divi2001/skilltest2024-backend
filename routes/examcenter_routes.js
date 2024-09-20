const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const examcontroller = require('../controllers/examcenter');




router.post('/center_login', examcontroller.loginCenter);
router.post('/centerrequest',examcontroller.getCenterResetRequests)


// Route for getting center data
router.get('/center-request-data', examcontroller.getCenterData);
router.delete('/centerrequest/:id', examcontroller.deleteCenterResetRequest)
module.exports = router;