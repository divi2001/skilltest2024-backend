const connection = require("../../config/db1")

exports.getAllExperts = async (req, res) => {

    try {
        let query = `select * from expertdb`;

        const [results] = await connection.query(query);

        if (results.length === 0) {
            return res.status(404).json({ "message": "No expert review logs found for this department" });
        }

        res.status(201).json({ "message": "experts fethed successfully", results });
    } catch (error) {
        console.log("error fetching experts", error);
        res.status(500).json({ "message": "Internal Server Error" });
    }
}

exports.updateExpertsdb = async (req, res) => {

    const { experts, paper_check, paper_mod, super_mod, updateAll } = req.body;


    const fieldsToUpdate = [];
    const values = [];
    if (paper_check !== undefined) {
        fieldsToUpdate.push('paper_check = ?');
        values.push(paper_check);
    }
    if (paper_mod !== undefined) {
        fieldsToUpdate.push('paper_mod = ?');
        values.push(paper_mod);
    }
    if (super_mod !== undefined) {
        fieldsToUpdate.push('super_mod = ?');
        values.push(super_mod);
    }

    // Validate input
    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update" });
    }
    try {
        let query = 'UPDATE expertdb SET ' + fieldsToUpdate.join(', ');
        if (!updateAll && (!experts || experts.length === 0)) {
            return res.status(400).json({ message: "No experts specified for update" });
        }
        if (!updateAll) {
            query += ' WHERE expertId IN (?)';
            values.push(experts);
        }

        const [result] = await connection.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No experts found or no changes made" });
        }

        res.status(200).json({
            message: `Successfully updated ${result.affectedRows} expert(s)`,
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Error updating expert fields:', error);
        res.status(500).json({ message: "Internal Server error" });
    }

}

