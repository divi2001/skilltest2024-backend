const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const connection = require('./config/db1'); // Adjust path to config/db1.js

const generateMissingZipReport = async () => {
    try {
        console.log('Generating report for students with feedback but missing ZIPs...');

        // Query Explanation:
        // 1. Join studentlogs (sl) with students (s) to get details.
        // 2. LEFT JOIN trackrecord (tr) to check for ZIPs.
        // 3. Filter where feedback_time IS NOT NULL (completed exam).
        // 4. AND where either PA_filename or PB_filename IS NULL (missing zip).
        // Note: We check if they are shorthand/typing students to know if they *should* have a zip.
        // Assuming all students with feedback should have at least one passage zip.

        const query = `
            SELECT 
                s.student_id,
                s.fullname,
                s.center,
                s.batchNo,
                sl.feedback_time,
                tr.PA_filename,
                tr.PB_filename
            FROM 
                studentlogs sl
            JOIN 
                students s ON sl.student_id = s.student_id
            LEFT JOIN 
                trackrecord tr ON s.student_id = tr.student_id
            WHERE 
                sl.feedback_time IS NOT NULL
                AND (tr.PA_filename IS NULL OR tr.PB_filename IS NULL)
        `;

        const [rows] = await connection.query(query);

        if (rows.length === 0) {
            console.log('Great! No students found with missing ZIPs who have completed feedback.');
            process.exit(0);
        }

        console.log(`Found ${rows.length} students with missing zip files.`);

        // Prepare data for Excel
        const dataForExcel = rows.map(row => ({
            Student_ID: row.student_id,
            Name: row.fullname,
            Center: row.center,
            Batch: row.batchNo,
            Feedback_Time: row.feedback_time,
            Passage_A_Zip: row.PA_filename || 'MISSING',
            Passage_B_Zip: row.PB_filename || 'MISSING'
        }));

        // Create Workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataForExcel);

        // Append Worksheet
        XLSX.utils.book_append_sheet(wb, ws, "Missing Zips");

        // Write File
        const outputFilename = `missing_zips_report_${Date.now()}.xlsx`;
        const outputPath = path.join(__dirname, outputFilename);

        XLSX.writeFile(wb, outputPath);

        console.log(`Report generated successfully: ${outputPath}`);
        process.exit(0);

    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
};

generateMissingZipReport();
