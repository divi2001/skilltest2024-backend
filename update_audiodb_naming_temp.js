const db = require('./config/db1');

/*
  Change naming pattern from:
    {subjectId}_{qset}{A/B/T}_{departmentId}.mp3
  To:
    {departmentId}_{subjectId}_{qset}{A/B/T}.mp3

  Columns to update:
    code_a, code_b, code_t  — filename only
    audio1, audio2          — filename only
    passage1, passage2      — full S3 URL (currently has NO departmentId in filename)
    testaudio               — full S3 URL (currently HAS departmentId suffix)
*/

const S3_BASE = 'https://shorthand2026.s3.ap-south-1.amazonaws.com/audio_jan26/';

function transformFilename(filename, departmentId) {
  // Current: {subjectId}_{qsetPart}{Letter}_{departmentId}.mp3 → e.g. 40_0A_10.mp3
  // New:     {departmentId}_{subjectId}_{qsetPart}{Letter}.mp3  → e.g. 10_40_0A.mp3
  if (!filename) return null;
  const suffix = `_${departmentId}.mp3`;
  if (!filename.endsWith(suffix)) {
    console.warn(`  WARNING: filename "${filename}" does not end with "${suffix}"`);
    return filename; // leave unchanged
  }
  const core = filename.slice(0, -suffix.length); // e.g. "40_0A"
  return `${departmentId}_${core}.mp3`;
}

function transformPassageUrl(url, departmentId) {
  // Current: .../audio_jan26/{subjectId}_{qsetPart}{A/B}.mp3 (NO departmentId)
  // New:     .../audio_jan26/{departmentId}_{subjectId}_{qsetPart}{A/B}.mp3
  if (!url) return null;
  const oldFilename = url.replace(S3_BASE, ''); // e.g. "40_0A.mp3"
  const core = oldFilename.replace('.mp3', '');  // e.g. "40_0A"
  const newFilename = `${departmentId}_${core}.mp3`;
  return `${S3_BASE}${newFilename}`;
}

function transformTestaudioUrl(url, departmentId) {
  // Current: .../audio_jan26/{subjectId}_{qsetPart}T_{departmentId}.mp3
  // New:     .../audio_jan26/{departmentId}_{subjectId}_{qsetPart}T.mp3
  if (!url) return null;
  const oldFilename = url.replace(S3_BASE, ''); // e.g. "40_0T_10.mp3"
  const suffix = `_${departmentId}.mp3`;
  if (!oldFilename.endsWith(suffix)) {
    console.warn(`  WARNING: testaudio filename "${oldFilename}" does not end with "${suffix}"`);
    return url;
  }
  const core = oldFilename.slice(0, -suffix.length); // e.g. "40_0T"
  const newFilename = `${departmentId}_${core}.mp3`;
  return `${S3_BASE}${newFilename}`;
}

(async () => {
  try {
    const [rows] = await db.query('SELECT id, subjectId, qset, departmentId, code_a, code_b, code_t, audio1, audio2, passage1, passage2, testaudio FROM audiodb ORDER BY id');
    console.log(`Total rows to update: ${rows.length}`);

    let updated = 0;
    let errors = 0;

    for (const row of rows) {
      const dept = row.departmentId;

      const newCodeA = transformFilename(row.code_a, dept);
      const newCodeB = transformFilename(row.code_b, dept);
      const newCodeT = transformFilename(row.code_t, dept);
      const newAudio1 = transformFilename(row.audio1, dept);
      const newAudio2 = transformFilename(row.audio2, dept);
      const newPassage1 = transformPassageUrl(row.passage1, dept);
      const newPassage2 = transformPassageUrl(row.passage2, dept);
      const newTestaudio = transformTestaudioUrl(row.testaudio, dept);

      try {
        await db.query(
          `UPDATE audiodb SET 
            code_a = ?, code_b = ?, code_t = ?,
            audio1 = ?, audio2 = ?,
            passage1 = ?, passage2 = ?, testaudio = ?
          WHERE id = ?`,
          [newCodeA, newCodeB, newCodeT, newAudio1, newAudio2, newPassage1, newPassage2, newTestaudio, row.id]
        );
        updated++;
      } catch (err) {
        console.error(`  ERROR updating row ${row.id}:`, err.message);
        errors++;
      }
    }

    console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);

    // Show sample of results
    const [sample] = await db.query('SELECT id, departmentId, code_a, code_b, code_t, audio1, audio2, passage1, passage2, testaudio FROM audiodb LIMIT 5');
    console.log('\nSample after update:');
    for (const r of sample) {
      console.log(`  id=${r.id} dept=${r.departmentId} code_a=${r.code_a} code_b=${r.code_b} code_t=${r.code_t}`);
      console.log(`    audio1=${r.audio1} audio2=${r.audio2}`);
      console.log(`    passage1=${r.passage1}`);
      console.log(`    passage2=${r.passage2}`);
      console.log(`    testaudio=${r.testaudio}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
