// // routes/skilltestHallticket_routes.js
// const express = require('express');
// const router = express.Router();
// const skilltestHallticketController = require('../controllers/skilltestHallticket_controller');
// const multer = require('multer');

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'public/uploads/');
//   },
//   filename: function (req, file, cb) {
//     cb(null, 'skilltest_students_' + Date.now() + '.xlsx');
//   }
// });

// const upload = multer({ 
//   storage: storage,
//   fileFilter: function (req, file, cb) {
//     if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
//         file.mimetype === 'application/vnd.ms-excel') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only Excel files are allowed!'), false);
//     }
//   },
//   limits: {
//     fileSize: 10 * 1024 * 1024 // 10MB limit
//   }
// });

// // Skill Test Hall Ticket Routes
// router.post('/upload-skilltest-student-data', upload.single('excelFile'), skilltestHallticketController.uploadSkillTestStudentData);
// router.get('/download-skilltest-hall-ticket/:applicationNo', skilltestHallticketController.downloadSkillTestHallTicket);
// router.get('/download-all-skilltest-hall-tickets', skilltestHallticketController.downloadAllSkillTestHallTickets);

// module.exports = router;


// routes/skilltestHallticket_routes.js
const express = require('express');
const router = express.Router();
const skilltestHallticketController = require('../controllers/skilltestHallticket_controller');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'skilltest_students_' + Date.now() + '.xlsx');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Skill Test Hall Ticket Routes
router.post('/upload-skilltest-student-data', upload.single('excelFile'), skilltestHallticketController.uploadSkillTestStudentData);
router.get('/download-skilltest-hall-ticket/:applicationNo', skilltestHallticketController.downloadSkillTestHallTicket);
router.get('/download-all-skilltest-hall-tickets', skilltestHallticketController.downloadAllSkillTestHallTickets);

// NEW: Test route to check department logo
router.get('/test-department-logo/:departmentId', skilltestHallticketController.getDepartmentLogo2);

module.exports = router;