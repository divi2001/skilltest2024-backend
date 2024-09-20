const { departementLogin , getStudentsTrackDepartmentwise ,getCurrentStudentDetailsCenterwise } = require("../controllers/department/departmentController");

const router = require("express").Router();

router.post("/department-login",departementLogin);
router.post("/track-students-on-department-code",getStudentsTrackDepartmentwise);
router.get("/get-department-batch-student-count",getCurrentStudentDetailsCenterwise);

module.exports = router;