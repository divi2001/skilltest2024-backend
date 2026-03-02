const connection = require('./config/db1'); // Adjust path to your db1.js file
const { encrypt, decrypt } = require('./config/encrypt'); // Adjust path to your encryption file

// Mock data generation script
const generateMockData = async () => {
    try {
        console.log('Connected to database using existing configuration');
        
        // Check if SECRET_KEY is loaded correctly
        console.log('SECRET_KEY loaded:', process.env.SECRET_KEY ? 'Yes' : 'No');
        console.log('SECRET_KEY length:', process.env.SECRET_KEY ? process.env.SECRET_KEY.length : 'undefined');

        // Parameters for mock data
        const BATCH_NO = 100;
        const SUBJECTS = [40, 41];
        const STUDENTS_PER_SUBJECT = 100;
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
        
        // Get selected department (you can modify this or make it dynamic)
        const DEPARTMENT_ID = 11;
        
        // Get batch information for batch 100 with departmentId 11
        const [batchInfo] = await connection.query(
            'SELECT batchdate, reporting_time, start_time, end_time FROM batchdb WHERE batchNo = ? AND departmentId = ?',
            [BATCH_NO, DEPARTMENT_ID]
        );
        
        if (batchInfo.length === 0) {
            console.log(`No batch found with batchNo ${BATCH_NO} and departmentId ${DEPARTMENT_ID}`);
            return;
        }

        const batchData = batchInfo[0];
        console.log('Batch information retrieved:', batchData);
        
        // Get all centers from examcenterdb
        const [centers] = await connection.query('SELECT center FROM examcenterdb');
        
        if (centers.length === 0) {
            console.log('No centers found in examcenterdb');
            return;
        }

        console.log(`Found ${centers.length} centers. Starting mock data generation...`);

        // Encrypt the mock password - store just the password string, not an object
        const encryptedPassword = encrypt(MOCK_PASSWORD);

        let totalStudentsCreated = 0;

        // Loop through each center
        for (const centerRow of centers) {
            const centerId = centerRow.center;
            console.log(`\nProcessing Center ID: ${centerId}`);

            let studentCounter = 1; // Counter for students in this center across all subjects

            // Generate students for each subject
            for (const subjectId of SUBJECTS) {
                console.log(`  Generating students for Subject ID: ${subjectId}`);

                // Generate 100 students for this subject in this center
                for (let i = 1; i <= STUDENTS_PER_SUBJECT; i++) {
                    // Create student_id format: center + sequential padded number
                    const studentId = parseInt(`${centerId}${studentCounter.toString().padStart(3, '0')}`);
                    studentCounter++; // Increment counter for next student
                    
                    // Create fullname
                    const fullname = `Mock Student ${centerId}-${subjectId}-${i}`;

                    // Insert student data
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
                        BATCH_NO,                          // batchNo
                        batchData.batchdate,               // batchdate from batchdb
                        fullname,                          // fullname
                        subjectId,                         // subjectsId
                        1,                                 // courseId (default to 1)
                        '2025',                            // batch_year
                        0,                                 // loggedin (false)
                        0,                                 // done (false)
                        centerId,                          // center
                        DEPARTMENT_ID,                     // departmentId
                        0,                                 // disability (false)
                        batchData.reporting_time,          // reporting_time from batchdb
                        batchData.start_time,              // start_time from batchdb
                        batchData.end_time,                // end_time from batchdb
                        1,                                 // day (default to 1)
                        1,                                 // qset (default to 1)
                        null,                              // base64 (null for now)
                        null,                              // sign_base64 (null for now)
                        1,                                 // IsShorthand (set to 1 as requested)
                        0                                  // IsTypewriting (set to 0 as requested)
                    ];

                    try {
                        await connection.query(insertStudentQuery, studentValues);
                        totalStudentsCreated++;
                        
                        // Log progress every 50 students
                        if (totalStudentsCreated % 50 === 0) {
                            console.log(`    Created ${totalStudentsCreated} students so far...`);
                        }
                        
                    } catch (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            console.log(`    Student ID ${studentId} already exists, skipping...`);
                        } else {
                            console.error(`    Error creating student ${studentId}:`, error.message);
                        }
                    }
                }
            }

            console.log(`  Completed Center ${centerId} - Student IDs: ${centerId}001 to ${centerId}${(studentCounter-1).toString().padStart(3, '0')}`);
        }

        console.log(`\n✅ Mock data generation completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Centers processed: ${centers.length}`);
        console.log(`   - Subjects per center: ${SUBJECTS.length} (40 and 41)`);
        console.log(`   - Students per subject: ${STUDENTS_PER_SUBJECT}`);
        console.log(`   - Total students created: ${totalStudentsCreated}`);
        console.log(`   - Batch Number: ${BATCH_NO}`);
        console.log(`   - Department ID: ${DEPARTMENT_ID}`);
        console.log(`   - Mock Password: ${MOCK_PASSWORD} (encrypted)`);
        console.log(`   - IsShorthand: 1, IsTypewriting: 0`);
        console.log(`   - Batch timing: ${batchData.reporting_time} - ${batchData.start_time} - ${batchData.end_time}`);
        console.log(`   - Student ID Format: {center}{001-200} (e.g., 1001-1200 for center 1)`);

    } catch (error) {
        console.error('❌ Error during mock data generation:', error);
    }
};

