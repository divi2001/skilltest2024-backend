const db = require('./config/db1');

const S3_BASE = 'https://shorthand2026.s3.ap-south-1.amazonaws.com/audio_jan26/';

(async () => {
  try {
    // =============================================
    // STEP 1: Delete 96 orphan audiodb rows
    // =============================================
    const [orphans] = await db.query(`
      SELECT a.id, a.departmentId, a.subjectId, a.qset
      FROM audiodb a
      LEFT JOIN students s ON a.subjectId = s.subjectsId AND a.qset = s.qset AND a.departmentId = s.departmentId
      WHERE a.departmentId IN (11,12,13) AND s.student_id IS NULL
      ORDER BY a.id
    `);
    console.log(`Orphan rows to delete: ${orphans.length}`);

    if (orphans.length > 0) {
      const orphanIds = orphans.map(r => r.id);
      const [delResult] = await db.query('DELETE FROM audiodb WHERE id IN (?)', [orphanIds]);
      console.log(`Deleted: ${delResult.affectedRows} rows`);
    }

    // =============================================
    // STEP 2: Add 10 missing rows for dept 13
    // =============================================
    const missingCombos = [
      { departmentId: 13, subjectId: 61, qset: 3 },
      { departmentId: 13, subjectId: 61, qset: 4 },
      { departmentId: 13, subjectId: 61, qset: 5 },
      { departmentId: 13, subjectId: 61, qset: 6 },
      { departmentId: 13, subjectId: 61, qset: 7 },
      { departmentId: 13, subjectId: 61, qset: 8 },
      { departmentId: 13, subjectId: 62, qset: 3 },
      { departmentId: 13, subjectId: 62, qset: 4 },
      { departmentId: 13, subjectId: 62, qset: 5 },
      { departmentId: 13, subjectId: 62, qset: 6 },
    ];

    // Pattern: {departmentId}_{subjectId}_{qset}{A/B/T}.mp3
    let inserted = 0;
    for (const c of missingCombos) {
      const d = c.departmentId, s = c.subjectId, q = c.qset;
      const codeA = `${d}_${s}_${q}A.mp3`;
      const codeB = `${d}_${s}_${q}B.mp3`;
      const codeT = `${d}_${s}_${q}T.mp3`;
      const audio1 = codeA;
      const audio2 = codeB;
      const passage1 = `${S3_BASE}${codeA}`;
      const passage2 = `${S3_BASE}${codeB}`;
      const testaudio = `${S3_BASE}${codeT}`;

      await db.query(
        `INSERT INTO audiodb (subjectId, qset, departmentId, code_a, code_b, code_t, audio1, audio2, passage1, passage2, testaudio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s, q, d, codeA, codeB, codeT, audio1, audio2, passage1, passage2, testaudio]
      );
      inserted++;
      console.log(`  Inserted: dept=${d} subj=${s} qset=${q}`);
    }
    console.log(`\nInserted: ${inserted} new rows`);

    // =============================================
    // STEP 3: Verify final state
    // =============================================
    const [final] = await db.query('SELECT departmentId, COUNT(*) as cnt FROM audiodb WHERE departmentId IN (11,12,13) GROUP BY departmentId ORDER BY departmentId');
    console.log('\nFinal audiodb counts:');
    for (const r of final) console.log(`  dept ${r.departmentId}: ${r.cnt} rows`);

    // Check no orphans remain
    const [orphCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM audiodb a
      LEFT JOIN students s ON a.subjectId = s.subjectsId AND a.qset = s.qset AND a.departmentId = s.departmentId
      WHERE a.departmentId IN (11,12,13) AND s.student_id IS NULL
    `);
    console.log(`Remaining orphans: ${orphCheck[0].cnt}`);

    // Check no students missing audio
    const [missCheck] = await db.query(`
      SELECT COUNT(DISTINCT CONCAT(s.departmentId,'_',s.subjectsId,'_',s.qset)) as cnt
      FROM students s
      LEFT JOIN audiodb a ON s.subjectsId = a.subjectId AND s.qset = a.qset AND s.departmentId = a.departmentId
      WHERE s.departmentId IN (11,12,13) AND a.id IS NULL
    `);
    console.log(`Students still missing audio: ${missCheck[0].cnt}`);

    // =============================================
    // STEP 4: Export Excel
    // =============================================
    const XLSX = require('xlsx');
    const [rows] = await db.query('SELECT * FROM audiodb WHERE departmentId IN (11,12,13) ORDER BY departmentId, subjectId, qset');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'audiodb');
    const path = 'C:\\freelancer\\kk exams software\\audiodb.xlsx';
    XLSX.writeFile(wb, path);
    console.log(`\nExcel exported: ${rows.length} rows -> ${path}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
