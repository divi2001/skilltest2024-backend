require('dotenv').config();
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const connection = require('./config/db1');

const EXCEL_PATH = 'C:/Users/Tanuj/Downloads/audiodb (4).xlsx';

const COLS = [
    'id', 'subjectId', 'qset', 'departmentId', 'examType',
    'code_a', 'code_b', 'code_t', 'audio1', 'passage1',
    'audio2', 'passage2', 'testaudio', 'textPassageA', 'textPassageB'
];

async function run() {
    console.log(`Target DB: ${process.env.DB_DATABASE} @ ${process.env.DB_HOST}`);

    // 1. Read Excel
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    console.log(`Read ${rows.length} rows from Excel`);

    // 2. Back up current audiodb to JSON
    const [existing] = await connection.query('SELECT * FROM audiodb ORDER BY id');
    const backupPath = path.join(__dirname, `audiodb_backup_${process.env.DB_DATABASE}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2));
    console.log(`Backed up ${existing.length} existing rows -> ${backupPath}`);

    // 3. Replace table contents
    await connection.query('TRUNCATE TABLE audiodb');
    console.log('Truncated audiodb');

    let inserted = 0;
    for (const row of rows) {
        const values = COLS.map(c => (row[c] === undefined ? null : row[c]));
        await connection.query(
            `INSERT INTO audiodb (${COLS.join(', ')}) VALUES (${COLS.map(() => '?').join(', ')})`,
            values
        );
        inserted++;
    }
    console.log(`Inserted ${inserted} new rows into audiodb`);

    // 4. Verify
    const [tot] = await connection.query('SELECT COUNT(*) cnt FROM audiodb');
    console.log(`Final audiodb total rows: ${tot[0].cnt}`);
    const [byd] = await connection.query(
        'SELECT departmentId, COUNT(*) cnt FROM audiodb GROUP BY departmentId ORDER BY departmentId'
    );
    console.table(byd);

    process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
