// upload_dept_11_12.js
// Script to update students for departments 11 (Samajkalyan) and 12 (Tribal)
// - Keeps batch 100 untouched for dept 11
// - Deletes existing students in dept 11 (batchNo >= 101) and dept 12 (all)
// - Inserts new students from Excel file

require('dotenv').config();
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, '..', 'final data for uploading samajkalyan and tribal dept 11 12.xlsx');

// Parse date string like "05-Mar-2026" to "2026-03-05"
function parseDate(dateStr) {
    if (!dateStr) return null;
    const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 
                     'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return null;
}

// Parse time string like "08:30 AM" to "08:30:00" (24h)
function parseTime(timeStr) {
    if (!timeStr) return null;
    const str = String(timeStr).trim();
    const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2];
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${minutes}:00`;
    }
    return null;
}

(async () => {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            connectTimeout: 30000
        });

        console.log('Connected to:', process.env.DB_HOST, '/', process.env.DB_DATABASE);

        // Read Excel
        const wb = XLSX.readFile(EXCEL_FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        console.log(`\nExcel loaded: ${data.length} rows`);

        // Show summary
        const dept11 = data.filter(r => r.departmentId === 11);
        const dept12 = data.filter(r => r.departmentId === 12);
        console.log(`  Dept 11 (Samajkalyan): ${dept11.length} students`);
        console.log(`  Dept 12 (Tribal): ${dept12.length} students`);

        // ============= STEP 1: Show current state =============
        const [before] = await conn.query(
            `SELECT departmentId, batchNo, COUNT(*) as count 
             FROM students WHERE departmentId IN (11, 12) 
             GROUP BY departmentId, batchNo ORDER BY departmentId, batchNo`
        );
        console.log('\n--- BEFORE: Current students in dept 11 & 12 ---');
        console.table(before);

        // ============= STEP 2: Delete existing students =============
        console.log('\n--- DELETING existing students ---');
        
        // Delete dept 11 batchNo >= 101 (keep batch 100)
        const [del11] = await conn.query(
            `DELETE FROM students WHERE departmentId = 11 AND batchNo >= 101`
        );
        console.log(`Deleted dept 11 (batch >= 101): ${del11.affectedRows} rows`);

        // Delete dept 12 all
        const [del12] = await conn.query(
            `DELETE FROM students WHERE departmentId = 12`
        );
        console.log(`Deleted dept 12 (all): ${del12.affectedRows} rows`);

        // ============= STEP 3: Insert new students =============
        console.log(`\n--- INSERTING ${data.length} new students ---`);

        const insertQuery = `
            INSERT INTO students (
                student_id, password, instituteId, batchNo, batchdate,
                fullname, subjectsId, courseId, batch_year, loggedin,
                done, center, departmentId, disability, reporting_time,
                start_time, end_time, day, qset, base64, sign_base64,
                IsShorthand, IsTypewriting
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let inserted = 0;
        let errors = 0;

        for (const row of data) {
            const disabilityVal = (row.disability === 'NA' || !row.disability) ? 0 : 1;
            const batchdate = parseDate(row.batchdate);
            const reportingTime = parseTime(row.reporting_time);
            const startTime = parseTime(row.start_time);
            const endTime = parseTime(row.end_time);

            const values = [
                String(row.student_id),          // student_id
                null,                             // password (to be generated later)
                row.center,                       // instituteId
                row.batchNo,                      // batchNo
                batchdate,                        // batchdate
                row.fullname,                     // fullname
                row.subjectsId,                   // subjectsId
                row.courseId,                      // courseId
                row.batch_year,                   // batch_year
                0,                                // loggedin
                0,                                // done
                row.center,                       // center
                row.departmentId,                 // departmentId
                disabilityVal,                    // disability
                reportingTime,                    // reporting_time
                startTime,                        // start_time
                endTime,                          // end_time
                1,                                // day
                1,                                // qset
                row.base64 || null,               // base64 (photo)
                row.sign_base64 || null,          // sign_base64
                row.IsShorthand || 0,             // IsShorthand
                row.IsTypewriting || 0            // IsTypewriting
            ];

            try {
                await conn.query(insertQuery, values);
                inserted++;
                if (inserted % 50 === 0) {
                    console.log(`  Inserted ${inserted} students...`);
                }
            } catch (err) {
                errors++;
                console.error(`  ERROR inserting student_id ${row.student_id}: ${err.message}`);
            }
        }

        console.log(`\nInsert complete: ${inserted} inserted, ${errors} errors`);

        // ============= STEP 4: Verify =============
        const [after] = await conn.query(
            `SELECT departmentId, batchNo, COUNT(*) as count 
             FROM students WHERE departmentId IN (11, 12) 
             GROUP BY departmentId, batchNo ORDER BY departmentId, batchNo`
        );
        console.log('\n--- AFTER: Students in dept 11 & 12 ---');
        console.table(after);

        const [totalAfter] = await conn.query(
            `SELECT COUNT(*) as total FROM students WHERE departmentId IN (11, 12)`
        );
        console.log('Total students in dept 11 & 12:', totalAfter[0].total);

    } catch (err) {
        console.error('FATAL ERROR:', err.message);
    } finally {
        if (conn) await conn.end();
        console.log('\nDone.');
    }
})();
