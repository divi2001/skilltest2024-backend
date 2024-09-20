const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminFunctionController = require('../controllers/admin_functions');

const isAuthenticatedAdmin = require('../middleware/isAuthAdmin')


router.post('/admin_login',adminFunctionController.loginadmin);

router.delete('/deletetable/:tableName',  adminFunctionController.deleteTable);

router.get('/resetaudiologs',isAuthenticatedAdmin,adminFunctionController.resetAllAudioLogs)

router.post('/fetch-table-data',isAuthenticatedAdmin, adminFunctionController.fetchTableData);
router.get('/fetch-table-names',adminFunctionController.fetchTableNames);
router.post('/update-table-data',adminFunctionController.updateTableData);
// Route for updateAndRetrieveAudioLogs
router.post('/audio-logs',isAuthenticatedAdmin, adminFunctionController.updateAndRetrieveAudioLogs);

// Route for manageTextLogs
router.post('/text-logs',isAuthenticatedAdmin, adminFunctionController.manageTextLogs);

// Route for manageFinalPassageSubmit
router.post('/final-passage-submit',isAuthenticatedAdmin, adminFunctionController.manageFinalPassageSubmit);

// Route for manageTypingPassageLogs
router.post('/typing-passage-logs',isAuthenticatedAdmin, adminFunctionController.manageTypingPassageLogs);

// Route for manageTypingPassage
router.post('/typing-passage',isAuthenticatedAdmin, adminFunctionController.manageTypingPassage);



module.exports = router;