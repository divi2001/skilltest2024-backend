const { departementLogin , getStudentsTrackDepartmentwise } = require("../controllers/department/departmentController");

const router = require("express").Router();

router.post("/department-login",departementLogin);
router.post("/track-students-on-department-code",getStudentsTrackDepartmentwise)

module.exports = router;