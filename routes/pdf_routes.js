const router = require("express").Router();
const {generateAbsenteeReport,generateAttendanceReport,generateStudentIdPasswordPdf,generateBlankAnswerSheet,generateSeatingArrangement, generateStudentId_Password,generateAnswerSheet, generateAbsenteeReportPost} = require("../Reports/generateReports");

router.post("/center/absentee-pdf-download",generateAbsenteeReport);
router.post("/center/post-absentee-pdf-download",generateAbsenteeReportPost);
router.post("/center/attendance-pdf-download",generateAttendanceReport);
router.post("/center/blank-answer-sheet-pdf-download",generateBlankAnswerSheet);
router.post("/center/studentId-password",generateStudentId_Password);
router.post("/center/studnetId-password-pdf-download",generateStudentIdPasswordPdf);
router.post("/center/answer-sheet-pdf-download",generateAnswerSheet);
router.post("/center/seating-arrangement-pdf-download",generateSeatingArrangement);

module.exports =router;