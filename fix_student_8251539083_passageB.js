// Fix student 8251539083 - Create passageB zip and update database
const connection = require('./config/db1');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const moment = require('moment');

const STUDENT_ID = 8251539083;
const CENTER = 8251;
const BATCH = 104;
const MAC_ADDRESS = '0024E846B15A'; // Same as passageA

async function fixStudent() {
    try {
        console.log(`🔧 Fixing student ${STUDENT_ID}...\n`);
        console.log('='.repeat(80));

        // Get textb content
        const [textlogs] = await connection.query(
            'SELECT textb FROM textlogs WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (!textlogs.length || !textlogs[0].textb) {
            console.log('❌ No textb found for this student');
            await connection.end();
            return;
        }

        const textbContent = textlogs[0].textb;
        console.log(`✅ Found textb: ${textbContent.length} characters\n`);

        // Get feedback time from studentlogs
        const [studentlogs] = await connection.query(
            'SELECT feedback_time, passage2_time FROM studentlogs WHERE student_id = ?',
            [STUDENT_ID]
        );

        const timestamp = studentlogs[0].feedback_time || studentlogs[0].passage2_time;
        const formattedTime = moment(timestamp).format('YYYYMMDD_HHmmss');
        console.log(`📅 Using timestamp: ${timestamp}`);
        console.log(`   Formatted: ${formattedTime}\n`);

        // Create zip filename
        const zipFilename = `${STUDENT_ID}_${CENTER}_${formattedTime}_${BATCH}_passageB_${MAC_ADDRESS}.zip`;
        console.log(`📦 Zip filename: ${zipFilename}\n`);

        // Create directory if needed
        const zipDir = path.join(__dirname, 'typing_passage_logs');
        if (!fs.existsSync(zipDir)) {
            fs.mkdirSync(zipDir, { recursive: true });
        }

        const zipPath = path.join(zipDir, zipFilename);

        // Create zip file
        console.log('🗜️  Creating zip file...');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
            output.on('close', () => {
                console.log(`✅ Zip created: ${archive.pointer()} bytes\n`);
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            // txt filename should be same as zip filename (without .zip extension)
            const txtFilename = zipFilename.replace('.zip', '.txt');
            archive.append(textbContent, { name: txtFilename });

            archive.finalize();
        });

        console.log('💾 Updating database...\n');

        // 1. Update/Insert into finalPassageSubmit with ACTUAL TEXT CONTENT (not zip filename)
        const [existing] = await connection.query(
            'SELECT * FROM finalPassageSubmit WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (existing.length > 0) {
            await connection.query(
                'UPDATE finalPassageSubmit SET passageB = ? WHERE student_id = ?',
                [textbContent, STUDENT_ID]  // Store actual text content
            );
            console.log('✅ Updated finalPassageSubmit.passageB with text content');
        } else {
            await connection.query(
                'INSERT INTO finalPassageSubmit (student_id, passageB) VALUES (?, ?)',
                [STUDENT_ID, textbContent]  // Store actual text content
            );
            console.log('✅ Inserted into finalPassageSubmit with text content');
        }

        // 2. Update trackrecord
        const [trackrecord] = await connection.query(
            'SELECT * FROM trackrecord WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (trackrecord.length > 0) {
            await connection.query(
                'UPDATE trackrecord SET PB_filename = ? WHERE student_id = ?',
                [zipFilename, STUDENT_ID]
            );
            console.log('✅ Updated trackrecord.PB_filename');
        } else {
            await connection.query(
                'INSERT INTO trackrecord (student_id, PB_filename) VALUES (?, ?)',
                [STUDENT_ID, zipFilename]
            );
            console.log('✅ Inserted into trackrecord');
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ STUDENT FIXED SUCCESSFULLY!\n');
        console.log('Summary:');
        console.log(`   Student ID: ${STUDENT_ID}`);
        console.log(`   Zip File: ${zipFilename}`);
        console.log(`   Location: ${zipPath}`);
        console.log(`   File Size: ${fs.statSync(zipPath).size} bytes`);
        console.log(`   Text Length: ${textbContent.length} characters`);
        console.log('\n🎉 PassageB is now submitted and zip file created!');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        await connection.end();
        process.exit(1);
    }
}

fixStudent();