// Function to test login with mock credentials - Updated to match your login logic
const testMockLogin = async (studentId) => {
    try {
        console.log('🔑 Secret Key Check:');
        console.log('   SECRET_KEY loaded:', process.env.SECRET_KEY ? 'Yes' : 'No');
        console.log('   SECRET_KEY value:', process.env.SECRET_KEY);
        console.log('   SECRET_KEY length:', process.env.SECRET_KEY ? process.env.SECRET_KEY.length : 'undefined');
        
        // Get student data
        const [students] = await connection.query(
            'SELECT student_id, password, fullname, subjectsId FROM students WHERE student_id = ?',
            [studentId]
        );
        
        if (students.length === 0) {
            console.log(`❌ Student with ID ${studentId} not found`);
            return;
        }
        
        const student = students[0];
        
        // Test password decryption to match your login logic
        try {
            console.log(`\n🧪 Testing Login for Student: ${student.fullname}`);
            console.log(`   Student ID: ${student.student_id}`);
            console.log(`   Subject ID: ${student.subjectsId}`);
            
            // Step 1: Decrypt stored password (what your login function does)
            const storedPasswordDecrypted = decrypt(student.password);
            console.log(`   Stored Password (encrypted): ${student.password}`);
            console.log(`   Stored Password (decrypted): "${storedPasswordDecrypted}"`);
            
            // Step 2: Encrypt the test password (what client should send)
            const inputPasswordEncrypted = encrypt('mock123');
            console.log(`   Input Password (original): "mock123"`);
            console.log(`   Input Password (encrypted): ${inputPasswordEncrypted}`);
            
            // Step 3: Decrypt the input password (what your login function does)
            const inputPasswordDecrypted = decrypt(inputPasswordEncrypted);
            console.log(`   Input Password (decrypted): "${inputPasswordDecrypted}"`);
            
            // Step 4: Compare (what your login function does)
            const storedStr = String(storedPasswordDecrypted).trim();
            const inputStr = String(inputPasswordDecrypted).trim();
            
            console.log(`\n🔍 Comparison:`);
            console.log(`   Stored (trimmed): "${storedStr}"`);
            console.log(`   Input (trimmed): "${inputStr}"`);
            console.log(`   Match: ${storedStr === inputStr ? '✅ SUCCESS' : '❌ FAILED'}`);
            
            // Show what you need to send in your API request
            console.log(`\n📝 For API Testing (POST to your login endpoint):`);
            console.log(`{`);
            console.log(`  "userId": ${studentId},`);
            console.log(`  "password": "${inputPasswordEncrypted}",`);
            console.log(`  "ipAddress": "192.168.1.100",`);
            console.log(`  "macAddress": "AA:BB:CC:DD:EE:FF",`);
            console.log(`  "diskIdentifier": "disk123"`);
            console.log(`}`);
            
        } catch (decryptError) {
            console.error('❌ Error in password encryption/decryption test:', decryptError);
            console.error('Full error:', decryptError);
        }
        
    } catch (error) {
        console.error('❌ Error during login test:', error);
    }
};

