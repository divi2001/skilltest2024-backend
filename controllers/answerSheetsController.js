const connection = require("../config/db1");

// Function to create answersheet table if it doesn't exist
async function createAnswerSheetTableIfNotExists() {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS answersheet (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        student_id BIGINT,
        base64 LONGTEXT,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id)
      )
    `);
    console.log('Answersheet table created or already exists');
  } catch (error) {
    console.error('Error creating answersheet table:', error);
    throw error;
  }
}

// Function to process a single file
async function processFile(file, studentId, connection) {
  const base64Data = file.buffer.toString('base64');
  const base64String = `data:${file.mimetype};base64,${base64Data}`;
  
  await connection.query(
    'INSERT INTO answersheet (student_id, base64) VALUES (?, ?)',
    [studentId, base64String]
  );
}

exports.uploadAnswerSheets = async (req, res) => {
  const { studentId } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files were uploaded.' });
  }

  if (req.files.length > 4) {
    return res.status(400).json({ message: 'Maximum 4 images can be uploaded at once.' });
  }

  try {
    // Ensure the answersheet table exists
    await createAnswerSheetTableIfNotExists();

    // Check if the student exists
    const [students] = await connection.query('SELECT * FROM students WHERE student_id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check how many images the student already has
    const [existingImages] = await connection.query(
      'SELECT COUNT(*) as count FROM answersheet WHERE student_id = ?',
      [studentId]
    );

    const currentCount = existingImages[0].count;
    const newImagesCount = req.files.length;

    if (currentCount + newImagesCount > 5) {
      return res.status(400).json({ message: 'Maximum 5 images allowed per student' });
    }

    // Process all files concurrently
    await Promise.all(req.files.map(file => processFile(file, studentId, connection)));

    res.status(200).json({ message: 'Answer sheets uploaded successfully' });
  } catch (error) {
    console.error('Error in uploadAnswerSheets:', error);
    res.status(500).json({ message: 'Error uploading answer sheets', error: error.message });
  }
};