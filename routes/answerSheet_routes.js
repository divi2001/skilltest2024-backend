const { uploadAnswerSheets } = require("../controllers/answerSheetsController");
const multer = require('multer');

const router = require("express").Router();


const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-answersheet",upload.array('answerSheets', 5),uploadAnswerSheets);

module.exports = router;