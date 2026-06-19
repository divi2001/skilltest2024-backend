const c = require('./config/db1');
c.query('SELECT s.done, COUNT(*) as count FROM trackrecord tr INNER JOIN students s ON tr.student_id = s.student_id WHERE s.batchNo IN (101,102,103,104) GROUP BY s.done')
    .then(([r]) => {
        console.log('Done status distribution:');
        r.forEach(x => console.log('  done=' + x.done + ': ' + x.count + ' students'));
        const total = r.reduce((sum, x) => sum + x.count, 0);
        console.log('  TOTAL: ' + total);
        c.end();
    });
