require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  // 1. Check batchdb for batchNo=101, departmentId=13
  const [batch] = await conn.query('SELECT * FROM batchdb WHERE batchNo = 101 AND departmentId = 13');
  console.log('=== batchdb (batchNo=101, deptId=13) ===');
  console.log(batch.length ? JSON.stringify(batch, null, 2) : 'NO ENTRY FOUND');

  // 2. Check departmentdb for departmentId=13
  const [dept] = await conn.query('SELECT departmentId, departmentName, examType FROM departmentdb WHERE departmentId = 13');
  console.log('\n=== departmentdb (deptId=13) ===');
  console.log(JSON.stringify(dept, null, 2));

  // 3. Check subjectsdb for subjectIds 53 and 62
  const [subs] = await conn.query('SELECT subjectId, examType, subject_name FROM subjectsdb WHERE subjectId IN (53, 62)');
  console.log('\n=== subjectsdb (subjectId 53, 62) ===');
  console.log(JSON.stringify(subs, null, 2));

  // 4. Check students in dept13 batch101 and whether JOIN works
  const [students] = await conn.query(`
    SELECT s.student_id, s.subjectsId, 
           sub.subject_name_short, d.examType as deptExamType, sub.examType as subExamType 
    FROM students s 
    JOIN departmentdb d ON s.departmentId = d.departmentId 
    LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND d.examType = sub.examType 
    WHERE s.batchNo = 101 AND s.departmentId = 13 LIMIT 5
  `);
  console.log('\n=== Attendance query sample - LEFT JOIN (dept13 batch101) ===');
  console.log(students.length ? JSON.stringify(students, null, 2) : 'NO RESULTS (no students for dept13 batch101)');

  // 5. Check with INNER JOIN (actual query used)
  const [studentsInner] = await conn.query(`
    SELECT s.student_id, s.subjectsId, 
           sub.subject_name_short, d.examType as deptExamType, sub.examType as subExamType 
    FROM students s 
    JOIN departmentdb d ON s.departmentId = d.departmentId 
    JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND d.examType = sub.examType 
    WHERE s.batchNo = 101 AND s.departmentId = 13 LIMIT 5
  `);
  console.log('\n=== Attendance query sample - INNER JOIN (actual query, dept13 batch101) ===');
  console.log(studentsInner.length ? JSON.stringify(studentsInner, null, 2) : 'NO RESULTS - this is why attendance download fails!');

  // 6. Check REPORT_PASSWORD_PDF setting
  try {
    const [setting] = await conn.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = 'REPORT_PASSWORD_PDF'");
    console.log('\n=== REPORT_PASSWORD_PDF setting ===');
    console.log(setting.length ? JSON.stringify(setting, null, 2) : 'NO SETTING (downloads allowed by default)');
  } catch(e) {
    console.log('\n=== system_settings table error:', e.message);
  }

  await conn.end();
})().catch(e => console.error('Error:', e.message));
