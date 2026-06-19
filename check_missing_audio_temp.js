const db = require('./config/db1');
(async () => {
  const [missing] = await db.query(`
    SELECT DISTINCT s.departmentId, s.subjectsId as subjectId, s.qset 
    FROM students s 
    LEFT JOIN audiodb a ON s.subjectsId = a.subjectId AND s.qset = a.qset AND s.departmentId = a.departmentId
    WHERE s.departmentId IN (11,12,13) AND a.id IS NULL
    ORDER BY s.departmentId, s.subjectsId, s.qset
  `);
  console.log('=== Students with NO audiodb entry ===');
  for (const r of missing) console.log('  dept=' + r.departmentId + ' subj=' + r.subjectId + ' qset=' + r.qset);
  console.log('Total missing: ' + missing.length);
  process.exit();
})();
