// Generate INSERT SQL from Excel data (deduplicated)
const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('institutedb.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Deduplicate by InstituteId
const seen = new Set();
const unique = [];
for (const row of data) {
    if (!seen.has(row.InstituteId)) {
        seen.add(row.InstituteId);
        unique.push(row);
    }
}

console.log(`Total rows: ${data.length}, Unique: ${unique.length}, Duplicates removed: ${data.length - unique.length}`);

function esc(val) {
    if (val == null) return 'NULL';
    return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").trim() + "'";
}

let sql = `-- Insert ${unique.length} institute records into dec25.institutedb\n`;
sql += `-- Generated from institutedb.xlsx (${data.length} rows, ${data.length - unique.length} duplicates removed)\n\n`;

// Batch insert in groups of 50
const BATCH = 50;
for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    sql += `INSERT INTO \`dec25\`.\`institutedb\` (\`instituteId\`, \`computer_typing_code\`, \`institute_name\`, \`institute_address\`, \`district\`, \`taluka\`) VALUES\n`;
    const rows = batch.map(r => {
        const id = r.InstituteId;
        const code = r.COMPUTER_TYPING_CODE != null ? r.COMPUTER_TYPING_CODE : null;
        const name = r.INSTITUTE_NAME;
        const addr = r.INSTITUTE_ADDRESS || null;
        const dist = r.InstDist;
        const tal = r.InstTaluka;
        return `(${id}, ${code === null ? 'NULL' : code}, ${esc(name)}, ${esc(addr)}, ${esc(dist)}, ${esc(tal)})`;
    });
    sql += rows.join(',\n') + ';\n\n';
}

sql += `-- Verification\nSELECT COUNT(*) AS total_rows FROM \`dec25\`.\`institutedb\`;\n`;

fs.writeFileSync('mig_institutedb_insert.sql', sql, 'utf8');
console.log(`SQL written to mig_institutedb_insert.sql`);
