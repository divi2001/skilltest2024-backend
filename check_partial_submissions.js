const connection = require('./config/db1');

async function checkPartialSubmissions() {
    try {
        console.log('🔍 Checking for Partial Submissions/Logs (One filled, other empty)...');
        console.log('Target Batches: 201, 202\n');
        console.log('='.repeat(80));

        const query = `
            SELECT 
                s.student_id,
                s.fullname,
                s.batchNo,
                tl.texta,
                tl.textb,
                fps.passageA,
                fps.passageB,
                LENGTH(tl.texta) as texta_len,
                LENGTH(tl.textb) as textb_len
            FROM students s
            LEFT JOIN textlogs tl ON s.student_id = tl.student_id
            LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
            WHERE s.batchNo IN (201, 202)
            ORDER BY s.student_id
        `;

        const [results] = await connection.query(query);

        const partialTextLogs = [];
        const partialFinalSubmissions = [];

        results.forEach(s => {
            const hasTextA = s.texta && s.texta.trim().length > 0;
            const hasTextB = s.textb && s.textb.trim().length > 0;
            const hasSubmissionA = s.passageA && s.passageA.trim().length > 0;
            const hasSubmissionB = s.passageB && s.passageB.trim().length > 0;

            // Check for partial text logs
            if ((hasTextA && !hasTextB) || (!hasTextA && hasTextB)) {
                partialTextLogs.push({
                    id: s.student_id,
                    batch: s.batchNo,
                    type: hasTextA ? 'Only Text A' : 'Only Text B',
                    lenA: s.texta_len || 0,
                    lenB: s.textb_len || 0
                });
            }

            // Check for partial final submissions
            if ((hasSubmissionA && !hasSubmissionB) || (!hasSubmissionA && hasSubmissionB)) {
                partialFinalSubmissions.push({
                    id: s.student_id,
                    batch: s.batchNo,
                    type: hasSubmissionA ? 'Only Sub A' : 'Only Sub B'
                });
            }
        });

        console.log('\n📝 PARTIAL TEXT LOGS (In textlogs table):');
        if (partialTextLogs.length > 0) {
            partialTextLogs.forEach((p, idx) => {
                console.log(`${idx + 1}. Student ID: ${p.id} (Batch ${p.batch}) - ${p.type}`);
                console.log(`   Lengths -> A: ${p.lenA}, B: ${p.lenB}`);
            });
        } else {
            console.log('   ✅ No partial text logs found.');
        }

        console.log('\n' + '─'.repeat(80));

        console.log('\n🚀 PARTIAL FINAL SUBMISSIONS (In finalPassageSubmit table):');
        if (partialFinalSubmissions.length > 0) {
            partialFinalSubmissions.forEach((p, idx) => {
                console.log(`${idx + 1}. Student ID: ${p.id} (Batch ${p.batch}) - ${p.type}`);
            });
        } else {
            console.log('   ✅ No partial final submissions found.');
        }

        console.log('\n📊 Summary:');
        console.log(`   Partial Text Logs: ${partialTextLogs.length}`);
        console.log(`   Partial Final Submissions: ${partialFinalSubmissions.length}`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ Check complete!');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPartialSubmissions();
