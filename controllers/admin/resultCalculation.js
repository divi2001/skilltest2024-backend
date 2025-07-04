const connection = require('../../config/db1');


exports.createStudentResult = (req, res) => {
        const query = `
        SELECT passageA, passageB, ansPassageA, ansPassageB, student_id, subjectId, qset
        FROM expertreviewlog 
              
    `;
}