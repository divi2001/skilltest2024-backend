// Download zip files for Department 11, Batches 101/102/103
// from http://13.204.48.33:8000/typing_passage_logs/
// using filenames stored in trackrecord table

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const connection = require('./config/db1');

const BASE_URL = 'http://13.204.48.33:8000/typing_passage_logs/';
const DOWNLOAD_DIR = path.join(__dirname, 'downloaded_zips_dept11');

const DEPARTMENT_ID = 11;
const BATCHES = [101, 102, 103];

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    console.log(`Created download folder: ${DOWNLOAD_DIR}`);
} else {
    console.log(`Download folder: ${DOWNLOAD_DIR}`);
}

const downloadFile = async (filename) => {
    if (!filename) return 'skipped';

    const fileUrl = `${BASE_URL}${filename}`;
    const filePath = path.join(DOWNLOAD_DIR, filename);

    if (fs.existsSync(filePath)) {
        console.log(`  [SKIP] Already exists: ${filename}`);
        return 'exists';
    }

    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
            timeout: 60000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve) => {
            writer.on('finish', () => {
                console.log(`  [OK]   Downloaded: ${filename}`);
                resolve('downloaded');
            });
            writer.on('error', (err) => {
                console.error(`  [ERR]  Write error ${filename}: ${err.message}`);
                resolve('error');
            });
        });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`  [404]  Not found on server: ${filename}`);
        } else {
            console.error(`  [ERR]  ${filename}: ${error.message}`);
        }
        return 'error';
    }
};

const main = async () => {
    try {
        console.log('='.repeat(70));
        console.log(`Fetching zips for Department ${DEPARTMENT_ID}, Batches: ${BATCHES.join(', ')}`);
        console.log('='.repeat(70));

        const placeholders = BATCHES.map(() => '?').join(',');
        const query = `
            SELECT 
                tr.student_id,
                tr.PA_filename,
                tr.PB_filename,
                s.batchNo,
                s.departmentId
            FROM trackrecord tr
            INNER JOIN students s ON tr.student_id = s.student_id
            WHERE s.departmentId = ?
              AND s.batchNo IN (${placeholders})
            ORDER BY s.batchNo, tr.student_id
        `;

        const [rows] = await connection.query(query, [DEPARTMENT_ID, ...BATCHES]);

        if (rows.length === 0) {
            console.log('\n⚠️  No trackrecord entries found for dept 11, batches 101/102/103.');
            await connection.end();
            process.exit(0);
        }

        console.log(`\nFound ${rows.length} students with trackrecord entries.\n`);

        // Batch distribution
        const batchCounts = {};
        rows.forEach(r => {
            batchCounts[r.batchNo] = (batchCounts[r.batchNo] || 0) + 1;
        });
        console.log('Batch distribution:');
        Object.keys(batchCounts).sort().forEach(b => {
            console.log(`  Batch ${b}: ${batchCounts[b]} students`);
        });
        console.log('');

        // Count available filenames
        const paCount = rows.filter(r => r.PA_filename).length;
        const pbCount = rows.filter(r => r.PB_filename).length;
        console.log(`Passage A filenames: ${paCount}`);
        console.log(`Passage B filenames: ${pbCount}`);
        console.log(`\nStarting downloads to: ${DOWNLOAD_DIR}\n`);
        console.log('-'.repeat(70));

        let downloaded = 0, skipped = 0, errors = 0;

        for (const record of rows) {
            console.log(`Student ${record.student_id} (Batch ${record.batchNo}):`);

            if (record.PA_filename) {
                const result = await downloadFile(record.PA_filename);
                if (result === 'downloaded') downloaded++;
                else if (result === 'exists') skipped++;
                else if (result === 'error') errors++;
            } else {
                console.log('  [SKIP] No PA_filename in trackrecord');
            }

            if (record.PB_filename) {
                const result = await downloadFile(record.PB_filename);
                if (result === 'downloaded') downloaded++;
                else if (result === 'exists') skipped++;
                else if (result === 'error') errors++;
            } else {
                console.log('  [SKIP] No PB_filename in trackrecord');
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('DONE');
        console.log(`  Downloaded : ${downloaded}`);
        console.log(`  Already existed (skipped) : ${skipped}`);
        console.log(`  Errors     : ${errors}`);
        console.log(`  Saved to   : ${DOWNLOAD_DIR}`);
        console.log('='.repeat(70));

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('\nScript failed:', error);
        await connection.end();
        process.exit(1);
    }
};

main();
