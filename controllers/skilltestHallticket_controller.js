// const puppeteer = require('puppeteer');
// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const archiver = require('archiver');

// // Upload and process Excel file with student data
// exports.uploadSkillTestStudentData = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     const data = XLSX.utils.sheet_to_json(worksheet);

//     const dataPath = path.join(__dirname, '../skilltest_data.json');
//     fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

//     fs.unlinkSync(req.file.path);

//     res.json({ 
//       success: true, 
//       message: 'Student data uploaded successfully', 
//       recordCount: data.length 
//     });
//   } catch (error) {
//     console.error('Upload error:', error);
//     res.status(500).json({ error: 'Failed to process Excel file' });
//   }
// };

// // Convert image to base64
// function getImageAsBase64(imagePath) {
//   try {
//     const fullPath = path.join(__dirname, '../public/assets/skilltest', imagePath);
//     if (fs.existsSync(fullPath)) {
//       const imageBuffer = fs.readFileSync(fullPath);
//       const ext = path.extname(fullPath).toLowerCase();
//       let mimeType = 'image/jpeg';
      
//       if (ext === '.png') mimeType = 'image/png';
//       else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      
//       return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
//     }
//     return '';
//   } catch (error) {
//     console.error(`Error reading image ${imagePath}:`, error.message);
//     return '';
//   }
// }

// // Generate and download single hall ticket PDF
// exports.downloadSkillTestHallTicket = async (req, res) => {
//   let browser = null;
  
//   try {
//     const { applicationNo } = req.params;
    
//     const dataPath = path.join(__dirname, '../skilltest_data.json');
//     if (!fs.existsSync(dataPath)) {
//       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
//     }

//     const studentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
//     const student = studentData.find(s => s.APPLICATION_NUMBER === applicationNo);
    
//     if (!student) {
//       return res.status(404).json({ error: 'Student not found with this application number' });
//     }

//     console.log('Generating PDF for:', applicationNo);

//     // Convert all images to base64
//     const studentWithImages = {
//       ...student,
//       logoBase64: getImageAsBase64('pwd_logo1.jpg'),
//       ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
//       photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
//       signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
//       townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
//       qrCodeBase64: getImageAsBase64('qr-code-sh.png')
//     };

//     // Read EJS template
//     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
//     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
//     // Render EJS template with student data
//     const html = ejs.render(htmlTemplate, studentWithImages);
    
//     // Launch Puppeteer
//     browser = await puppeteer.launch({
//       headless: 'new',
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--disable-gpu'
//       ]
//     });
    
//     const page = await browser.newPage();
    
//     // Set content
//     await page.setContent(html, { 
//       waitUntil: 'networkidle0',
//       timeout: 60000 
//     });
    
//     // Wait for rendering
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     // Generate PDF
//     const pdfBuffer = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       preferCSSPageSize: false,
//       margin: { 
//         top: '0mm', 
//         right: '0mm', 
//         bottom: '0mm', 
//         left: '0mm' 
//       }
//     });
    
//     await browser.close();
    
//     console.log('PDF generated successfully');
    
