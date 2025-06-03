const { departementLogin , getStudentsTrackDepartmentwise ,getCurrentStudentDetailsCenterwise,getDepartmentswithstudents ,updateDepartmentStatus, getDepartmentDetails } = require("../controllers/department/departmentController");

const router = require("express").Router();

router.post("/department-login",departementLogin);
router.post("/track-students-on-department-code",getStudentsTrackDepartmentwise);
router.post("/update-department-status",updateDepartmentStatus);
router.get("/get-department-batch-student-count",getCurrentStudentDetailsCenterwise);
router.get("/get-departments",getDepartmentswithstudents);
router.get("/get-department-details",getDepartmentDetails);

module.exports = router;