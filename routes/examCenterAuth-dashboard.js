const express = require('express');
const router = express.Router();
const examCenterAdminController = require('../controllers/examCenterAdmin/center_admin_functions');
const examCenterDetails = require('../controllers/centerAdminMonitoring/getCenterDetails');

router.post('/center_admin_login',examCenterAdminController.loginCenterAdmin);
// Generic session logout — used by the center admin and department navbars so that logging out
// actually destroys the server session instead of only navigating away in the browser.
router.post('/logout', examCenterAdminController.logout);
module.exports = router;