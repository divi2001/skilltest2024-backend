const { fetchSubject } = require("../controllers/fetchDetails");

const router = require("express").Router();

router.get("/subjects",fetchSubject);


module.exports =router;