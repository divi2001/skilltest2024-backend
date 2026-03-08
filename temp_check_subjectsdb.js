require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });
  const [r] = await conn.query('SELECT * FROM subjectsdb LIMIT 1');
  fs.writeFileSync('subjectsdb_cols.txt', Object.keys(r[0]).join(', '));
  await conn.end();
})().catch(e => { require('fs').writeFileSync('subjectsdb_cols.txt', 'Error: ' + e.message); });
