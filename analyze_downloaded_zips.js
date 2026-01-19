// Check downloaded_passage_logs folder to find students with only one zip
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, 'downloaded_passage_logs');

function analyzeDownloadedZips() {
    try {
        console.log('🔍 Analyzing downloaded_passage_logs folder...\n');
        console.log('='.repeat(80));

        // Get all files in directory
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const zipFiles = files.filter(f => f.endsWith('.zip'));

        console.log(`📦 Total zip files: ${zipFiles.length}\n`);

        // Group by student_id
        const studentZips = {};

        zipFiles.forEach(filename => {
            // Extract student_id from filename (first part before underscore)
            const studentId = filename.split('_')[0];

            if (!studentZips[studentId]) {
                studentZips[studentId] = {
                    passageA: null,
                    passageB: null,
                    count: 0
                };
            }

            if (filename.includes('passageA')) {
                studentZips[studentId].passageA = filename;
                studentZips[studentId].count++;
            } else if (filename.includes('passageB')) {
                studentZips[studentId].passageB = filename;
                studentZips[studentId].count++;
            }
        });

        // Find students with only one zip
        const studentsWithOneZip = [];
        const studentsWithBothZips = [];
        const studentsWithOnlyA = [];
        const studentsWithOnlyB = [];

        for (const [studentId, data] of Object.entries(studentZips)) {
            if (data.count === 1) {
                studentsWithOneZip.push(studentId);
                if (data.passageA) {
                    studentsWithOnlyA.push({ studentId, filename: data.passageA });
                } else {
                    studentsWithOnlyB.push({ studentId, filename: data.passageB });
                }
            } else if (data.count === 2) {
                studentsWithBothZips.push(studentId);
            }
        }

        console.log('📊 SUMMARY:');
        console.log(`   Total unique students: ${Object.keys(studentZips).length}`);
        console.log(`   Students with BOTH zips: ${studentsWithBothZips.length}`);
        console.log(`   Students with ONE zip: ${studentsWithOneZip.length}`);
        console.log(`   - Only Passage A: ${studentsWithOnlyA.length}`);
        console.log(`   - Only Passage B: ${studentsWithOnlyB.length}`);

        console.log('\n' + '='.repeat(80));

        if (studentsWithOnlyA.length > 0) {
            console.log(`\n⚠️  Students with ONLY Passage A (${studentsWithOnlyA.length}):\n`);
            studentsWithOnlyA.forEach((student, idx) => {
                console.log(`   ${idx + 1}. Student ID: ${student.studentId}`);
                console.log(`      File: ${student.filename}`);
                console.log('');
            });
        }

        if (studentsWithOnlyB.length > 0) {
            console.log('─'.repeat(80));
            console.log(`\n⚠️  Students with ONLY Passage B (${studentsWithOnlyB.length}):\n`);
            studentsWithOnlyB.forEach((student, idx) => {
                console.log(`   ${idx + 1}. Student ID: ${student.studentId}`);
                console.log(`      File: ${student.filename}`);
                console.log('');
            });
        }

        console.log('='.repeat(80));
        console.log('\n📈 CALCULATIONS:');
        console.log(`   Total zip files: ${zipFiles.length}`);
        console.log(`   Expected if all complete: ${Object.keys(studentZips).length} × 2 = ${Object.keys(studentZips).length * 2}`);
        console.log(`   Missing zips: ${(Object.keys(studentZips).length * 2) - zipFiles.length}`);
        console.log(`   Students missing one zip: ${studentsWithOneZip.length}`);

        console.log('\n✅ Analysis complete!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

analyzeDownloadedZips();
