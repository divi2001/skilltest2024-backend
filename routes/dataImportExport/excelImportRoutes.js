const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { importExcel } = require('../../controllers/dataImportExport/ExcelImportController');

const { appendExcel } = require('../../controllers/dataImportExport/AppendExcel');
// Configure multer to use memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import-excel', upload.any(), async (req, res) => {
  console.log('Files:', req.files);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  

  try { 
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No file uploaded.');
    }

    const file = req.files[0]; // Get the first file
    const tempPath = path.join(__dirname, '../../uploads', file.originalname);

    // Write the file to disk
    fs.writeFileSync(tempPath, file.buffer);

    const result = await importExcel(tempPath);
    
    // Clean up the temporary file
    fs.unlinkSync(tempPath);

    if (result.success) {
      res.json({ message: result.message, details: result.results });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in import-excel route:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});



router.post('/append-excel', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No file uploaded.');
    }

    const file = req.files[0]; // Get the first file
    const tempPath = path.join(__dirname, '../../uploads', file.originalname);

    // Write the file to disk
    fs.writeFileSync(tempPath, file.buffer);

    const result = await appendExcel(tempPath);
    
    // Clean up the temporary file
    fs.unlinkSync(tempPath);

    if (result.success) {
      res.json({ message: result.message, details: result.results });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in import-excel route:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

module.exports = router;