/**
 * Dept 11, Batch 101 - Full picture:
 * 4 unique subjectsId+qset combos, controller pass, audio data
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    // 1. Unique combos
    console.log('=== 4 UNIQUE COMBOS: Dept 11, Batch 101 ===');
    const [combos] = await c.execute(
        `SELECT s.subjectsId, sub.subject_name, s.qset, COUNT(*) as students
         FROM students s
         LEFT JOIN (SELECT subjectId, MAX(subject_name) as subject_name FROM subjectsdb GROUP BY subjectId) sub
           ON s.subjectsId = sub.subjectId
         WHERE s.departmentId = 11 AND s.batchNo = 101
         GROUP BY s.subjectsId, sub.subject_name, s.qset
         ORDER BY s.subjectsId, s.qset`
    );
    console.table(combos);

    // 2. Controller
    console.log('\n=== CONTROLLER (Dept 11, Batch 101) ===');
    const [ctrl] = await c.execute(
        `SELECT center, batchNo, controller_code, controller_name, controller_contact, controller_email, controller_pass, district
         FROM controllerdb WHERE departmentId = 11 AND batchNo = 101`
    );
    ctrl.forEach(r => {
        console.log('Center:', r.center);
        console.log('Controller Code:', r.controller_code);
        console.log('Controller Name:', r.controller_name);
        console.log('Contact:', r.controller_contact);
        console.log('Email:', r.controller_email);
        console.log('Password (encrypted):', r.controller_pass);
        console.log('District:', r.district);
    });

    // 3. Audio data from audiodb for these 4 combos
    console.log('\n=== AUDIO DATA (audiodb) for subjectId 51,61 qset 1,2 dept 11 ===');
    const [audio] = await c.execute(
        `SELECT a.id, a.subjectId, a.qset, a.departmentId,
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
    console.log('Audio records found:', audio.length);
    console.log();

    audio.forEach(r => {
        console.log('─'.repeat(70));
        console.log(`subjectId: ${r.subjectId} | qset: ${r.qset} | dept: ${r.departmentId} | id: ${r.id}`);
        console.log(`code_a: ${r.code_a} | code_b: ${r.code_b} | code_t: ${r.code_t}`);
        console.log(`audio1:      ${r.audio1 || 'NULL'}`);
        console.log(`audio2:      ${r.audio2 || 'NULL'}`);
        console.log(`testaudio:   ${r.testaudio || 'NULL'}`);
        console.log(`passage1:    ${r.passage1 || 'NULL'}`);
        console.log(`passage2:    ${r.passage2 || 'NULL'}`);
        console.log(`textPassageA: ${r.textPassageA ? r.textPassageA.substring(0, 120) + '...' : 'NULL'}`);
        console.log(`textPassageB: ${r.textPassageB ? r.textPassageB.substring(0, 120) + '...' : 'NULL'}`);
        console.log();
    });

    await c.end();
})();
