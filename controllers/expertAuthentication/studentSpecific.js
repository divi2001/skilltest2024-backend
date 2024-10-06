// StudentSpecific.js
const connection = require('../../config/db1');

exports.getAllSubjects = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const paper_check = req.session.paper_check;
    const paper_mod = req.session.paper_mod;
    const super_mod = req.session.super_mod;
    let tableName;
    let subjectsQuery;

    if (paper_check !== 1 && paper_mod !== 1 && super_mod !== 1) {
        return res.status(403).json({ error: 'Forbidden - No stages alloted' });
    }

    if (paper_check === 1) {
        tableName = 'expertreviewlog';
    } else if (super_mod === 1) {
        tableName = 'modreviewlog';
    }

    if (paper_mod === 1) {
        subjectsQuery = `
            SELECT DISTINCT
                s.subjectId,
                s.subject_name
            FROM 
                subjectsdb s
            JOIN 
                students st ON s.subjectId = st.subjectsId
            JOIN 
                departmentdb d ON st.departmentId = d.departmentId
            WHERE 
                d.departmentStatus = 1
            ORDER BY 
                s.subjectId;
        `;
    } else {
        // Original query for paper_check and super_mod
        subjectsQuery = `
            SELECT 
                s.subjectId, 
                s.subject_name, 
                s.subject_name_short, 
                s.daily_timer, 
                s.passage_timer, 
                s.demo_timer,
                COUNT(DISTINCT CASE 
                    WHEN m.subm_done IS NULL OR m.subm_done = 0 
                    THEN m.student_id 
                END) AS incomplete_count,
                COUNT(DISTINCT m.student_id) AS total_count,
                st.departmentId
            FROM 
                subjectsdb s
            LEFT JOIN 
                ${tableName} m ON s.subjectId = m.subjectId AND m.expertId = ?
            LEFT JOIN 
                students st ON m.student_id = st.student_id
            LEFT JOIN 
                departmentdb d ON st.departmentId = d.departmentId
            WHERE 
                d.departmentStatus = 1
            GROUP BY 
                s.subjectId, 
                s.subject_name, 
                s.subject_name_short, 
                s.daily_timer, 
                s.passage_timer, 
                s.demo_timer, 
                st.departmentId, 
                d.departmentName
            HAVING 
                incomplete_count > 0;
        `;
    }

    try {
        let results;
        if (paper_mod === 1) {
            [results] = await connection.query(subjectsQuery);
        } else {
            [results] = await connection.query(subjectsQuery, [req.session.expertId]);
        }
        
        // Console log the subjects and their student counts
        console.log("Subjects available for expert:");
        results.forEach(subject => {
            if (paper_mod === 1) {
                console.log(`Subject ID: ${subject.subjectId}, Name: ${subject.subject_name}`);
            } else {
                console.log(`Subject ID: ${subject.subjectId}, Name: ${subject.subject_name}, Incomplete Count: ${subject.incomplete_count}, Total Count: ${subject.total_count}`);
            }
        });

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching subjects:", err);
        res.status(500).json({ error: 'Error fetching subjects' });
    }
};

