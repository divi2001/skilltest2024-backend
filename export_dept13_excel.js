require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const key = crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();

function decrypt(enc) {
  try {
    const [ivH, e] = enc.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivH, 'hex'));
    let d = decipher.update(e, 'hex', 'utf8');
    d += decipher.final('utf8');
    try { return JSON.parse(d); } catch { return d; }
  } catch { return enc; }
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  // Fetch subject names separately to avoid row multiplication from JOIN
  const [subjRows] = await conn.query('SELECT subjectId, subject_name FROM subjectsdb');
  const subjMap = {};
  subjRows.forEach(r => { subjMap[r.subjectId] = r.subject_name; });

  // Fetch one student per subjectsId+qset (no JOIN)
  const [students] = await conn.query(`
    SELECT s.student_id, s.password, s.subjectsId, s.qset, s.batchNo, s.fullname
    FROM students s
    WHERE s.center = 211351
    AND s.student_id = (
      SELECT MIN(student_id) FROM students
      WHERE center = 211351 AND subjectsId = s.subjectsId AND qset = s.qset
    )
    ORDER BY s.subjectsId, s.qset
  `);

  // Fetch controller passwords for dept 13
  const [controllers] = await conn.query(
    'SELECT * FROM controllerdb WHERE departmentId = 13 ORDER BY batchNo'
  );

  // Build batchNo -> plain controller_pass map
  const ctrlMap = {};
  controllers.forEach(c => { ctrlMap[c.batchNo] = decrypt(c.controller_pass); });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'KK Exams';
  wb.created = new Date();

  // ── Sheet 1: Students ──────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Students');

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const altFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  const border     = { style: 'thin', color: { argb: 'FFBFBFBF' } };
  const allBorder  = { top: border, left: border, bottom: border, right: border };

  ws1.columns = [
    { header: 'Sr No',               key: 'sr',       width: 8  },
    { header: 'subjectsId',          key: 'sid',      width: 14 },
    { header: 'Subject Name',        key: 'sname',    width: 28 },
    { header: 'qset',                key: 'qset',     width: 8  },
    { header: 'batchNo',             key: 'batch',    width: 12 },
    { header: 'student_id',          key: 'stuid',    width: 18 },
    { header: 'Full Name',           key: 'fname',    width: 30 },
    { header: 'Student Password',    key: 'pass',     width: 22 },
    { header: 'Controller Password', key: 'ctrlpass', width: 22 },
  ];

  // Style header row
  ws1.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorder;
  });
  ws1.getRow(1).height = 22;

  students.forEach((r, i) => {
    const decPass = r.password ? decrypt(r.password) : 'NULL';
    const ctrlPass = ctrlMap[r.batchNo] || 'N/A';
    const row = ws1.addRow({
      sr: i + 1,
      sid: r.subjectsId,
      sname: subjMap[r.subjectsId] || 'unknown',
      qset: r.qset,
      batch: r.batchNo,
      stuid: r.student_id,
      fname: r.fullname,
      pass: decPass,
      ctrlpass: ctrlPass,
    });
    if (i % 2 === 1) {
      row.eachCell(cell => { cell.fill = altFill; });
    }
    row.eachCell(cell => {
      cell.border = allBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  ws1.autoFilter = { from: 'A1', to: 'I1' };

  // ── Sheet 2: Controller Passwords ─────────────────────────────────────────
  const ws2 = wb.addWorksheet('Controller Passwords');

  const ctrlHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF833C00' } };

  ws2.columns = [
    { header: 'Sr No',              key: 'sr',    width: 8  },
    { header: 'center',             key: 'ctr',   width: 12 },
    { header: 'departmentId',       key: 'dept',  width: 14 },
    { header: 'batchNo',            key: 'batch', width: 12 },
    { header: 'controller_name',    key: 'name',  width: 36 },
    { header: 'controller_contact', key: 'cont',  width: 20 },
    { header: 'controller_pass (plain)', key: 'pass', width: 24 },
    { header: 'district',           key: 'dist',  width: 16 },
  ];

  ws2.getRow(1).eachCell(cell => {
    cell.fill = ctrlHeaderFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorder;
  });
  ws2.getRow(1).height = 22;

  const ctrlAltFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };

  controllers.forEach((c, i) => {
    const plainPass = decrypt(c.controller_pass);
    const row = ws2.addRow({
      sr: i + 1,
      ctr: c.center,
      dept: c.departmentId,
      batch: c.batchNo,
      name: c.controller_name,
      cont: c.controller_contact,
      pass: plainPass,
      dist: c.district,
    });
    if (i % 2 === 1) {
      row.eachCell(cell => { cell.fill = ctrlAltFill; });
    }
    row.eachCell(cell => {
      cell.border = allBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  ws2.autoFilter = { from: 'A1', to: 'H1' };

  const outFile = 'Dept13_Students_Controllers.xlsx';
  await wb.xlsx.writeFile(outFile);
  console.log(`Excel written: ${outFile}`);
  await conn.end();
})().catch(err => console.error('Error:', err.message));
