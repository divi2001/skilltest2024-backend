const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');
const upload = require('../middleware/uploadMiddleware');

const examcontroller = require('../controllers/examcenter');
const { examcenterdb } = require('../schema/schema');



router.post('/center_login', examcontroller.loginCenter);
router.post('/centerrequest',examcontroller.getCenterResetRequests)
router.post('/upload-attendance',upload.single('attendance'),examcontroller.uploadAttendanceReport);
router.post("/delete-atttendance",examcontroller.deleteAttendanceReport)
router.get('/get-attendance-report',examcontroller.getAllAttendanceReport);


// Route for getting center data
router.get('/center-request-data', examcontroller.getCenterData);
router.delete('/centerrequest/:id', examcontroller.deleteCenterResetRequest)
module.exports = router;