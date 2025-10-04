// // routes\trackStudentRoute.js

// const express = require('express');
// const router = express.Router();

// const trackStudentController = require('../controllers/centerAdminMonitoring/trackStudentsProgress');

// // router.post('/track-students-on-exam-center-code', trackStudentController.getStudentsTrack);

// router.post('/track-students-on-exam-center-code', trackStudentController.getBatchesByDepartment);
// router.post('/get-active-departments', trackStudentController.getActiveDepartments)

// //router.post('/track-students-on-exam-center-code/:examCenterCode/:batchNo',  trackStudentController.getStudentsTrack);
// //router.post('/track-students-on-exam-center-code/:examCenterCode', trackStudentController.getStudentsTrack);

// router.post('/track-students-on-exam-center-code/:batchNo', trackStudentController.getStudentsTrack);
// router.post('/examStage', trackStudentController.storeExamStage);
// router.get('/get-examStages', trackStudentController.getStoredStages);
// router.get('/get-active-departments', trackStudentController.getActiveDepartments);

// module.exports = router;


// routes\trackStudentRoute.js

const express = require('express');
const router = express.Router();

const trackStudentController = require('../controllers/centerAdminMonitoring/trackStudentsProgress');

// router.post('/track-students-on-exam-center-code', trackStudentController.getStudentsTrack);
router.post('/track-students-on-exam-center-code', trackStudentController.getBatchesByDepartment);
router.post('/get-active-departments', trackStudentController.getActiveDepartments)
//router.post('/track-students-on-exam-center-code/:examCenterCode/:batchNo',  trackStudentController.getStudentsTrack);
//router.post('/track-students-on-exam-center-code/:examCenterCode', trackStudentController.getStudentsTrack);


router.post('/track-students-on-exam-center-code/all', trackStudentController.getStudentsTrack);
router.post('/track-students-on-exam-center-code/:batchNo', trackStudentController.getStudentsTrack);


router.post('/examStage', trackStudentController.storeExamStage);
router.get('/get-examStages', trackStudentController.getStoredStages);
router.get('/get-active-departments', trackStudentController.getActiveDepartments);

module.exports = router;