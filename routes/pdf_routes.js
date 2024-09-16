const router = require("express").Router();
const {generateAbsenteeReport,generateAttendanceReport,generateBlankAnswerSheet, generateStudentId_Password} = require("../Reports/generateReports");

router.post("/center/absentee-pdf-download",generateAbsenteeReport);
router.post("/center/attendance-pdf-download",generateAttendanceReport);
router.post("/center/blank-answer-sheet-pdf-download",generateBlankAnswerSheet);
router.post("/center/studentId-password",generateStudentId_Password);

module.exports =router;