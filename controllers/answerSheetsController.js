const connection = require("../config/db1");

// Function to create answersheet table if it doesn't exist
async function createAnswerSheetTableIfNotExists() {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS answersheet (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        student_id BIGINT,
        image1 LONGTEXT,
        image2 LONGTEXT,
        image3 LONGTEXT,
        image4 LONGTEXT,
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

// Function to process files and insert/update the database
async function processFiles(files, studentId, connection) {
  const [existingRecord] = await connection.query(
    'SELECT * FROM answersheet WHERE student_id = ?',
    [studentId]
  );

  let query;
  let params;

  const imageData = files.map(file => {
    const base64Data = file.buffer.toString('base64');
    return `${base64Data}`;
  });

  if (existingRecord.length === 0) {
    // Insert new record
    query = 'INSERT INTO answersheet (student_id, image1, image2, image3, image4) VALUES (?, ?, ?, ?, ?)';
    params = [studentId, ...imageData, ...Array(4 - imageData.length).fill(null)];
  } else {
    // Update existing record, only filling empty slots
    const existingImages = [
      existingRecord[0].image1,
      existingRecord[0].image2,
      existingRecord[0].image3,
      existingRecord[0].image4
    ];
    
    let updatedImages = [...existingImages];
    let newImageIndex = 0;

    for (let i = 0; i < 4; i++) {
      if (!existingImages[i] && newImageIndex < imageData.length) {
        updatedImages[i] = imageData[newImageIndex];
        newImageIndex++;
      }
    }

    if (newImageIndex < imageData.length) {
      throw new Error('No empty slots available for all uploaded images');
    }
    
    query = 'UPDATE answersheet SET image1 = ?, image2 = ?, image3 = ?, image4 = ? WHERE student_id = ?';
    params = [...updatedImages, studentId];
  }

  await connection.query(query, params);
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

    // Check available slots
    const [existingImages] = await connection.query(
      'SELECT image1, image2, image3, image4 FROM answersheet WHERE student_id = ?',
      [studentId]
    );

    let availableSlots = 4;
    if (existingImages.length > 0) {
      availableSlots = [
        existingImages[0].image1,
        existingImages[0].image2,
        existingImages[0].image3,
        existingImages[0].image4
      ].filter(img => img === null).length;
    }

    if (req.files.length > availableSlots) {
      return res.status(400).json({ message: `Only ${availableSlots} empty slot(s) available for upload.` });
    }

    // Process files and update database
    await processFiles(req.files, studentId, connection);

    res.status(200).json({ message: 'Answer sheets uploaded successfully' });
  } catch (error) {
    console.error('Error in uploadAnswerSheets:', error);
    res.status(500).json({ message: 'Error uploading answer sheets', error: error.message });
  }
};