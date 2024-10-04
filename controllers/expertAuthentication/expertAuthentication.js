// expertAuthentication.js
const connection = require('../../config/db1');

// Authentication functions
exports.loginExpertAdmin = async (req, res) => {
    console.log("Trying expert admin login");
    const { expertId, password } = req.body;
    console.log("expertId: "+ expertId + " password: "+ password);
    const expertQuery = 'SELECT expertId, password, expert_name FROM expertdb WHERE expertId = ?';

    try {
        const [results] = await connection.query(expertQuery, [expertId]);
        if (results.length > 0) {
            const expert = results[0];
            console.log("data: "+expert);
            console.log(expert)
            
            if (expert.password === password) {
                // Set expert session
                req.session.expertId = expert.expertId;
                req.session.expert_name = expert.expert_name;
                
                res.status(200).json({
                    message: 'Logged in successfully as an expert!',
                    expertId: expert.expertId
                });
                
            } else {
                res.status(401).send('Invalid credentials for expert');
            }
        } else {
            res.status(404).send('Expert not found');
        }
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).send(err.message);
    }
};

exports.logoutExpertStage1 = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const expertId = req.session.expertId;

    let conn;
    try {
        conn = await connection.getConnection();

        const updateStatusQuery = `
            UPDATE expertreviewlog 
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

exports.logoutExpertStage3 = async (req, res) => {
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
exports.getExpertAssignedPassages = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    try {
        const query = `
            SELECT passageA, passageB, ansPassageA, ansPassageB, student_id
            FROM modreviewlog 
            WHERE subjectId = ? AND qset = ? AND expertId = ?
            ORDER BY loggedin DESC
            LIMIT 1
        `;
        const [results] = await connection.query(query, [subjectId, qset, expertId]);

        if (results.length > 0) {
            console.log("Assigned student_id:", results[0].student_id);
            res.status(200).json(results[0]);
        } else {
            res.status(404).json({ error: 'No assigned passages found' });
        }
    } catch (err) {
        console.error("Error fetching assigned passages:", err);
        res.status(500).json({ error: 'Error fetching assigned passages' });
    }
};

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
                SELECT passageA, passageB, ansPassageA, ansPassageB, student_id, subjectId, qset
                FROM expertreviewlog 
                WHERE student_id = ?
            `;
            const [results] = await connection.query(query, [studentId]);
    
            if (results.length > 0) {
                console.log("Assigned student_id:", results[0].student_id);
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
                SELECT passageA, passageB, ansPassageA, ansPassageB, student_id, subjectId, qset, QPA, QPB
                FROM modreviewlog 
                WHERE student_id = ?
            `;
            const [results] = await connection.query(query, [studentId]);

            if (results.length > 0) {
                console.log("Assigned student_id:", results[0].student_id);
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
    const { subjectId, qset, studentId } = req.params;

    if(expertId === 8){
        try {
            const query = `
                SELECT passageA, passageB, ansPassageA, ansPassageB, student_id
                FROM expertreviewlog 
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, studentId]);
    
            if (results.length > 0) {
                console.log("Fetched student_id:", results[0].student_id);
                res.status(200).json(results[0]);
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
                res.status(200).json(results[0]);
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
                res.status(200).json(results[0]);
            } else {
                res.status(404).json({ error: 'No passages found for this student' });
            }
        } catch (err) {
            console.error("Error fetching student passages:", err);
            res.status(500).json({ error: 'Error fetching student passages' });
        }
    }
};