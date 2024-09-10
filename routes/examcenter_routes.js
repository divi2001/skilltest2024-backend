const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const examcontroller = require('../controllers/examcenter');
const examCenterFunc = require('../controllers/examCenterAdmin/center_admin_functions');




router.post('/center_login', examcontroller.loginCenter);
router.get('/get-batches',examCenterFunc.isAbletoDownload);

module.exports = router;