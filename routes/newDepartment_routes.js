// routes/newDepartment_routes.js
const express = require('express');
const router = express.Router();
const newDepartmentController = require('../controllers/newDepartment_Controller');

// Department Routes
router.post('/departments', newDepartmentController.createDepartment);
router.get('/departments', newDepartmentController.getAllDepartments);
router.get('/departments/:id', newDepartmentController.getDepartmentById);

// Exam Center Routes
router.post('/exam-centers', newDepartmentController.createExamCenter);
router.get('/exam-centers', newDepartmentController.getAllExamCenters);

// Batch Routes
router.post('/batches', newDepartmentController.createBatch);
router.get('/batches', newDepartmentController.getAllBatches);
router.get('/batches/:departmentId', newDepartmentController.getBatchesByDepartment);

// Controller Routes
router.post('/controllers', newDepartmentController.assignController);
router.get('/controllers', newDepartmentController.getAllControllers);

// Student Routes
router.post('/students', newDepartmentController.registerStudent);
router.get('/students', newDepartmentController.getAllStudents);

module.exports = router;