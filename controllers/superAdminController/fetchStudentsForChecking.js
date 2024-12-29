const connection = require("../../config/db1");

exports.getStudentsFromExpertReviewlog = async (req,res) => {

    const {department} = req.query;

    try {
        let query = `select erl.*,s.departmentId from expertreviewlog erl join students s on s.student_id = erl.student_id where s.departmentId = ?;`;


        const[results] =  await connection.query(query,[department]);
        
        if (results.length === 0) {
            return res.status(404).json({ "message": "No expert review logs found for this department" });
        }

        res.status(201).json(results)
    } catch (error) {
        console.error('Error fetching expert review logs:', error);
        res.status(500).json({ "message": "Internal Server error" });
    }
    
}

exports.getStudentsFromModReviewlog = async (req,res) => {

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