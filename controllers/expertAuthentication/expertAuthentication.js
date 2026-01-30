// expertAuthentication.js
const connection = require('../../config/db1');
const moment = require('moment-timezone');

// Authentication functions
exports.loginExpertAdmin = async (req, res) => {
    console.log("Trying expert admin login");

    const { expertId, password } = req.body;

    const expertQuery = `
        SELECT expertId, password, expert_name,
               paper_check, paper_mod, super_mod
        FROM expertdb
        WHERE expertId = ?
    `;

    try {
        const [results] = await connection.query(expertQuery, [expertId]);

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Expert not found'
            });
        }

        const expert = results[0];

        // Password check
        if (expert.password !== password) {
            return res.status(401).json({
                message: 'Invalid credentials for expert'
            });
        }

        const hasAccess =
            expert.paper_check === 1 ||
            expert.paper_mod === 1 ||
            expert.super_mod === 1;

        // 🚫 No permissions
        if (!hasAccess) {
            return res.status(403).json({
                message: 'No access rights assigned'
            });
        }

        // ✅ Create session only when allowed
        req.session.expertId = expert.expertId;
        req.session.expert_name = expert.expert_name;

        if (expert.paper_check === 1) req.session.paper_check = 1;
        if (expert.paper_mod === 1) req.session.paper_mod = 1;
        if (expert.super_mod === 1) req.session.super_mod = 1;

        return res.status(200).json({
            message: 'Logged in successfully as an expert!',
            expertId: expert.expertId
        });

    } catch (err) {
        console.error("Error during login:", err);

        return res.status(500).json({
            message: 'Internal server error',
            error: err.message
        });
    }
};



exports.logoutExpert = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const expertId = req.session.expertId;

    let conn;
    try {
        conn = await connection.getConnection();

        const updateStatusQuery = `
            UPDATE modreviewlog 
            SET status = 0
            WHERE expertId = ?
        `;
        await conn.query(updateStatusQuery, [expertId]);

        // Clear the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ error: 'Error logging out' });
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });

    } catch (err) {
        console.error("Error logging out expert:", err);
        res.status(500).json({ error: 'Error logging out' });
    } finally {
        if (conn) conn.release();
    }
};

exports.getExpertDetails = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
        expertId: req.session.expertId,
        expert_name: req.session.expert_name
    });
};

// Expert assignment and passage retrieval routes

exports.getPassagesByStudentId = async (req, res) => {
    console.log("getPassagesByStudentId called");
    console.log("req.body:", req.body);

    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { studentId } = req.body;
    const expertId = req.session.expertId;

    if(expertId === 8){
        try {
            const query = `
                SELECT 
                    COALESCE(NULLIF(fps.passageA, ''), tl.texta) as passageA,
                    COALESCE(NULLIF(fps.passageB, ''), tl.textb) as passageB,
                    aud.textPassageA as ansPassageA,
                    aud.textPassageB as ansPassageB,
                    erl.student_id, 
                    erl.subjectId, 
                    erl.qset,
                    s.departmentId,
                    d.examType
                FROM expertreviewlog erl
                JOIN students s ON erl.student_id = s.student_id
                JOIN departmentdb d ON s.departmentId = d.departmentId
                LEFT JOIN audiodb aud ON erl.subjectId = aud.subjectId 
                    AND erl.qset = aud.qset 
                    AND erl.departmentId = aud.departmentId
                LEFT JOIN finalPassageSubmit fps ON erl.student_id = fps.student_id
                LEFT JOIN textlogs tl ON erl.student_id = tl.student_id
                WHERE erl.student_id = ?
            `;
            const [results] = await connection.query(query, [studentId]);
    
            if (results.length > 0) {
                console.log(`Assigned student_id: ${results[0].student_id}, ExamType: ${results[0].examType}, DepartmentId: ${results[0].departmentId}`);
                res.status(200).json({ ...results[0], expertId }); // Include expertId in the response
            } else {
                res.status(404).json({ error: 'No assigned passages found' });
            }
        } catch (err) {
            console.error("Error fetching assigned passages:", err);
            res.status(500).json({ error: 'Error fetching assigned passages' });
        }
    }
    else if(expertId === 100 || expertId === 101){
        try {
            const query = `
                SELECT 
                    mrl.passageA, 
                    mrl.passageB, 
                    mrl.ansPassageA, 
                    mrl.ansPassageB, 
                    mrl.student_id, 
                    mrl.subjectId, 
                    mrl.qset, 
                    mrl.QPA, 
                    mrl.QPB,
                    s.departmentId,
                    d.examType
                FROM modreviewlog mrl
                LEFT JOIN students s ON mrl.student_id = s.student_id
                LEFT JOIN departmentdb d ON s.departmentId = d.departmentId
                WHERE mrl.student_id = ?
            `;
            const [results] = await connection.query(query, [studentId]);

            if (results.length > 0) {
                console.log(`Assigned student_id: ${results[0].student_id}, ExamType: ${results[0].examType}, DepartmentId: ${results[0].departmentId}`);
                res.status(200).json({ ...results[0], expertId }); // Include expertId in the response
            } else {
                res.status(404).json({ error: 'No assigned passages found' });
            }
        } catch (err) {
            console.error("Error fetching assigned passages:", err);
            res.status(500).json({ error: 'Error fetching assigned passages' });
        }
    }
    else{
        res.status(403).json({ error: 'Forbidden' });
    }
};

