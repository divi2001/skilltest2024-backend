// controllers\superAdminController\fetchStudentsForChecking.js
const connection = require("../../config/db1");

// exports.getStudentsFromExpertReviewlog = async (req,res) => {

//     const {department} = req.query;

//     try {
//         let query = `select erl.*,s.departmentId from expertreviewlog erl join students s on s.student_id = erl.student_id where s.departmentId = ?;`;


//         const[results] =  await connection.query(query,[department]);
        
//         if (results.length === 0) {
//             return res.status(404).json({ "message": "No expert review logs found for this department" });
//         }
//         console.log(results.length);
//         res.status(201).json(results)
//     } catch (error) {
//         console.error('Error fetching expert review logs:', error);
//         res.status(500).json({ "message": "Internal Server error" });
//     }
    
// }

exports.getStudentsFromExpertReviewlog = async (req, res) => {
  const { department, subject, stage_1, stage_3 } = req.query;

  try {
    let stageCondition = '';
    if (stage_1 === 'true') {
      stageCondition = 'erl.stage = 1';
    } else if (stage_3 === 'true') {
      stageCondition = 'erl.stage = 3';
    } else {
      return res.status(400).json({ message: 'Stage parameter missing or invalid' });
    }

    let query = `
      SELECT erl.*, s.departmentId 
      FROM expertreviewlog erl 
      JOIN students s ON s.student_id = erl.student_id 
      WHERE ${stageCondition}
    `;

    const queryParams = [];

    if (department) {
      query += ` AND s.departmentId = ?`;
      queryParams.push(department);
    }

    if (subject) {
      query += ` AND erl.subject = ?`;
      queryParams.push(subject);
    }

    const [results] = await connection.query(query, queryParams);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No expert review logs found for the given filters' });
    }

    res.status(200).json({ results });
  } catch (error) {
    console.error('Error fetching expert review logs:', error);
    res.status(500).json({ message: 'Internal Server error' });
  }
};

exports.getStudentsFromModReviewlog = async (req,res) => {
    console.log("Fetching mod review logs for department");
    const {department} = req.query;

    try {
        let query = `select mrl.*,s.departmentId from modreviewlog mrl join students s on s.student_id = mrl.student_id where s.departmentId = ?;`;


        const[results] =  await connection.query(query,[department]);
        if (results.length === 0) {
            return res.status(404).json({ "message": "No mod review logs found for this department" });
        }

        res.status(201).json(results)
    } catch (error) {
        console.error('Error fetching mod review logs:', error);
        res.status(500).json({ "message": "Internal Server error" });
    }
    
}