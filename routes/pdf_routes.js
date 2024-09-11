const router = require("express").Router();
const generateReport = require("../Reports/generateReports");

router.post("/center/absentee-pdf-download",generateReport.generateAbsenteeReport);
router.post("/center/attendance-pdf-download",generateReport.generateAttendanceReport);

module.exports =router;