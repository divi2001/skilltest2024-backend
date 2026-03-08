require('dotenv').config();
const mysql = require('mysql2/promise');
const { decrypt } = require('./config/encrypt');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const [rows] = await conn.query(`
    SELECT s.subjectsId, s.qset, s.student_id, s.password
    FROM students s
    INNER JOIN (
      SELECT subjectsId, qset, MIN(student_id) as min_id
      FROM students WHERE departmentId=12
      GROUP BY subjectsId, qset
    ) t ON s.subjectsId=t.subjectsId AND s.qset=t.qset AND s.student_id=t.min_id
    ORDER BY s.subjectsId, s.qset
  `);

  console.log('subjectsId | qset | student_id    | password');
  console.log('-----------|------|---------------|----------');
  for (const r of rows) {
    let plain = '';
    try { plain = decrypt(r.password); } catch(e) { plain = '(err)'; }
    console.log(
      String(r.subjectsId).padEnd(11) + '| ' +
      String(r.qset).padEnd(5) + '| ' +
      String(r.student_id).padEnd(14) + '| ' +
      plain
    );
  }
  await conn.end();
}
main().catch(console.error);
