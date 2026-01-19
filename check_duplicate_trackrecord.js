// Check for duplicate student IDs in trackrecord for batches 101-104
const connection = require('./config/db1');

async function checkDuplicates() {
    try {
        console.log('🔍 Checking for duplicate student IDs in trackrecord for batches 101-104...\n');
        console.log('='.repeat(80));

        // Find duplicate student_ids in trackrecord
        const [duplicates] = await connection.query(`
            SELECT 
                tr.student_id,
                s.batchNo,
                COUNT(*) as count
            FROM trackrecord tr
            INNER JOIN students s ON tr.student_id = s.student_id
            WHERE s.batchNo IN (101, 102, 103, 104)
            GROUP BY tr.student_id, s.batchNo
            HAVING COUNT(*) > 1
            ORDER BY count DESC, s.batchNo, tr.student_id
        `);

        if (duplicates && duplicates.length > 0) {
            console.log(`⚠️  Found ${duplicates.length} duplicate student ID(s):\n`);
            duplicates.forEach((dup, idx) => {
                console.log(`${idx + 1}. Student ID: ${dup.student_id} (Batch ${dup.batchNo})`);
                console.log(`   Appears ${dup.count} times in trackrecord table`);
                console.log('');
            });

            // Get details of the duplicate entries
            console.log('='.repeat(80));
            console.log('\n📋 Detailed information for duplicates:\n');

            for (const dup of duplicates) {
                const [details] = await connection.query(`
                    SELECT 
                        tr.student_id,
                        tr.PA_filename,
                        tr.PB_filename,
                        s.batchNo,
                        s.fullname
                    FROM trackrecord tr
                    INNER JOIN students s ON tr.student_id = s.student_id
                    WHERE tr.student_id = ?
                `, [dup.student_id]);

                console.log(`Student ID: ${dup.student_id} - ${details[0]?.fullname || 'N/A'} (Batch ${dup.batchNo})`);
                details.forEach((detail, idx) => {
                    console.log(`  Entry ${idx + 1}:`);
                    console.log(`    PA_filename: ${detail.PA_filename || 'NULL'}`);
                    console.log(`    PB_filename: ${detail.PB_filename || 'NULL'}`);
                });
                console.log('');
            }
        } else {
            console.log('✅ No duplicate student IDs found in trackrecord for batches 101-104\n');
        }

        // Count total unique students
        const [uniqueCount] = await connection.query(`
            SELECT COUNT(DISTINCT tr.student_id) as unique_count
            FROM trackrecord tr
            INNER JOIN students s ON tr.student_id = s.student_id
            WHERE s.batchNo IN (101, 102, 103, 104)
        `);

        // Count total records
        const [totalCount] = await connection.query(`
            SELECT COUNT(*) as total_count
            FROM trackrecord tr
            INNER JOIN students s ON tr.student_id = s.student_id
            WHERE s.batchNo IN (101, 102, 103, 104)
        `);

        console.log('='.repeat(80));
        console.log('\n📊 SUMMARY:');
        console.log(`   Total records in trackrecord: ${totalCount[0].total_count}`);
        console.log(`   Unique students: ${uniqueCount[0].unique_count}`);
        console.log(`   Duplicates: ${totalCount[0].total_count - uniqueCount[0].unique_count}`);

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

checkDuplicates();
