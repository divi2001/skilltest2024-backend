// Routes for blank passage submissions management
const express = require('express');
const router = express.Router();
const blankPassageController = require('../controllers/blankPassageController');

// Middleware to check authentication
const isAuthenticatedCenter = require('../middleware/isAuthCenter');
const isAuthenticatedAdmin = require('../middleware/isAuthAdmin');

// Center admin routes
router.get(
    '/center/:center/:batchNo',
    isAuthenticatedCenter,
    blankPassageController.getBlankSubmissionsByCenter
);

router.post(
    '/comment/:id',
    isAuthenticatedCenter,
    blankPassageController.addCenterComment
);

router.get(
    '/center/:center/count',
    isAuthenticatedCenter,
    blankPassageController.getUncommentedCount
);

// Admin routes
router.get(
    '/admin/all',
    isAuthenticatedAdmin,
    blankPassageController.getAllBlankSubmissions
);

router.post(
    '/admin/mark-viewed/:id',
    isAuthenticatedAdmin,
    blankPassageController.markViewedByAdmin
);

module.exports = router;