//     // Send PDF
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=hallticket_${applicationNo}.pdf`);
//     res.setHeader('Content-Length', pdfBuffer.length);
//     res.end(pdfBuffer, 'binary');
    
//   } catch (error) {
//     console.error('PDF generation error:', error);
//     if (browser) {
//       await browser.close();
//     }
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Failed to generate hall ticket PDF', details: error.message });
//     }
//   }
// };

// // Generate and download all hall tickets as ZIP file - FIXED VERSION
// exports.downloadAllSkillTestHallTickets = async (req, res) => {
//   let browser = null;
  
//   try {
//     const dataPath = path.join(__dirname, '../skilltest_data.json');
//     if (!fs.existsSync(dataPath)) {
//       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
//     }

//     const studentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
//     if (studentData.length === 0) {
//       return res.status(404).json({ error: 'No students found in the data' });
//     }

//     console.log(`Generating ${studentData.length} hall tickets...`);

//     // Set response headers immediately
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
//     // Create archive and pipe to response immediately
//     const archive = archiver('zip', { 
//       zlib: { level: 6 } // Lower compression for faster generation
//     });
    
//     // Handle archive errors
//     archive.on('error', (err) => {
//       console.error('Archive error:', err);
//       if (!res.headersSent) {
//         res.status(500).json({ error: 'Failed to create ZIP archive' });
//       }
//     });
    
//     // Pipe archive to response immediately
//     archive.pipe(res);
    
//     // Launch browser
//     browser = await puppeteer.launch({
//       headless: 'new',
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--disable-gpu'
//       ]
//     });
    
//     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
//     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
//     // Process students sequentially to avoid buffer conflicts
//     let successCount = 0;
//     let errorCount = 0;
    
//     for (let i = 0; i < studentData.length; i++) {
//       const student = studentData[i];
      
//       try {
//         console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

//         // Convert images to base64
//         const studentWithImages = {
//           ...student,
//           logoBase64: getImageAsBase64('pwd_logo1.jpg'),
//           ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
//           photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
//           signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
//           townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
//           qrCodeBase64: getImageAsBase64('qr-code-sh.png')
//         };

//         const html = ejs.render(htmlTemplate, studentWithImages);
        
//         const page = await browser.newPage();
        
//         // Set shorter timeout for faster processing
//         await page.setContent(html, { 
//           waitUntil: 'domcontentloaded', // Faster than networkidle0
//           timeout: 30000 
//         });
        
//         // Shorter wait time
//         await new Promise(resolve => setTimeout(resolve, 300));
        
//         const pdfBuffer = await page.pdf({
//           format: 'A4',
//           printBackground: true,
//           preferCSSPageSize: false,
//           margin: { 
//             top: '0mm', 
//             right: '0mm', 
//             bottom: '0mm', 
//             left: '0mm' 
//           }
//         });
        
//         await page.close();
        
//         // Create a fresh buffer copy to avoid conflicts
//         const freshBuffer = Buffer.from(pdfBuffer);
        
//         // Add PDF to archive
//         const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
//         archive.append(freshBuffer, { name: filename });
        
//         successCount++;
//         console.log(`✓ Added to ZIP: ${filename} (${successCount}/${studentData.length})`);
        
//       } catch (error) {
//         errorCount++;
//         console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
        
//         // Add error file to ZIP to indicate failure
//         const errorFilename = `ERROR_${student.APPLICATION_NUMBER}.txt`;
//         archive.append(`Failed to generate hall ticket for ${student.APPLICATION_NUMBER}\nError: ${error.message}`, { name: errorFilename });
//       }
      
//       // Small delay to prevent overwhelming the system
//       if (i < studentData.length - 1) {
//         await new Promise(resolve => setTimeout(resolve, 200));
//       }
//     }
    
//     // Close browser
//     await browser.close();
//     browser = null;
    
//     // Finalize archive
//     await archive.finalize();
    
//     console.log(`ZIP file generation completed: ${successCount} successful, ${errorCount} failed`);
    
//   } catch (error) {
//     console.error('Bulk PDF generation error:', error);
//     if (browser) {
//       await browser.close();
//     }
    
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
//     }
//   }
// };

// // Alternative faster method using temporary files (more reliable)
// exports.downloadAllSkillTestHallTicketsFast = async (req, res) => {
//   let browser = null;
  
//   try {
//     const dataPath = path.join(__dirname, '../skilltest_data.json');
//     if (!fs.existsSync(dataPath)) {
//       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
//     }

//     const studentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
//     if (studentData.length === 0) {
//       return res.status(404).json({ error: 'No students found in the data' });
//     }

//     console.log(`Generating ${studentData.length} hall tickets using fast method...`);

//     // Create temporary directory
//     const tempDir = path.join(__dirname, '../temp_pdfs_' + Date.now());
//     if (!fs.existsSync(tempDir)) {
//       fs.mkdirSync(tempDir, { recursive: true });
//     }

//     // Launch browser
//     browser = await puppeteer.launch({
//       headless: 'new',
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--disable-gpu'
//       ]
//     });
    
//     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
//     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
//     // Generate PDFs to temporary files first
//     let successCount = 0;
//     const generatedFiles = [];
    
//     for (let i = 0; i < studentData.length; i++) {
//       const student = studentData[i];
      
//       try {
//         console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

//         // Convert images to base64
//         const studentWithImages = {
//           ...student,
//           logoBase64: getImageAsBase64('pwd_logo1.jpg'),
//           ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
//           photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
//           signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
//           townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
//           qrCodeBase64: getImageAsBase64('qr-code-sh.png')
//         };

//         const html = ejs.render(htmlTemplate, studentWithImages);
        
//         const page = await browser.newPage();
        
//         await page.setContent(html, { 
//           waitUntil: 'domcontentloaded',
//           timeout: 30000 
//         });
        
//         await new Promise(resolve => setTimeout(resolve, 300));
        
//         const pdfBuffer = await page.pdf({
//           format: 'A4',
//           printBackground: true,
//           preferCSSPageSize: false,
//           margin: { 
//             top: '0mm', 
//             right: '0mm', 
//             bottom: '0mm', 
//             left: '0mm' 
//           }
//         });
        
//         await page.close();
        
//         // Save to temporary file
//         const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
//         const filePath = path.join(tempDir, filename);
//         fs.writeFileSync(filePath, pdfBuffer);
//         generatedFiles.push(filePath);
        
//         successCount++;
//         console.log(`✓ Generated: ${filename} (${successCount}/${studentData.length})`);
        
//       } catch (error) {
//         console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
//       }
      
//       // Small delay
//       if (i < studentData.length - 1) {
//         await new Promise(resolve => setTimeout(resolve, 200));
//       }
//     }
    
//     // Close browser
//     await browser.close();
//     browser = null;
    
//     // Create ZIP from temporary files
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
//     const archive = archiver('zip', { zlib: { level: 6 } });
    
//     archive.on('error', (err) => {
//       console.error('Archive error:', err);
//       if (!res.headersSent) {
//         res.status(500).json({ error: 'Failed to create ZIP archive' });
//       }
//     });
    
//     archive.pipe(res);
    
//     // Add all generated files to archive
//     generatedFiles.forEach(filePath => {
//       const filename = path.basename(filePath);
//       archive.file(filePath, { name: filename });
//     });
    
//     await archive.finalize();
    
//     console.log(`ZIP file created successfully: ${successCount} PDFs`);
    
//     // Clean up temporary files after a delay
//     setTimeout(() => {
//       try {
//         generatedFiles.forEach(filePath => {
//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//           }
//         });
//         if (fs.existsSync(tempDir)) {
//           fs.rmSync(tempDir, { recursive: true, force: true });
//         }
//         console.log('Temporary files cleaned up');
//       } catch (cleanupError) {
//         console.error('Error cleaning up temporary files:', cleanupError);
//       }
//     }, 5000);
    
//   } catch (error) {
//     console.error('Fast bulk PDF generation error:', error);
//     if (browser) {
//       await browser.close();
//     }
    
//     // Clean up on error
//     try {
//       const tempDir = path.join(__dirname, '../temp_pdfs_*');
//       // Cleanup logic for temp directories
//     } catch (cleanupError) {
//       console.error('Error cleaning up on failure:', cleanupError);
//     }
    
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
//     }
//   }
// };


const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const archiver = require('archiver');

// Store student data in memory
let studentDataMemory = null;

// Upload and process Excel file with student data
exports.uploadSkillTestStudentData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Store data in memory
    studentDataMemory = data;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: 'Student data uploaded successfully', 
      recordCount: data.length 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
};

// Convert image to base64
function getImageAsBase64(imagePath) {
  try {
    const fullPath = path.join(__dirname, '../public/assets/skilltest', imagePath);
    if (fs.existsSync(fullPath)) {
      const imageBuffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      let mimeType = 'image/jpeg';
      
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }
    return '';
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error.message);
    return '';
  }
}

// Clear memory function
function clearMemoryData() {
  if (studentDataMemory) {
    const recordCount = studentDataMemory.length;
    studentDataMemory = null;
    console.log(`🧹 Memory cleared. Previous record count: ${recordCount}`);
  }
}

// Generate and download single hall ticket PDF
exports.downloadSkillTestHallTicket = async (req, res) => {
  let browser = null;
  
  try {
    const { applicationNo } = req.params;
    
    // Check if data exists in memory
    if (!studentDataMemory) {
      return res.status(404).json({ error: 'No student data found. Please upload data first.' });
    }

    const student = studentDataMemory.find(s => s.APPLICATION_NUMBER === applicationNo);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found with this application number' });
    }

    console.log('Generating PDF for:', applicationNo);

    // Convert all images to base64
    const studentWithImages = {
      ...student,
      logoBase64: getImageAsBase64('pwd_logo1.jpg'),
      ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
      photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
      signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
      townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
      qrCodeBase64: getImageAsBase64('qr-code-sh.png')
    };

    // Read EJS template
    const templatePath = path.join(__dirname, '../views/hallticket.ejs');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Render EJS template with student data
    const html = ejs.render(htmlTemplate, studentWithImages);
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { 
        top: '0mm', 
        right: '0mm', 
        bottom: '0mm', 
        left: '0mm' 
      }
    });
    
    await browser.close();
    
    console.log('PDF generated successfully');
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=hallticket_${applicationNo}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF and clear memory after response is sent
    res.end(pdfBuffer, 'binary', () => {
      console.log('📤 PDF sent to client, clearing memory...');
      clearMemoryData();
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    if (browser) {
      await browser.close();
    }
    
    // Clear memory on error too
    clearMemoryData();
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate hall ticket PDF', details: error.message });
    }
  }
};

// Generate and download all hall tickets as ZIP file
exports.downloadAllSkillTestHallTickets = async (req, res) => {
  let browser = null;
  
  try {
    // Check if data exists in memory
    if (!studentDataMemory) {
      return res.status(404).json({ error: 'No student data found. Please upload data first.' });
    }

    const studentData = studentDataMemory;
    
    if (studentData.length === 0) {
      return res.status(404).json({ error: 'No students found in the data' });
    }

    console.log(`Generating ${studentData.length} hall tickets...`);

    // Set response headers immediately
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
    // Create archive and pipe to response immediately
    const archive = archiver('zip', { 
      zlib: { level: 6 }
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      clearMemoryData(); // Clear memory on archive error
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create ZIP archive' });
      }
    });
    
    // Pipe archive to response immediately
    archive.pipe(res);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const templatePath = path.join(__dirname, '../views/hallticket.ejs');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Process students sequentially to avoid buffer conflicts
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < studentData.length; i++) {
      const student = studentData[i];
      
      try {
        console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

        // Convert images to base64
        const studentWithImages = {
          ...student,
          logoBase64: getImageAsBase64('pwd_logo1.jpg'),
          ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
          photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
          signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
          townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
          qrCodeBase64: getImageAsBase64('qr-code-sh.png')
        };

        const html = ejs.render(htmlTemplate, studentWithImages);
        
        const page = await browser.newPage();
        
        // Set shorter timeout for faster processing
        await page.setContent(html, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        // Shorter wait time
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: false,
          margin: { 
            top: '0mm', 
            right: '0mm', 
            bottom: '0mm', 
            left: '0mm' 
          }
        });
        
        await page.close();
        
        // Create a fresh buffer copy to avoid conflicts
        const freshBuffer = Buffer.from(pdfBuffer);
        
        // Add PDF to archive
        const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
        archive.append(freshBuffer, { name: filename });
        
        successCount++;
        console.log(`✓ Added to ZIP: ${filename} (${successCount}/${studentData.length})`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
        
        // Add error file to ZIP to indicate failure
        const errorFilename = `ERROR_${student.APPLICATION_NUMBER}.txt`;
        archive.append(`Failed to generate hall ticket for ${student.APPLICATION_NUMBER}\nError: ${error.message}`, { name: errorFilename });
      }
      
      // Small delay to prevent overwhelming the system
      if (i < studentData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Close browser
    await browser.close();
    browser = null;
    
    // Finalize archive and clear memory when done
    archive.finalize();
    
    // Clear memory when archive is finished
    archive.on('end', () => {
      console.log(`📤 ZIP file sent to client, clearing memory...`);
      console.log(`ZIP generation completed: ${successCount} successful, ${errorCount} failed`);
      clearMemoryData();
    });
    
  } catch (error) {
    console.error('Bulk PDF generation error:', error);
    if (browser) {
      await browser.close();
    }
    
    // Clear memory on error
    clearMemoryData();
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
    }
  }
};

// Check if data is loaded in memory
exports.checkDataStatus = async (req, res) => {
  try {
    if (!studentDataMemory) {
      return res.json({
        status: 'no_data',
        message: 'No student data loaded. Please upload an Excel file first.',
        recordCount: 0
      });
    }

    res.json({
      status: 'data_loaded',
      message: 'Student data is loaded in memory',
      recordCount: studentDataMemory.length,
      sampleRecord: studentDataMemory[0] ? {
        APPLICATION_NUMBER: studentDataMemory[0].APPLICATION_NUMBER,
        fullname: studentDataMemory[0].fullname
      } : null
    });
  } catch (error) {
    console.error('Check data status error:', error);
    res.status(500).json({ error: 'Failed to check data status' });
  }
};

// Manual clear endpoint (optional)
exports.clearMemoryData = async (req, res) => {
  try {
    const previousCount = studentDataMemory ? studentDataMemory.length : 0;
    clearMemoryData();
    
    res.json({
      success: true,
      message: 'Memory data cleared successfully',
      previousRecordCount: previousCount
    });
  } catch (error) {
    console.error('Clear memory data error:', error);
    res.status(500).json({ error: 'Failed to clear memory data' });
  }
};