exports.getQSetsForSubject = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId } = req.params;
    const expertId = req.session.expertId;

    const paper_check = req.session.paper_check;
    const paper_mod = req.session.paper_mod;
    const super_mod = req.session.super_mod;
    let tableName;
    let qsetQuery;

    if (paper_check === 1) {
        tableName = 'expertreviewlog';
    } else if (super_mod === 1) {
        tableName = 'modreviewlog';
    } else if (paper_mod !== 1) {
        return res.status(403).json({ error: 'Forbidden - No stages alloted' });
    }

    try {
        if (paper_mod === 1) {
            qsetQuery = `
                SELECT DISTINCT
                    a.qset
                FROM 
                    audiodb a
                JOIN 
                    students st ON a.subjectId = st.subjectsId
                JOIN 
                    departmentdb d ON st.departmentId = d.departmentId
                WHERE 
                    a.subjectId = ?
                    AND d.departmentStatus = 1
                ORDER BY 
                    a.qset
            `;
            const [qsetResults] = await connection.query(qsetQuery, [subjectId]);

            console.log(`QSets for subject ${subjectId} from audiodb:`);
            qsetResults.forEach(qset => {
                console.log(`QSet: ${qset.qset}`);
            });

            res.status(200).json(qsetResults);
        } else {
            qsetQuery = `
                SELECT 
                    qset, 
                    COUNT(DISTINCT CASE WHEN subm_done IS NULL OR subm_done = 0 THEN student_id END) as incomplete_count,
                    COUNT(DISTINCT student_id) as total_count
                FROM ${tableName} 
                WHERE subjectId = ?
                AND expertId = ?
                GROUP BY qset
                HAVING incomplete_count > 0
                ORDER BY qset
            `;
            const [qsetResults] = await connection.query(qsetQuery, [subjectId, expertId]);

            console.log(`QSets for subject ${subjectId} and expert ${expertId} with student counts:`);
            qsetResults.forEach(qset => {
                console.log(`QSet: ${qset.qset}, Incomplete Count: ${qset.incomplete_count}, Total Count: ${qset.total_count}`);
            });

            res.status(200).json(qsetResults);
        }
    } catch (err) {
        console.error("Error fetching qsets:", err);
        res.status(500).json({ error: 'Error fetching qsets' });
    }
};

// Expert assignment and passage retrieval routes
exports.getExpertAssignedPassages = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    const paper_check = req.session.paper_check;
    const paper_mod = req.session.paper_mod;
    const super_mod = req.session.super_mod;
    let tableName;
    let query;

    if (paper_check === 1) {
        tableName = 'expertreviewlog';
    } else if (super_mod === 1) {
        tableName = 'modreviewlog';
    } else if (paper_mod !== 1) {
        return res.status(403).json({ error: 'Forbidden - No stages alloted' });
    }

    try {
        if (paper_mod === 1) {
            query = `
                SELECT subjectId, qset, textPassageA, textPassageB
                FROM audiodb
                WHERE subjectId = ? AND qset = ?
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset]);

            if (results.length > 0) {
                console.log(`Fetched passages for subject ${subjectId}, qset ${qset} from audiodb`);
                res.status(200).json({
                    subjectId: results[0].subjectId,
                    qset: results[0].qset,
                    passageA: results[0].textPassageA,
                    passageB: results[0].textPassageB
                });
            } else {
                res.status(404).json({ error: 'No passages found' });
            }
        } else {
            query = `
                SELECT passageA, passageB, ansPassageA, ansPassageB, student_id
                FROM ${tableName} 
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
        }
    } catch (err) {
        console.error("Error fetching passages:", err);
        res.status(500).json({ error: 'Error fetching passages' });
    }
};