exports.insertExpert = async (req, res) => {
    const { password, expert_name, expertId } = req.body;

    // Validate input
    if (!password || !expert_name) {
        return res.status(400).json({ message: "Both password and expert_name are required" });
    }

    try {
        const super_mod = true;
        const query = 'INSERT INTO expertdb (expertId,password, expert_name , super_mod) VALUES (?,?, ? ,?)';
        const values = [expertId, password, expert_name, super_mod];

        const [result] = await connection.query(query, values);

        res.status(201).json({
            message: "Expert successfully inserted",
        });

    } catch (error) {
        console.error('Error inserting expert:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
}
exports.getStudentsforExperts = async (req, res) => {
    const { department ,subject, stage_1, stage_3 } = req.query;
    console.log(typeof department);
    try {
        let query, queryParams = [];
        if (!stage_1 && !stage_3) {
            console.log('Error: No stage selected');
            return res.status(400).json({ "message": "Please select a option" });
        }
        let tableName;
        if (stage_1) tableName = "expertreviewlog";
        if (stage_3) tableName = "modreviewlog"

        console.log(`Using table: ${tableName}`);

        if (!department && !subject) {
            // Get department-wise stats
            query = `
                SELECT 
                    d.departmentId,
                    d.departmentName,
                    COUNT(DISTINCT e.student_id) as total_count,
                    COUNT(DISTINCT CASE WHEN e.expertId IS NULL THEN e.student_id END) as unassigned_count
                FROM 
                    departmentdb d
                JOIN students s ON d.departmentId = s.departmentId
                JOIN ${tableName} e ON s.student_id = e.student_id
                GROUP BY 
                    d.departmentId, d.departmentName
                ORDER BY 
                    d.departmentId;
            `;
        } else if (department && !subject) {
            // Get subject-wise stats for a specific department
            query = `
                SELECT 
                    sub.subjectId,
                    sub.subject_name,
                    COUNT(DISTINCT e.student_id) as total_count,
                    COUNT(DISTINCT CASE WHEN e.expertId IS NULL THEN e.student_id END) as unassigned_count
                FROM 
                    subjectsdb sub
                LEFT JOIN ${tableName} e ON sub.subjectId = e.subjectId
                LEFT JOIN students s ON e.student_id = s.student_id
                WHERE 
                    s.departmentId = ?
                GROUP BY 
                    sub.subjectId, sub.subject_name
                ORDER BY 
                    sub.subjectId;
            `;
            queryParams = [department];
        } else if (department && subject) {
            // Get qset-wise stats for a specific subject and department
            query = `
                SELECT 
                    e.qset,
                    COUNT(DISTINCT e.student_id) as total_count,
                    COUNT(DISTINCT CASE WHEN e.expertId IS NULL THEN e.student_id END) as unassigned_count
                FROM 
                    ${tableName} e
                JOIN students s ON e.student_id = s.student_id
                WHERE 
                    e.subjectId = ? AND s.departmentId = ?
                GROUP BY 
                    e.qset
                ORDER BY 
                    e.qset;
            `;
            queryParams = [subject, department];
        } else {
            console.log('Error: Invalid query parameters', { department, subject });
            return res.status(400).json({ "message": "Invalid query parameters" });
        }

        console.log('Executing query:', query);
        console.log('Query parameters:', queryParams);

        const [results] = await connection.query(query, queryParams);

        console.log('Query results:', results);

        if (results.length === 0) {
            console.log('No results found');
            return res.status(404).json({ "message": "No unassigned students found!" });
        }

        res.status(200).json({
            "message": "Unassigned students count calculated successfully",
            results
        });
    } catch (error) {
        console.error('Error in getStudentsforExperts:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        if (error.sql) {
            console.error('SQL query:', error.sql);
        }
        
        if (error.sqlMessage) {
            console.error('SQL error message:', error.sqlMessage);
        }
        
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }
};

exports.assignExpertToStudents = async (req, res) => {
    const { department, subject, qset, expertId, count, stage_1, stage_3 } = req.body;

    if (!department || !subject || !qset || !expertId || !count) {
        return res.status(400).json({ message: "Missing required parameters" });
    }

    try {
        // First, select the IDs of the rows we want to update
        if (!stage_1 && !stage_3) return res.status(400).json({ "message": "Please select a option" });
        let tableName;
        let columnName;
        if (stage_1) {
            tableName = "expertreviewlog";
            columnName = "paper_check"
        };
        if (stage_3) {
            tableName = "modreviewlog";
            columnName = "super_mod"
        }

        const updateExpertQuery = `update expertdb set ${columnName}= true where expertId = ?`;
        const [results] = await connection.query(updateExpertQuery, [expertId]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ "message": "Expert not found or papercheck already set to true" });
        }


        const selectQuery = `
            SELECT e.id
            FROM ${tableName} e
            JOIN students s ON e.student_id = s.student_id
            WHERE s.departmentId = ?
            AND e.subjectId = ?
            AND e.qset = ?
            AND e.expertId IS NULL

            LIMIT ?
        `;

        const [selectedRows] = await connection.query(selectQuery, [department, subject, qset, count]);

        if (selectedRows.length === 0) {
            return res.status(404).json({ message: "No unassigned students found matching the criteria" });
        }

        // Now, update these specific rows
        const updateQuery = `
            UPDATE ${tableName}
            SET expertId = ?
            WHERE id IN (?)
        `;

        const student_ids = selectedRows.map(row => row.id);
        const [updateResult] = await connection.query(updateQuery, [expertId, student_ids]);

        res.status(200).json({
            message: `Successfully assigned expert to ${updateResult.affectedRows} students`,
            assignedCount: updateResult.affectedRows
        });

    } catch (error) {
        console.error('Error assigning expert to students:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
};

exports.assignedStudentsSummary = async (req, res) => {
    const { stage_1, stage_3 } = req.query;

    let tableName;
    if (!stage_1 && !stage_3) return res.status(400).json({ "message": "Please select a option" });
    if (stage_1) {
        tableName = "expertreviewlog";
    }
    if (stage_3) {
        tableName = "modreviewlog";
    }


    const query = `
        SELECT 
            e.expertId,
            e.expert_name,
            s.subjectId,
            s.subject_name,
            st.departmentId,
            erl.qset,
            COUNT(DISTINCT erl.student_id) AS expert_assigned_count,
            (SELECT COUNT(DISTINCT student_id) 
             FROM ${tableName} 
             WHERE qset = erl.qset AND subjectId = s.subjectId) AS total_students_in_qset,
            (SELECT COUNT(DISTINCT student_id) 
             FROM ${tableName} 
             WHERE qset = erl.qset AND subjectId = s.subjectId AND expertId IS NOT NULL) AS total_assigned_in_qset
        FROM 
            expertdb e
        JOIN ${tableName} erl ON e.expertId = erl.expertId
        JOIN subjectsdb s ON erl.subjectId = s.subjectId
        JOIN students st ON erl.student_id = st.student_id
        GROUP BY 
            e.expertId, e.expert_name, s.subjectId, s.subject_name, st.departmentId, erl.qset
        ORDER BY 
            st.departmentId, e.expertId, s.subjectId, erl.qset;
    `;

    try {
        const [results] = await connection.query(query);

        if (results.length === 0) {
            return res.status(200).json({
                message: "No expert assignments found",
                departments: []
            });
        }

        // Group the results by department, expert, subject, and qset
        const groupedAssignments = results.reduce((acc, row) => {
            if (!acc[row.departmentId]) {
                acc[row.departmentId] = {
                    departmentId: row.departmentId,
                    experts: {}
                };
            }

            if (!acc[row.departmentId].experts[row.expertId]) {
                acc[row.departmentId].experts[row.expertId] = {
                    expertId: row.expertId,
                    expert_name: row.expert_name,
                    subjects: {}
                };
            }

            if (!acc[row.departmentId].experts[row.expertId].subjects[row.subjectId]) {
                acc[row.departmentId].experts[row.expertId].subjects[row.subjectId] = {
                    subjectId: row.subjectId,
                    subject_name: row.subject_name,
                    qsets: []
                };
            }

            acc[row.departmentId].experts[row.expertId].subjects[row.subjectId].qsets.push({
                qset: row.qset,
                expert_assigned_count: row.expert_assigned_count,
                total_students_in_qset: row.total_students_in_qset,
                total_assigned_in_qset: row.total_assigned_in_qset
            });

            return acc;
        }, {});

        // Convert the grouped assignments to the desired array format
        const formattedAssignments = Object.values(groupedAssignments).map(department => ({
            ...department,
            experts: Object.values(department.experts).map(expert => ({
                ...expert,
                subjects: Object.values(expert.subjects)
            }))
        }));

        res.status(200).json({
            departments: formattedAssignments
        });

    } catch (error) {
        console.error('Error fetching expert assignment summary:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
};

exports.unassignExpertFromStudents = async (req, res) => {
    const { department, subject, qset, expertId, count, stage_1, stage_3 } = req.body;

    if (!department || !subject || !qset || !expertId || count === undefined) {
        return res.status(400).json({ message: "Missing required parameters" });
    }

    if (!stage_1 && !stage_3) {
        return res.status(400).json({ "message": "Please select an option (stage_1 or stage_3)" });
    }

    try {
        let tableName;
        if (stage_1) {
            tableName = "expertreviewlog";

        }
        if (stage_3) {
            tableName = "modreviewlog";

        }

        // Check current assignment count
        const countQuery = `
            SELECT COUNT(*) as currentCount
            FROM ${tableName}
            WHERE expertId = ? AND subjectId = ? AND qset = ? AND subm_done = 0 
        `;
        const [countResult] = await connection.query(countQuery, [expertId, subject, qset]);
        const currentCount = countResult[0].currentCount;

        // Calculate the number of students to unassign

        console.log(count, currentCount);

        if (count <= 0) {
            return res.status(400).json({ message: "No students to unassign based on the provided count" });
        }
        if (count > currentCount) {
            return res.status(400).json({ message: "Count cannot exceed the assigne students count!!" });
        }

        // Unassign students
        const unassignQuery = `
            UPDATE ${tableName}
            SET expertId = NULL
            WHERE expertId = ? AND subjectId = ? AND qset = ? AND subm_done = 0
            ORDER BY id DESC
            LIMIT ?
        `;
        const [unassignResult] = await connection.query(unassignQuery, [expertId, subject, qset, count]);

        if (unassignResult.affectedRows === 0) {
            return res.status(404).json({ message: "No students found to unassign" });
        }

        // If all students are unassigned, update the expert's status
        // if (count === 0) {
        //     const updateExpertQuery = `UPDATE expertdb SET ${columnName} = false WHERE expertId = ?`;
        //     await connection.query(updateExpertQuery, [expertId]);
        // }

        res.status(200).json({
            message: `Successfully unassigned ${unassignResult.affectedRows} students from the expert`,
            unassignedCount: unassignResult.affectedRows,
            remainingAssignedCount: currentCount - unassignResult.affectedRows
        });

    } catch (error) {
        console.error('Error unassigning students from expert:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
};

exports.submmitedByExperts = async (req, res) => {
    const { stage_1, stage_3 } = req.query;

    let tableName;
    if (!stage_1 && !stage_3) return res.status(400).json({ "message": "Please select a option" });
    if (stage_1) {
        tableName = "expertreviewlog";
    }
    if (stage_3) {
        tableName = "modreviewlog";
    }


    const query = `
    SELECT 
        e.expertId,
        e.expert_name,
        s.subjectId,
        s.subject_name,
        st.departmentId,
        erl.qset,
        COUNT(DISTINCT erl.student_id) AS expert_assigned_count,
        SUM(CASE WHEN erl.subm_done = 1 THEN 1 ELSE 0 END) AS submitted_students,
        SUM(CASE WHEN erl.subm_done = 0 THEN 1 ELSE 0 END) AS pending_students
    FROM 
        expertdb e
    JOIN ${tableName} erl ON e.expertId = erl.expertId
    JOIN subjectsdb s ON erl.subjectId = s.subjectId
    JOIN students st ON erl.student_id = st.student_id
    GROUP BY 
        e.expertId, e.expert_name, s.subjectId, s.subject_name, st.departmentId, erl.qset
    ORDER BY 
        st.departmentId, e.expertId, s.subjectId, erl.qset;`;

    try {
        const [results] = await connection.query(query);

        if (results.length === 0) {
            return res.status(200).json({
                message: "No expert assignments found",
                departments: []
            });
        }

        // Group the results by department, expert, subject, and qset
        const groupedAssignments = results.reduce((acc, row) => {
            if (!acc[row.departmentId]) {
                acc[row.departmentId] = {
                    departmentId: row.departmentId,
                    experts: {}
                };
            }

            if (!acc[row.departmentId].experts[row.expertId]) {
                acc[row.departmentId].experts[row.expertId] = {
                    expertId: row.expertId,
                    expert_name: row.expert_name,
                    subjects: {}
                };
            }

            if (!acc[row.departmentId].experts[row.expertId].subjects[row.subjectId]) {
                acc[row.departmentId].experts[row.expertId].subjects[row.subjectId] = {
                    subjectId: row.subjectId,
                    subject_name: row.subject_name,
                    qsets: []
                };
            }

            acc[row.departmentId].experts[row.expertId].subjects[row.subjectId].qsets.push({
                qset: row.qset,
                expert_assigned_count: row.expert_assigned_count,
                submitted_students: Number(row.submitted_students),
                pending_students: Number(row.pending_students)
            });

            return acc;
        }, {});

        // Convert the grouped assignments to the desired array format
        const formattedAssignments = Object.values(groupedAssignments).map(department => ({
            ...department,
            experts: Object.values(department.experts).map(expert => ({
                ...expert,
                subjects: Object.values(expert.subjects)
            }))
        }));

        res.status(200).json({
            departments: formattedAssignments
        });

    } catch (error) {
        console.error('Error fetching expert assignment summary:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
};

exports.copyQsetToModqset = async (req, res) => {
    try {
        // First, add a unique constraint to subjectId in modqsetdb
        const addUniqueConstraintQuery = `
            ALTER TABLE modqsetdb ADD UNIQUE (subjectId);
        `;
        
        await connection.query(addUniqueConstraintQuery);

        // Now, run your original query
        const query = `
            INSERT INTO modqsetdb (subjectId, Q1PA, Q1PB, Q2PA, Q2PB, Q3PA, Q3PB, Q4PA, Q4PB)
            SELECT subjectId, Q1PA, Q1PB, Q2PA, Q2PB, Q3PA, Q3PB, Q4PA, Q4PB
            FROM qsetdb
            ON DUPLICATE KEY UPDATE
                Q1PA = VALUES(Q1PA),
                Q1PB = VALUES(Q1PB),
                Q2PA = VALUES(Q2PA),
                Q2PB = VALUES(Q2PB),
                Q3PA = VALUES(Q3PA),
                Q3PB = VALUES(Q3PB),
                Q4PA = VALUES(Q4PA),
                Q4PB = VALUES(Q4PB);
        `;

        const [result] = await connection.query(query);

        console.log(`Affected rows: ${result.affectedRows}. Inserted: ${result.insertId}. Updated: ${result.changedRows}`);
        res.status(201).json({
            affectedRows: result.affectedRows,
            insertedRows: result.insertId,
            updatedRows: result.changedRows
        });
    } catch (error) {
        console.error('Error updating or copying data from qsetdb to modqsetdb:', error);
        res.status(500).json({ error: error.message });
    }
};