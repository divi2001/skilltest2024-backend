const db = require('./config/db1');
(async () => {
  // What's in audiodb for dept 11,12,13
  const [audio] = await db.query('SELECT departmentId, subjectId, qset FROM audiodb WHERE departmentId IN (11,12,13) ORDER BY departmentId, subjectId, qset');
  console.log('=== AUDIODB entries (dept 11,12,13) ===');
  for (const r of audio) console.log('  dept=' + r.departmentId + ' subj=' + r.subjectId + ' qset=' + r.qset);
  console.log('Total audiodb rows: ' + audio.length);

  // What students actually have
  const [students] = await db.query('SELECT departmentId, subjectsId as subjectId, qset, COUNT(*) as cnt FROM students WHERE departmentId IN (11,12,13) GROUP BY departmentId, subjectsId, qset ORDER BY departmentId, subjectsId, qset');
  console.log('\n=== STUDENTS (dept 11,12,13) ===');
  for (const r of students) console.log('  dept=' + r.departmentId + ' subj=' + r.subjectId + ' qset=' + r.qset + ' count=' + r.cnt);

  // Find audiodb entries with NO matching students
  const [orphans] = await db.query(`
    SELECT a.departmentId, a.subjectId, a.qset 
    FROM audiodb a 
    LEFT JOIN students s ON a.subjectId = s.subjectsId AND a.qset = s.qset AND a.departmentId = s.departmentId
    WHERE a.departmentId IN (11,12,13) AND s.student_id IS NULL
    ORDER BY a.departmentId, a.subjectId, a.qset
  `);
  console.log('\n=== AUDIODB entries with NO matching students ===');
  for (const r of orphans) console.log('  dept=' + r.departmentId + ' subj=' + r.subjectId + ' qset=' + r.qset);
  console.log('Total orphan rows: ' + orphans.length);

  process.exit();
})();