exports.assignStudentForQSet = async (req, res) => {
    console.log("assignStudentForQSet function called");
    console.log("Session data:", req.session);

    if (!req.session.expertId) {
        console.log("Unauthorized: No expertId in session");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    console.log(`Parameters: subjectId=${subjectId}, qset=${qset}, expertId=${expertId}`);

    const paper_check = req.session.paper_check;
    const super_mod = req.session.super_mod;
    const paper_mod = req.session.paper_mod;
    let tableName;

    console.log(`paper_check=${paper_check}, super_mod=${super_mod}`);

    if (paper_check === 1){
        tableName = 'expertreviewlog';
    }
    else if (super_mod === 1){
        tableName = 'modreviewlog';
    }
    else{
        console.log("Forbidden: No stages alloted");
        return res.status(403).json({error: 'Forbidden - No stages alloted'})
    }

    console.log(`Using table: ${tableName}`);

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();
        console.log("Transaction begun");

        // Check if the expert already has an active assignment
        let checkExistingAssignmentQuery;
        if (tableName === 'expertreviewlog') {
            checkExistingAssignmentQuery = `
                SELECT student_id, loggedin, status, subm_done, subm_time
                FROM ${tableName} 
                WHERE subjectId = ? AND qset = ? AND expertId = ? AND (subm_done IS NULL OR subm_done = 0)
                LIMIT 1
            `;
        } else {
            checkExistingAssignmentQuery = `
                SELECT student_id, loggedin, status, subm_done, subm_time, QPA, QPB
                FROM ${tableName} 
                WHERE subjectId = ? AND qset = ? AND expertId = ? AND (subm_done IS NULL OR subm_done = 0)
                LIMIT 1
            `;
        }
        console.log("Checking existing assignment query:", checkExistingAssignmentQuery);
        const [existingAssignment] = await conn.query(checkExistingAssignmentQuery, [subjectId, qset, expertId]);
        console.log("Existing assignment result:", existingAssignment);

        let student_id, loggedin, status, subm_done, subm_time, QPA, QPB;

        if (existingAssignment.length > 0) {
            console.log("Existing active assignment found");
            ({ student_id, loggedin, status, subm_done, subm_time } = existingAssignment[0]);
            if (tableName === 'modreviewlog') {
                ({ QPA, QPB } = existingAssignment[0]);
            }

            // Update the existing assignment
            const updateAssignmentQuery = `
                UPDATE ${tableName}
                SET loggedin = NOW(), status = 1, subm_done = 0, subm_time = NULL
                WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?
            `;
            await conn.query(updateAssignmentQuery, [student_id, subjectId, qset, expertId]);
            loggedin = new Date();
            status = 1;
            subm_done = 0;
            subm_time = null;
        } else {
            console.log("No existing active assignment, assigning new student");
            // Assign a new student that is not already assigned to any expert
            const assignNewStudentQuery = `
                UPDATE ${tableName} 
                SET expertId = ?, loggedin = NOW(), status = 1, subm_done = 0, subm_time = NULL
                WHERE subjectId = ? AND qset = ? AND expertId IS NULL AND student_id IS NOT NULL
                LIMIT 1
            `;
            const [assignResult] = await conn.query(assignNewStudentQuery, [expertId, subjectId, qset]);

            if (assignResult.affectedRows > 0) {
                // Fetch the new assignment details
                const [newAssignment] = await conn.query(checkExistingAssignmentQuery, [subjectId, qset, expertId]);
                ({ student_id, loggedin, status, subm_done, subm_time } = newAssignment[0]);
                if (tableName === 'modreviewlog') {
                    ({ QPA, QPB } = newAssignment[0]);
                }
            } else {
                // No available students
                await conn.rollback();
                return res.status(400).json({ error: 'No available students for this QSet. All students are already assigned.' });
            }
        }

        // Check if QPA and QPB are already filled
        if (paper_check === 1){
            console.log("paper_check is 1, returning assignment details");
            await conn.commit();
            return res.status(200).json({ qset, student_id, loggedin, status, subm_done, subm_time });
        }
        else if (paper_mod === 1) {
            console.log("paper_mod is 1, returning qset details without assigning student");
            await conn.commit();
            return res.status(200).json({ qset, paper_mod });
        }
        else if(super_mod === 1){
            console.log("super_mod is 1, proceeding with QPA and QPB check");
            if (!QPA || !QPB) {
                console.log("QPA or QPB not filled, fetching ignore lists");
                // Fetch ignore lists only if QPA or QPB is not filled
                const fetchIgnoreListsQuery = `
                    SELECT Q${qset}PA as QPA, Q${qset}PB as QPB
                    FROM modqsetdb
                    WHERE subjectId = ?
                `;
                const [ignoreListsResult] = await conn.query(fetchIgnoreListsQuery, [subjectId]);
    
                if (ignoreListsResult.length === 0) {
                    await conn.rollback();
                    return res.status(404).json({ error: 'Ignore lists not found for this subject and qset' });
                }
    
                QPA = QPA || ignoreListsResult[0].QPA;
                QPB = QPB || ignoreListsResult[0].QPB;
    
                // Update the modreviewlog with the ignore lists only if they were not filled
                const updateIgnoreListsQuery = `
                    UPDATE modreviewlog
                    SET QPA = COALESCE(QPA, ?), QPB = COALESCE(QPB, ?)
                    WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?
                `;
                await conn.query(updateIgnoreListsQuery, [QPA, QPB, student_id, subjectId, qset, expertId]);
            }
    
            await conn.commit();
            console.log("Transaction committed");
            console.log("Sending response:", { qset, student_id, loggedin, status, subm_done, subm_time, QPA, QPB });
            res.status(200).json({ qset, student_id, loggedin, status, subm_done, subm_time, QPA, QPB });            
        }

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error assigning student for QSet:", err);
        res.status(500).json({ error: 'Error assigning student for QSet' });
    } finally {
        if (conn) conn.release();
        console.log("Connection released");
    }
};

