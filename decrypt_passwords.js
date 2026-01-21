// decrypt_passwords.js

const path = require('path');
const xlsx = require('xlsx');
require('dotenv').config();

// Import your existing decrypt function
const { decrypt } = require('./config/encrypt');

// Path to the Excel file
const FILE_PATH = path.join(__dirname, 'student_subject_qset_all_34.xlsx');

// Load workbook
const workbook = xlsx.readFile(FILE_PATH);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert sheet to JSON
const records = xlsx.utils.sheet_to_json(worksheet);

// Decrypt passwords
const decryptedRecords = records.map(row => {
    let decryptedPassword;
    try {
        decryptedPassword = decrypt(row.password);
    } catch (err) {
        decryptedPassword = 'DECRYPTION_FAILED';
    }

    return {
        ...row,
        decrypted_password: decryptedPassword
    };
});

// Print results to console
console.table(decryptedRecords);

// OPTIONAL: write decrypted data to a new Excel file
const newWorkbook = xlsx.utils.book_new();
const newWorksheet = xlsx.utils.json_to_sheet(decryptedRecords);
xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Decrypted_Data');

const OUTPUT_PATH = path.join(__dirname, 'student_subject_qset_decrypted.xlsx');
xlsx.writeFile(newWorkbook, OUTPUT_PATH);

console.log(`Decrypted file created at: ${OUTPUT_PATH}`);
