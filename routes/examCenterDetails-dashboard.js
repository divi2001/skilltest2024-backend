const express = require('express');
const router = express.Router();
const examCenterController = require('../controllers/centerAdminMonitoring/getExamCenter');
const examCenter = require('../controllers/centerAdminMonitoring/getCenterDetails');
const examCenterFunc = require('../controllers/examCenterAdmin/get_pdfs_data');
const {getControllerPassForCenter,getBatchwiseControllerPassForCenter} = require('../controllers/controllerPassword/controllerPassword');
const {getPcRegistrations,removePcRegistration} = require('../controllers/controllerPassword/pcRegistration');
const { getCurrentStudentDetails } = require('../controllers/centerAdminMonitoring/getCurrentStudentStatus');

router.get('/get-center-centerpass', examCenterController.getExamCenter);
router.get('/get-center-details', examCenter.getExamCenterDetails);
router.get('/get-pdfs', examCenterFunc.getPdfFromExamCenterDb);
router.get('/get-controller-pass', getControllerPassForCenter);
router.post('/get-batch-controller-password',getBatchwiseControllerPassForCenter);
router.get('/get-pcregistration', getPcRegistrations);
router.get('/get-current-student-details',getCurrentStudentDetails);
router.get("/get-center-pcregistration-details",examCenter.getPcregistrationdetails);
router.post('/delete-pcregistration',removePcRegistration);

module.exports = router;