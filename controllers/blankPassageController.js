// Controller for managing blank passage submissions
const connection = require('../config/db1');
const moment = require('moment-timezone');

// Get all blank submissions for a specific center
exports.getBlankSubmissionsByCenter = async (req, res) => {
    try {
        const { center, batchNo } = req.params;

        if (!center) {
            return res.status(400).json({ error: 'Center ID is required' });
        }

        let query = `
            SELECT 
                bps.*,
                s.fullname,
                s.student_id,
                s.center,
                s.batchNo,
                s.batchdate
            FROM blank_passage_submissions bps
            LEFT JOIN students s ON bps.student_id = s.student_id
            WHERE bps.center = ?
        `;

        const params = [center];

        // Add batch filter if provided
        if (batchNo && batchNo !== 'all') {
            query += ' AND bps.batchNo = ?';
            params.push(batchNo);
        }

        query += ' ORDER BY bps.submitted_at DESC';

        const [results] = await connection.query(query, params);

        res.json({
            success: true,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('Error fetching blank submissions by center:', error);
        res.status(500).json({
            error: 'Failed to fetch blank submissions',
            details: error.message
        });
    }
};

// Add or update center comment for a blank submission
exports.addCenterComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment, commentedBy } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Submission ID is required' });
        }

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Comment is required' });
        }

        const commentedAt = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        const updateQuery = `
            UPDATE blank_passage_submissions
            SET center_comment = ?, commented_by = ?, commented_at = ?
            WHERE id = ?
        `;

        const [result] = await connection.query(updateQuery, [
            comment,
            commentedBy || 'Center Admin',
            commentedAt,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Blank submission not found' });
        }

        res.json({
            success: true,
            message: 'Comment added successfully',
            data: {
                id,
                comment,
                commentedBy: commentedBy || 'Center Admin',
                commentedAt
            }
        });

    } catch (error) {
        console.error('Error adding center comment:', error);
        res.status(500).json({
            error: 'Failed to add comment',
            details: error.message
        });
    }
};

// Get all blank submissions (admin only)
exports.getAllBlankSubmissions = async (req, res) => {
    try {
        const { center, batchNo, hasComment } = req.query;

        let query = `
            SELECT 
                bps.*,
                s.fullname,
                s.student_id,
                s.center,
                s.batchNo,
                s.batchdate,
                ec.center_name
            FROM blank_passage_submissions bps
            LEFT JOIN students s ON bps.student_id = s.student_id
            LEFT JOIN examcenterdb ec ON bps.center = ec.center
            WHERE 1=1
        `;

        const params = [];

        // Add filters
        if (center) {
            query += ' AND bps.center = ?';
            params.push(center);
        }

        if (batchNo) {
            query += ' AND bps.batchNo = ?';
            params.push(batchNo);
        }

        if (hasComment === 'true') {
            query += ' AND bps.center_comment IS NOT NULL';
        } else if (hasComment === 'false') {
            query += ' AND bps.center_comment IS NULL';
        }

        query += ' ORDER BY bps.submitted_at DESC';

        const [results] = await connection.query(query, params);

        res.json({
            success: true,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('Error fetching all blank submissions:', error);
        res.status(500).json({
            error: 'Failed to fetch blank submissions',
            details: error.message
        });
    }
};

// Mark submission as viewed by admin
exports.markViewedByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Submission ID is required' });
        }

        const updateQuery = `
            UPDATE blank_passage_submissions
            SET viewed_by_admin = TRUE
            WHERE id = ?
        `;

        const [result] = await connection.query(updateQuery, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Blank submission not found' });
        }

        res.json({
            success: true,
            message: 'Marked as viewed successfully'
        });

    } catch (error) {
        console.error('Error marking as viewed:', error);
        res.status(500).json({
            error: 'Failed to mark as viewed',
            details: error.message
        });
    }
};

// Get count of uncommented blank submissions for a center
exports.getUncommentedCount = async (req, res) => {
    try {
        const { center } = req.params;

        if (!center) {
            return res.status(400).json({ error: 'Center ID is required' });
        }

        const countQuery = `
            SELECT COUNT(*) as count
            FROM blank_passage_submissions
            WHERE center = ? AND center_comment IS NULL
        `;

        const [results] = await connection.query(countQuery, [center]);

        res.json({
            success: true,
            count: results[0].count
        });

    } catch (error) {
        console.error('Error fetching uncommented count:', error);
        res.status(500).json({
            error: 'Failed to fetch count',
            details: error.message
        });
    }
};

module.exports = exports;
