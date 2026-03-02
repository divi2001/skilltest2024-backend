const connection = require('./config/db1');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const moment = require('moment');

async function fixAllMissingPassageB() {
    const targetBatches = [101, 102, 103, 104, 201, 202, 203, 204];

    try {
        console.log(`🔍 Identifying students in batches ${targetBatches.join(', ')} missing Passage B zips...`);

        // We only target students who have a loginTime (meaning they at least started the exam)
        const query = `
            SELECT 
                s.student_id, 
                s.center, 
                s.batchNo, 
                tr.PA_filename, 
                tr.PB_filename,
                sl.feedback_time,
                sl.passage2_time,
                sl.loginTime
            FROM students s
            LEFT JOIN trackrecord tr ON s.student_id = tr.student_id
            LEFT JOIN studentlogs sl ON s.student_id = sl.student_id
            WHERE s.batchNo IN (${targetBatches.join(',')})
            AND sl.loginTime IS NOT NULL
            AND (tr.PB_filename IS NULL OR tr.PB_filename = '')
        `;

        const [students] = await connection.query(query);

        if (students.length === 0) {
            console.log('✅ No eligible students found with missing Passage B zips.');
            process.exit(0);
        }

        console.log(`⚠️  Found ${students.length} students. Starting blank zip creation...\n`);

        const typingLogDir = path.join(__dirname, 'typing_passage_logs');
        const downloadDir = path.join(__dirname, 'downloaded_passage_logs');

        if (!fs.existsSync(typingLogDir)) fs.mkdirSync(typingLogDir, { recursive: true });
        if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

        for (const s of students) {
            try {
                // 1. Determine MAC Address
                let mac = 'UNKNOWN_MAC';
                if (s.PA_filename) {
                    const match = s.PA_filename.match(/_passageA_([A-Z0-9]+)\.zip/);
                    if (match) mac = match[1];
                }

                // 2. Determine Timestamp
                const timestamp = s.feedback_time || s.passage2_time || s.loginTime;
                const formattedTime = moment(timestamp).format('YYYYMMDD_HHmmss');

                // 3. Create Filename
                const zipFilename = `${s.student_id}_${s.center}_${formattedTime}_${s.batchNo}_passageB_${mac}.zip`;
                const zipPath = path.join(typingLogDir, zipFilename);
                const downloadZipPath = path.join(downloadDir, zipFilename);

                // 4. Create ZIP (Internal text file is blank)
                const output = fs.createWriteStream(zipPath);
                const archive = archiver('zip', { zlib: { level: 9 } });

                await new Promise((resolve, reject) => {
                    output.on('close', resolve);
                    archive.on('error', reject);
                    archive.pipe(output);
                    const txtFilename = zipFilename.replace('.zip', '.txt');
                    archive.append("", { name: txtFilename });
                    archive.finalize();
                });

                // 5. Copy to download dir
                fs.copyFileSync(zipPath, downloadZipPath);

                // 6. Update Database
                // Update finalPassageSubmit (blank text)
                const [existingFPS] = await connection.query('SELECT * FROM finalPassageSubmit WHERE student_id = ?', [s.student_id]);
                if (existingFPS.length > 0) {
                    await connection.query('UPDATE finalPassageSubmit SET passageB = "" WHERE student_id = ?', [s.student_id]);
                } else {
                    await connection.query('INSERT INTO finalPassageSubmit (student_id, passageB) VALUES (?, "")', [s.student_id]);
                }

                // Update trackrecord
                const [existingTR] = await connection.query('SELECT * FROM trackrecord WHERE student_id = ?', [s.student_id]);
                if (existingTR.length > 0) {
                    await connection.query('UPDATE trackrecord SET PB_filename = ? WHERE student_id = ?', [zipFilename, s.student_id]);
                } else {
                    await connection.query('INSERT INTO trackrecord (student_id, PB_filename) VALUES (?, ?)', [s.student_id, zipFilename]);
                }

                console.log(`✅ Fixed: ${s.student_id} (Batch ${s.batchNo}) -> ${zipFilename}`);

            } catch (err) {
                console.error(`❌ Error fixing student ${s.student_id}:`, err.message);
            }
        }

        console.log('\n✨ Processing complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Database error:', err);
        process.exit(1);
    }
}

fixAllMissingPassageB();
