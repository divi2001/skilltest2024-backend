const express = require('express');
const router = express.Router();

const fetchUpdateTableController = require('../controllers/superAdminController/fetchUpdate');
const updateTableController = require('../controllers/superAdminController/updateTable');
const resetStudentLogs = require("../controllers/superAdminController/resetStudentLogs");
const { populateExpertReviewLog } = require("../controllers/superAdminController/populateExpertReviewLog");
const { populateModReviewLog } = require("../controllers/superAdminController/populateModReviewLog");
const { getAllStudentsTrack, getCurrentStudentDetailsDepartmentWise } = require('../controllers/superAdminController/superAdminTrackDashboard');
const { getStudentsFromExpertReviewlog, getStudentsFromModReviewlog } = require('../controllers/superAdminController/fetchStudentsForChecking');
const { getAllExperts, updateExpertsdb, insertExpert, getStudentsforExperts, assignExpertToStudents, assignedStudentsSummary ,unassignExpertFromStudents,submmitedByExperts ,copyQsetToModqset } = require('../controllers/superAdminController/experts_functions');
const { expertdb } = require('../schema/schema');
const { getAllBatches, updateBatchStatus } = require('../controllers/superAdminController/batchController');

router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);
router.put('/update-table/:table_name/:id', updateTableController.updateTable);
router.post('/super-admin-student-track-dashboard', getAllStudentsTrack);
router.get('/get-super-admin-student-count', getCurrentStudentDetailsDepartmentWise);
router.post('/super-admin-reset-student-logs', resetStudentLogs.resetStudentProgress);
router.get('/get-pending-requests',resetStudentLogs.getResetRequests);
router.get("/reset-centers",resetStudentLogs.getResetCenters);
router.post("/reject-reset-request",resetStudentLogs.rejectResetRequest);

//Paper-checking related routes
router.post('/populate-expert-review-log', populateExpertReviewLog);
router.post('/populate-mod-review-log', populateModReviewLog);
router.post('/update-experts', updateExpertsdb);
router.post('/insert-expert', insertExpert);
router.post('/assign-expert', assignExpertToStudents);
router.post('/unassign-expert', unassignExpertFromStudents);
router.post("/qset-to-modqset",copyQsetToModqset);
router.post("/update-batch-status",updateBatchStatus);


router.get('/get-expert-review-logs', getStudentsFromExpertReviewlog);
router.get('/get-mod-review-logs', getStudentsFromModReviewlog);
router.get("/get-experts", getAllExperts);
router.get('/get-student-count-expert', getStudentsforExperts);
router.get('/get-student-summary-expert', assignedStudentsSummary);
router.get("/checked-students",submmitedByExperts);
router.get("/get-all-batches",getAllBatches)



module.exports = router;
