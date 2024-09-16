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




module.exports = router;