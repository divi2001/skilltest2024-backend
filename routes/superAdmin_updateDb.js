const express = require('express');
const router = express.Router();

const fetchUpdateTableController = require('../controllers/superAdminController/fetchUpdate');
const updateTableController = require('../controllers/superAdminController/updateTable');
const resetStudentLogs = require("../controllers/superAdminController/resetStudentLogs");
const { getAllStudentsTrack,getCurrentStudentDetailsDepartmentWise } = require('../controllers/superAdminController/superAdminTrackDashboard');

router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);
router.put('/update-table/:table_name/:id', updateTableController.updateTable);
router.post('/super-admin-student-track-dashboard',getAllStudentsTrack);
router.get('/get-super-admin-student-count',getCurrentStudentDetailsDepartmentWise);
router.post('/super-admin-reset-student-logs',resetStudentLogs.resetStudentProgress);

module.exports = router;