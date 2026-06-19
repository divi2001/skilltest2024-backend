require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    // Update code_a: 51_1A.mp3 → 51_1A_11.mp3
    const [r1] = await c.query(`
        UPDATE audiodb 
        SET code_a = CONCAT(REPLACE(code_a, '.mp3', ''), '_', departmentId, '.mp3') 
        WHERE code_a IS NOT NULL AND code_a NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('code_a updated:', r1.affectedRows);

    // Update code_b
    const [r2] = await c.query(`
        UPDATE audiodb 
        SET code_b = CONCAT(REPLACE(code_b, '.mp3', ''), '_', departmentId, '.mp3') 
        WHERE code_b IS NOT NULL AND code_b NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('code_b updated:', r2.affectedRows);

    // Update code_t
    const [r3] = await c.query(`
        UPDATE audiodb 
        SET code_t = CONCAT(REPLACE(code_t, '.mp3', ''), '_', departmentId, '.mp3') 
        WHERE code_t IS NOT NULL AND code_t NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('code_t updated:', r3.affectedRows);

    // Update audio1 (same as code_a pattern)
    const [r4] = await c.query(`
        UPDATE audiodb 
        SET audio1 = CONCAT(REPLACE(audio1, '.mp3', ''), '_', departmentId, '.mp3') 
        WHERE audio1 IS NOT NULL 
          AND audio1 NOT LIKE 'http%'
          AND audio1 NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('audio1 updated:', r4.affectedRows);

    // Update audio2 (same as code_b pattern)
    const [r5] = await c.query(`
        UPDATE audiodb 
        SET audio2 = CONCAT(REPLACE(audio2, '.mp3', ''), '_', departmentId, '.mp3') 
        WHERE audio2 IS NOT NULL 
          AND audio2 NOT LIKE 'http%'
          AND audio2 NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('audio2 updated:', r5.affectedRows);

    // Update testaudio - has S3 URLs, update the filename part
    const [r6] = await c.query(`
        UPDATE audiodb 
        SET testaudio = CONCAT(
            SUBSTRING_INDEX(testaudio, '/', LENGTH(testaudio) - LENGTH(REPLACE(testaudio, '/', ''))),
            '/',
            REPLACE(SUBSTRING_INDEX(testaudio, '/', -1), '.mp3', CONCAT('_', departmentId, '.mp3'))
        )
        WHERE testaudio IS NOT NULL 
          AND testaudio LIKE 'http%'
          AND testaudio NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('testaudio (URLs) updated:', r6.affectedRows);

    // Also update testaudio that are not URLs
    const [r7] = await c.query(`
        UPDATE audiodb 
        SET testaudio = CONCAT(REPLACE(testaudio, '.mp3', ''), '_', departmentId, '.mp3') 
        WHERE testaudio IS NOT NULL 
          AND testaudio NOT LIKE 'http%'
          AND testaudio NOT LIKE CONCAT('%\\_', departmentId, '.mp3')
    `);
    console.log('testaudio (non-URL) updated:', r7.affectedRows);

    // Verify
    const [sample] = await c.query(`
        SELECT id, subjectId, qset, departmentId, code_a, code_b, code_t, audio1, audio2, 
               SUBSTRING(testaudio, -30) as testaudio_end
        FROM audiodb ORDER BY departmentId, subjectId, qset LIMIT 10
    `);
    console.log('\nSample after update:');
    console.table(sample);

    await c.end();
})();
