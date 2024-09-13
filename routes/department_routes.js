const { departementLogin } = require("../controllers/department/departmentController");

const router = require("express").Router();

router.post("/department-login",departementLogin);

module.exports = router;