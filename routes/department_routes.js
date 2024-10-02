const { departementLogin , getStudentsTrackDepartmentwise ,getCurrentStudentDetailsCenterwise,getDepartmentswithstudents } = require("../controllers/department/departmentController");

const router = require("express").Router();

router.post("/department-login",departementLogin);
router.post("/track-students-on-department-code",getStudentsTrackDepartmentwise);
router.get("/get-department-batch-student-count",getCurrentStudentDetailsCenterwise);
router.get("/get-departments",getDepartmentswithstudents);

module.exports = router;