// Function to verify the generated data and test password decryption
const verifyMockData = async () => {
    try {
        // Count students by center and subject
        const [results] = await connection.query(`
            SELECT 
                center, 
                subjectsId, 
                COUNT(*) as student_count 
            FROM students 
            WHERE batchNo = 100 AND departmentId = 6
            GROUP BY center, subjectsId 
            ORDER BY center, subjectsId
        `);
        
        console.log('📊 Mock Data Verification:');
        console.log('Center | Subject | Count');
        console.log('-------|---------|------');
        
        results.forEach(row => {
            console.log(`  ${row.center.toString().padStart(4)} |    ${row.subjectsId.toString().padStart(2)}   |  ${row.student_count.toString().padStart(3)}`);
        });
        
        // Total count
        const [total] = await connection.query('SELECT COUNT(*) as total FROM students WHERE batchNo = 100 AND departmentId = 6');
        console.log(`\nTotal mock students: ${total[0].total}`);
        
        // Show sample student IDs for each center
        const [sampleIds] = await connection.query(`
            SELECT center, MIN(student_id) as first_id, MAX(student_id) as last_id
            FROM students 
            WHERE batchNo = 100 AND departmentId = 6
            GROUP BY center 
            ORDER BY center
        `);
        
        console.log('\n📊 Student ID Ranges by Center:');
        sampleIds.forEach(row => {
            console.log(`   Center ${row.center}: ${row.first_id} to ${row.last_id}`);
        });
        
        // Verify both subjects are created
        const [subjectCheck] = await connection.query(`
            SELECT subjectsId, COUNT(*) as count 
            FROM students 
            WHERE batchNo = 100 AND departmentId = 6 
            GROUP BY subjectsId
        `);
        
        console.log('\n📊 Subject Distribution:');
        subjectCheck.forEach(row => {
            console.log(`   Subject ${row.subjectsId}: ${row.count} students`);
        });
        
        // Test password decryption with a sample student
        const [sampleStudent] = await connection.query(
            'SELECT student_id, password, IsShorthand, IsTypewriting FROM students WHERE batchNo = 100 AND departmentId = 6 LIMIT 1'
        );
        
        if (sampleStudent.length > 0) {
            try {
                const decryptedPassword = decrypt(sampleStudent[0].password);
                console.log(`\n🔓 Sample Student Verification:`);
                console.log(`   Student ID: ${sampleStudent[0].student_id}`);
                console.log(`   Encrypted: ${sampleStudent[0].password}`);
                console.log(`   Decrypted: "${decryptedPassword}"`);
                console.log(`   IsShorthand: ${sampleStudent[0].IsShorthand}`);
                console.log(`   IsTypewriting: ${sampleStudent[0].IsTypewriting}`);
            } catch (decryptError) {
                console.error('❌ Error decrypting password:', decryptError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Error during verification:', error);
    }
};

// Additional utility function to clean up mock data if needed
const cleanupMockData = async () => {
    try {
        // Delete all students with batchNo 100 (our mock batch)
        const [result] = await connection.query('DELETE FROM students WHERE batchNo = ? AND departmentId = ?', [100, 6]);
        
        console.log(`✅ Cleanup completed. Deleted ${result.affectedRows} mock students.`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
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

// Export functions for use
module.exports = {
    generateMockData,
    cleanupMockData,
    verifyMockData,
    testMockLogin,
    closeConnection
};

// Run the script if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const runScript = async () => {
        try {
            if (args.includes('--cleanup')) {
                await cleanupMockData();
            } else if (args.includes('--verify')) {
                await verifyMockData();
            } else if (args.includes('--test-login')) {
                const studentId = args[args.indexOf('--test-login') + 1];
                if (studentId) {
                    await testMockLogin(parseInt(studentId));
                } else {
                    console.log('Please provide a student ID: --test-login <student_id>');
                }
            } else {
                await generateMockData();
            }
        } catch (error) {
            console.error('Script execution error:', error);
        } finally {
            // Close the connection pool when done
            await closeConnection();
            process.exit(0);
        }
    };

    runScript();
}