const connection = require("../../config/db1")

exports.getAllExperts = async(req,res)=>{

    try {
        let query =  `select * from expertdb`;
        
        const [results] = await connection.query(query);

        if (results.length === 0) {
            return res.status(404).json({ "message": "No expert review logs found for this department" });
        }

        res.status(201).json({"message":"experts fethed successfully",results});
    } catch (error) {
        console.log("error fetching experts",error);
        res.status(500).json({"message":"Internal Server Error"});
    }
}

exports.updateExpertsdb = async (req,res) => {

    const {experts , paper_check , paper_mod , super_mod ,updateAll} = req.body;

    
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
    const { password, expert_name , expertId } = req.body;

    // Validate input
    if (!password || !expert_name) {
        return res.status(400).json({ message: "Both password and expert_name are required" });
    }
    
    try {
        const super_mod = true;
        const query = 'INSERT INTO expertdb (expertId,password, expert_name , super_mod) VALUES (?,?, ? ,?)';
        const values = [expertId , password, expert_name , super_mod];

        const [result] = await connection.query(query, values);

        res.status(201).json({
            message: "Expert successfully inserted",
        });

    } catch (error) {
        console.error('Error inserting expert:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
}

exports.getStudentsforExperts = async(req,res)=>{
    const {department , subject} = req.query;
    try {
        let query = ` SELECT 
          d.departmentId,
          d.departmentName,
          COUNT(DISTINCT e.student_id) as student_count
      FROM 
          departmentdb d
      LEFT JOIN students s ON d.departmentId = s.departmentId
      LEFT JOIN expertreviewlog e ON s.student_id = e.student_id
      GROUP BY 
          d.departmentId, d.departmentName
      ORDER BY 
          d.departmentId;`
          let queryParams= [];

          if (department && !subject) {
            // Get subject-wise stats for a specific department
            query = `
              SELECT 
                  sub.subjectId,
                  sub.subject_name,
                  COUNT(DISTINCT e.student_id) as student_count
              FROM 
                  subjectsdb sub
              LEFT JOIN expertreviewlog e ON sub.subjectId = e.subjectId
              LEFT JOIN students s ON e.student_id = s.student_id
              WHERE 
                  s.departmentId = ?
              GROUP BY 
                  sub.subjectId, sub.subject_name
              ORDER BY 
                  sub.subjectId;
            `;
            queryParams = [department];
          }else if(department && subject){
            query = `
            SELECT 
                e.qset,
                COUNT(DISTINCT e.student_id) as student_count
            FROM 
                expertreviewlog e
            JOIN students s ON e.student_id = s.student_id
            WHERE 
                e.subjectId = ? AND s.departmentId = ?
            GROUP BY 
                e.qset
            ORDER BY 
                e.qset;
          `;
          queryParams = [subject, department];
          }

          const [results]= await connection.query(query,queryParams);
          if(results.length === 0) return res.status(404).json({"message":"No students Found!!"});

          res.status(201).json({"message":"Students Count calculated successfully",results});
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
}