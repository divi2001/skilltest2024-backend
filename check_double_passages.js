const fs = require('fs');
const path = require('path');

async function checkDoublePassages() {
    const logDir = path.join(__dirname, 'downloaded_passage_logs');

    try {
        if (!fs.existsSync(logDir)) {
            console.error(`❌ Directory not found: ${logDir}`);
            process.exit(1);
        }

        console.log(`🔍 Scanning directory: ${logDir} for students with BOTH Passage A and Passage B...\n`);

        const files = fs.readdirSync(logDir);
        const studentMap = new Map();

        files.forEach(file => {
            // Pattern: STUDENTID_CENTER_TIMESTAMP_BATCH_passage[A|B]_MAC.zip
            // We can split by underscore or use regex
            const match = file.match(/^(\d+)_.*passage([AB])_.*\.zip$/i);

            if (match) {
                const studentId = match[1];
                const type = match[2].toUpperCase(); // A or B

                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, { hasA: false, hasB: false, filesA: [], filesB: [] });
                }

                const data = studentMap.get(studentId);
                if (type === 'A') {
                    data.hasA = true;
                    data.filesA.push(file);
                } else if (type === 'B') {
                    data.hasB = true;
                    data.filesB.push(file);
                }
            }
        });

        const completeStudents = [];
        const missingA = [];
        const missingB = [];

        studentMap.forEach((data, id) => {
            if (data.hasA && data.hasB) {
                completeStudents.push({ id, ...data });
            } else if (data.hasA && !data.hasB) {
                missingB.push({ id, ...data });
            } else if (!data.hasA && data.hasB) {
                missingA.push({ id, ...data });
            }
        });

        console.log('='.repeat(80));
        console.log(`✅ STUDENTS WITH BOTH PASSAGES (A & B): ${completeStudents.length}`);
        console.log('='.repeat(80));

        if (completeStudents.length > 0) {
            completeStudents.sort((a, b) => a.id.localeCompare(b.id)).forEach((s, idx) => {
                console.log(`${idx + 1}. Student ID: ${s.id}`);
                console.log(`   - Passage A: ${s.filesA.join(', ')}`);
                console.log(`   - Passage B: ${s.filesB.join(', ')}`);
                console.log('─'.repeat(40));
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log(`📊 SUMMARY:`);
        console.log(`   - Total unique students found: ${studentMap.size}`);
        console.log(`   - Students with both A & B: ${completeStudents.length}`);
        console.log(`   - Students with ONLY A: ${missingB.length}`);
        console.log(`   - Students with ONLY B: ${missingA.length}`);
        console.log('='.repeat(80));

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

checkDoublePassages();
