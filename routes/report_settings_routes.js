const express = require('express');
const router = express.Router();
const reportSettingsController = require('../controllers/superAdminController/reportSettingsController');
// const isAuthenticatedAdmin = require('../middleware/isAuthAdmin'); // Assuming this exists

// Get all report settings
router.get('/report-settings', reportSettingsController.getReportSettings);

// Update a specific report setting
router.post('/report-settings', reportSettingsController.updateReportSetting);

module.exports = router;
