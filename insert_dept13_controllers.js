require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const key = crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();

function encrypt(value) {
  const plainText = JSON.stringify(value);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function genPassword(usedPasswords) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  while (true) {
    // Fisher-Yates shuffle, pick first 6
    const arr = [...digits];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const pass = arr.slice(0, 6).join('');
    if (!usedPasswords.has(pass)) {
      usedPasswords.add(pass);
      return pass;
    }
  }
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const batches = [101, 103, 201, 202, 204, 301, 303, 401];
  const CENTER = 211351;
  const DEPT = 13;

  // Collect existing passwords to avoid collision
  const [existing] = await conn.query('SELECT controller_pass FROM controllerdb');
  const usedPasswords = new Set();
  // (existing ones are encrypted so we just ensure our generated ones are unique among themselves)

  const toInsert = [];
  for (const batchNo of batches) {
    const plainPass = genPassword(usedPasswords);
    const encPass = encrypt(plainPass);
    toInsert.push({ batchNo, plainPass, encPass });
  }

  console.log('\nPasswords to insert:');
  console.log('batch | plain_pass | encrypted');
  console.log('-'.repeat(80));
  toInsert.forEach(r => console.log(`${r.batchNo}   | ${r.plainPass}   | ${r.encPass}`));

  for (const r of toInsert) {
    await conn.query(
      `INSERT INTO controllerdb (center, batchNo, departmentId, controller_code, controller_name, controller_contact, controller_email, controller_pass, district)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        CENTER,
        r.batchNo,
        DEPT,
        CENTER,
        'Controller NetQuiz Assessment Solutions',
        9999999999,
        'controller211351@example.com',
        r.encPass,
        'Auto-Generated'
      ]
    );
    console.log(`Inserted batch ${r.batchNo} -> pass: ${r.plainPass}`);
  }

  console.log('\nDone. Verifying...');
  const [verify] = await conn.query('SELECT * FROM controllerdb WHERE departmentId = 13 ORDER BY batchNo');
  console.log(`Total dept 13 controller entries: ${verify.length}`);

  await conn.end();
})().catch(err => console.error('Error:', err.message));
