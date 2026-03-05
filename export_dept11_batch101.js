/**
 * Export full data for Dept 11, Batch 101 (4 unique combos) to Excel
 * Includes: students, controller (decrypted pass), audio data
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { decrypt } = require('./config/encrypt');
const ExcelJS = require('exceljs');

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    const wb = new ExcelJS.Workbook();

    // ========== SHEET 1: Students ==========
    console.log('Fetching students...');
    const [students] = await c.execute(
        `SELECT s.student_id, s.password, s.fullname, s.mothername, s.instituteId, s.batchNo, s.batchdate,
                s.subjectsId, sub.subject_name, s.qset, s.center, s.departmentId,
                s.loggedin, s.done, s.IsShorthand, s.IsTypewriting, s.disability,
                s.reporting_time, s.start_time, s.end_time, s.day,
                s.courseId, s.batch_year
         FROM students s
         LEFT JOIN (SELECT subjectId, MAX(subject_name) as subject_name FROM subjectsdb GROUP BY subjectId) sub
           ON s.subjectsId = sub.subjectId
         WHERE s.departmentId = 11 AND s.batchNo = 101
         ORDER BY s.subjectsId, s.qset, s.student_id`
    );
    console.log(`Found ${students.length} students`);

    // Decrypt student passwords
    students.forEach(s => {
        try { s.password_decrypted = decrypt(s.password); } catch(e) { s.password_decrypted = 'DECRYPT_ERROR'; }
    });

    const ws1 = wb.addWorksheet('Students');
    const studentCols = [
        { header: 'student_id', key: 'student_id', width: 15 },
        { header: 'password_decrypted', key: 'password_decrypted', width: 20 },
        { header: 'fullname', key: 'fullname', width: 25 },
        { header: 'mothername', key: 'mothername', width: 25 },
        { header: 'instituteId', key: 'instituteId', width: 12 },
        { header: 'batchNo', key: 'batchNo', width: 10 },
        { header: 'batchdate', key: 'batchdate', width: 12 },
        { header: 'subjectsId', key: 'subjectsId', width: 12 },
        { header: 'subject_name', key: 'subject_name', width: 30 },
        { header: 'qset', key: 'qset', width: 8 },
        { header: 'center', key: 'center', width: 10 },
        { header: 'departmentId', key: 'departmentId', width: 14 },
        { header: 'loggedin', key: 'loggedin', width: 10 },
        { header: 'done', key: 'done', width: 8 },
        { header: 'IsShorthand', key: 'IsShorthand', width: 12 },
        { header: 'IsTypewriting', key: 'IsTypewriting', width: 14 },
        { header: 'disability', key: 'disability', width: 12 },
        { header: 'reporting_time', key: 'reporting_time', width: 14 },
        { header: 'start_time', key: 'start_time', width: 12 },
        { header: 'end_time', key: 'end_time', width: 12 },
        { header: 'day', key: 'day', width: 8 },
        { header: 'courseId', key: 'courseId', width: 10 },
        { header: 'batch_year', key: 'batch_year', width: 12 },
        { header: 'password_encrypted', key: 'password', width: 50 },
    ];
    ws1.columns = studentCols;
    students.forEach(s => ws1.addRow(s));

    // Style header
    ws1.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // ========== SHEET 2: Unique Combos Summary ==========
    console.log('Building combos summary...');
    const [combos] = await c.execute(
        `SELECT s.subjectsId, sub.subject_name, s.qset, COUNT(*) as student_count
         FROM students s
         LEFT JOIN (SELECT subjectId, MAX(subject_name) as subject_name FROM subjectsdb GROUP BY subjectId) sub
           ON s.subjectsId = sub.subjectId
         WHERE s.departmentId = 11 AND s.batchNo = 101
         GROUP BY s.subjectsId, sub.subject_name, s.qset
         ORDER BY s.subjectsId, s.qset`
    );

    const ws2 = wb.addWorksheet('Unique Combos');
    ws2.columns = [
        { header: 'subjectsId', key: 'subjectsId', width: 12 },
        { header: 'subject_name', key: 'subject_name', width: 30 },
        { header: 'qset', key: 'qset', width: 8 },
        { header: 'student_count', key: 'student_count', width: 14 },
    ];
    combos.forEach(r => ws2.addRow(r));
    ws2.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // ========== SHEET 3: Controller ==========
    console.log('Fetching controller...');
    const [ctrl] = await c.execute(
        `SELECT * FROM controllerdb WHERE departmentId = 11 AND batchNo = 101`
    );
    ctrl.forEach(r => {
        try { r.password_decrypted = decrypt(r.controller_pass); } catch(e) { r.password_decrypted = 'DECRYPT_ERROR'; }
    });

    const ws3 = wb.addWorksheet('Controller');
    ws3.columns = [
        { header: 'center', key: 'center', width: 10 },
        { header: 'batchNo', key: 'batchNo', width: 10 },
        { header: 'departmentId', key: 'departmentId', width: 14 },
        { header: 'controller_code', key: 'controller_code', width: 16 },
        { header: 'controller_name', key: 'controller_name', width: 40 },
        { header: 'controller_contact', key: 'controller_contact', width: 18 },
        { header: 'controller_email', key: 'controller_email', width: 35 },
        { header: 'password_decrypted', key: 'password_decrypted', width: 20 },
        { header: 'controller_pass_encrypted', key: 'controller_pass', width: 50 },
        { header: 'district', key: 'district', width: 18 },
    ];
    ctrl.forEach(r => ws3.addRow(r));
    ws3.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // ========== SHEET 4: Audio Data with Student IDs ==========
    console.log('Fetching audio data...');
    const [audio] = await c.execute(
        `SELECT a.id as audio_id, a.subjectId, a.qset, a.departmentId,
                a.code_a, a.code_b, a.code_t,
                a.audio1, a.audio2, a.testaudio,
                a.passage1, a.passage2,
                a.textPassageA, a.textPassageB
         FROM audiodb a
         WHERE a.departmentId = 11
           AND a.subjectId IN (51, 61)
           AND a.qset IN (1, 2)
         ORDER BY a.subjectId, a.qset`
    );

    // Get student IDs grouped by subjectsId + qset
    const [studentsByCombo] = await c.execute(
        `SELECT subjectsId, qset, GROUP_CONCAT(student_id ORDER BY student_id SEPARATOR ', ') as student_ids,
                COUNT(*) as student_count
         FROM students
         WHERE departmentId = 11 AND batchNo = 101
         GROUP BY subjectsId, qset
         ORDER BY subjectsId, qset`
    );
    const comboMap = {};
    studentsByCombo.forEach(r => { comboMap[`${r.subjectsId}_${r.qset}`] = r; });

    // Merge student IDs into audio rows
    audio.forEach(r => {
        const key = `${r.subjectId}_${r.qset}`;
        r.student_count = comboMap[key] ? comboMap[key].student_count : 0;
        r.student_ids = comboMap[key] ? comboMap[key].student_ids : '';
    });

    const ws4 = wb.addWorksheet('Audio Data');
    ws4.columns = [
        { header: 'audio_id', key: 'audio_id', width: 10 },
        { header: 'subjectId', key: 'subjectId', width: 12 },
        { header: 'qset', key: 'qset', width: 8 },
        { header: 'departmentId', key: 'departmentId', width: 14 },
        { header: 'student_count', key: 'student_count', width: 14 },
        { header: 'student_ids', key: 'student_ids', width: 50 },
        { header: 'code_a', key: 'code_a', width: 18 },
        { header: 'code_b', key: 'code_b', width: 18 },
        { header: 'code_t', key: 'code_t', width: 18 },
        { header: 'audio1', key: 'audio1', width: 20 },
        { header: 'audio2', key: 'audio2', width: 20 },
        { header: 'testaudio', key: 'testaudio', width: 60 },
        { header: 'passage1', key: 'passage1', width: 60 },
        { header: 'passage2', key: 'passage2', width: 60 },
        { header: 'textPassageA', key: 'textPassageA', width: 80 },
        { header: 'textPassageB', key: 'textPassageB', width: 80 },
    ];
    audio.forEach(r => ws4.addRow(r));
    ws4.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // Save
    const outPath = 'Dept11_Batch101_Full_Data.xlsx';
    await wb.xlsx.writeFile(outPath);
    console.log(`\n✓ Excel saved: ${outPath}`);
    console.log(`  - Students: ${students.length} rows`);
    console.log(`  - Unique Combos: ${combos.length} rows`);
    console.log(`  - Controller: ${ctrl.length} rows`);
    console.log(`  - Audio Data: ${audio.length} rows`);

    await c.end();
})();
