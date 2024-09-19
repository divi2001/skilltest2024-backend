const express = require('express');
const router = express.Router();

const fetchUpdateTableController = require('../controllers/superAdminController/fetchUpdate');
const updateTableController = require('../controllers/superAdminController/updateTable');
const resetTableController = require('../controllers/superAdminController/resetStudentProgress')

router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);
router.put('/update-table/:table_name/:id', updateTableController.updateTable);
router.post('/reset-tables', resetTableController.resetStudentProgress)

module.exports = router;