// src/controllers/expertAuthentication/studentSpecific.js
const connection = require('../../config/db1');
const moment = require('moment-timezone');
const { ensureQsetdbEntryForSubject } = require('../../utils/qsetdbHandler');

exports.getAllSubjects = async (req, res) => {
    console.log("getAllSubjects called");
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log("Get all subjects hit")
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
                s.subject_name,
                st.departmentId,
                d.departmentName,
                d.examType,
                COUNT(DISTINCT st.student_id) as total_count,
                COUNT(DISTINCT st.student_id) as incomplete_count
            FROM 
                subjectsdb s
            JOIN 
                students st ON s.subjectId = st.subjectsId
            JOIN 
                departmentdb d ON st.departmentId = d.departmentId
            WHERE 
                d.departmentStatus = 1
            GROUP BY
                s.subjectId,
                s.subject_name,
                st.departmentId,
                d.departmentName,
                d.examType
            ORDER BY 
                s.subjectId, st.departmentId;
        `;
    } else {
        // Fixed query without held column references
        subjectsQuery = `
            SELECT 
                s.subjectId, 
                s.subject_name, 
                s.subject_name_short, 
                s.daily_timer, 
                s.passage_timer, 
                s.demo_timer,
                st.departmentId,
                d.departmentName,
                d.examType,
                COUNT(DISTINCT CASE 
                    WHEN m.subm_done IS NULL OR m.subm_done = 0 
                    THEN m.student_id 
                END) AS incomplete_count,
                COUNT(DISTINCT m.student_id) AS total_count
            FROM 
                subjectsdb s
            JOIN 
                students st ON s.subjectId = st.subjectsId
            JOIN 
                departmentdb d ON st.departmentId = d.departmentId
            LEFT JOIN 
                ${tableName} m ON s.subjectId = m.subjectId 
                    AND m.student_id = st.student_id 
                    AND m.expertId = ?
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
                d.departmentName,
                d.examType
            HAVING 
                incomplete_count > 0
            ORDER BY 
                s.subjectId, st.departmentId;
        `;
    }

    try {
        let results;
        if (paper_mod === 1) {
            [results] = await connection.query(subjectsQuery);
        } else {
            [results] = await connection.query(subjectsQuery, [req.session.expertId]);
        }
        
        // Console log the subjects with department information
        console.log("Subjects available for expert:");
        results.forEach(subject => {
            if (paper_mod === 1) {
                console.log(`Subject ID: ${subject.subjectId}, Name: ${subject.subject_name}, Department: ${subject.departmentName} (ID: ${subject.departmentId}), ExamType: ${subject.examType}`);
            } else {
                console.log(`Subject ID: ${subject.subjectId}, Name: ${subject.subject_name}, Department: ${subject.departmentName} (ID: ${subject.departmentId}), ExamType: ${subject.examType}, Incomplete Count: ${subject.incomplete_count}, Total Count: ${subject.total_count}`);
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
    const { departmentId } = req.query; // Get departmentId from query parameters
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
            if (departmentId) {
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
                        AND st.departmentId = ?
                        AND d.departmentStatus = 1
                    ORDER BY 
                        a.qset
                `;
                const [qsetResults] = await connection.query(qsetQuery, [subjectId, departmentId]);
                
                console.log(`QSets for subject ${subjectId}, department ${departmentId} from audiodb:`);
                qsetResults.forEach(qset => {
                    console.log(`QSet: ${qset.qset}`);
                });

                res.status(200).json(qsetResults);
            } else {
                // Original query without department filtering
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
            }
        } else {
            if (departmentId) {
                qsetQuery = `
                    SELECT 
                        ${tableName}.qset, 
                        COUNT(DISTINCT CASE WHEN ${tableName}.subm_done IS NULL OR ${tableName}.subm_done = 0 THEN ${tableName}.student_id END) as incomplete_count,
                        COUNT(DISTINCT ${tableName}.student_id) as total_count
                    FROM ${tableName} 
                    JOIN students s ON ${tableName}.student_id = s.student_id
                    WHERE ${tableName}.subjectId = ?
                    AND ${tableName}.expertId = ?
                    AND s.departmentId = ?
                    GROUP BY ${tableName}.qset
                    HAVING incomplete_count > 0
                    ORDER BY ${tableName}.qset
                `;
                const [qsetResults] = await connection.query(qsetQuery, [subjectId, expertId, departmentId]);

                console.log(`QSets for subject ${subjectId}, department ${departmentId} and expert ${expertId} with student counts:`);
                qsetResults.forEach(qset => {
                    console.log(`QSet: ${qset.qset}, Incomplete Count: ${qset.incomplete_count}, Total Count: ${qset.total_count}`);
                });

                res.status(200).json(qsetResults);
            } else {
                // Original query without department filtering
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

    const { subjectId, qset, departmentId } = req.params;
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
                WHERE subjectId = ? AND qset = ? AND departmentId = ?
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, departmentId]);

            if (results.length > 0) {
                console.log(`Fetched passages for subject ${subjectId}, qset ${qset}, department ${departmentId} from audiodb`);
                res.status(200).json({
                    subjectId: results[0].subjectId,
                    qset: results[0].qset,
                    passageA: results[0].textPassageA,
                    passageB: results[0].textPassageB,
                    departmentId: departmentId
                });
            } else {
                res.status(404).json({ error: 'No passages found' });
            }
        } else if (paper_check === 1) {
            // For expertreviewlog - JOIN with audiodb for question passages and finalPassageSubmit/textlogs for student answers
            query = `
                SELECT 
                    erl.student_id,
                    erl.subjectId,
                    erl.qset,
                    s.departmentId,
                    aud.textPassageA as ansPassageA,
                    aud.textPassageB as ansPassageB,
                    COALESCE(NULLIF(fps.passageA, ''), tl.texta) as passageA,
                    COALESCE(NULLIF(fps.passageB, ''), tl.textb) as passageB
                FROM ${tableName} erl
                JOIN students s ON erl.student_id = s.student_id
                JOIN audiodb aud ON erl.subjectId = aud.subjectId 
                    AND erl.qset = aud.qset 
                    AND erl.departmentId = aud.departmentId
                LEFT JOIN finalPassageSubmit fps ON erl.student_id = fps.student_id
                LEFT JOIN textlogs tl ON erl.student_id = tl.student_id
                WHERE erl.subjectId = ? 
                    AND erl.qset = ? 
                    AND erl.expertId = ? 
                    AND s.departmentId = ?
                ORDER BY erl.loggedin DESC
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, expertId, departmentId]);

            if (results.length > 0) {
                console.log(`Assigned student_id: ${results[0].student_id}, departmentId: ${results[0].departmentId}`);
                res.status(200).json({
                    student_id: results[0].student_id,
                    departmentId: results[0].departmentId,
                    passageA: results[0].passageA,
                    passageB: results[0].passageB,
                    ansPassageA: results[0].ansPassageA,
                    ansPassageB: results[0].ansPassageB
                });
            } else {
                res.status(404).json({ error: 'No assigned passages found for this department' });
            }
        } else if (super_mod === 1) {
            // For modreviewlog - JOIN with audiodb for question passages
            query = `
                SELECT 
                    mrl.student_id,
                    mrl.subjectId,
                    mrl.qset,
                    s.departmentId,
                    aud.textPassageA as ansPassageA,
                    aud.textPassageB as ansPassageB,
                    mrl.passageA,
                    mrl.passageB
                FROM ${tableName} mrl
                JOIN students s ON mrl.student_id = s.student_id
                JOIN audiodb aud ON mrl.subjectId = aud.subjectId 
                    AND mrl.qset = aud.qset 
                    AND s.departmentId = aud.departmentId
                WHERE mrl.subjectId = ? 
                    AND mrl.qset = ? 
                    AND mrl.expertId = ? 
                    AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, expertId, departmentId]);

            if (results.length > 0) {
                console.log(`Assigned student_id: ${results[0].student_id}, departmentId: ${results[0].departmentId}`);
                res.status(200).json(results[0]);
            } else {
                res.status(404).json({ error: 'No assigned passages found for this department' });
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

    // Get departmentId and examType from URL path parameters
    const { subjectId, qset, departmentId, examType } = req.params;
    const expertId = req.session.expertId;

    console.log(`Parameters: subjectId=${subjectId}, qset=${qset}, departmentId=${departmentId}, examType=${examType}, expertId=${expertId}`);

    const paper_check = req.session.paper_check;
    const super_mod = req.session.super_mod;
    const paper_mod = req.session.paper_mod;

    console.log(`paper_check=${paper_check}, super_mod=${super_mod}, paper_mod=${paper_mod}`);

    // Check paper_mod condition first
    if (paper_mod === 1) {
        console.log("paper_mod is 1, returning qset details without assigning student");
        return res.status(200).json({ 
            qset, 
            paper_mod, 
            departmentId: departmentId || null, 
            examType: examType || null 
        });
    }

    let tableName;

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

        // Updated queries to include departmentId filtering
        let checkExistingAssignmentQuery;
        if (tableName === 'expertreviewlog') {
            if (departmentId && departmentId !== 'undefined' && departmentId !== 'null') {
                checkExistingAssignmentQuery = `
                    SELECT 
                        erl.student_id, 
                        erl.loggedin, 
                        erl.status, 
                        erl.subm_done, 
                        erl.subm_time,
                        s.departmentId,
                        d.examType
                    FROM ${tableName} erl
                    JOIN students s ON erl.student_id = s.student_id
                    JOIN departmentdb d ON s.departmentId = d.departmentId
                    WHERE erl.subjectId = ? AND erl.qset = ? AND erl.expertId = ? AND s.departmentId = ? AND (erl.subm_done IS NULL OR erl.subm_done = 0)
                    LIMIT 1
                `;
            } else {
                checkExistingAssignmentQuery = `
                    SELECT 
                        erl.student_id, 
                        erl.loggedin, 
                        erl.status, 
                        erl.subm_done, 
                        erl.subm_time,
                        s.departmentId,
                        d.examType
                    FROM ${tableName} erl
                    JOIN students s ON erl.student_id = s.student_id
                    JOIN departmentdb d ON s.departmentId = d.departmentId
                    WHERE erl.subjectId = ? AND erl.qset = ? AND erl.expertId = ? AND (erl.subm_done IS NULL OR erl.subm_done = 0)
                    LIMIT 1
                `;
            }
        } else {
            if (departmentId && departmentId !== 'undefined' && departmentId !== 'null') {
                checkExistingAssignmentQuery = `
                    SELECT 
                        mrl.student_id, 
                        mrl.loggedin, 
                        mrl.status, 
                        mrl.subm_done, 
                        mrl.subm_time, 
                        mrl.QPA, 
                        mrl.QPB,
                        s.departmentId,
                        d.examType
                    FROM ${tableName} mrl
                    JOIN students s ON mrl.student_id = s.student_id
                    JOIN departmentdb d ON s.departmentId = d.departmentId
                    WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND s.departmentId = ? AND (mrl.subm_done IS NULL OR mrl.subm_done = 0)
                    LIMIT 1
                `;
            } else {
                checkExistingAssignmentQuery = `
                    SELECT 
                        mrl.student_id, 
                        mrl.loggedin, 
                        mrl.status, 
                        mrl.subm_done, 
                        mrl.subm_time, 
                        mrl.QPA, 
                        mrl.QPB,
                        s.departmentId,
                        d.examType
                    FROM ${tableName} mrl
                    JOIN students s ON mrl.student_id = s.student_id
                    JOIN departmentdb d ON s.departmentId = d.departmentId
                    WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND (mrl.subm_done IS NULL OR mrl.subm_done = 0)
                    LIMIT 1
                `;
            }
        }

        console.log("Checking existing assignment query:", checkExistingAssignmentQuery);
        
        let queryParams;
        if (departmentId && departmentId !== 'undefined' && departmentId !== 'null') {
            queryParams = [subjectId, qset, expertId, departmentId];
        } else {
            queryParams = [subjectId, qset, expertId];
        }
        
        const [existingAssignment] = await conn.query(checkExistingAssignmentQuery, queryParams);
        console.log("Existing assignment result:", existingAssignment);

        let student_id, loggedin, status, subm_done, subm_time, QPA, QPB, finalExamType, finalDepartmentId;

        if (existingAssignment.length > 0) {
            console.log("Existing active assignment found");
            ({ student_id, loggedin, status, subm_done, subm_time, departmentId: finalDepartmentId, examType: finalExamType } = existingAssignment[0]);
            if (tableName === 'modreviewlog') {
                ({ QPA, QPB } = existingAssignment[0]);
            }

            console.log(`Existing assignment - Student ID: ${student_id}, DepartmentId: ${finalDepartmentId}, ExamType: ${finalExamType}`);

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
            
            // Updated assign new student query to include department filtering
            let assignNewStudentQuery;
            if (departmentId && departmentId !== 'undefined' && departmentId !== 'null') {
                assignNewStudentQuery = `
                    UPDATE ${tableName} 
                    JOIN students s ON ${tableName}.student_id = s.student_id
                    SET ${tableName}.expertId = ?, ${tableName}.loggedin = NOW(), ${tableName}.status = 1, ${tableName}.subm_done = 0, ${tableName}.subm_time = NULL
                    WHERE ${tableName}.subjectId = ? AND ${tableName}.qset = ? AND ${tableName}.expertId IS NULL AND ${tableName}.student_id IS NOT NULL AND s.departmentId = ?
                    LIMIT 1
                `;
                const [assignResult] = await conn.query(assignNewStudentQuery, [expertId, subjectId, qset, departmentId]);
                
                if (assignResult.affectedRows > 0) {
                    const [newAssignment] = await conn.query(checkExistingAssignmentQuery, queryParams);
                    ({ student_id, loggedin, status, subm_done, subm_time, departmentId: finalDepartmentId, examType: finalExamType } = newAssignment[0]);
                    if (tableName === 'modreviewlog') {
                        ({ QPA, QPB } = newAssignment[0]);
                    }
                    console.log(`New assignment - Student ID: ${student_id}, DepartmentId: ${finalDepartmentId}, ExamType: ${finalExamType}`);
                } else {
                    await conn.rollback();
                    return res.status(400).json({ error: `No available students for this QSet in department ${departmentId}. All students are already assigned.` });
                }
            } else {
                assignNewStudentQuery = `
                    UPDATE ${tableName} 
                    SET expertId = ?, loggedin = NOW(), status = 1, subm_done = 0, subm_time = NULL
                    WHERE subjectId = ? AND qset = ? AND expertId IS NULL AND student_id IS NOT NULL
                    LIMIT 1
                `;
                const [assignResult] = await conn.query(assignNewStudentQuery, [expertId, subjectId, qset]);
                
                if (assignResult.affectedRows > 0) {
                    const [newAssignment] = await conn.query(checkExistingAssignmentQuery, queryParams);
                    ({ student_id, loggedin, status, subm_done, subm_time, departmentId: finalDepartmentId, examType: finalExamType } = newAssignment[0]);
                    if (tableName === 'modreviewlog') {
                        ({ QPA, QPB } = newAssignment[0]);
                    }
                    console.log(`New assignment - Student ID: ${student_id}, DepartmentId: ${finalDepartmentId}, ExamType: ${finalExamType}`);
                } else {
                    await conn.rollback();
                    return res.status(400).json({ error: 'No available students for this QSet. All students are already assigned.' });
                }
            }
        }

        // Check if QPA and QPB are already filled
        if (paper_check === 1){
            console.log("paper_check is 1, returning assignment details");
            await conn.commit();
            if (loggedin) {
                loggedin = moment(loggedin).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            }
            if (subm_time) {
                subm_time = moment(subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            }
            
            console.log(`Assignment completed for expertId: ${expertId}, student_id: ${student_id}, departmentId: ${finalDepartmentId}, examType: ${finalExamType}`);
            return res.status(200).json({ 
                qset, 
                student_id, 
                loggedin, 
                status, 
                subm_done, 
                subm_time, 
                departmentId: finalDepartmentId, 
                examType: finalExamType 
            });
        }
        else if(super_mod === 1){
            console.log("super_mod is 1, proceeding with QPA and QPB check");
            if (!QPA || !QPB) {
                console.log("QPA or QPB not filled, fetching ignore lists");
                
                // Updated fetchIgnoreListsQuery to include departmentId
                let fetchIgnoreListsQuery;
                if (finalDepartmentId) {
                    fetchIgnoreListsQuery = `
                        SELECT Q${qset}PA as QPA, Q${qset}PB as QPB
                        FROM modqsetdb
                        WHERE subjectId = ? AND departmentId = ?
                    `;
                    const [ignoreListsResult] = await conn.query(fetchIgnoreListsQuery, [subjectId, finalDepartmentId]);
                    
                    if (ignoreListsResult.length === 0) {
                        await conn.rollback();
                        return res.status(404).json({ error: `Ignore lists not found for this subject and qset in department ${finalDepartmentId}` });
                    }
                    
                    QPA = QPA || ignoreListsResult[0].QPA;
                    QPB = QPB || ignoreListsResult[0].QPB;
                } else {
                    fetchIgnoreListsQuery = `
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
                }

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
            if (loggedin) {
                loggedin = moment(loggedin).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            }
            if (subm_time) {
                subm_time = moment(subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            }
            
            console.log(`Assignment completed for expertId: ${expertId}, student_id: ${student_id}, departmentId: ${finalDepartmentId}, examType: ${finalExamType}`);
            console.log("Sending response:", { qset, student_id, loggedin, status, subm_done, subm_time, QPA, QPB, departmentId: finalDepartmentId, examType: finalExamType });
            res.status(200).json({ 
                qset, 
                student_id, 
                loggedin, 
                status, 
                subm_done, 
                subm_time, 
                QPA, 
                QPB, 
                departmentId: finalDepartmentId, 
                examType: finalExamType 
            });            
        }

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error assigning student for QSet:", err);
        res.status(500).json({ error: 'Error assigning student for QSet', details: err.message });
    } finally {
        if (conn) conn.release();
        console.log("Connection released");
    }
};

// Ignore list management routes
// 1. Updated getIgnoreList function
exports.getIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, departmentId } = req.body;
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
    if (!subjectId || !qset || !activePassage || !departmentId) {
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, departmentId)' });
    }

    if (paper_check === 1 || paper_mod === 1){ 
        try {
            // Ensure qsetdb entries exist for this departmentId
            await ensureQsetdbEntryForSubject(departmentId, subjectId);

            const columnName = `Q${qset}P${activePassage}`;
            
            const query = `
                SELECT ${columnName} AS ignoreList
                FROM ${tableName}
                WHERE subjectId = ? AND departmentId = ?
            `;
            
            const [results] = await connection.query(query, [subjectId, departmentId]);
            
            if (results.length > 0 && results[0].ignoreList) {
                const ignoreList = results[0].ignoreList.split(',').map(item => item.trim());
                console.log(`Fetched ignore list for subjectId: ${subjectId}, departmentId: ${departmentId}, qset: ${qset}, activePassage: ${activePassage}`);
                console.log(ignoreList);
                res.status(200).json({ ignoreList });
            } else {
                res.status(404).json({ error: 'No ignore list found' });
            }
        } catch (err) {
            console.error("Error fetching ignore list:", err);
            res.status(500).json({ error: 'Error fetching ignore list' });
        }
    }
    else if (super_mod === 1){ 
        try {
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            const query = `
                SELECT mrl.${columnName} AS ignoreList, mrl.student_id, s.departmentId
                FROM modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
            `;
            
            const [results] = await connection.query(query, [subjectId, qset, expertId, departmentId]);
    
            if (results.length > 0) {
                const { ignoreList, student_id } = results[0];
                
                if (ignoreList) {
                    const ignoreListArray = ignoreList.split(',').map(item => item.trim());
                    
                    console.log(`Fetched ignore list for expertId: ${expertId}, student_id: ${student_id}, subjectId: ${subjectId}, departmentId: ${departmentId}, qset: ${qset}, activePassage: ${activePassage}`);
                    console.log(`Ignore list: ${ignoreListArray.join(', ')}`);
                    
                    res.status(200).json({ 
                        ignoreList: ignoreListArray,
                        debug: {
                            expertId,
                            student_id,
                            subjectId,
                            departmentId,
                            qset,
                            activePassage,
                            table: 'modreviewlog',
                            column: columnName
                        }
                    });
                } else {
                    res.status(404).json({ 
                        error: 'No ignore list found',
                        debug: {
                            expertId,
                            student_id,
                            subjectId,
                            departmentId,
                            qset,
                            activePassage,
                            table: 'modreviewlog',
                            column: columnName
                        }
                    });
                }
            } else {
                res.status(404).json({ 
                    error: 'No record found',
                    debug: {
                        expertId,
                        subjectId,
                        departmentId,
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

// 2. Updated getStudentIgnoreList function
exports.getStudentIgnoreList = async (req, res) => {
    console.log("=== getStudentIgnoreList function called ===");
    console.log("Session expertId:", req.session.expertId);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    if (!req.session.expertId) {
        console.log("❌ Unauthorized: No expertId in session");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, studentId, departmentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !studentId || !departmentId) {
        const missingParams = [];
        if (!subjectId) missingParams.push('subjectId');
        if (!qset) missingParams.push('qset');
        if (!activePassage) missingParams.push('activePassage');
        if (!studentId) missingParams.push('studentId');
        if (!departmentId) missingParams.push('departmentId');
        
        console.log(`❌ Missing required parameters: ${missingParams.join(', ')}`);
        return res.status(400).json({ 
            error: 'Missing required parameters',
            missing: missingParams
        });
    }

    console.log(`Processing for expertId: ${expertId}, subjectId: ${subjectId}, departmentId: ${departmentId}, studentId: ${studentId}, qset: ${qset}, activePassage: ${activePassage}`);

    if (expertId === 8) {
        console.log("📋 Processing with qsetdb table (expertId = 8)");
        try {
            // Ensure qsetdb entries exist for this departmentId
            await ensureQsetdbEntryForSubject(departmentId, subjectId);

            const columnName = `Q${qset}P${activePassage}`;
            console.log(`Using column: ${columnName}`);
            
            const query = `
                SELECT ${columnName} AS ignoreList
                FROM qsetdb
                WHERE subjectId = ? AND departmentId = ?
            `;
            
            console.log(`Executing query: ${query} with params: [${subjectId}, ${departmentId}]`);
            
            const [results] = await connection.query(query, [subjectId, departmentId]);
            console.log(`Query returned ${results.length} results`);

            if (results.length > 0) {
                console.log(`First result: ${JSON.stringify(results[0])}`);
                
                if (results[0].ignoreList) {
                    const ignoreList = results[0].ignoreList.split(',').map(item => item.trim());
                    console.log(`✅ Fetched ignore list for subjectId: ${subjectId}, departmentId: ${departmentId}`);
                    console.log(`📋 Ignore list content: ${ignoreList.join(', ')}`);
                    console.log(`👥 Number of students in ignore list: ${ignoreList.length}`);
                    
                    res.status(200).json({ 
                        ignoreList,
                        debug: {
                            source: 'qsetdb',
                            column: columnName,
                            count: ignoreList.length
                        }
                    });
                } else {
                    console.log(`⚠️  Column ${columnName} exists but is NULL or empty`);
                    res.status(200).json({ 
                        ignoreList: [],
                        debug: {
                            source: 'qsetdb',
                            column: columnName,
                            status: 'column_exists_but_null'
                        }
                    });
                }
            } else {
                console.log(`❌ No records found in qsetdb for subjectId: ${subjectId}, departmentId: ${departmentId}`);
                res.status(404).json({ 
                    error: 'No ignore list found',
                    debug: {
                        source: 'qsetdb',
                        queryParams: { subjectId, departmentId }
                    }
                });
            }
        } catch (err) {
            console.error("❌ Error fetching ignore list from qsetdb:", err);
            res.status(500).json({ 
                error: 'Error fetching ignore list',
                details: err.message 
            });
        }
    }
    else if (expertId === 100 || expertId === 101) {
        console.log("📋 Processing with modreviewlog table (expertId = 100 or 101)");
        try {
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            console.log(`Using column: ${columnName}`);
            
            const query = `
                SELECT mrl.${columnName} AS ignoreList, mrl.student_id, s.departmentId
                FROM modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.student_id = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
            `;
            
            console.log(`Executing query: ${query} with params: [${subjectId}, ${qset}, ${studentId}, ${departmentId}]`);
            
            const [results] = await connection.query(query, [subjectId, qset, studentId, departmentId]);
            console.log(`Query returned ${results.length} results`);

            if (results.length > 0) {
                const { ignoreList, student_id } = results[0];
                console.log(`Found record for student_id: ${student_id}`);
                console.log(`Raw ignoreList value: '${ignoreList}'`);
                
                const ignoreListArray = ignoreList ? ignoreList.split(',').map(item => item.trim()) : [];
                
                console.log(`✅ Fetched ignore list for expertId: ${expertId}, student_id: ${student_id}`);
                console.log(`📋 Ignore list content: ${ignoreListArray.join(', ')}`);
                console.log(`👥 Number of students in ignore list: ${ignoreListArray.length}`);
                
                res.status(200).json({ 
                    ignoreList: ignoreListArray,
                    debug: {
                        expertId,
                        student_id,
                        subjectId,
                        departmentId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName,
                        count: ignoreListArray.length,
                        rawValue: ignoreList
                    }
                });
            } else {
                console.log(`❌ No records found in modreviewlog for the given criteria`);
                console.log(`Checking if student exists in students table...`);
                
                // Additional check to see if student exists
                const studentCheckQuery = `SELECT * FROM students WHERE student_id = ? AND departmentId = ?`;
                const [studentResults] = await connection.query(studentCheckQuery, [studentId, departmentId]);
                
                console.log(`Student exists check: ${studentResults.length > 0 ? 'YES' : 'NO'}`);
                
                res.status(404).json({ 
                    error: 'No record found',
                    debug: {
                        expertId,
                        subjectId,
                        departmentId,
                        qset,
                        activePassage,
                        studentId,
                        studentExists: studentResults.length > 0,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            }
        } catch (err) {
            console.error("❌ Error fetching ignore list from modreviewlog:", err);
            res.status(500).json({ 
                error: 'Error fetching ignore list',
                details: err.message 
            });
        }
    } else {
        console.log(`❌ Unhandled expertId: ${expertId}`);
        res.status(400).json({ 
            error: 'Unsupported expertId',
            expertId: expertId 
        });
    }
    
    console.log("=== getStudentIgnoreList function completed ===");
};

// 3. Updated addToIgnoreList function
exports.addToIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, newWord, departmentId } = req.body;
    console.log("Request body for addToIgnoreList:", req.body);
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord || !departmentId) {
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, newWord, departmentId)' });
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
            // Ensure qsetdb entries exist for this departmentId
            await ensureQsetdbEntryForSubject(departmentId, subjectId);

            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM ${tableName}
                WHERE subjectId = ? AND departmentId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, departmentId]);
    
            let currentIgnoreList = [];
            if (results.length > 0 && results[0].ignoreList) {
              currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            }
    
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
            }
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE ${tableName}
                SET ${columnName} = ?
                WHERE subjectId = ? AND departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, departmentId]);
            
            await conn.commit();
            console.log(`Word added to ignore list for subjectId: ${subjectId}, departmentId: ${departmentId}, qset: ${qset}, activePassage: ${activePassage}`);
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
            
            const selectQuery = `
                SELECT mrl.${columnName} AS ignoreList, mrl.student_id, s.departmentId
                FROM modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, expertId, departmentId]);
    
            let currentIgnoreList = [];
            let student_id = null;
            if (results.length > 0) {
                if (results[0].ignoreList) {
                    currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
                }
                student_id = results[0].student_id;
            }
    
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
                console.log(`Word added: ${newWord} for departmentId: ${departmentId}`);
            } else {
                console.log(`Word "${newWord}" already exists in the ignore list for departmentId: ${departmentId}. No changes made.`);
            }
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                SET mrl.${columnName} = ?
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND mrl.student_id = ? AND s.departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, expertId, student_id, departmentId]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word added to ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    departmentId,
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

// 4. Updated addToStudentIgnoreList function
exports.addToStudentIgnoreList = async (req, res) => {
    console.log("Received data:", req.body);
    const { activePassage, newWord, subjectId, qset, studentId, departmentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord || !studentId || !departmentId) {
        console.log("Missing parameters:", { subjectId, qset, activePassage, newWord, studentId, departmentId });
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, newWord, studentId, departmentId)' });
    }

    let conn;

    if(expertId === 8){
        try {
            // Ensure qsetdb entries exist for this departmentId
            await ensureQsetdbEntryForSubject(departmentId, subjectId);

            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM qsetdb
                WHERE subjectId = ? AND departmentId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, departmentId]);
    
            let currentIgnoreList = [];
            if (results.length > 0 && results[0].ignoreList) {
              currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            }
    
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
            }
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE qsetdb
                SET ${columnName} = ?
                WHERE subjectId = ? AND departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, departmentId]);
            
            await conn.commit();
            console.log(`Word added to student ignore list for subjectId: ${subjectId}, departmentId: ${departmentId}, studentId: ${studentId}`);
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
            
            const selectQuery = `
                SELECT mrl.${columnName} AS ignoreList, mrl.student_id, s.departmentId
                FROM modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.student_id = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, studentId, departmentId]);
    
            let currentIgnoreList = [];
            let student_id = null;
            if (results.length > 0) {
                if (results[0].ignoreList) {
                    currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
                }
                student_id = results[0].student_id;
            }
    
            if (!currentIgnoreList.includes(newWord)) {
                currentIgnoreList.unshift(newWord);
                console.log(`Word added: ${newWord} for departmentId: ${departmentId}, studentId: ${studentId}`);
            } else {
                console.log(`Word "${newWord}" already exists in the ignore list for departmentId: ${departmentId}, studentId: ${studentId}. No changes made.`);
            }
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                SET mrl.${columnName} = ?
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.student_id = ? AND s.departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, student_id, departmentId]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word added to ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    departmentId,
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
        console.log("Stage parameters inaccessible");
        return res.status(403).json({error: 'Stage parameters inaccessible'})
    }
};

// 5. Updated removeFromIgnoreList function
exports.removeFromIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log("remove from Ignore List called");
    const { subjectId, qset, activePassage, wordToRemove, departmentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove || !departmentId) {
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, wordToRemove, departmentId)' });
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
            // Ensure qsetdb entries exist for this departmentId
            await ensureQsetdbEntryForSubject(departmentId, subjectId);

            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM ${tableName} 
                WHERE subjectId = ? AND departmentId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, departmentId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
    
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE ${tableName}
                SET ${columnName} = ?
                WHERE subjectId = ? AND departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, departmentId]);
            
            await conn.commit();
            console.log(`Word removed from ignore list for subjectId: ${subjectId}, departmentId: ${departmentId}, qset: ${qset}, activePassage: ${activePassage}`);
    
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
            
            const selectQuery = `
                SELECT mrl.${columnName} AS ignoreList, mrl.student_id, s.departmentId
                FROM modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, expertId, departmentId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            const student_id = results[0].student_id;
    
            const initialLength = currentIgnoreList.length;
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            if (currentIgnoreList.length < initialLength) {
                console.log(`Word removed: ${wordToRemove} for departmentId: ${departmentId}`);
            } else {
                console.log(`Word "${wordToRemove}" not found in the ignore list for departmentId: ${departmentId}. No changes made.`);
            }
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                SET mrl.${columnName} = ?
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND mrl.student_id = ? AND s.departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, expertId, student_id, departmentId]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word removed from ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    departmentId,
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

