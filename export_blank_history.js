const connection = require('./config/db1');
const xl = require('excel4node');
const path = require('path');
const fs = require('fs');

async function exportHistoryToExcel() {
    try {
        console.log('🔍 Identifying students from Batches 101-104 and 201-202 with blank submissions...');

        // 1. Get students from target batches with blank submissions
        const studentsQuery = `
            SELECT f.student_id
            FROM finalPassageSubmit f 
            JOIN students s ON s.student_id = f.student_id 
            WHERE s.batchNo IN (201,202,203) 
            AND ((f.passageA IS NULL OR TRIM(f.passageA) = '') OR (f.passageB IS NULL OR TRIM(f.passageB) = ''))
        `;
        const [students] = await connection.query(studentsQuery);

        if (students.length === 0) {
            console.log('✅ No students found with blank submissions in Batch 201.');
            process.exit(0);
        }

        console.log(`📊 Found ${students.length} students. Fetching internal history logs (last 10 each)...`);

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet('History Logs');

        // Styles
        const headerStyle = wb.createStyle({
            font: { bold: true, color: '#FFFFFF', size: 12 },
            fill: { type: 'pattern', patternType: 'solid', fgColor: '#4F81BD' },
            border: { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } }
        });

        const cellStyle = wb.createStyle({
            border: { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } },
            alignment: { wrapText: true, vertical: 'top' }
        });

        // Headers
        const headers = ['#', 'Student ID', 'Passage', 'Time Remaining', 'Log Created At', 'Text Content'];
        headers.forEach((h, i) => ws.cell(1, i + 1).string(h).style(headerStyle));

        let currentRow = 2;

        for (const student of students) {
            const sid = student.student_id;

            // 2. Fetch ALL DISTINCT time records for each student
            const historyQuery = `
                SELECT passage_identifier, time_taken, created_at, text_content 
                FROM textlogs_history 
                WHERE (student_id, time_taken, created_at) IN (
                    SELECT student_id, time_taken, MAX(created_at)
                    FROM textlogs_history
                    WHERE student_id = ?
                    AND time_taken > 0
                    GROUP BY time_taken
                )
                ORDER BY created_at ASC
            `;
            const [logs] = await connection.query(historyQuery, [sid, sid]);

            if (logs.length > 0) {
                logs.forEach((log, index) => {
                    ws.cell(currentRow, 1).number(index + 1).style(cellStyle);
                    ws.cell(currentRow, 2).string(sid.toString()).style(cellStyle);
                    ws.cell(currentRow, 3).string(log.passage_identifier || 'N/A').style(cellStyle);
                    ws.cell(currentRow, 4).number(log.time_taken || 0).style(cellStyle);
                    ws.cell(currentRow, 5).string(log.created_at ? log.created_at.toLocaleString() : 'N/A').style(cellStyle);
                    ws.cell(currentRow, 6).string(log.text_content || '').style(cellStyle);
                    currentRow++;
                });
                // Add a blank row as separator between students
                currentRow++;
            }
        }

        // Set column widths
        ws.column(1).setWidth(5);
        ws.column(2).setWidth(15);
        ws.column(3).setWidth(12);
        ws.column(4).setWidth(15);
        ws.column(5).setWidth(25);
        ws.column(6).setWidth(100);

        const fileName = `All_Batches_Blank_History_Export_${Date.now()}.xlsx`;
        const filePath = path.join(__dirname, fileName);

        wb.write(filePath, function (err, stats) {
            if (err) {
                console.error('❌ Error writing Excel file:', err);
                process.exit(1);
            } else {
                console.log(`\n✅ Excel file generated successfully!`);
                console.log(`📂 File path: ${filePath}`);

                // Also log a summary of who we exported
                console.log(`\n📊 Exported logs for ${students.length} students.`);
                process.exit(0);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

exportHistoryToExcel();
