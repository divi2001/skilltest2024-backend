require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const key = crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();

function decrypt(encryptedText) {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let dec = decipher.update(encrypted, 'hex', 'utf8');
    dec += decipher.final('utf8');
    try { return JSON.parse(dec); } catch(e) { return dec; }
  } catch(e) { return '[err]'; }
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  // Get subjectsdb columns
  const [sSample] = await conn.query('SELECT * FROM subjectsdb LIMIT 1');
  const subjCols = Object.keys(sSample[0]).join(', ');

  // Get all subjectsdb records and build map
  const [subjRows] = await conn.query('SELECT * FROM subjectsdb');
  const subjMap = {};
  for (const s of subjRows) {
    const id = s.subjectsId || s.subjects_id || s.id || s.SubjectsId;
    const name = s.subject_name || s.subjectName || s.name || s.Subject_name || JSON.stringify(s);
    if (id) subjMap[id] = name;
  }

  // Get one student per unique subjectsId+qset combo for center 211351
  const [students] = await conn.query(`
    SELECT s.student_id, s.password, s.subjectsId, s.qset, s.batchNo, s.fullname
    FROM students s
    WHERE s.center = 211351
    AND s.student_id = (
      SELECT student_id FROM students
      WHERE center = 211351 AND subjectsId = s.subjectsId AND qset = s.qset
      LIMIT 1
    )
    ORDER BY s.subjectsId, s.qset
  `);

  // Check controllerdb for dept 13
  const [ctrlRows] = await conn.query('SELECT * FROM controllerdb WHERE departmentId = 13');

  let out = '';
  out += 'subjectsdb columns: ' + subjCols + '\n\n';
  out += '=== CONTROLLER (dept 13) ===\n';
  if (ctrlRows.length === 0) {
    out += 'No controller entries for departmentId 13\n';
  } else {
    ctrlRows.forEach(c => {
      out += `  batchNo:${c.batchNo} | pass:${c.controller_pass} | name:${c.controller_name}\n`;
    });
  }

  out += '\n=== STUDENTS per subjectsId+qset (center 211351, dept 13) ===\n';
  out += 'subjectsId | subject_name | qset | batchNo | student_id | decrypted_password\n';
  out += '-'.repeat(100) + '\n';

  for (const r of students) {
    let decPass = 'N/A';
    if (r.password) {
      decPass = JSON.stringify(decrypt(r.password));
    } else {
      decPass = 'NULL';
    }
    const subjectName = subjMap[r.subjectsId] || 'unknown';
    out += `${r.subjectsId} | ${subjectName} | qset:${r.qset} | batch:${r.batchNo} | ${r.student_id} | ${decPass}\n`;
  }

  fs.writeFileSync('dept13_output.txt', out, 'utf8');
  console.log('Written to dept13_output.txt');
  await conn.end();
})().catch(err => {
  fs.writeFileSync('dept13_output.txt', 'Error: ' + err.message);
  console.error('Error:', err.message);
});