// 6. Updated removeFromStudentIgnoreList function
exports.removeFromStudentIgnoreList = async (req, res) => {
    const { subjectId, qset, activePassage, wordToRemove, studentId, departmentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove || !studentId || !departmentId) {
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, wordToRemove, studentId, departmentId)' });
    }

    let conn;
    if(expertId === 8){
        try {
            // Ensure qsetdb entries exist for this departmentId
            await ensureQsetdbEntryForSubject(departmentId, subjectId);

            conn = await connection.getConnection();
            await conn.beginTransaction();
    
            const columnName = `Q${qset}P${activePassage}`;
            
            const selectQuery = `
                SELECT ${columnName} AS ignoreList
                FROM qsetdb 
                WHERE subjectId = ? AND departmentId = ?
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, departmentId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
    
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE qsetdb
                SET ${columnName} = ?
                WHERE subjectId = ? AND departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, departmentId]);
            
            await conn.commit();
            console.log(`Word removed from student ignore list for subjectId: ${subjectId}, departmentId: ${departmentId}, studentId: ${studentId}`);
    
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
            
            const selectQuery = `
                SELECT mrl.${columnName} AS ignoreList, mrl.student_id, s.departmentId
                FROM modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.student_id = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
                FOR UPDATE
            `;
            
            const [results] = await conn.query(selectQuery, [subjectId, qset, studentId, departmentId]);
    
            if (results.length === 0 || !results[0].ignoreList) {
                await conn.rollback();
                return res.status(404).json({ error: 'No ignore list found' });
            }
    
            let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            const student_id = results[0].student_id;
    
            const initialLength = currentIgnoreList.length;
            currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());
    
            if (currentIgnoreList.length < initialLength) {
                console.log(`Word removed: ${wordToRemove} for departmentId: ${departmentId}, studentId: ${studentId}`);
            } else {
                console.log(`Word "${wordToRemove}" not found in the ignore list for departmentId: ${departmentId}, studentId: ${studentId}. No changes made.`);
            }
    
            const updatedIgnoreList = currentIgnoreList.join(', ');
    
            const updateQuery = `
                UPDATE modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                SET mrl.${columnName} = ?
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.student_id = ? AND s.departmentId = ?
            `;
    
            await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, student_id, departmentId]);
            
            await conn.commit();
    
            res.status(200).json({ 
                message: 'Word removed from ignore list', 
                ignoreList: currentIgnoreList,
                debug: {
                    expertId,
                    student_id,
                    subjectId,
                    departmentId,
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

// 7. Updated clearIgnoreList function
exports.clearIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, departmentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !departmentId) {
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, departmentId)' });
    }

    try {
        const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
        
        const query = `
            UPDATE modreviewlog mrl
            JOIN students s ON mrl.student_id = s.student_id
            SET mrl.${columnName} = NULL
            WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.expertId = ? AND s.departmentId = ?
            ORDER BY mrl.loggedin DESC
            LIMIT 1
        `;
        
        const [result] = await connection.query(query, [subjectId, qset, expertId, departmentId]);

        if (result.affectedRows > 0) {
            console.log(`Cleared ignore list for expertId: ${expertId}, subjectId: ${subjectId}, departmentId: ${departmentId}, qset: ${qset}, activePassage: ${activePassage}`);
            
            res.status(200).json({ 
                message: 'Ignore list cleared successfully',
                debug: {
                    expertId,
                    subjectId,
                    departmentId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        } else {
            res.status(404).json({ 
                error: 'No record found to clear',
                debug: {
                    expertId,
                    subjectId,
                    departmentId,
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

// 8. Updated clearStudentIgnoreList function
exports.clearStudentIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, studentId, departmentId } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !studentId || !departmentId) {
        return res.status(400).json({ error: 'Missing required parameters (subjectId, qset, activePassage, studentId, departmentId)' });
    } 

    if (expertId === 100){
        try {
            const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
            
            const query = `
                UPDATE modreviewlog mrl
                JOIN students s ON mrl.student_id = s.student_id
                SET mrl.${columnName} = NULL
                WHERE mrl.subjectId = ? AND mrl.qset = ? AND mrl.student_id = ? AND s.departmentId = ?
                ORDER BY mrl.loggedin DESC
                LIMIT 1
            `;
            
            const [result] = await connection.query(query, [subjectId, qset, studentId, departmentId]);
    
            if (result.affectedRows > 0) {
                console.log(`Cleared student ignore list for expertId: ${expertId}, subjectId: ${subjectId}, departmentId: ${departmentId}, studentId: ${studentId}, qset: ${qset}, activePassage: ${activePassage}`);
                
                res.status(200).json({ 
                    message: 'Ignore list cleared successfully',
                    debug: {
                        expertId,
                        subjectId,
                        departmentId,
                        studentId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            } else {
                res.status(404).json({ 
                    error: 'No record found to clear',
                    debug: {
                        expertId,
                        subjectId,
                        departmentId,
                        studentId,
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

// this function fetches model answer audio for a given subjectId and qset
exports.modelAnswerAudio = async(req, res) => {
    console.log("modelAnswerAudio called with params:", req.params);
    console.log("Session expertId:", req.session.expertId);

    if (!req.session.expertId){
        console.log("Unauthorized access attempt - no expertId in session");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, departmentId } = req.params;
    console.log(`Extracted parameters - subjectId: ${subjectId}, qset: ${qset}, departmentId: ${departmentId || 'none'}`);

    let conn;

    try{
        conn = await connection.getConnection();
        console.log("Database connection established");

        // Updated query to include departmentId filtering on BOTH tables
        let audioQuery;
        let queryParams;
        
        if (departmentId) {
            console.log("Using query with departmentId filter");
            audioQuery = `
                SELECT DISTINCT a.subjectId, a.qset, a.passage1, a.passage2, a.departmentId
                FROM audiodb a
                JOIN students s ON a.subjectId = s.subjectsId
                WHERE a.subjectId = ? AND a.qset = ? AND a.departmentId = ? AND s.departmentId = ?
                LIMIT 1
            `;
            queryParams = [subjectId, qset, departmentId, departmentId];
        } else {
            console.log("Using basic query without department filter");
            audioQuery = `
                SELECT subjectId, qset, passage1, passage2, departmentId
                FROM audiodb 
                WHERE subjectId = ? AND qset = ?
                LIMIT 1
            `;
            queryParams = [subjectId, qset];
        }

        console.log("Executing query:", audioQuery);
        console.log("With parameters:", queryParams);

        const [audioResults] = await conn.query(audioQuery, queryParams);
        console.log(`Query executed successfully. Found ${audioResults.length} results`);
        
        if (audioResults.length === 0) {
            console.log("No audio results found for the given criteria");
            return res.status(404).json({ error: 'No Audio found for this subject and qset' });
        }

        const audioData = audioResults[0];
        console.log("Audio data retrieved:", {
            subjectId: audioData.subjectId,
            qset: audioData.qset,
            departmentId: audioData.departmentId, // Added for debugging
            passage1: audioData.passage1,
            passage2: audioData.passage2,
            passage1Type: typeof audioData.passage1,
            passage1Length: audioData.passage1 ? audioData.passage1.length : 0
        });

        // Detailed logging for passage1 value
        console.log("=== PASSAGE1 DETAILED ANALYSIS ===");
        console.log("passage1 value:", audioData.passage1);
        console.log("passage1 is null:", audioData.passage1 === null);
        console.log("passage1 is undefined:", audioData.passage1 === undefined);
        console.log("passage1 is empty string:", audioData.passage1 === "");
        console.log("passage1 data type:", typeof audioData.passage1);
        
        if (audioData.passage1) {
            console.log("passage1 content length:", audioData.passage1.length);
            console.log("passage1 first 100 characters:", audioData.passage1.substring(0, 100));
        } else {
            console.log("passage1 is falsy - may need to check database for correct values");
        }
        console.log("==================================");

        console.log(`Successfully fetched audio for subjectId: ${subjectId}, qset: ${qset}, departmentId: ${departmentId || 'all'}`);
        res.status(200).json(audioData);
    } catch (err) {
        console.error("Error fetching the audio:", err.message);
        console.error("Error stack:", err.stack);
        console.error("Error details:", err);
        res.status(500).json({ error: 'Error fetching the audio' });
    } finally {
        if (conn) {
            conn.release();
            console.log("Database connection released");
        }
    }
};

exports.modelAnswerAudioById = async(req, res) => {
    console.log("modelAnswerAudio called with params:", req.params);
    console.log("Session expertId:", req.session.expertId);

    if (!req.session.expertId){
        console.log("Unauthorized access attempt - no expertId in session");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, studentId, departmentId } = req.params;
    console.log(`Extracted parameters - subjectId: ${subjectId}, qset: ${qset}, studentId: ${studentId || 'none'}, departmentId: ${departmentId || 'none'}`);

    let conn;

    try{
        conn = await connection.getConnection();
        console.log("Database connection established");

        // Updated query to include departmentId filtering on BOTH tables
        let audioQuery;
        let queryParams;
        
        if (departmentId && studentId) {
            console.log("Using query with both departmentId and studentId filters");
            audioQuery = `
                SELECT DISTINCT a.subjectId, a.qset, a.passage1, a.passage2, a.departmentId
                FROM audiodb a
                JOIN students s ON a.subjectId = s.subjectsId
                WHERE a.subjectId = ? AND a.qset = ? AND a.departmentId = ? AND s.student_id = ? AND s.departmentId = ?
                LIMIT 1
            `;
            queryParams = [subjectId, qset, departmentId, studentId, departmentId];
        } else if (studentId) {
            console.log("Using query with studentId filter only");
            audioQuery = `
                SELECT DISTINCT a.subjectId, a.qset, a.passage1, a.passage2, a.departmentId
                FROM audiodb a
                JOIN students s ON a.subjectId = s.subjectsId
                WHERE a.subjectId = ? AND a.qset = ? AND s.student_id = ?
                LIMIT 1
            `;
            queryParams = [subjectId, qset, studentId];
        } else {
            console.log("Using basic query without student/department filters");
            audioQuery = `
                SELECT subjectId, qset, passage1, passage2, departmentId
                FROM audiodb 
                WHERE subjectId = ? AND qset = ?
                LIMIT 1
            `;
            queryParams = [subjectId, qset];
        }

        console.log("Executing query:", audioQuery);
        console.log("With parameters:", queryParams);

        const [audioResults] = await conn.query(audioQuery, queryParams);
        console.log(`Query executed successfully. Found ${audioResults.length} results`);
        
        if (audioResults.length === 0) {
            console.log("No audio results found for the given criteria");
            return res.status(404).json({ error: 'No Audio found for this subject, qset, and student' });
        }

        const audioData = audioResults[0];
        console.log("Audio data retrieved:", {
            subjectId: audioData.subjectId,
            qset: audioData.qset,
            departmentId: audioData.departmentId, // Added this for debugging
            passage1: audioData.passage1,
            passage2: audioData.passage2,
            passage1Type: typeof audioData.passage1,
            passage1Length: audioData.passage1 ? audioData.passage1.length : 0
        });

        // Detailed logging for passage1 value
        console.log("=== PASSAGE1 DETAILED ANALYSIS ===");
        console.log("passage1 value:", audioData.passage1);
        console.log("passage1 is null:", audioData.passage1 === null);
        console.log("passage1 is undefined:", audioData.passage1 === undefined);
        console.log("passage1 is empty string:", audioData.passage1 === "");
        console.log("passage1 data type:", typeof audioData.passage1);
        
        if (audioData.passage1) {
            console.log("passage1 content length:", audioData.passage1.length);
            console.log("passage1 first 100 characters:", audioData.passage1.substring(0, 100));
        } else {
            console.log("passage1 is falsy - may need to check database for correct values");
        }
        console.log("==================================");

        console.log(`Successfully fetched audio for subjectId: ${subjectId}, qset: ${qset}`);
        res.status(200).json(audioData);
    } catch (err) {
        console.error("Error fetching the audio:", err.message);
        console.error("Error stack:", err.stack);
        console.error("Error details:", err);
        res.status(500).json({ error: 'Error fetching the audio' });
    } finally {
        if (conn) {
            conn.release();
            console.log("Database connection released");
        }
    }
};

// Passage review submission function
exports.submitPassageReview = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, departmentId } = req.params;
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
        res.status(403).json({error: 'Stage parameters inaccessible in submitPassageReview'});
    }

    let conn;

    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        // Updated fetch assignment query to include departmentId filtering
        let fetchAssignmentQuery;
        if (departmentId) {
            fetchAssignmentQuery = `
                SELECT ${tableName}.student_id
                FROM ${tableName}
                JOIN students s ON ${tableName}.student_id = s.student_id
                WHERE ${tableName}.subjectId = ? AND ${tableName}.qset = ? AND ${tableName}.expertId = ? AND ${tableName}.status = 1 AND ${tableName}.subm_done = 0 AND s.departmentId = ?
                ORDER BY ${tableName}.loggedin DESC
                LIMIT 1
            `;
            const [assignmentResult] = await conn.query(fetchAssignmentQuery, [subjectId, qset, expertId, departmentId]);
            
            if (assignmentResult.length === 0) {
                await conn.rollback();
                return res.status(404).json({ error: `No active assignment found for this expert in department ${departmentId}` });
            }

            const studentId = assignmentResult[0].student_id;

            // Update the review log table for the specific student
            const updateQuery = `
                UPDATE ${tableName} 
                JOIN students s ON ${tableName}.student_id = s.student_id
                SET ${tableName}.subm_done = 1, ${tableName}.subm_time = NOW()
                WHERE ${tableName}.subjectId = ? AND ${tableName}.qset = ? AND ${tableName}.expertId = ? AND ${tableName}.student_id = ? AND ${tableName}.status = 1 AND s.departmentId = ?
            `;
            const [updateResult] = await conn.query(updateQuery, [subjectId, qset, expertId, studentId, departmentId]);

            if (updateResult.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'No matching record found to update' });
            }

            // Fetch the updated record
            const selectQuery = `
                SELECT ${tableName}.student_id, ${tableName}.subm_done, ${tableName}.subm_time, s.departmentId
                FROM ${tableName}
                JOIN students s ON ${tableName}.student_id = s.student_id
                WHERE ${tableName}.subjectId = ? AND ${tableName}.qset = ? AND ${tableName}.expertId = ? AND ${tableName}.student_id = ? AND s.departmentId = ?
            `;
            const [results] = await conn.query(selectQuery, [subjectId, qset, expertId, studentId, departmentId]);

            if (results.length === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'Updated record not found' });
            }

            await conn.commit();
            if (results[0].subm_time) {
                results[0].subm_time = moment(results[0].subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            }
            
            console.log(`Passage review submitted for expertId: ${expertId}, studentId: ${studentId}, departmentId: ${departmentId}`);
            res.status(200).json(results[0]);
        } else {
            // Original logic without department filtering
            fetchAssignmentQuery = `
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
            if (results[0].subm_time) {
                results[0].subm_time = moment(results[0].subm_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            }
            res.status(200).json(results[0]);
        }
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error submitting passage review:", err);
        res.status(500).json({ error: 'Error submitting passage review' });
    } finally {
        if (conn) conn.release();
    }
};

