const db = require('./config/db1');

async function check() {
  try {
    // All distinct batches per dept (excluding batch 100 and dept 10)
    const [deptBatches] = await db.query(`
      SELECT departmentId, GROUP_CONCAT(DISTINCT batchNo ORDER BY batchNo) as batches
      FROM students
      WHERE batchNo != 100 AND departmentId != 10
      GROUP BY departmentId ORDER BY departmentId
    `);
    console.log('=== BATCHES PER DEPARTMENT ===');
    deptBatches.forEach(r => console.log(JSON.stringify(r)));

    // Subjects per dept (null qset students)
    const [subjPerDept] = await db.query(`
      SELECT departmentId, batchNo, subjectsId, COUNT(*) as count
      FROM students
      WHERE qset IS NULL AND batchNo != 100 AND departmentId != 10
      GROUP BY departmentId, batchNo, subjectsId
      ORDER BY departmentId, batchNo, subjectsId
    `);
    console.log('\n=== NULL QSET: dept > batch > subject > count ===');
    subjPerDept.forEach(r => console.log(JSON.stringify(r)));

    // Available qsets per subject/dept
    const [avail] = await db.query(`
      SELECT subjectId, departmentId, GROUP_CONCAT(DISTINCT qset ORDER BY qset) as available_qsets
      FROM audiodb
      GROUP BY subjectId, departmentId ORDER BY subjectId, departmentId
    `);
    console.log('\n=== AUDIODB AVAILABLE QSETS ===');
    avail.forEach(r => console.log(JSON.stringify(r)));

    process.exit(0);
  } catch(e) { console.error(e.message); process.exit(1); }
}
check();
