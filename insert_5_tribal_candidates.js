require('dotenv').config();
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const { encrypt } = require('./config/encrypt');

function generatePassword(usedSet) {
  const digits = '123456789';
  let pass;
  do {
    pass = '';
    for (let i = 0; i < 6; i++) pass += digits[Math.floor(Math.random() * 9)];
  } while (usedSet.has(pass));
  usedSet.add(pass);
  return pass;
}

function parseTime(t) {
  if (!t) return null;
  const [time, ampm] = t.trim().split(' ');
  let [h, m] = time.split(':').map(Number);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':00';
}

function parseDate(d) {
  if (!d) return null;
  const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const [dd, mon, yyyy] = d.split('-');
  return yyyy + '-' + months[mon] + '-' + dd.padStart(2, '0');
}

async function main() {
  const wb = XLSX.readFile('../tribal hallticket new 5 candidates v4.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  const usedPasswords = new Set();
  let inserted = 0;
  const results = [];

  for (const r of data) {
    const plainPass = generatePassword(usedPasswords);
    const encPass = encrypt(plainPass);
    const student_id = String(r.student_id);
    const batchdate = parseDate(String(r.batchdate));
    const reporting_time = parseTime(String(r.reporting_time));
    const start_time = parseTime(String(r.start_time));
    const end_time = parseTime(String(r.end_time));
    const disability = (r.disability === 'NA' || r.disability === '' || r.disability === 0) ? 0 : 1;
    const day = r.day === '' ? null : r.day;

    try {
      await conn.query(
        `INSERT INTO students 
          (student_id, password, instituteId, batchNo, batchdate, fullname, subjectsId, courseId, batch_year,
           loggedin, done, photo, center, reporting_time, start_time, end_time, day, qset,
           base64, sign_base64, IsShorthand, IsTypewriting, departmentId, disability)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          student_id, encPass, 211251,
          r.batchNo, batchdate, r.fullname, r.subjectsId, r.courseId, r.batch_year,
          0, 0, null, r.center,
          reporting_time, start_time, end_time, day, null,
          r.base64 || null, r.sign_base64 || null,
          r.IsShorthand, r.IsTypewriting, 12, disability
        ]
      );
      console.log(`✅ Inserted: ${student_id} | ${r.fullname} | Batch: ${r.batchNo} | Pass: ${plainPass}`);
      results.push({ student_id, fullname: r.fullname, batchNo: r.batchNo, password: plainPass });
      inserted++;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️  Already exists (skipped): ${student_id} | ${r.fullname}`);
      } else {
        throw err;
      }
    }
  }

  console.log(`\n✅ Done. Inserted ${inserted} students.`);
  const [count] = await conn.query('SELECT COUNT(*) as total FROM students WHERE departmentId=12');
  console.log(`New total in dept 12: ${count[0].total}`);
  console.log('\nSummary (save these passwords):');
  results.forEach(r => console.log(`  ${r.student_id} | ${r.fullname} | Batch ${r.batchNo} | Password: ${r.password}`));
  await conn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