// Ignore list management routes
// 1. Get ignorelist functions
exports.getIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage } = req.body;
    const expertId = req.session.expertId;

    const paper_check = req.session.paper_check;
    const super_mod = req.session.super_mod;
    const paper_mod = req.session.paper_mod;
    let tableName;

    if (paper_check === 1) {
        tableName = 'qsetdb';
    } else if (paper_mod === 1) {
        tableName = 'modqsetdb';
    }

    // Input validation
    if (!subjectId || !qset || !activePassage) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (paper_check === 1 || paper_mod === 1){ 
        try {
            const columnName = `Q${qset}P${activePassage}`;
            
            const query = `
                SELECT ${columnName} AS ignoreList
                FROM ${tableName}
                WHERE subjectId = ?
            `;
            
            const [results] = await connection.query(query, [subjectId]);
            
            if (results.length > 0 && results[0].ignoreList) {
                // Split the ignore list string into an array
                const ignoreList = results[0].ignoreList.split(',').map(item => item.trim());
                console.log(ignoreList)
                res.status(200).json({ ignoreList });
            } else {
                res.status(404).json({ error: 'No ignore list found' });
            }
        } catch (err) {
            console.error("Error fetching ignore list:", err);
            res.status(500).json({ error: 'Error fetching ignore list' });
        }
    }
    else if (super_mod === 1){ //Fetching ignore list from QPA and QPB columns for Stage 3
        try {
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            const query = `
                SELECT ${columnName} AS ignoreList, student_id
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND expertId = ?
                ORDER BY loggedin DESC
                LIMIT 1
            `;
            
            const [results] = await connection.query(query, [subjectId, qset, expertId]);
    
            if (results.length > 0) {
                const { ignoreList, student_id } = results[0];
                
                if (ignoreList) {
                    // Split the ignore list string into an array
                    const ignoreListArray = ignoreList.split(',').map(item => item.trim());
                    
                    console.log(`Fetched ignore list for expertId: ${expertId}, student_id: ${student_id}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
                    console.log(`Table: modreviewlog, Column: ${columnName}`);
                    console.log(`Ignore list: ${ignoreListArray.join(', ')}`);
                    
                    res.status(200).json({ 
                        ignoreList: ignoreListArray,
                        debug: {
                            expertId,
                            student_id,
                            subjectId,
                            qset,
                            activePassage,
                            table: 'modreviewlog',
                            column: columnName
                        }
                    });
                } else {
                    console.log(`No ignore list found for expertId: ${expertId}, student_id: ${student_id}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
                    console.log(`Table: modreviewlog, Column: ${columnName}`);
                    res.status(404).json({ 
                        error: 'No ignore list found',
                        debug: {
                            expertId,
                            student_id,
                            subjectId,
                            qset,
                            activePassage,
                            table: 'modreviewlog',
                            column: columnName
                        }
                    });
                }
            } else {
                console.log(`No record found for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                res.status(404).json({ 
                    error: 'No record found',
                    debug: {
                        expertId,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            }
        } catch (err) {
            console.error("Error fetching ignore list:", err);
            res.status(500).json({ error: 'Error fetching ignore list' });
        }
    }
    else{
        console.log("Forbidden: No stages alloted");
        return res.status(403).json({error: 'Forbidden - No stages alloted'})
    }
};

exports.getStudentIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, studentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !studentId) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (expertId === 8){
        try {
            const columnName = `Q${qset}P${activePassage}`;
            
            const query = `
                SELECT ${columnName} AS ignoreList
                FROM qsetdb
                WHERE subjectId = ?
            `;
            
            const [results] = await connection.query(query, [subjectId]);

            if (results.length > 0 && results[0].ignoreList) {
                // Split the ignore list string into an array
                const ignoreList = results[0].ignoreList.split(',').map(item => item.trim());
                console.log(ignoreList)
                res.status(200).json({ ignoreList });
            } else {
                res.status(404).json({ error: 'No ignore list found' });
            }
        } catch (err) {
            console.error("Error fetching ignore list:", err);
            res.status(500).json({ error: 'Error fetching ignore list' });
        }
    }
    else if(expertId === 100 || expertId === 101){
        try {
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            const query = `
                SELECT ${columnName} AS ignoreList, student_id
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                ORDER BY loggedin DESC
                LIMIT 1
            `;
            
            const [results] = await connection.query(query, [subjectId, qset, studentId]);
    
            if (results.length > 0) {
                const { ignoreList, student_id } = results[0];
                
                // Convert ignoreList to array if it exists, otherwise set to empty array
                const ignoreListArray = ignoreList ? ignoreList.split(',').map(item => item.trim()) : [];
                
                console.log(`Fetched ignore list for expertId: ${expertId}, student_id: ${student_id}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                console.log(`Ignore list: ${ignoreListArray.join(', ')}`);
                
                res.status(200).json({ 
                    ignoreList: ignoreListArray,
                    debug: {
                        expertId,
                        student_id,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            } else {
                console.log(`No record found for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                res.status(404).json({ 
                    error: 'No record found',
                    debug: {
                        expertId,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            }
        } catch (err) {
            console.error("Error fetching ignore list:", err);
            res.status(500).json({ error: 'Error fetching ignore list' });
        }
    }
};

// 2. Get addToIgnoreList functions
exports.addToIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, newWord } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const paper_check = req.session.paper_check;
    const super_mod = req.session.super_mod;
    const paper_mod = req.session.paper_mod;

    let tableName;

    if (paper_check === 1) {
        tableName = 'qsetdb';
    } else if (paper_mod === 1) {
        tableName = 'modqsetdb';
    }

    let conn;

    if (paper_check === 1 || paper_mod === 1){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM ${tableName}
                WHERE subjectId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId]);
    
            let currentIgnoreList = [];
            if (results.length > 0 && results[0].ignoreList) {
              currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            }
    
            // Add the new word if it's not already in the list
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
              }
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE ${tableName}
                SET ${columnName} = ?
                WHERE subjectId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId]);
            
            await conn.commit();
            console.log(currentIgnoreList);
    
            res.status(200).json({ message: 'Word added to ignore list', ignoreList: currentIgnoreList });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error adding word to ignore list:", err);
            res.status(500).json({ error: 'Error adding word to ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }
    else if(super_mod === 1){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList, student_id
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND expertId = ?
                ORDER BY loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, expertId]);
    
            let currentIgnoreList = [];
            let student_id = null;
            if (results.length > 0) {
                if (results[0].ignoreList) {
                    currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
                }
                student_id = results[0].student_id;
            }
    
            // Add the new word if it's not already in the list
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
                console.log(`Word added: ${newWord}`);
                console.log(`Table updated: modreviewlog`);
                console.log(`Column updated: ${columnName}`);
            } else {
                console.log(`Word "${newWord}" already exists in the ignore list. No changes made.`);
            }
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE modreviewlog
                SET ${columnName} = ?
                WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, expertId, student_id]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word added to ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error adding word to ignore list:", err);
            res.status(500).json({ error: 'Error adding word to ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }

};

exports.addToStudentIgnoreList = async (req, res) => {
    console.log("Received data:", req.body);
    const { activePassage, newWord, subjectId, qset, studentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord || !studentId) {
        console.log("Missing parameters:", { subjectId, qset, activePassage, newWord });
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    let conn;

    if(expertId === 8){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM qsetdb
                WHERE subjectId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId]);
    
            let currentIgnoreList = [];
            if (results.length > 0 && results[0].ignoreList) {
              currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            }
    
            // Add the new word if it's not already in the list
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
              }
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE qsetdb
                SET ${columnName} = ?
                WHERE subjectId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId]);
            
            await conn.commit();
            console.log(currentIgnoreList);
    
            res.status(200).json({ message: 'Word added to ignore list', ignoreList: currentIgnoreList });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error adding word to ignore list:", err);
            res.status(500).json({ error: 'Error adding word to ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }
    else if(expertId === 100){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList, student_id
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                ORDER BY loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, studentId]);
    
            let currentIgnoreList = [];
            let student_id = null;
            if (results.length > 0) {
                if (results[0].ignoreList) {
                    currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
                }
                student_id = results[0].student_id;
            }
    
            // Add the new word if it's not already in the list
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
                console.log(`Word added: ${newWord}`);
                console.log(`Table updated: modreviewlog`);
                console.log(`Column updated: ${columnName}`);
            } else {
                console.log(`Word "${newWord}" already exists in the ignore list. No changes made.`);
            }
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE modreviewlog
                SET ${columnName} = ?
                WHERE subjectId = ? AND qset = ? AND student_id = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, student_id]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word added to ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error adding word to ignore list:", err);
            res.status(500).json({ error: 'Error adding word to ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }
    else{
        console.log("Stage parameters inaccesible");
        return res.status(403).json({error: 'Stage parameters inaccesible'})
    }
};

// 3. Get addToIgnoreList functions
exports.removeFromIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, wordToRemove } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const paper_check = req.session.paper_check;
    const super_mod = req.session.super_mod;
    const paper_mod = req.session.paper_mod;

    let tableName;

    if (paper_check === 1) {
        tableName = 'qsetdb';
    } else if (paper_mod === 1) {
        tableName = 'modqsetdb';
    }

    let conn;

    if (paper_check === 1 || paper_mod === 1){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM ${tableName} 
                WHERE subjectId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
    
            // Remove the word from the list
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE ${tableName}
                SET ${columnName} = ?
                WHERE subjectId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId]);
            
            await conn.commit();
    
            res.status(200).json({ message: 'Word removed from ignore list', ignoreList: currentIgnoreList });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error removing word from ignore list:", err);
            res.status(500).json({ error: 'Error removing word from ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }
    else if (super_mod === 1){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList, student_id
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND expertId = ?
                ORDER BY loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, expertId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            const student_id = results[0].student_id;
    
            // Remove the word from the list
            const initialLength = currentIgnoreList.length;
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            if (currentIgnoreList.length < initialLength) {
                console.log(`Word removed: ${wordToRemove}`);
                console.log(`Table updated: modreviewlog`);
                console.log(`Column updated: ${columnName}`);
            } else {
                console.log(`Word "${wordToRemove}" not found in the ignore list. No changes made.`);
            }
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE modreviewlog
                SET ${columnName} = ?
                WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, expertId, student_id]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word removed from ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error removing word from ignore list:", err);
            res.status(500).json({ error: 'Error removing word from ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }
};

exports.removeFromStudentIgnoreList = async (req, res) => {
    const { subjectId, qset, activePassage, wordToRemove, studentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    let conn;
    if(expertId === 8){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM qsetdb 
                WHERE subjectId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
    
            // Remove the word from the list
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE qsetdb
                SET ${columnName} = ?
                WHERE subjectId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId]);
            
            await conn.commit();
    
            res.status(200).json({ message: 'Word removed from ignore list', ignoreList: currentIgnoreList });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error removing word from ignore list:", err);
            res.status(500).json({ error: 'Error removing word from ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }
    else if(expertId === 100){
        try {
            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            // First, fetch the current ignore list
            const selectQuery = `
                SELECT ${columnName} AS ignoreList, student_id
                FROM modreviewlog
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                ORDER BY loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, studentId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            const student_id = results[0].student_id;
    
            // Remove the word from the list
            const initialLength = currentIgnoreList.length;
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            if (currentIgnoreList.length < initialLength) {
                console.log(`Word removed: ${wordToRemove}`);
                console.log(`Table updated: modreviewlog`);
                console.log(`Column updated: ${columnName}`);
            } else {
                console.log(`Word "${wordToRemove}" not found in the ignore list. No changes made.`);
            }
    
            // Join the list back into a comma-separated string
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            // Update the database with the new ignore list
            const updateQuery = `
                UPDATE modreviewlog
                SET ${columnName} = ?
                WHERE subjectId = ? AND qset = ? AND student_id = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, student_id]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word removed from ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Error removing word from ignore list:", err);
            res.status(500).json({ error: 'Error removing word from ignore list' });
        } finally {
            if (conn) conn.release();
        }
    }

};

// 4. Clear ignore list
exports.clearIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
        
        const query = `
            UPDATE modreviewlog
            SET ${columnName} = NULL
            WHERE subjectId = ? AND qset = ? AND expertId = ?
            ORDER BY loggedin DESC
            LIMIT 1
        `;
        
        const [result] = await connection.query(query, [subjectId, qset, expertId]);

        if (result.affectedRows > 0) {
            console.log(`Cleared ignore list for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
            console.log(`Table: modreviewlog, Column: ${columnName}`);
            
            res.status(200).json({ 
                message: 'Ignore list cleared successfully',
                debug: {
                    expertId,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        } else {
            console.log(`No record found to clear for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}`);
            console.log(`Table: modreviewlog, Column: ${columnName}`);
            res.status(404).json({ 
                error: 'No record found to clear',
                debug: {
                    expertId,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        }
    } catch (err) {
        console.error("Error clearing ignore list:", err);
        res.status(500).json({ error: 'Error clearing ignore list' });
    }
};

exports.clearStudentIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, studentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !studentId) {
        return res.status(400).json({ error: 'Missing required parameters' });
    } 

    if (expertId === 100){
        try {
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            const query = `
                UPDATE modreviewlog
                SET ${columnName} = NULL
                WHERE subjectId = ? AND qset = ? AND student_id = ?
                ORDER BY loggedin DESC
                LIMIT 1
            `;
            
            const [result] = await connection.query(query, [subjectId, qset, studentId]);
    
            if (result.affectedRows > 0) {
                console.log(`Cleared ignore list for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                
                res.status(200).json({ 
                    message: 'Ignore list cleared successfully',
                    debug: {
                        expertId,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            } else {
                console.log(`No record found to clear for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                res.status(404).json({ 
                    error: 'No record found to clear',
                    debug: {
                        expertId,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            }
        } catch (err) {
            console.error("Error clearing ignore list:", err);
            res.status(500).json({ error: 'Error clearing ignore list' });
        }
    }
};

// Passage review submission function
exports.submitPassageReview = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    const paper_check = req.session.paper_check;
    const super_mod = req.session.super_mod;
    let tableName;

    if (paper_check === 1){
        tableName = 'expertreviewlog';
    }
    else if(super_mod === 1){
        tableName = 'modreviewlog';
    }
    else{
        res.status(403).json({error: 'Stage parameters inaccesible in submitPassageReview'});
    }

    let conn;

    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        // First, fetch the current assignment for this expert
        const fetchAssignmentQuery = `
            SELECT student_id
            FROM ${tableName}
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND status = 1 AND subm_done = 0
            ORDER BY loggedin DESC
            LIMIT 1
        `;
        const [assignmentResult] = await conn.query(fetchAssignmentQuery, [subjectId, qset, expertId]);

        if (assignmentResult.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'No active assignment found for this expert' });
        }

        const studentId = assignmentResult[0].student_id;

        // Update the modreviewlog table for the specific student
        const updateQuery = `
            UPDATE ${tableName} 
            SET subm_done = 1, subm_time = NOW()
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ? AND status = 1
        `;
        const [updateResult] = await conn.query(updateQuery, [subjectId, qset, expertId, studentId]);

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'No matching record found to update' });
        }

        // Fetch the updated record
        const selectQuery = `
            SELECT student_id, subm_done, subm_time
            FROM ${tableName}
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ?
        `;
        const [results] = await conn.query(selectQuery, [subjectId, qset, expertId, studentId]);

        if (results.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Updated record not found' });
        }

        await conn.commit();
        res.status(200).json(results[0]);
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error submitting passage review:", err);
        res.status(500).json({ error: 'Error submitting passage review' });
    } finally {
        if (conn) conn.release();
    }
};