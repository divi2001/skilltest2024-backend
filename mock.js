const connection = require('./config/db1');
const { encrypt, decrypt } = require('./config/encrypt');

// Enhanced mock data generation based on existing center-department relationships and examcenterdb max_pc
const generateMockDataFromExistingPatterns = async () => {
    try {
        console.log('🔍 Generating mock data based on existing center-department patterns and examcenterdb max_pc...');
        
        // Check if SECRET_KEY is loaded correctly
        console.log('SECRET_KEY loaded:', process.env.SECRET_KEY ? 'Yes' : 'No');
        console.log('SECRET_KEY length:', process.env.SECRET_KEY ? process.env.SECRET_KEY.length : 'undefined');

        // Parameters for mock data
        const TARGET_BATCH_NO = 100;
        const SUBJECTS = [40, 41]; // Always use subjects 40 and 41
        const MOCK_PASSWORD = 'mock123';
        
        // Test encryption/decryption first
        console.log('\n🔐 Testing Encryption/Decryption:');
        try {
            const testEncrypted = encrypt(MOCK_PASSWORD);
            const testDecrypted = decrypt(testEncrypted);
            console.log(`   Original: ${MOCK_PASSWORD}`);
            console.log(`   Encrypted: ${testEncrypted.substring(0, 50)}...`);
            console.log(`   Decrypted: ${testDecrypted}`);
            console.log(`   Test Result: ${testDecrypted === MOCK_PASSWORD ? '✅ SUCCESS' : '❌ FAILED'}`);
        } catch (encryptionError) {
            console.error('❌ Encryption test failed:', encryptionError.message);
            return;
        }

        // Step 1: Get existing center-department relationships from students table
        console.log('\n📊 Step 1: Getting existing center-department relationships...');
        const [centerDeptRelations] = await connection.query(`
            SELECT DISTINCT center, departmentId 
            FROM students 
            ORDER BY departmentId, center
        `);

        if (centerDeptRelations.length === 0) {
            console.log('❌ No existing center-department relationships found in students table');
            return;
        }

        console.log('Found center-department relationships:');
        console.log('Center | Department');
        console.log('-------|----------');
        for (const relation of centerDeptRelations) {
            console.log(`${relation.center.toString().padStart(6)} |     ${relation.departmentId.toString().padStart(2)}`);
        }

        // Step 2: Get max_pc for each center from examcenterdb
        console.log('\n📊 Step 2: Getting max_pc values from examcenterdb...');
        const centerCapacities = {};
        
        for (const relation of centerDeptRelations) {
            const [capacityResult] = await connection.query(`
                SELECT max_pc 
                FROM examcenterdb 
                WHERE center = ?
            `, [relation.center]);
            
            if (capacityResult.length > 0) {
                centerCapacities[relation.center] = {
                    max_pc: capacityResult[0].max_pc + 50,
                    departmentId: relation.departmentId
                };
            } else {
                console.log(`   ⚠️  No max_pc found for center ${relation.center}, skipping...`);
            }
        }

        console.log('Center capacities found:');
        console.log('Center | Department | Max PC');
        console.log('-------|------------|-------');
        for (const [center, data] of Object.entries(centerCapacities)) {
            console.log(`${center.toString().padStart(6)} |     ${data.departmentId.toString().padStart(2)}     |  ${data.max_pc.toString().padStart(3)}`);
        }

        // Step 3: Generate mock data for each center
        console.log('\n🚀 Step 3: Generating mock data...');
        const encryptedPassword = encrypt(MOCK_PASSWORD);
        let totalStudentsCreated = 0;
        const departmentSummary = {};

        for (const [center, centerData] of Object.entries(centerCapacities)) {
            const centerId = parseInt(center);
            const departmentId = centerData.departmentId;
            const maxStudents = centerData.max_pc;
            
            console.log(`\n📝 Processing Center ${centerId} (Department ${departmentId}, Max: ${maxStudents}):`);

            // Initialize department summary if not exists
            if (!departmentSummary[departmentId]) {
                departmentSummary[departmentId] = { centers: 0, students: 0 };
            }
            departmentSummary[departmentId].centers++;

            // Get batch timing information for this department
            const [batchInfo] = await connection.query(
                'SELECT reporting_time, start_time, end_time FROM batchdb WHERE batchNo = ? AND departmentId = ?',
                [TARGET_BATCH_NO, departmentId]
            );
            
            let batchData;
            if (batchInfo.length === 0) {
                console.log(`   ⚠️  No batch ${TARGET_BATCH_NO} found for department ${departmentId}, using default times`);
                batchData = {
                    reporting_time: '09:00:00',
                    start_time: '10:00:00',
                    end_time: '13:00:00'
                };
            } else {
                batchData = batchInfo[0];
            }

            // Split students evenly between subjects 40 and 41
            const studentsPerSubject = Math.floor(maxStudents / SUBJECTS.length);
            const extraStudents = maxStudents % SUBJECTS.length;

            console.log(`   📋 Creating ${maxStudents} students (${studentsPerSubject} per subject + ${extraStudents} extra)`);
            console.log(`   ⏰ Batch timing: ${batchData.reporting_time} - ${batchData.start_time} - ${batchData.end_time}`);

            // **FIXED ID GENERATION - ALWAYS START FROM 0001 FOR EACH CENTER**
            const centerPrefix = centerId.toString();
            let currentSequence = 1; // Always start from 0001 for each center

            console.log(`   🔢 Starting ID generation from: ${centerPrefix}${currentSequence.toString().padStart(4, '0')} (${centerPrefix}0001)`);

            let centerStudentsCreated = 0;

            // Create students for each subject
            for (let subjectIndex = 0; subjectIndex < SUBJECTS.length; subjectIndex++) {
                const subjectId = SUBJECTS[subjectIndex];
                const studentsForThisSubject = studentsPerSubject + (subjectIndex < extraStudents ? 1 : 0);
                
                console.log(`     Subject ${subjectId}: Creating ${studentsForThisSubject} students`);

                for (let i = 0; i < studentsForThisSubject; i++) {
                    // Generate ID in format: center + 4-digit sequence (e.g., 12340001, 12340002)
                    const studentId = parseInt(centerPrefix + currentSequence.toString().padStart(4, '0'));
                    const fullname = `Mock Student C${centerId}D${departmentId}S${subjectId}-${currentSequence.toString().padStart(4, '0')}`;

                    const insertStudentQuery = `
                        INSERT INTO students (
                            student_id, password, instituteId, batchNo, batchdate, 
                            fullname, subjectsId, courseId, batch_year, loggedin, 
                            done, center, departmentId, disability, reporting_time, 
                            start_time, end_time, day, qset, base64, sign_base64, 
                            IsShorthand, IsTypewriting
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const studentValues = [
                        studentId,                          // student_id
                        encryptedPassword,                  // password (encrypted)
                        centerId,                           // instituteId (using center as institute)
                        TARGET_BATCH_NO,                   // batchNo
                        '2025-08-11',                      // batchdate (current date)
                        fullname,                          // fullname
                        subjectId,                         // subjectsId (40 or 41)
                        1,                                 // courseId (default to 1)
                        '2025',                            // batch_year
                        0,                                 // loggedin (false)
                        0,                                 // done (false)
                        centerId,                          // center
                        departmentId,                      // departmentId (from existing relationship)
                        0,                                 // disability (false)
                        batchData.reporting_time,          // reporting_time from batchdb
                        batchData.start_time,              // start_time from batchdb
                        batchData.end_time,                // end_time from batchdb
                        1,                                 // day (default to 1)
                        1,                                 // qset (default to 1)
                        null,                              // base64 (null for now)
                        null,                              // sign_base64 (null for now)
                        1,                                 // IsShorthand (set to 1)
                        0                                  // IsTypewriting (set to 0)
                    ];

                    try {
                        await connection.query(insertStudentQuery, studentValues);
                        totalStudentsCreated++;
                        centerStudentsCreated++;
                        departmentSummary[departmentId].students++;
                        currentSequence++; // Increment sequence for next student
                        
                        // Log progress every 100 students
                        if (totalStudentsCreated % 100 === 0) {
                            console.log(`       📊 Progress: ${totalStudentsCreated} total students created...`);
                        }
                        
                    } catch (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            console.log(`       ⚠️  Student ID ${studentId} already exists, trying next sequence...`);
                            // Find next available sequence number
                            let foundAvailable = false;
                            while (!foundAvailable && currentSequence <= 9999) {
                                currentSequence++;
                                const nextStudentId = parseInt(centerPrefix + currentSequence.toString().padStart(4, '0'));
                                const [existingCheck] = await connection.query(
                                    'SELECT student_id FROM students WHERE student_id = ?',
                                    [nextStudentId]
                                );
                                if (existingCheck.length === 0) {
                                    foundAvailable = true;
                                    console.log(`       ✅ Found available sequence: ${currentSequence.toString().padStart(4, '0')}`);
                                }
                            }
                            if (!foundAvailable) {
                                console.log(`       ❌ No available sequence found for center ${centerId}, skipping...`);
                                break;
                            }
                            // Retry with new sequence (don't increment currentSequence here as it will be incremented in the retry)
                            i--; // Retry this iteration
                        } else {
                            console.error(`       ❌ Error creating student ${studentId}:`, error.message);
                            currentSequence++; // Increment even on other errors
                        }
                    }
                }
            }

            console.log(`     ✅ Center ${centerId} completed: ${centerStudentsCreated}/${maxStudents} students created`);
            console.log(`     🔢 ID Range: ${centerPrefix}0001 to ${centerPrefix}${(currentSequence - 1).toString().padStart(4, '0')}`);
        }

        // Final summary
        console.log(`\n🎉 Mock data generation completed!`);
        console.log(`📊 Final Summary:`);
        console.log(`   - Batch Number: ${TARGET_BATCH_NO}`);
        console.log(`   - Subjects used: ${SUBJECTS.join(', ')}`);
        console.log(`   - Total students created: ${totalStudentsCreated}`);
        console.log(`   - Mock Password: ${MOCK_PASSWORD} (encrypted)`);
        console.log(`   - IsShorthand: 1, IsTypewriting: 0`);
        console.log(`   - ID Format: Each center starts from 0001 (e.g., Center 1234: 12340001, 12340002...)`);

        console.log(`\n📋 Department Summary:`);
        console.log('Department | Centers | Students');
        console.log('-----------|---------|----------');
        for (const [deptId, summary] of Object.entries(departmentSummary)) {
            console.log(`    ${deptId.toString().padStart(2)}     |    ${summary.centers.toString().padStart(2)}   |   ${summary.students.toString().padStart(4)}`);
        }

    } catch (error) {
        console.error('❌ Error during mock data generation:', error);
    }
};

// Verification function for the new approach
const verifyMockDataByCapacity = async (batchNo = 100) => {
    try {
        console.log(`📊 Verifying mock data generated from examcenterdb capacity (Batch ${batchNo}):\n`);
        
        // Get the verification data
        const [results] = await connection.query(`
            SELECT 
                s.center, 
                s.departmentId,
                s.subjectsId, 
                COUNT(*) as student_count,
                MIN(s.student_id) as min_id,
                MAX(s.student_id) as max_id,
                e.max_pc
            FROM students s
            LEFT JOIN examcenterdb e ON s.center = e.center
            WHERE s.batchNo = ?
            GROUP BY s.center, s.departmentId, s.subjectsId, e.max_pc
            ORDER BY s.departmentId, s.center, s.subjectsId
        `, [batchNo]);
        
        if (results.length === 0) {
            console.log('❌ No mock data found for the specified batch');
            return;
        }
        
        console.log('Center | Dept | Subject | Count | ID Range          | Max PC | Status');
        console.log('-------|------|---------|-------|-------------------|--------|--------');
        
        const centerTotals = {};
        const departmentTotals = {};
        
        for (const row of results) {
            const centerKey = `${row.center}-${row.departmentId}`;
            if (!centerTotals[centerKey]) {
                centerTotals[centerKey] = { count: 0, max_pc: row.max_pc, center: row.center, dept: row.departmentId };
            }
            centerTotals[centerKey].count += row.student_count;
            
            if (!departmentTotals[row.departmentId]) {
                departmentTotals[row.departmentId] = 0;
            }
            departmentTotals[row.departmentId] += row.student_count;
            
            const status = centerTotals[centerKey].count <= row.max_pc ? '✅' : '⚠️';
            
            console.log(`${row.center.toString().padStart(6)} |  ${row.departmentId.toString().padStart(2)}  |    ${row.subjectsId.toString().padStart(2)}   |  ${row.student_count.toString().padStart(3)}  | ${row.min_id}-${row.max_id.toString().padEnd(10)} |   ${row.max_pc.toString().padStart(3)}  |   ${status}`);
        }
        
        console.log('\n📋 Center Totals vs Max PC:');
        console.log('Center | Dept | Created | Max PC | Status');
        console.log('-------|------|---------|--------|--------');
        
        for (const [centerKey, data] of Object.entries(centerTotals)) {
            const status = data.count <= data.max_pc ? '✅ OK' : `⚠️ OVER by ${data.count - data.max_pc}`;
            console.log(`${data.center.toString().padStart(6)} |  ${data.dept.toString().padStart(2)}  |   ${data.count.toString().padStart(3)}   |   ${data.max_pc.toString().padStart(3)}  | ${status}`);
        }
        
        console.log('\n📋 Department Totals:');
        for (const [deptId, total] of Object.entries(departmentTotals)) {
            console.log(`   Department ${deptId}: ${total} students`);
        }
        
        // Overall total
        const grandTotal = Object.values(departmentTotals).reduce((sum, count) => sum + count, 0);
        console.log(`\n🎯 Grand Total: ${grandTotal} students`);
        
        // Show ID pattern analysis
        console.log(`\n🔍 ID Pattern Analysis:`);
        const [patterns] = await connection.query(`
            SELECT 
                center,
                MIN(student_id) as first_id,
                MAX(student_id) as last_id,
                COUNT(*) as total_count,
                CONCAT(center, '0001') as expected_first,
                CONCAT(center, LPAD(COUNT(*), 4, '0')) as expected_last
            FROM students 
            WHERE batchNo = ?
            GROUP BY center
            ORDER BY center
        `, [batchNo]);
        
        console.log('Center | First ID | Last ID  | Count | Expected Range');
        console.log('-------|----------|----------|-------|----------------');
        for (const pattern of patterns) {
            const firstMatch = pattern.first_id == pattern.expected_first ? '✅' : '❌';
            const lastMatch = pattern.last_id == pattern.expected_last ? '✅' : '❌';
            console.log(`${pattern.center.toString().padStart(6)} | ${pattern.first_id.toString().padStart(8)} | ${pattern.last_id.toString().padStart(8)} |  ${pattern.total_count.toString().padStart(3)}  | ${pattern.expected_first}-${pattern.expected_last} ${firstMatch}${lastMatch}`);
        }
        
    } catch (error) {
        console.error('❌ Error during verification:', error);
    }
};

// Cleanup function - clean by batch number
const cleanupMockDataByBatch = async (batchNo = 100) => {
    try {
        console.log(`⚠️  Cleanup for Batch ${batchNo}:\n`);
        
        // First, show what will be deleted by department
        const [departmentCounts] = await connection.query(`
            SELECT departmentId, COUNT(*) as count 
            FROM students 
            WHERE batchNo = ? 
            GROUP BY departmentId 
            ORDER BY departmentId
        `, [batchNo]);
        
        if (departmentCounts.length === 0) {
            console.log('❌ No data found for the specified batch');
            return;
        }
        
        console.log('Department | Students to Delete');
        console.log('-----------|------------------');
        let totalToDelete = 0;
        for (const row of departmentCounts) {
            console.log(`    ${row.departmentId.toString().padStart(2)}     |       ${row.count.toString().padStart(4)}`);
            totalToDelete += row.count;
        }
        console.log(`Total: ${totalToDelete} students will be deleted`);
        
        // Delete the mock data
        const [result] = await connection.query(
            'DELETE FROM students WHERE batchNo = ?', 
            [batchNo]
        );
        
        console.log(`\n✅ Cleanup completed. Deleted ${result.affectedRows} students from batch ${batchNo}.`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
};

// Test login function
const testMockLogin = async (studentId) => {
    try {
        const [students] = await connection.query(
            'SELECT student_id, password, fullname, subjectsId, center, departmentId FROM students WHERE student_id = ?',
            [studentId]
        );
        
        if (students.length === 0) {
            console.log(`❌ Student with ID ${studentId} not found`);
            return;
        }
        
        const student = students[0];
        
        try {
            console.log(`\n🧪 Testing Login for Student: ${student.fullname}`);
            console.log(`   Student ID: ${student.student_id}`);
            console.log(`   Center: ${student.center}`);
            console.log(`   Subject: ${student.subjectsId}`);
            console.log(`   Department: ${student.departmentId}`);
            
            const storedPasswordDecrypted = decrypt(student.password);
            const inputPasswordEncrypted = encrypt('mock123');
            const inputPasswordDecrypted = decrypt(inputPasswordEncrypted);
            
            console.log(`   Stored Password (decrypted): "${storedPasswordDecrypted}"`);
            console.log(`   Input Password (decrypted): "${inputPasswordDecrypted}"`);
            console.log(`   Match: ${storedPasswordDecrypted === inputPasswordDecrypted ? '✅ SUCCESS' : '❌ FAILED'}`);
            
            console.log(`\n📝 For API Testing:`);
            console.log(`{`);
            console.log(`  "userId": ${studentId},`);
            console.log(`  "password": "${inputPasswordEncrypted}"`);
            console.log(`}`);
            
        } catch (decryptError) {
            console.error('❌ Error in password test:', decryptError);
        }
        
    } catch (error) {
        console.error('❌ Error during login test:', error);
    }
};

// Function to show existing center-department relationships
const showCenterDepartmentRelationships = async () => {
    try {
        console.log('📊 Current Center-Department Relationships:\n');
        
        const [relations] = await connection.query(`
            SELECT DISTINCT s.center, s.departmentId, e.max_pc
            FROM students s
            LEFT JOIN examcenterdb e ON s.center = e.center
            ORDER BY s.departmentId, s.center
        `);
        
        if (relations.length === 0) {
            console.log('❌ No center-department relationships found');
            return;
        }
        
        console.log('Center | Department | Max PC');
        console.log('-------|------------|-------');
        
        const departmentGroups = {};
        for (const relation of relations) {
            if (!departmentGroups[relation.departmentId]) {
                departmentGroups[relation.departmentId] = [];
            }
            departmentGroups[relation.departmentId].push(relation);
            
            const maxPc = relation.max_pc || 'N/A';
            console.log(`${relation.center.toString().padStart(6)} |     ${relation.departmentId.toString().padStart(2)}     |  ${maxPc.toString().padStart(3)}`);
        }
        
        console.log('\n📋 Summary by Department:');
        for (const [deptId, centers] of Object.entries(departmentGroups)) {
            const totalCapacity = centers.reduce((sum, c) => sum + (c.max_pc || 0), 0);
            console.log(`   Department ${deptId}: ${centers.length} centers, total capacity: ${totalCapacity}`);
        }
        
    } catch (error) {
        console.error('❌ Error showing relationships:', error);
    }
};

// Function to gracefully close the connection pool
const closeConnection = async () => {
    try {
        await connection.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing connection pool:', error);
    }
};

// Export functions
module.exports = {
    generateMockDataFromExistingPatterns,
    cleanupMockDataByBatch,
    verifyMockDataByCapacity,
    testMockLogin,
    showCenterDepartmentRelationships,
    closeConnection
};

// Run the script if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const runScript = async () => {
        try {
            if (args.includes('--cleanup')) {
                const batchNo = args[args.indexOf('--cleanup') + 1];
                await cleanupMockDataByBatch(batchNo ? parseInt(batchNo) : 100);
            } else if (args.includes('--verify')) {
                const batchNo = args[args.indexOf('--verify') + 1];
                await verifyMockDataByCapacity(batchNo ? parseInt(batchNo) : 100);
            } else if (args.includes('--test-login')) {
                const studentId = args[args.indexOf('--test-login') + 1];
                if (studentId) {
                    await testMockLogin(parseInt(studentId));
                } else {
                    console.log('Please provide a student ID: --test-login <student_id>');
                }
            } else if (args.includes('--show-relations')) {
                await showCenterDepartmentRelationships();
            } else {
                await generateMockDataFromExistingPatterns();
            }
        } catch (error) {
            console.error('Script execution error:', error);
        } finally {
            await closeConnection();
            process.exit(0);
        }
    };

    runScript();
}