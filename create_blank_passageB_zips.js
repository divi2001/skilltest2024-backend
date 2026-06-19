// Script to create blank Passage B zips for specific students
const connection = require('./config/db1');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const moment = require('moment');

const studentsToFix = [
    {
        id: 8251639181,
        center: 8251,
        batch: 204,
        mac: '0024E83DAF0B',
        timestamp: '2026-01-20T10:55:08.000Z'
    },
    {
        id: 8351609478,
        center: 8351,
        batch: 201,
        mac: 'D067E5234789',
        timestamp: '2026-01-20T04:36:32.000Z'
    }
];

async function createBlankZip(student) {
    const { id, center, batch, mac, timestamp } = student;
    const formattedTime = moment(timestamp).format('YYYYMMDD_HHmmss');
    const zipFilename = `${id}_${center}_${formattedTime}_${batch}_passageB_${mac}.zip`;
    const zipDir = path.join(__dirname, 'typing_passage_logs');

    if (!fs.existsSync(zipDir)) {
        fs.mkdirSync(zipDir, { recursive: true });
    }

    const zipPath = path.join(zipDir, zipFilename);
    const textContent = ""; // Blank content as requested

    console.log(`\n📦 Student ${id}: Creating zip ${zipFilename}...`);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        const txtFilename = zipFilename.replace('.zip', '.txt');
        archive.append(textContent, { name: txtFilename });
        archive.finalize();
    });

    console.log(`✅ Zip created at ${zipPath}`);

    // Copy to downloaded_passage_logs as well
    const downloadDir = path.join(__dirname, 'downloaded_passage_logs');
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    const downloadZipPath = path.join(downloadDir, zipFilename);

    fs.copyFileSync(zipPath, downloadZipPath);
    console.log(`📂 Also copied zip to ${downloadDir}`);

    // Update Database
    console.log(`💾 Updating database for student ${id}...`);

    // 1. Update finalPassageSubmit
    const [existingFPS] = await connection.query('SELECT * FROM finalPassageSubmit WHERE student_id = ?', [id]);
    if (existingFPS.length > 0) {
        await connection.query('UPDATE finalPassageSubmit SET passageB = ? WHERE student_id = ?', [textContent, id]);
        console.log('   - Updated finalPassageSubmit.passageB');
    } else {
        await connection.query('INSERT INTO finalPassageSubmit (student_id, passageB) VALUES (?, ?)', [id, textContent]);
        console.log('   - Inserted into finalPassageSubmit');
    }

    // 2. Update trackrecord
    const [existingTR] = await connection.query('SELECT * FROM trackrecord WHERE student_id = ?', [id]);
    if (existingTR.length > 0) {
        await connection.query('UPDATE trackrecord SET PB_filename = ? WHERE student_id = ?', [zipFilename, id]);
        console.log('   - Updated trackrecord.PB_filename');
    } else {
        await connection.query('INSERT INTO trackrecord (student_id, PB_filename) VALUES (?, ?)', [id, zipFilename]);
        console.log('   - Inserted into trackrecord');
    }
}

async function start() {
    try {
        console.log('🚀 Starting creation of blank Passage B zips...\n');
        for (const student of studentsToFix) {
            await createBlankZip(student);
        }
        console.log('\n✨ All tasks completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ ERROR:', err);
        process.exit(1);
    }
}

start();
