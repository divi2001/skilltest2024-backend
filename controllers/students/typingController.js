const connection = require('../../config/db1');
const fs = require('fs').promises; 
const xl = require('excel4node');

const path = require('path');
const fs1 = require('fs');
const Buffer = require('buffer').Buffer;
const archiver = require('archiver');
const moment = require('moment-timezone');

const { encrypt, decrypt } =require('../../config/encrypt');
const { request } = require('http');


exports.getpassages = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectsdb WHERE subjectId = ?';
    const typingQuery = "SELECT * FROM computerTyping WHERE subjectId = ? AND qset = ?";

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        const student = students[0];
  


        // Extract subjectsId and parse it to an array
        const subjectsId = student.subjectsId;
        const qset = student.qset
        console.log(qset)

        // Assuming you want the first subject from the array
        const subjectId = student.subjectsId;
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        if (subjects.length === 0) {
            return res.status(404).send('Subject not found');
        }
        const subject = subjects[0];


        const [passages] = await connection.query(typingQuery, [subjectId, qset]);
        if (passages.length === 0) {
            return res.status(404).send('passage not found');
        }
        const passage = passages[0];
    

        const responseData = {
            subjectId: subject.subjectId,
            courseId: subject.courseId,
            subject_name: subject.subject_name,
            subject_name_short: subject.subject_name_short,
            Daily_Timer: subject.daily_timer                ,
            Passage_Timer: subject.passage_timer                ,
            Demo_Timer: subject.demo_timer                ,
            trial_passage: passage.trial_passage            ,
            passage1: passage.passage_text            ,
  
        };
        console.log(responseData)


        // const encryptedResponseData = {};
        // for (let key in responseData) {
        //     if (responseData.hasOwnProperty(key)) {
        //         encryptedResponseData[key] = encrypt(responseData[key].toString());
        //     }
        // }

        res.send(responseData);
    } catch (err) {
        // console.error('Failed to fetch student details:', err);
        res.status(500).send(err.message);
    }
};