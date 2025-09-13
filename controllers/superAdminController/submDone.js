const connection = require('../../config/db1');
const moment = require('moment-timezone');


exports.getExpertReviewLogs = async (req, res) => {
    const { subjectId, qset, expertId, status, subm_done } = req.query;

    try {
        // Validate subjectId is provided if qset is requested
        if (qset && !subjectId) {
            return res.status(400).json({ 
                message: "Subject ID is required when filtering by QSet" 
            });
        }

        let query = 'SELECT * FROM expertreviewlog WHERE 1=1';
        const queryParams = [];

        // Add filtering conditions
        if (subjectId) {
            query += ' AND subjectId = ?';
            queryParams.push(subjectId);
        }
        if (qset) {
            query += ' AND qset = ?';
            queryParams.push(qset);
        }
        if (expertId) {
            query += ' AND expertId = ?';
            queryParams.push(expertId);
        }
        if (status !== undefined) {
            query += ' AND status = ?';
            queryParams.push(status);
        }
        if (subm_done !== undefined) {
            query += ' AND subm_done = ?';
            queryParams.push(subm_done);
        }

        query += ' ORDER BY id DESC';

        const [results] = await connection.query(query, queryParams);

        // Get QSets specifically for the selected subject
        let subjectQsets = [];
        if (subjectId) {
            // First get ACTUAL existing QSets from database for this subject
            const [existingQsets] = await connection.query(
                'SELECT DISTINCT qset FROM expertreviewlog WHERE subjectId = ? ORDER BY qset',
                [subjectId]
            );
            
            const existingQsetNumbers = existingQsets.map(q => q.qset);
            
            // Generate all possible QSets (1-12) for display
            for (let i = 1; i <= 12; i++) {
                subjectQsets.push({
                    qset: i,
                    exists: existingQsetNumbers.includes(i),
                    displayText: `${subjectId} - QSet ${i}`
                });
            }
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                message: "No expert review logs found with the specified criteria",
                subjectQsets: subjectId ? subjectQsets : undefined
            });
        }

        // Format datetime fields
        const formattedResults = results.map(log => ({
            ...log,
            loggedin: log.loggedin ? moment(log.loggedin).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null,
            subm_time: log.subm_time ? moment(log.subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null
        }));

        res.json({
            message: "Expert review logs retrieved successfully",
            data: formattedResults,
            count: formattedResults.length,
            subjectQsets: subjectId ? subjectQsets : undefined
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// exports.getExpertReviewLogs = async (req, res) => {
//     const { subjectId, qset, expertId, status, subm_done } = req.query;

//     try {
//         // Validate subjectId is provided if qset is requested
//         if (qset && !subjectId) {
//             return res.status(400).json({ 
//                 message: "Subject ID is required when filtering by QSet" 
//             });
//         }

//         let query = 'SELECT * FROM expertreviewlog WHERE 1=1';
//         const queryParams = [];

//         // Add filtering conditions
//         if (subjectId) {
//             query += ' AND subjectId = ?';
//             queryParams.push(subjectId);
//         }
//         if (qset) {
//             query += ' AND qset = ?';
//             queryParams.push(qset);
//         }
//         if (expertId) {
//             query += ' AND expertId = ?';
//             queryParams.push(expertId);
//         }
//         if (status !== undefined) {
//             query += ' AND status = ?';
//             queryParams.push(status);
//         }
//         if (subm_done !== undefined) {
//             query += ' AND subm_done = ?';
//             queryParams.push(subm_done);
//         }

//         query += ' ORDER BY id DESC';

//         const [results] = await connection.query(query, queryParams);

//         // If subjectId is present, generate subject-specific QSets
//         let subjectQsets = [];
//         if (subjectId) {
//             const [existingQsets] = await connection.query(
//                 'SELECT DISTINCT qset FROM expertreviewlog WHERE subjectId = ? ORDER BY qset',
//                 [subjectId]
//             );
            
//             const existingQsetNumbers = existingQsets.map(q => q.qset);

//             for (let i = 1; i <= 12; i++) {
//                 subjectQsets.push({
//                     qset: i,
//                     exists: existingQsetNumbers.includes(i),
//                     displayText: `${subjectId} - QSet ${i}`
//                 });
//             }
//         }

//         if (results.length === 0) {
//             return res.status(404).json({ 
//                 message: "No expert review logs found with the specified criteria",
//                 subjectQsets: subjectId ? subjectQsets : undefined
//             });
//         }

//         // Format datetime fields
//         const formattedResults = results.map(log => ({
//             ...log,
//             loggedin: log.loggedin ? moment(log.loggedin).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null,
//             subm_time: log.subm_time ? moment(log.subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null
//         }));

//         res.json({
//             message: "Expert review logs retrieved successfully",
//             data: formattedResults,
//             count: formattedResults.length,
//             subjectQsets: subjectId ? subjectQsets : undefined
//         });

//     } catch (err) {
//         console.error('Database query error:', err);
//         res.status(500).json({ message: 'Internal server error', error: err.message });
//     }
// };

exports.getModReviewLogs = async (req, res) => {
    const { subjectId, qset, expertId, status, subm_done, hold } = req.query;

    try {
        let query = 'SELECT * FROM modreviewlog WHERE 1=1';
        const queryParams = [];

        // Add filtering conditions
        if (subjectId) {
            query += ' AND subjectId = ?';
            queryParams.push(subjectId);
        }
        if (qset) {
            query += ' AND qset = ?';
            queryParams.push(qset);
        }
        if (expertId) {
            query += ' AND expertId = ?';
            queryParams.push(expertId);
        }
        if (status !== undefined) {
            query += ' AND status = ?';
            queryParams.push(status);
        }
        if (subm_done !== undefined) {
            query += ' AND subm_done = ?';
            queryParams.push(subm_done);
        }
        if (hold !== undefined) {
            query += ' AND hold = ?';
            queryParams.push(hold);
        }

        query += ' ORDER BY id DESC';

        const [results] = await connection.query(query, queryParams);

        if (results.length === 0) {
            return res.status(404).json({ message: "No moderator review logs found with the specified criteria" });
        }

        // Format datetime fields
        const formattedResults = results.map(log => ({
            ...log,
            loggedin: log.loggedin ? moment(log.loggedin).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null,
            subm_time: log.subm_time ? moment(log.subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null
        }));

        res.json({
            message: "Moderator review logs retrieved successfully",
            data: formattedResults,
            count: formattedResults.length
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Reset expert review logs (subm_done from 1 to 0)
exports.resetExpertReviewLogs = async (req, res) => {
    const { subjectId, qset, expertId, resetType } = req.body;

    if (!resetType || !['subject', 'qset', 'expert'].includes(resetType)) {
        return res.status(400).json({ 
            message: "Invalid resetType. Must be 'subject', 'qset', or 'expert'" 
        });
    }

    try {
        let updateQuery = 'UPDATE expertreviewlog SET subm_done = 0 WHERE subm_done = 1';
        const queryParams = [];

        // Build query based on reset type
        if (resetType === 'subject' && subjectId) {
            updateQuery += ' AND subjectId = ?';
            queryParams.push(subjectId);
        } else if (resetType === 'qset' && subjectId && qset) {
            updateQuery += ' AND subjectId = ? AND qset = ?';
            queryParams.push(subjectId, qset);
        } else if (resetType === 'expert' && expertId) {
            updateQuery += ' AND expertId = ?';
            queryParams.push(expertId);
        } else {
            return res.status(400).json({ 
                message: "Missing required parameters for the specified reset type" 
            });
        }

        const [result] = await connection.query(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: "No records found to reset with the specified criteria" 
            });
        }

        res.json({
            message: `Successfully reset ${result.affectedRows} expert review log(s)`,
            affectedRows: result.affectedRows,
            resetType: resetType,
            criteria: {
                subjectId: resetType === 'subject' || resetType === 'qset' ? subjectId : undefined,
                qset: resetType === 'qset' ? qset : undefined,
                expertId: resetType === 'expert' ? expertId : undefined
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Reset moderator review logs (subm_done from 1 to 0)
exports.resetModReviewLogs = async (req, res) => {
    const { subjectId, qset, expertId, resetType } = req.body;

    if (!resetType || !['subject', 'qset', 'expert'].includes(resetType)) {
        return res.status(400).json({ 
            message: "Invalid resetType. Must be 'subject', 'qset', or 'expert'" 
        });
    }

    try {
        let updateQuery = 'UPDATE modreviewlog SET subm_done = 0 WHERE subm_done = 1';
        const queryParams = [];

        // Build query based on reset type
        if (resetType === 'subject' && subjectId) {
            updateQuery += ' AND subjectId = ?';
            queryParams.push(subjectId);
        } else if (resetType === 'qset' && subjectId && qset) {
            updateQuery += ' AND subjectId = ? AND qset = ?';
            queryParams.push(subjectId, qset);
        } else if (resetType === 'expert' && expertId) {
            updateQuery += ' AND expertId = ?';
            queryParams.push(expertId);
        } else {
            return res.status(400).json({ 
                message: "Missing required parameters for the specified reset type" 
            });
        }

        const [result] = await connection.query(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: "No records found to reset with the specified criteria" 
            });
        }

        res.json({
            message: `Successfully reset ${result.affectedRows} moderator review log(s)`,
            affectedRows: result.affectedRows,
            resetType: resetType,
            criteria: {
                subjectId: resetType === 'subject' || resetType === 'qset' ? subjectId : undefined,
                qset: resetType === 'qset' ? qset : undefined,
                expertId: resetType === 'expert' ? expertId : undefined
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Get unique subjects, qsets, and experts for dropdown/selection purposes
exports.getReviewFilterOptions = async (req, res) => {
    const { table } = req.query; // 'expertreviewlog' or 'modreviewlog'

    if (!table || !['expertreviewlog', 'modreviewlog'].includes(table)) {
        return res.status(400).json({ 
            message: "Invalid table parameter. Must be 'expertreviewlog' or 'modreviewlog'" 
        });
    }

    try {
        const subjectQuery = `SELECT DISTINCT subjectId FROM ${table} WHERE subjectId IS NOT NULL ORDER BY subjectId`;
        const expertQuery = `SELECT DISTINCT expertId FROM ${table} WHERE expertId IS NOT NULL ORDER BY expertId`;
        const qsetQuery = `SELECT DISTINCT subjectId, qset FROM ${table} WHERE subjectId IS NOT NULL AND qset IS NOT NULL ORDER BY subjectId, qset`;

        const [subjects] = await connection.query(subjectQuery);
        const [experts] = await connection.query(expertQuery);
        const [qsets] = await connection.query(qsetQuery);

        res.json({
            message: "Filter options retrieved successfully",
            data: {
                subjects: subjects.map(s => s.subjectId),
                experts: experts.map(e => e.expertId),
                qsets: qsets
            }
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};