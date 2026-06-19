// test_qsetdb_handler.js
// Test script for qsetdbHandler utility

const { ensureQsetdbEntries, ensureQsetdbEntryForSubject } = require('./utils/qsetdbHandler');

async function testQsetdbHandler() {
    console.log('=== Testing qsetdbHandler Utility ===\n');

    // Test 1: Ensure entries for departmentId 10 (exists in audiodb, not in qsetdb)
    console.log('Test 1: Ensuring entries for departmentId 10...');
    const result1 = await ensureQsetdbEntries(10);
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log('\n---\n');

    // Test 2: Try again with the same departmentId (should find existing entries)
    console.log('Test 2: Re-running for departmentId 10 (should find existing)...');
    const result2 = await ensureQsetdbEntries(10);
    console.log('Result:', JSON.stringify(result2, null, 2));
    console.log('\n---\n');

    // Test 3: Ensure entry for specific subject
    console.log('Test 3: Ensuring entry for departmentId 10, subjectId 40...');
    const result3 = await ensureQsetdbEntryForSubject(10, 40);
    console.log('Result:', JSON.stringify(result3, null, 2));
    console.log('\n---\n');

    // Test 4: Try with non-existent departmentId
    console.log('Test 4: Testing with departmentId 999 (should not exist in audiodb)...');
    const result4 = await ensureQsetdbEntries(999);
    console.log('Result:', JSON.stringify(result4, null, 2));
    console.log('\n---\n');

    console.log('=== Tests Completed ===');
    process.exit(0);
}

// Run tests
testQsetdbHandler().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
