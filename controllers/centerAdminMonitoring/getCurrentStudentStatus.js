const connection = require('../../config/db1');
const moment = require('moment-timezone');

exports.getCurrentStudentDetails = async(req,res) =>{

    const center = req.session.centerId;
    let { subject_name, loginStatus, batchDate ,exam_type , batchNo } = req.query;

    try {
    
    let filter = '';
    const queryparams = [center];
    if(batchNo){
        console.log(batchNo);
        filter += ' AND s.batchNo = ?';
       queryparams.push(batchNo);
    }
    
    let query = `SELECT  s.batchNo, COUNT(s.student_id) AS total_students, SUM(CASE WHEN s.loggedin = TRUE THEN 1 ELSE 0 END)  AS logged_in_students,SUM(CASE WHEN s.done = TRUE THEN 1 ELSE 0 END) AS completed_student , s.start_time , s.batchdate FROM students s where s.center = ? ${filter} GROUP BY  s.batchNo, s.start_time, s.batchdate ORDER BY s.batchNo ;`;

    console.log(query);
    const [results] = await connection.query(query,queryparams);

    console.log(results);

    res.status(201).json({results});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message":"Internal Server Error!!"});
    }


}