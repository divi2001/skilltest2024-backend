const connection = require('./config/db1');
const xl = require('excel4node');
const path = require('path');

async function checkDiscrepancies() {
    // EDIT THIS ARRAY FOR DIFFERENT BATCHES
    const targetBatches = [ 201, 202, 203, 204];

    try {
        console.log(`🔍 Checking discrepancies for batches: ${targetBatches.join(', ')}...`);

        const query = `
            SELECT 
                s.student_id,
                s.fullname,
                s.batchNo,
                s.loggedin,
                tl.texta,
                tl.textb,
                fps.passageA,
                fps.passageB,
                tr.PA_filename,
                tr.PB_filename,
                LENGTH(tl.texta) as texta_len,
                LENGTH(tl.textb) as textb_len,
                LENGTH(fps.passageA) as suba_len,
                LENGTH(fps.passageB) as subb_len
            FROM students s
            LEFT JOIN textlogs tl ON s.student_id = tl.student_id
            LEFT JOIN finalPassageSubmit fps ON s.student_id = fps.student_id
            LEFT JOIN trackrecord tr ON s.student_id = tr.student_id
            WHERE s.batchNo IN (${targetBatches.join(',')})
        `;

        const [results] = await connection.query(query);

        const discrepancies = [];

        results.forEach(row => {
            const hasTextA = row.texta && row.texta.trim().length > 0;
            const hasTextB = row.textb && row.textb.trim().length > 0;
            const hasSubA = row.passageA && row.passageA.trim().length > 0;
            const hasSubB = row.passageB && row.passageB.trim().length > 0;
            const hasZipA = row.PA_filename && row.PA_filename.trim().length > 0;
            const hasZipB = row.PB_filename && row.PB_filename.trim().length > 0;

            let issues = [];

            // Case 1: Text A exists but no final submission A
            if (hasTextA && !hasSubA) {
                issues.push("Text A exists but NO Submission A");
            }

            // Case 2: Text B exists but no final submission B
            if (hasTextB && !hasSubB) {
                issues.push("Text B exists but NO Submission B");
            }

            // Case 3: Submission A exists but NO Text B AND NO Submission B
            if (hasSubA && !hasTextB && !hasSubB) {
                issues.push("Passage A submitted but NO sign of Passage B (Log or Sub)");
            }

            // Zip File Checks
            if (hasSubA && !hasZipA) {
                issues.push("Passage A submitted but ZIP MISSING in trackrecord");
            }
            if (hasSubB && !hasZipB) {
                issues.push("Passage B submitted but ZIP MISSING in trackrecord");
            }

            if (issues.length > 0) {
                discrepancies.push({
                    id: row.student_id,
                    name: row.fullname,
                    batch: row.batchNo,
                    login: row.loggedin === 1 ? 'YES' : 'NO',
                    texta_len: row.texta_len || 0,
                    textb_len: row.textb_len || 0,
                    suba_len: row.suba_len || 0,
                    subb_len: row.subb_len || 0,
                    zip_a: hasZipA ? 'PA_ZIP_OK' : 'PA_ZIP_NULL',
                    zip_b: hasZipB ? 'PB_ZIP_OK' : 'PB_ZIP_NULL',
                    discrepancy: issues.join(' | ')
                });
            }
        });

        if (discrepancies.length === 0) {
            console.log('✅ No discrepancies found for these batches.');
            process.exit(0);
        }

        console.log(`⚠️  Found ${discrepancies.length} students with discrepancies. Generating Excel...`);

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet('Discrepancies');

        const headerStyle = wb.createStyle({
            font: { bold: true, color: '#FFFFFF' },
            fill: { type: 'pattern', patternType: 'solid', fgColor: '#C0504D' }
        });

        const cellStyle = wb.createStyle({
            border: { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } }
        });

        const headers = ['Student ID', 'Batch', 'Logged In', 'Text A Len', 'Sub A Len', 'Zip A', 'Text B Len', 'Sub B Len', 'Zip B', 'Issue Description'];
        headers.forEach((h, i) => ws.cell(1, i + 1).string(h).style(headerStyle));

        discrepancies.forEach((d, i) => {
            const row = i + 2;
            ws.cell(row, 1).string(d.id.toString()).style(cellStyle);
            ws.cell(row, 2).number(d.batch).style(cellStyle);
            ws.cell(row, 3).string(d.login).style(cellStyle);
            ws.cell(row, 4).number(d.texta_len).style(cellStyle);
            ws.cell(row, 5).number(d.suba_len).style(cellStyle);
            ws.cell(row, 6).string(d.zip_a).style(cellStyle);
            ws.cell(row, 7).number(d.textb_len).style(cellStyle);
            ws.cell(row, 8).number(d.subb_len).style(cellStyle);
            ws.cell(row, 9).string(d.zip_b).style(cellStyle);
            ws.cell(row, 10).string(d.discrepancy).style(cellStyle);
        });

        // Column widths
        ws.column(1).setWidth(15);
        ws.column(10).setWidth(60);

        const fileName = `Submission_Discrepancies_Batches_${targetBatches.join('_')}_${Date.now()}.xlsx`;
        const filePath = path.join(__dirname, fileName);

        wb.write(filePath, function (err, stats) {
            if (err) {
                console.error('❌ Excel error:', err);
                process.exit(1);
            } else {
                console.log(`\n✅ Report generated: ${filePath}`);
                process.exit(0);
            }
        });

    } catch (err) {
        console.error('❌ Database error:', err);
        process.exit(1);
    }
}

checkDiscrepancies();
