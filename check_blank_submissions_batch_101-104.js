const connection = require('./config/db1');

async function checkBlankSubmissions() {
    try {
        console.log('🔍 Checking for BLANK vs FILLED submissions in finalPassageSubmit...');
        console.log('Target Batches: 101, 102, 103, 104\n');
        console.log('='.repeat(90));

        const query = `
            SELECT 
                f.student_id, 
                s.batchNo, 
                s.loggedin AS login_flag,
                CASE WHEN f.passageA IS NULL OR TRIM(f.passageA) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageA_status, 
                CASE WHEN f.passageB IS NULL OR TRIM(f.passageB) = '' THEN 'BLANK' ELSE 'FILLED' END AS passageB_status 
            FROM finalPassageSubmit f 
            JOIN students s ON s.student_id = f.student_id 
            WHERE s.batchNo IN (101, 102, 103, 104) 
            AND ((f.passageA IS NULL OR TRIM(f.passageA) = '') OR (f.passageB IS NULL OR TRIM(f.passageB) = ''));
        `;

        const [results] = await connection.query(query);

        if (results && results.length > 0) {
            console.log(`| Student ID   | Batch | Login Flag | Passage A Status | Passage B Status |`);
            console.log(`|${'-'.repeat(14)}|${'-'.repeat(7)}|${'-'.repeat(12)}|${'-'.repeat(18)}|${'-'.repeat(18)}|`);

            results.forEach(row => {
                const id = row.student_id.toString().padEnd(12);
                const batch = row.batchNo.toString().padEnd(5);
                const login = (row.login_flag === 1 ? 'LOGGED IN' : 'OFFLINE').padEnd(10);
                const statusA = row.passageA_status.padEnd(16);
                const statusB = row.passageB_status.padEnd(16);

                console.log(`| ${id} | ${batch} | ${login} | ${statusA} | ${statusB} |`);
            });
        } else {
            console.log('✅ No students found with blank submissions in targeted batches.');
        }

        console.log('\n📊 Summary:');
        console.log(`   Students with blank fields: ${results.length}`);

        console.log('\n' + '='.repeat(90));
        console.log('✅ Query complete!');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkBlankSubmissions();
