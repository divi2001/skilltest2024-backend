// Script to check textlogs vs finalPassageSubmit for unsubmitted passages
const connection = require('./config/db1');

async function checkUnsubmittedPassages() {
    try {
        console.log('🔍 Checking textlogs vs finalPassageSubmit...\n');
        console.log('='.repeat(80));

        // Check for Passage A: has texta but no passageA in finalPassageSubmit (excluding batch 100)
        console.log('\n📝 PASSAGE A - Students with texta but no submission (excluding Batch 100):\n');
        const [passageAResults] = await connection.query(`
            SELECT 
                tl.student_id,
                s.batchNo,
                tl.texta,
                fps.passageA,
                LENGTH(tl.texta) as texta_length,
                tl.created_at
            FROM textlogs tl
            LEFT JOIN finalPassageSubmit fps ON tl.student_id = fps.student_id
            INNER JOIN students s ON tl.student_id = s.student_id
            WHERE tl.texta IS NOT NULL 
                AND tl.texta != ''
                AND (fps.passageA IS NULL OR fps.passageA = '')
                AND s.batchNo IN (201, 202)
            ORDER BY tl.student_id
        `);

        if (passageAResults && passageAResults.length > 0) {
            console.log(`   ⚠️  Found ${passageAResults.length} student(s) with unsubmitted Passage A\n`);
            passageAResults.forEach((student, idx) => {
                console.log(`   ${idx + 1}. Student ID: ${student.student_id} (Batch ${student.batchNo})`);
                console.log(`      Texta Length: ${student.texta_length} characters`);
                console.log(`      Passage A Submitted: ${student.passageA ? 'YES' : 'NO'}`);
                console.log(`      Created At: ${student.created_at}`);
                console.log('');
            });
        } else {
            console.log('   ✅ No students found with unsubmitted Passage A\n');
        }

        console.log('─'.repeat(80));

        // Check for Passage B: has textb but no passageB in finalPassageSubmit (excluding batch 100)
        console.log('\n📝 PASSAGE B - Students with textb but no submission (excluding Batch 100):\n');
        const [passageBResults] = await connection.query(`
            SELECT 
                tl.student_id,
                s.batchNo,
                tl.textb,
                fps.passageB,
                LENGTH(tl.textb) as textb_length,
                tl.created_at
            FROM textlogs tl
            LEFT JOIN finalPassageSubmit fps ON tl.student_id = fps.student_id
            INNER JOIN students s ON tl.student_id = s.student_id
            WHERE tl.textb IS NOT NULL 
                AND tl.textb != ''
                AND (fps.passageB IS NULL OR fps.passageB = '')
                AND s.batchNo IN (201, 202)
            ORDER BY tl.student_id
        `);

        if (passageBResults && passageBResults.length > 0) {
            console.log(`   ⚠️  Found ${passageBResults.length} student(s) with unsubmitted Passage B\n`);
            passageBResults.forEach((student, idx) => {
                console.log(`   ${idx + 1}. Student ID: ${student.student_id} (Batch ${student.batchNo})`);
                console.log(`      Textb Length: ${student.textb_length} characters`);
                console.log(`      Passage B Submitted: ${student.passageB ? 'YES' : 'NO'}`);
                console.log(`      Created At: ${student.created_at}`);
                console.log('');
            });
        } else {
            console.log('   ✅ No students found with unsubmitted Passage B\n');
        }

        console.log('='.repeat(80));

        // Summary
        console.log('\n📊 SUMMARY:');
        console.log(`   Passage A - Unsubmitted: ${passageAResults.length}`);
        console.log(`   Passage B - Unsubmitted: ${passageBResults.length}`);
        console.log(`   Total Issues: ${passageAResults.length + passageBResults.length}`);

        // Check for students with BOTH issues
        const studentIdsA = new Set(passageAResults.map(s => s.student_id));
        const studentIdsB = new Set(passageBResults.map(s => s.student_id));
        const both = [...studentIdsA].filter(id => studentIdsB.has(id));

        if (both.length > 0) {
            console.log(`\n   ⚠️  ${both.length} student(s) have BOTH passages unsubmitted:`);
            both.forEach(id => {
                console.log(`      - Student ID: ${id}`);
            });
        }

        console.log('\n✅ Check complete!\n');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        await connection.end();
        process.exit(1);
    }
}

checkUnsubmittedPassages();
