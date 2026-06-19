// Check and fix student 8251539083 - create missing passageB zip
const connection = require('./config/db1');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const STUDENT_ID = 8251539083;

async function checkAndFixStudent() {
    try {
        console.log(`🔍 Checking student ${STUDENT_ID}...\n`);
        console.log('='.repeat(80));

        // Get student details
        const [students] = await connection.query(
            'SELECT * FROM students WHERE student_id = ?',
            [STUDENT_ID]
        );

        if (students.length === 0) {
            console.log('❌ Student not found!');
            await connection.end();
            return;
        }

        const student = students[0];
        console.log('📋 STUDENT INFO:');
        console.log(`   Student ID: ${student.student_id}`);
        console.log(`   Name: ${student.fullname}`);
        console.log(`   Batch: ${student.batchNo}`);
        console.log(`   Center: ${student.center}`);
        console.log(`   Department: ${student.departmentId}`);

        // Get studentlogs
        const [studentlogs] = await connection.query(
            'SELECT * FROM studentlogs WHERE student_id = ?',
            [STUDENT_ID]
        );

        console.log('\n📊 STUDENTLOGS:');
        if (studentlogs.length > 0) {
            const log = studentlogs[0];
            console.log(`   Login Time: ${log.loginTime}`);
            console.log(`   Trial Time: ${log.trial_time}`);
            console.log(`   Audio1 Time: ${log.audio1_time}`);
            console.log(`   Passage1 Time: ${log.passage1_time}`);
            console.log(`   Audio2 Time: ${log.audio2_time}`);
            console.log(`   Passage2 Time: ${log.passage2_time}`);
            console.log(`   Feedback Time: ${log.feedback_time}`);
        } else {
            console.log('   ⚠️ No studentlogs found');
        }

        // Get textlogs
        const [textlogs] = await connection.query(
            'SELECT * FROM textlogs WHERE student_id = ?',
            [STUDENT_ID]
        );

        console.log('\n📝 TEXTLOGS:');
        if (textlogs.length > 0) {
            const text = textlogs[0];
            console.log(`   Texta Length: ${text.texta ? text.texta.length : 0} chars`);
            console.log(`   Textb Length: ${text.textb ? text.textb.length : 0} chars`);
            console.log(`   Created At: ${text.created_at}`);
        } else {
            console.log('   ⚠️ No textlogs found');
        }

        // Get finalPassageSubmit
        const [finalSubmit] = await connection.query(
            'SELECT * FROM finalPassageSubmit WHERE student_id = ?',
            [STUDENT_ID]
        );

        console.log('\n✅ FINAL PASSAGE SUBMIT:');
        if (finalSubmit.length > 0) {
            const submit = finalSubmit[0];
            console.log(`   PassageA: ${submit.passageA ? 'SUBMITTED' : 'NOT SUBMITTED'}`);
            console.log(`   PassageB: ${submit.passageB ? 'SUBMITTED' : 'NOT SUBMITTED'}`);
        } else {
            console.log('   ⚠️ No finalPassageSubmit record found');
        }

        // Get loginlogs
        const [loginlogs] = await connection.query(
            'SELECT * FROM loginlogs WHERE student_id = ? ORDER BY id DESC LIMIT 10',
            [STUDENT_ID]
        );

        console.log('\n🔐 LOGINLOGS (Recent):');
        if (loginlogs.length > 0) {
            loginlogs.forEach((log, idx) => {
                console.log(`   ${idx + 1}. ${log.action} - ${log.timestamp} - IP: ${log.ip_address || 'N/A'}`);
            });
        } else {
            console.log('   ⚠️ No loginlogs found');
        }

        // Get trackrecord
        const [trackrecord] = await connection.query(
            'SELECT * FROM trackrecord WHERE student_id = ?',
            [STUDENT_ID]
        );

        console.log('\n📦 TRACKRECORD:');
        if (trackrecord.length > 0) {
            const track = trackrecord[0];
            console.log(`   PA_filename: ${track.PA_filename || 'NULL'}`);
            console.log(`   PB_filename: ${track.PB_filename || 'NULL'}`);
        } else {
            console.log('   ⚠️ No trackrecord found');
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n💡 ANALYSIS:');

        if (textlogs.length > 0 && textlogs[0].textb && textlogs[0].textb.length > 0) {
            console.log('   ✅ Has textb content');
            if (!finalSubmit.length || !finalSubmit[0].passageB) {
                console.log('   ⚠️  PassageB NOT submitted in finalPassageSubmit');
                console.log('\n🔧 ACTION NEEDED: Submit passageB and create zip');

                // Propose creating the zip
                if (studentlogs.length > 0) {
                    const timing = studentlogs[0].feedback_time || studentlogs[0].passage2_time || new Date();
                    console.log(`\n   Suggested timestamp: ${timing}`);
                    console.log(`   Text length: ${textlogs[0].textb.length} characters`);
                }
            } else {
                console.log('   ✅ PassageB is submitted');
            }
        } else {
            console.log('   ❌ No textb content found');
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

checkAndFixStudent();