exports.getStudentPassages = async (req, res) => {
    console.log("getStudentPassages called with params:", req.params);
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const expertId = req.session.expertId;
    const { subjectId, qset, studentId, departmentId } = req.params; // Added departmentId

    console.log(`DepartmentId from URL: ${departmentId}`);

    if(expertId === 8){
        try {
            const query = `
                SELECT 
                    COALESCE(NULLIF(fps.passageA, ''), tl.texta) as passageA,
                    COALESCE(NULLIF(fps.passageB, ''), tl.textb) as passageB,
                    aud.textPassageA as ansPassageA,
                    aud.textPassageB as ansPassageB,
                    erl.student_id
                FROM expertreviewlog erl
                LEFT JOIN audiodb aud ON erl.subjectId = aud.subjectId 
                    AND erl.qset = aud.qset 
                    AND erl.departmentId = aud.departmentId
                LEFT JOIN finalPassageSubmit fps ON erl.student_id = fps.student_id
                LEFT JOIN textlogs tl ON erl.student_id = tl.student_id
                WHERE erl.subjectId = ? AND erl.qset = ? AND erl.student_id = ?
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, studentId]);
    
            if (results.length > 0) {
                console.log("Fetched student_id:", results[0].student_id);
                res.status(200).json({...results[0], departmentId}); // Include departmentId in response
            } else {
                res.status(404).json({ error: 'No passages found for this student' });
            }
        } catch (err) {
            console.error("Error fetching student passages:", err);
            res.status(500).json({ error: 'Error fetching student passages' });
        }
    }
    else if(expertId === 100){
        try {
            const query = `
                SELECT passageA, passageB, ansPassageA, ansPassageB, student_id, QPA, QPB
                FROM modreviewlog 
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, studentId]);
    
            if (results.length > 0) {
                console.log("Fetched student_id:", results[0].student_id);
                res.status(200).json({...results[0], departmentId}); // Include departmentId in response
            } else {
                res.status(404).json({ error: 'No passages found for this student' });
            }
        } catch (err) {
            console.error("Error fetching student passages:", err);
            res.status(500).json({ error: 'Error fetching student passages' });
        }
    }
    if(expertId === 101){
        try {
            const query = `
                SELECT passageA, passageB, ansPassageA, ansPassageB, student_id, QPA, QPB
                FROM modreviewlog 
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, studentId]);
    
            if (results.length > 0) {
                console.log("Fetched student_id:", results[0].student_id);
                res.status(200).json({...results[0], departmentId}); // Include departmentId in response
            } else {
                res.status(404).json({ error: 'No passages found for this student' });
            }
        } catch (err) {
            console.error("Error fetching student passages:", err);
            res.status(500).json({ error: 'Error fetching student passages' });
        }
    }
};

// Update student marks

exports.updateStudentMarks = async(req, res) => {
    console.log("updateStudentMarks function called");

    const {subjectId, qset} = req.params;
    const {spelling, missed, added, grammar, total_mistakes, total_marks} = req.body;

    const expertId = req.session.expertId;

    if (!req.session.expertId){
        return res.status(401).json({error: 'Unauthorized'});
    }

    const super_mod = req.session.super_mod;

    let conn;
    
    if (super_mod === 1){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const currentStudentAssignment = `
                SELECT student_id, spelling, missed, added, grammar, total_mistakes, total_marks
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND expertId = ? AND subm_done = 0
                ORDER BY loggedin DESC
                LIMIT 1`;

            const [storeStudentAssignment] = await conn.query(currentStudentAssignment, [subjectId, qset, expertId]);

            if (storeStudentAssignment.length === 0){
                await conn.rollback();
                return res.status(404).json({error: 'No active assignment available'});
            }

            const studentId = storeStudentAssignment[0].student_id;

            const updateQuery = `
                UPDATE modreviewlog 
                SET spelling = ?, missed = ?, added = ?, grammar = ?, total_mistakes = ?, total_marks = ?
                WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?`;
            
            const [updateResult] = await conn.query(updateQuery, [spelling, missed, added, grammar, total_mistakes, total_marks, studentId, subjectId, qset, expertId]);

            if (updateResult.affectedRows === 0){
                await conn.rollback();
                return res.status(404).json({error: 'No matching record found to update'});               
            }

            // fetch the updated record
            const updatedResult = `
                SELECT spelling, missed, added, grammar, total_mistakes, total_marks
                FROM modreviewlog
                WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?`;
            
            const [results] = await conn.query(updatedResult, [studentId, subjectId, qset, expertId]);

            if (results.length === 0){
                await conn.rollback();
                return res.status(404).json({error: 'Updated record not found!'});
            }

            if (results && results[0]) {
                if (results[0].updated_at) {
                    results[0].updated_at = moment(results[0].updated_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                }
            }

            await conn.commit();
            res.status(200).json(results[0]);
        } catch (error) {
            if (conn) await conn.rollback();
            console.error("Error updating marks: ", error);
            res.status(500).json({error: "Error updating marks"});
        } finally {
            if (conn) conn.release();
        }
    } else {
        return res.status(403).json({error: 'Access denied. Only super moderators can update marks.'});
    }
};