// Get student passages from expertreviewlog with filters
exports.getStudentPassagesWithFilters = async (req, res) => {
    const { 
        student_id, 
        subjectId, 
        examType, 
        qset, 
        departmentId, 
        expertId, 
        subm_done,
        table 
    } = req.query;

    console.log("getStudentPassages called with filters:", req.query);

    // Validate table parameter
    if (!table || (table !== 'expertreviewlog' && table !== 'modreviewlog')) {
        return res.status(400).json({ 
            error: 'Invalid or missing table parameter. Must be either "expertreviewlog" or "modreviewlog"' 
        });
    }

    try {
        // Build the WHERE clause dynamically based on provided filters
        let whereClauses = [];
        let queryParams = [];

        if (student_id && student_id !== 'All') {
            whereClauses.push('e.student_id = ?');
            queryParams.push(student_id);
        }

        if (subjectId) {
            whereClauses.push('e.subjectId = ?');
            queryParams.push(subjectId);
        }

        if (examType) {
            whereClauses.push('e.examType = ?');
            queryParams.push(examType);
        }

        if (qset) {
            whereClauses.push('e.qset = ?');
            queryParams.push(qset);
        }

        if (departmentId) {
            whereClauses.push('e.departmentId = ?');
            queryParams.push(departmentId);
        }

        if (expertId) {
            whereClauses.push('e.expertId = ?');
            queryParams.push(expertId);
        }

        if (subm_done !== undefined && subm_done !== null && subm_done !== '') {
            whereClauses.push('e.subm_done = ?');
            queryParams.push(subm_done);
        }

        const whereClause = whereClauses.length > 0 
            ? 'WHERE ' + whereClauses.join(' AND ') 
            : '';

        // Helper function to generate CASE statements for qsetdb columns
        const generateQSetCaseStatement = (passage, maxQSets = 8) => {
            const cases = [];
            for (let i = 1; i <= maxQSets; i++) {
                cases.push(`WHEN ${i} THEN q.Q${i}P${passage}`);
            }
            return `CASE e.qset\n                        ${cases.join('\n                        ')}\n                    END AS QP${passage}`;
        };

        // Build query with dynamic table name - always includes ignored words
        const query = `
            SELECT 
                e.id,
                e.student_id,
                e.subjectId,
                s.subject_name,
                e.examType,
                e.qset,
                e.departmentId,
                e.expertId,
                e.subm_done,
                COALESCE(t.texta, f.passageA) AS passageA,
                COALESCE(t.textb, f.passageB) AS passageB,
                aud.textPassageA AS ansPassageA,
                aud.textPassageB AS ansPassageB,
                ${generateQSetCaseStatement('A')},
                ${generateQSetCaseStatement('B')}
            FROM 
                ${table} e
            LEFT JOIN 
                subjectsdb s 
                    ON e.subjectId = s.subjectId 
                    AND e.examType = s.examType
            LEFT JOIN 
                textlogs t ON e.student_id = t.student_id
            LEFT JOIN 
                finalPassageSubmit f ON e.student_id = f.student_id
            LEFT JOIN 
                audiodb aud ON e.subjectId = aud.subjectId 
                    AND e.qset = aud.qset 
                    AND e.departmentId = aud.departmentId
            LEFT JOIN 
                qsetdb q ON e.subjectId = q.subjectId 
                    AND e.departmentId = q.departmentId
            ${whereClause}
            ORDER BY 
                e.id ASC
        `;


        console.log("Executing query for table:", table);
        console.log("With parameters:", queryParams);

        const [results] = await connection.query(query, queryParams);

        console.log(`Found ${results.length} records from ${table}`);
        
        // Get count of appeared students if departmentId is provided
        let appearedStudents = 0;
        let subjectWiseCount = [];
        
        if (departmentId) {
            // Total appeared students
            const countQuery = `
                SELECT COUNT(*) as count 
                FROM students 
                WHERE departmentId = ? AND batchNo != 100
            `;
            const [countResult] = await connection.query(countQuery, [departmentId]);
            appearedStudents = countResult[0].count;
            console.log(`Found ${appearedStudents} appeared students in department ${departmentId}`);

            // Subject-wise count of students
            const subjectIdsQuery = `
                SELECT DISTINCT subjectId 
                FROM audiodb 
                WHERE departmentId = ?
                ORDER BY subjectId
            `;
            const [subjectIds] = await connection.query(subjectIdsQuery, [departmentId]);
            
            for (const row of subjectIds) {
                const subjectCountQuery = `
                    SELECT COUNT(student_id) as count 
                    FROM students 
                    WHERE subjectsId = ? AND departmentId = ? AND batchNo != 100
                `;
                const [subjectCountResult] = await connection.query(subjectCountQuery, [row.subjectId, departmentId]);
                subjectWiseCount.push({
                    subjectId: row.subjectId,
                    count: subjectCountResult[0].count
                });
            }
            console.log(`Subject-wise count:`, subjectWiseCount);
        }
        
        res.status(200).json({
            success: true,
            count: results.length,
            table: table,
            appeared_students: appearedStudents,
            subject_wise_count: subjectWiseCount,
            data: results
        });

    } catch (err) {
        console.error("Error fetching student passages:", err);
        res.status(500).json({ 
            error: 'Error fetching student passages',
            details: err.message 
        });
    }
};

