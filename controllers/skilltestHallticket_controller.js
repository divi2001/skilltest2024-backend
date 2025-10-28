// // // const puppeteer = require('puppeteer');
// // // const XLSX = require('xlsx');
// // // const fs = require('fs');
// // // const path = require('path');
// // // const ejs = require('ejs');
// // // const archiver = require('archiver');

// // // // Upload and process Excel file with student data
// // // exports.uploadSkillTestStudentData = async (req, res) => {
// // //   try {
// // //     if (!req.file) {
// // //       return res.status(400).json({ error: 'No file uploaded' });
// // //     }

// // //     const workbook = XLSX.readFile(req.file.path);
// // //     const sheetName = workbook.SheetNames[0];
// // //     const worksheet = workbook.Sheets[sheetName];
// // //     const data = XLSX.utils.sheet_to_json(worksheet);

// // //     const dataPath = path.join(__dirname, '../skilltest_data.json');
// // //     fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

// // //     fs.unlinkSync(req.file.path);

// // //     res.json({ 
// // //       success: true, 
// // //       message: 'Student data uploaded successfully', 
// // //       recordCount: data.length 
// // //     });
// // //   } catch (error) {
// // //     console.error('Upload error:', error);
// // //     res.status(500).json({ error: 'Failed to process Excel file' });
// // //   }
// // // };

// // // // Convert image to base64
// // // function getImageAsBase64(imagePath) {
// // //   try {
// // //     const fullPath = path.join(__dirname, '../public/assets/skilltest', imagePath);
// // //     if (fs.existsSync(fullPath)) {
// // //       const imageBuffer = fs.readFileSync(fullPath);
// // //       const ext = path.extname(fullPath).toLowerCase();
// // //       let mimeType = 'image/jpeg';
      
// // //       if (ext === '.png') mimeType = 'image/png';
// // //       else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      
// // //       return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
// // //     }
// // //     return '';
// // //   } catch (error) {
// // //     console.error(`Error reading image ${imagePath}:`, error.message);
// // //     return '';
// // //   }
// // // }

// // // // Generate and download single hall ticket PDF
// // // exports.downloadSkillTestHallTicket = async (req, res) => {
// // //   let browser = null;
  
// // //   try {
// // //     const { applicationNo } = req.params;
    
// // //     const dataPath = path.join(__dirname, '../skilltest_data.json');
// // //     if (!fs.existsSync(dataPath)) {
// // //       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
// // //     }

// // //     const studentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
// // //     const student = studentData.find(s => s.APPLICATION_NUMBER === applicationNo);
    
// // //     if (!student) {
// // //       return res.status(404).json({ error: 'Student not found with this application number' });
// // //     }

// // //     console.log('Generating PDF for:', applicationNo);

// // //     // Convert all images to base64
// // //     const studentWithImages = {
// // //       ...student,
// // //       logoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // //       ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // //       photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
// // //       signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
// // //       townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // //       qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // //     };

// // //     // Read EJS template
// // //     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // //     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
// // //     // Render EJS template with student data
// // //     const html = ejs.render(htmlTemplate, studentWithImages);
    
// // //     // Launch Puppeteer
// // //     browser = await puppeteer.launch({
// // //       headless: 'new',
// // //       args: [
// // //         '--no-sandbox',
// // //         '--disable-setuid-sandbox',
// // //         '--disable-dev-shm-usage',
// // //         '--disable-accelerated-2d-canvas',
// // //         '--disable-gpu'
// // //       ]
// // //     });
    
// // //     const page = await browser.newPage();
    
// // //     // Set content
// // //     await page.setContent(html, { 
// // //       waitUntil: 'networkidle0',
// // //       timeout: 60000 
// // //     });
    
// // //     // Wait for rendering
// // //     await new Promise(resolve => setTimeout(resolve, 1000));
    
// // //     // Generate PDF
// // //     const pdfBuffer = await page.pdf({
// // //       format: 'A4',
// // //       printBackground: true,
// // //       preferCSSPageSize: false,
// // //       margin: { 
// // //         top: '0mm', 
// // //         right: '0mm', 
// // //         bottom: '0mm', 
// // //         left: '0mm' 
// // //       }
// // //     });
    
// // //     await browser.close();
    
// // //     console.log('PDF generated successfully');
    
// // //     // Send PDF
// // //     res.setHeader('Content-Type', 'application/pdf');
// // //     res.setHeader('Content-Disposition', `attachment; filename=hallticket_${applicationNo}.pdf`);
// // //     res.setHeader('Content-Length', pdfBuffer.length);
// // //     res.end(pdfBuffer, 'binary');
    
// // //   } catch (error) {
// // //     console.error('PDF generation error:', error);
// // //     if (browser) {
// // //       await browser.close();
// // //     }
// // //     if (!res.headersSent) {
// // //       res.status(500).json({ error: 'Failed to generate hall ticket PDF', details: error.message });
// // //     }
// // //   }
// // // };

// // // // Generate and download all hall tickets as ZIP file - FIXED VERSION
// // // exports.downloadAllSkillTestHallTickets = async (req, res) => {
// // //   let browser = null;
  
// // //   try {
// // //     const dataPath = path.join(__dirname, '../skilltest_data.json');
// // //     if (!fs.existsSync(dataPath)) {
// // //       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
// // //     }

// // //     const studentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
// // //     if (studentData.length === 0) {
// // //       return res.status(404).json({ error: 'No students found in the data' });
// // //     }

// // //     console.log(`Generating ${studentData.length} hall tickets...`);

// // //     // Set response headers immediately
// // //     res.setHeader('Content-Type', 'application/zip');
// // //     res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
// // //     // Create archive and pipe to response immediately
// // //     const archive = archiver('zip', { 
// // //       zlib: { level: 6 } // Lower compression for faster generation
// // //     });
    
// // //     // Handle archive errors
// // //     archive.on('error', (err) => {
// // //       console.error('Archive error:', err);
// // //       if (!res.headersSent) {
// // //         res.status(500).json({ error: 'Failed to create ZIP archive' });
// // //       }
// // //     });
    
// // //     // Pipe archive to response immediately
// // //     archive.pipe(res);
    
// // //     // Launch browser
// // //     browser = await puppeteer.launch({
// // //       headless: 'new',
// // //       args: [
// // //         '--no-sandbox',
// // //         '--disable-setuid-sandbox',
// // //         '--disable-dev-shm-usage',
// // //         '--disable-accelerated-2d-canvas',
// // //         '--disable-gpu'
// // //       ]
// // //     });
    
// // //     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // //     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
// // //     // Process students sequentially to avoid buffer conflicts
// // //     let successCount = 0;
// // //     let errorCount = 0;
    
// // //     for (let i = 0; i < studentData.length; i++) {
// // //       const student = studentData[i];
      
// // //       try {
// // //         console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

// // //         // Convert images to base64
// // //         const studentWithImages = {
// // //           ...student,
// // //           logoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // //           ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // //           photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
// // //           signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
// // //           townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // //           qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // //         };

// // //         const html = ejs.render(htmlTemplate, studentWithImages);
        
// // //         const page = await browser.newPage();
        
// // //         // Set shorter timeout for faster processing
// // //         await page.setContent(html, { 
// // //           waitUntil: 'domcontentloaded', // Faster than networkidle0
// // //           timeout: 30000 
// // //         });
        
// // //         // Shorter wait time
// // //         await new Promise(resolve => setTimeout(resolve, 300));
        
// // //         const pdfBuffer = await page.pdf({
// // //           format: 'A4',
// // //           printBackground: true,
// // //           preferCSSPageSize: false,
// // //           margin: { 
// // //             top: '0mm', 
// // //             right: '0mm', 
// // //             bottom: '0mm', 
// // //             left: '0mm' 
// // //           }
// // //         });
        
// // //         await page.close();
        
// // //         // Create a fresh buffer copy to avoid conflicts
// // //         const freshBuffer = Buffer.from(pdfBuffer);
        
// // //         // Add PDF to archive
// // //         const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
// // //         archive.append(freshBuffer, { name: filename });
        
// // //         successCount++;
// // //         console.log(`✓ Added to ZIP: ${filename} (${successCount}/${studentData.length})`);
        
// // //       } catch (error) {
// // //         errorCount++;
// // //         console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
        
// // //         // Add error file to ZIP to indicate failure
// // //         const errorFilename = `ERROR_${student.APPLICATION_NUMBER}.txt`;
// // //         archive.append(`Failed to generate hall ticket for ${student.APPLICATION_NUMBER}\nError: ${error.message}`, { name: errorFilename });
// // //       }
      
// // //       // Small delay to prevent overwhelming the system
// // //       if (i < studentData.length - 1) {
// // //         await new Promise(resolve => setTimeout(resolve, 200));
// // //       }
// // //     }
    
// // //     // Close browser
// // //     await browser.close();
// // //     browser = null;
    
// // //     // Finalize archive
// // //     await archive.finalize();
    
// // //     console.log(`ZIP file generation completed: ${successCount} successful, ${errorCount} failed`);
    
// // //   } catch (error) {
// // //     console.error('Bulk PDF generation error:', error);
// // //     if (browser) {
// // //       await browser.close();
// // //     }
    
// // //     if (!res.headersSent) {
// // //       res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
// // //     }
// // //   }
// // // };

// // // // Alternative faster method using temporary files (more reliable)
// // // exports.downloadAllSkillTestHallTicketsFast = async (req, res) => {
// // //   let browser = null;
  
// // //   try {
// // //     const dataPath = path.join(__dirname, '../skilltest_data.json');
// // //     if (!fs.existsSync(dataPath)) {
// // //       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
// // //     }

// // //     const studentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
// // //     if (studentData.length === 0) {
// // //       return res.status(404).json({ error: 'No students found in the data' });
// // //     }

// // //     console.log(`Generating ${studentData.length} hall tickets using fast method...`);

// // //     // Create temporary directory
// // //     const tempDir = path.join(__dirname, '../temp_pdfs_' + Date.now());
// // //     if (!fs.existsSync(tempDir)) {
// // //       fs.mkdirSync(tempDir, { recursive: true });
// // //     }

// // //     // Launch browser
// // //     browser = await puppeteer.launch({
// // //       headless: 'new',
// // //       args: [
// // //         '--no-sandbox',
// // //         '--disable-setuid-sandbox',
// // //         '--disable-dev-shm-usage',
// // //         '--disable-accelerated-2d-canvas',
// // //         '--disable-gpu'
// // //       ]
// // //     });
    
// // //     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // //     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
// // //     // Generate PDFs to temporary files first
// // //     let successCount = 0;
// // //     const generatedFiles = [];
    
// // //     for (let i = 0; i < studentData.length; i++) {
// // //       const student = studentData[i];
      
// // //       try {
// // //         console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

// // //         // Convert images to base64
// // //         const studentWithImages = {
// // //           ...student,
// // //           logoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // //           ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // //           photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
// // //           signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
// // //           townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // //           qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // //         };

// // //         const html = ejs.render(htmlTemplate, studentWithImages);
        
// // //         const page = await browser.newPage();
        
// // //         await page.setContent(html, { 
// // //           waitUntil: 'domcontentloaded',
// // //           timeout: 30000 
// // //         });
        
// // //         await new Promise(resolve => setTimeout(resolve, 300));
        
// // //         const pdfBuffer = await page.pdf({
// // //           format: 'A4',
// // //           printBackground: true,
// // //           preferCSSPageSize: false,
// // //           margin: { 
// // //             top: '0mm', 
// // //             right: '0mm', 
// // //             bottom: '0mm', 
// // //             left: '0mm' 
// // //           }
// // //         });
        
// // //         await page.close();
        
// // //         // Save to temporary file
// // //         const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
// // //         const filePath = path.join(tempDir, filename);
// // //         fs.writeFileSync(filePath, pdfBuffer);
// // //         generatedFiles.push(filePath);
        
// // //         successCount++;
// // //         console.log(`✓ Generated: ${filename} (${successCount}/${studentData.length})`);
        
// // //       } catch (error) {
// // //         console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
// // //       }
      
// // //       // Small delay
// // //       if (i < studentData.length - 1) {
// // //         await new Promise(resolve => setTimeout(resolve, 200));
// // //       }
// // //     }
    
// // //     // Close browser
// // //     await browser.close();
// // //     browser = null;
    
// // //     // Create ZIP from temporary files
// // //     res.setHeader('Content-Type', 'application/zip');
// // //     res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
// // //     const archive = archiver('zip', { zlib: { level: 6 } });
    
// // //     archive.on('error', (err) => {
// // //       console.error('Archive error:', err);
// // //       if (!res.headersSent) {
// // //         res.status(500).json({ error: 'Failed to create ZIP archive' });
// // //       }
// // //     });
    
// // //     archive.pipe(res);
    
// // //     // Add all generated files to archive
// // //     generatedFiles.forEach(filePath => {
// // //       const filename = path.basename(filePath);
// // //       archive.file(filePath, { name: filename });
// // //     });
    
// // //     await archive.finalize();
    
// // //     console.log(`ZIP file created successfully: ${successCount} PDFs`);
    
// // //     // Clean up temporary files after a delay
// // //     setTimeout(() => {
// // //       try {
// // //         generatedFiles.forEach(filePath => {
// // //           if (fs.existsSync(filePath)) {
// // //             fs.unlinkSync(filePath);
// // //           }
// // //         });
// // //         if (fs.existsSync(tempDir)) {
// // //           fs.rmSync(tempDir, { recursive: true, force: true });
// // //         }
// // //         console.log('Temporary files cleaned up');
// // //       } catch (cleanupError) {
// // //         console.error('Error cleaning up temporary files:', cleanupError);
// // //       }
// // //     }, 5000);
    
// // //   } catch (error) {
// // //     console.error('Fast bulk PDF generation error:', error);
// // //     if (browser) {
// // //       await browser.close();
// // //     }
    
// // //     // Clean up on error
// // //     try {
// // //       const tempDir = path.join(__dirname, '../temp_pdfs_*');
// // //       // Cleanup logic for temp directories
// // //     } catch (cleanupError) {
// // //       console.error('Error cleaning up on failure:', cleanupError);
// // //     }
    
// // //     if (!res.headersSent) {
// // //       res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
// // //     }
// // //   }
// // // };


// // //controllers\skilltestHallticket_controller.js
// // const puppeteer = require('puppeteer');
// // const XLSX = require('xlsx');
// // const fs = require('fs');
// // const path = require('path');
// // const ejs = require('ejs');
// // const archiver = require('archiver');
// // const connection = require('../config/db1');

// // // Store student data in memory
// // let studentDataMemory = null;

// // // Upload and process Excel file with student data
// // exports.uploadSkillTestStudentData = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({ error: 'No file uploaded' });
// //     }

// //     const workbook = XLSX.readFile(req.file.path);
// //     const sheetName = workbook.SheetNames[0];
// //     const worksheet = workbook.Sheets[sheetName];
// //     const data = XLSX.utils.sheet_to_json(worksheet);

// //     // Store data in memory
// //     studentDataMemory = data;

// //     // Clean up uploaded file
// //     fs.unlinkSync(req.file.path);

// //     console.log(`✅ Student data uploaded: ${data.length} records stored in memory`);

// //     res.json({ 
// //       success: true, 
// //       message: 'Student data uploaded successfully', 
// //       recordCount: data.length 
// //     });
// //   } catch (error) {
// //     console.error('Upload error:', error);
// //     res.status(500).json({ error: 'Failed to process Excel file' });
// //   }
// // };

// // // Convert image to base64
// // function getImageAsBase64(imagePath) {
// //   try {
// //     const fullPath = path.join(__dirname, '../public/assets/skilltest', imagePath);
// //     if (fs.existsSync(fullPath)) {
// //       const imageBuffer = fs.readFileSync(fullPath);
// //       const ext = path.extname(fullPath).toLowerCase();
// //       let mimeType = 'image/jpeg';
      
// //       if (ext === '.png') mimeType = 'image/png';
// //       else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      
// //       return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
// //     }
// //     return '';
// //   } catch (error) {
// //     console.error(`Error reading image ${imagePath}:`, error.message);
// //     return '';
// //   }
// // }

// // // Clear memory function
// // function clearMemoryData() {
// //   if (studentDataMemory) {
// //     const recordCount = studentDataMemory.length;
// //     studentDataMemory = null;
// //     console.log(`🧹 Memory cleared. Previous record count: ${recordCount}`);
// //   }
// // }

// // // Fetch department logo from database
// // async function getDepartmentLogo(departmentId) {
// //   try {
// //     if (!departmentId) {
// //       console.log('⚠ No departmentId provided');
// //       return '';
// //     }

// //     console.log('🔍 Fetching logo for departmentId:', departmentId);

// //     // Use async/await with mysql2/promise
// //     const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
// //     const [rows] = await connection.execute(query, [parseInt(departmentId)]);

// //     console.log('📊 Query executed, rows returned:', rows.length);

// //     if (rows.length > 0 && rows[0].logo) {
// //       let logoData = rows[0].logo;
      
// //       console.log('✓ Logo found, length:', logoData.length);
      
// //       // Add data:image prefix if missing
// //       if (!logoData.startsWith('data:image')) {
// //         console.log('⚙️ Adding data:image prefix');
        
// //         if (logoData.startsWith('/9j/')) {
// //           logoData = `data:image/jpeg;base64,${logoData}`;
// //         } else if (logoData.startsWith('iVBORw0KG')) {
// //           logoData = `data:image/png;base64,${logoData}`;
// //         } else if (logoData.startsWith('R0lGOD')) {
// //           logoData = `data:image/gif;base64,${logoData}`;
// //         } else {
// //           logoData = `data:image/jpeg;base64,${logoData}`;
// //         }
        
// //         console.log('✓ Prefix added');
// //       }
      
// //       console.log('✅ RETURNING LOGO TO PDF GENERATOR');
// //       return logoData;
// //     } else {
// //       console.log('⚠ No logo found for departmentId:', departmentId);
// //       return '';
// //     }
// //   } catch (error) {
// //     console.error('❌ Error fetching logo:', error.message);
// //     return '';
// //   }
// // }

// // // Generate and download single hall ticket PDF
// // exports.downloadSkillTestHallTicket = async (req, res) => {
// //   let browser = null;
  
// //   try {
// //     const { applicationNo } = req.params;
// //     const departmentId = req.query.departmentId;
    
// //     console.log('=== PDF GENERATION START ===');
// //     console.log('Application No:', applicationNo);
// //     console.log('Department ID:', departmentId);
    
// //     if (!studentDataMemory) {
// //       console.error('❌ No student data in memory');
// //       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
// //     }

// //     console.log('✓ Student data in memory:', studentDataMemory.length, 'records');

// //     const student = studentDataMemory.find(s => s.APPLICATION_NUMBER === applicationNo);
    
// //     if (!student) {
// //       console.error('❌ Student not found:', applicationNo);
// //       return res.status(404).json({ error: 'Student not found with this application number' });
// //     }

// //     console.log('✓ Student found:', student.fullname || applicationNo);

// //     // Fetch department logo from database (for RIGHT side)
// //     const departmentLogoBase64 = await getDepartmentLogo(departmentId);
// //     console.log('Step 1: Logo fetched ✓');

// //     // Convert all images to base64
// //     const studentWithImages = {
// //       ...student,
// //       leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'), // Left logo (default PWD)
// //       logoBase64: departmentLogoBase64, // Right logo (dynamic department logo)
// //       ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'), // Fallback for right logo
// //       photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
// //       signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
// //       townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// //       qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// //     };
// //     console.log('Step 2: Images converted ✓');

// //     // Read EJS template
// //     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// //     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
// //     console.log('Step 3: Template loaded ✓');
    
// //     // Render EJS template with student data
// //     const html = ejs.render(htmlTemplate, studentWithImages);
// //     console.log('Step 4: HTML rendered ✓');
// //     console.log('Step 4a: HTML length:', html.length);
    
// //     // Launch Puppeteer
// //     console.log('🚀 Launching Puppeteer...');
// //     browser = await puppeteer.launch({
// //       headless: 'new',
// //       args: [
// //         '--no-sandbox',
// //         '--disable-setuid-sandbox',
// //         '--disable-dev-shm-usage',
// //         '--disable-accelerated-2d-canvas',
// //         '--disable-gpu'
// //       ]
// //     });
// //     console.log('Step 5: Puppeteer launched ✓');
    
// //     const page = await browser.newPage();
// //     console.log('Step 6: New page created ✓');
    
// //     // Set content
// //     await page.setContent(html, { 
// //       waitUntil: 'networkidle0',
// //       timeout: 60000 
// //     });
// //     console.log('Step 7: Content set ✓');
    
// //     // Wait for rendering
// //     await new Promise(resolve => setTimeout(resolve, 1000));
    
// //     // Generate PDF
// //     console.log('📄 Generating PDF...');
// //     const pdfBuffer = await page.pdf({
// //       format: 'A4',
// //       printBackground: true,
// //       preferCSSPageSize: false,
// //       margin: { 
// //         top: '0mm', 
// //         right: '0mm', 
// //         bottom: '0mm', 
// //         left: '0mm' 
// //       }
// //     });
    
// //     await browser.close();
    
// //     console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
// //     // Send PDF
// //     res.setHeader('Content-Type', 'application/pdf');
// //     res.setHeader('Content-Disposition', `attachment; filename=hallticket_${applicationNo}.pdf`);
// //     res.setHeader('Content-Length', pdfBuffer.length);
    
// //     // Don't clear memory on single download
// //     res.end(pdfBuffer, 'binary', () => {
// //       console.log('📤 PDF sent to client');
// //       console.log('💾 Memory preserved for additional downloads');
// //     });
    
// //   } catch (error) {
// //     console.error('❌ PDF generation error:', error);
// //     if (browser) {
// //       await browser.close();
// //     }
    
// //     if (!res.headersSent) {
// //       res.status(500).json({ error: 'Failed to generate hall ticket PDF', details: error.message });
// //     }
// //   }
// // };

// // // Generate and download all hall tickets as ZIP file
// // exports.downloadAllSkillTestHallTickets = async (req, res) => {
// //   let browser = null;
  
// //   try {
// //     // Check if data exists in memory
// //     if (!studentDataMemory) {
// //       console.error('❌ No student data in memory');
// //       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
// //     }

// //     const studentData = studentDataMemory;
// //     const departmentId = req.query.departmentId;
    
// //     if (studentData.length === 0) {
// //       return res.status(404).json({ error: 'No students found in the data' });
// //     }

// //     console.log(`=== BULK PDF GENERATION START ===`);
// //     console.log(`Total students: ${studentData.length}`);
// //     console.log('Department ID:', departmentId);

// //     // Fetch department logo once for all students
// //     const departmentLogoBase64 = await getDepartmentLogo(departmentId);

// //     // Set response headers immediately
// //     res.setHeader('Content-Type', 'application/zip');
// //     res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
// //     // Create archive and pipe to response immediately
// //     const archive = archiver('zip', { 
// //       zlib: { level: 6 }
// //     });
    
// //     // Handle archive errors
// //     archive.on('error', (err) => {
// //       console.error('Archive error:', err);
// //       clearMemoryData();
// //       if (!res.headersSent) {
// //         res.status(500).json({ error: 'Failed to create ZIP archive' });
// //       }
// //     });
    
// //     // Pipe archive to response immediately
// //     archive.pipe(res);
    
// //     // Launch browser
// //     browser = await puppeteer.launch({
// //       headless: 'new',
// //       args: [
// //         '--no-sandbox',
// //         '--disable-setuid-sandbox',
// //         '--disable-dev-shm-usage',
// //         '--disable-accelerated-2d-canvas',
// //         '--disable-gpu'
// //       ]
// //     });
    
// //     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// //     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
// //     // Process students sequentially to avoid buffer conflicts
// //     let successCount = 0;
// //     let errorCount = 0;
    
// //     for (let i = 0; i < studentData.length; i++) {
// //       const student = studentData[i];
      
// //       try {
// //         console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

// //         // Convert images to base64
// //         const studentWithImages = {
// //           ...student,
// //           leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'), // ADD THIS
// //           logoBase64: departmentLogoBase64,
// //           ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// //           photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
// //           signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
// //           townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// //           qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// //         };

// //         const html = ejs.render(htmlTemplate, studentWithImages);
        
// //         const page = await browser.newPage();
        
// //         // Set shorter timeout for faster processing
// //         await page.setContent(html, { 
// //           waitUntil: 'domcontentloaded',
// //           timeout: 30000 
// //         });
        
// //         // Shorter wait time
// //         await new Promise(resolve => setTimeout(resolve, 300));
        
// //         const pdfBuffer = await page.pdf({
// //           format: 'A4',
// //           printBackground: true,
// //           preferCSSPageSize: false,
// //           margin: { 
// //             top: '0mm', 
// //             right: '0mm', 
// //             bottom: '0mm', 
// //             left: '0mm' 
// //           }
// //         });
        
// //         await page.close();
        
// //         // Create a fresh buffer copy to avoid conflicts
// //         const freshBuffer = Buffer.from(pdfBuffer);
        
// //         // Add PDF to archive
// //         const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
// //         archive.append(freshBuffer, { name: filename });
        
// //         successCount++;
// //         console.log(`✓ Added to ZIP: ${filename} (${successCount}/${studentData.length})`);
        
// //       } catch (error) {
// //         errorCount++;
// //         console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
        
// //         // Add error file to ZIP to indicate failure
// //         const errorFilename = `ERROR_${student.APPLICATION_NUMBER}.txt`;
// //         archive.append(`Failed to generate hall ticket for ${student.APPLICATION_NUMBER}\nError: ${error.message}`, { name: errorFilename });
// //       }
      
// //       // Small delay to prevent overwhelming the system
// //       if (i < studentData.length - 1) {
// //         await new Promise(resolve => setTimeout(resolve, 200));
// //       }
// //     }
    
// //     // Close browser
// //     await browser.close();
// //     browser = null;
    
// //     // Finalize archive and clear memory when done
// //     archive.finalize();
    
// //     // Clear memory when archive is finished
// //     archive.on('end', () => {
// //       console.log(`📤 ZIP file sent to client, clearing memory...`);
// //       console.log(`ZIP generation completed: ${successCount} successful, ${errorCount} failed`);
// //       clearMemoryData();
// //     });
    
// //   } catch (error) {
// //     console.error('Bulk PDF generation error:', error);
// //     if (browser) {
// //       await browser.close();
// //     }
    
// //     // Clear memory on error
// //     clearMemoryData();
    
// //     if (!res.headersSent) {
// //       res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
// //     }
// //   }
// // };

// // // Check if data is loaded in memory
// // exports.checkDataStatus = async (req, res) => {
// //   try {
// //     if (!studentDataMemory) {
// //       return res.json({
// //         status: 'no_data',
// //         message: 'No student data loaded. Please upload an Excel file first.',
// //         recordCount: 0
// //       });
// //     }

// //     res.json({
// //       status: 'data_loaded',
// //       message: 'Student data is loaded in memory',
// //       recordCount: studentDataMemory.length,
// //       sampleRecord: studentDataMemory[0] ? {
// //         APPLICATION_NUMBER: studentDataMemory[0].APPLICATION_NUMBER,
// //         fullname: studentDataMemory[0].fullname
// //       } : null
// //     });
// //   } catch (error) {
// //     console.error('Check data status error:', error);
// //     res.status(500).json({ error: 'Failed to check data status' });
// //   }
// // };

// // // Manual clear endpoint
// // exports.clearMemoryData = async (req, res) => {
// //   try {
// //     const previousCount = studentDataMemory ? studentDataMemory.length : 0;
// //     clearMemoryData();
    
// //     res.json({
// //       success: true,
// //       message: 'Memory data cleared successfully',
// //       previousRecordCount: previousCount
// //     });
// //   } catch (error) {
// //     console.error('Clear memory data error:', error);
// //     res.status(500).json({ error: 'Failed to clear memory data' });
// //   }
// // };

// // // Test endpoint to fetch department logo (for debugging)
// // exports.getDepartmentLogo2 = async (req, res) => {
// //   try {
// //     const { departmentId } = req.params;
    
// //     console.log('Testing logo fetch for departmentId:', departmentId);
    
// //     if (!departmentId) {
// //       return res.status(400).json({ 
// //         success: false, 
// //         error: 'Department ID is required' 
// //       });
// //     }

// //     const query = 'SELECT departmentId, departmentName, logo FROM departmentdb WHERE departmentId = ?';
// //     const [rows] = await connection.execute(query, [parseInt(departmentId)]);

// //     if (rows && rows.length > 0) {
// //       const department = rows[0];
// //       const logoExists = department.logo ? true : false;
// //       const logoSize = department.logo ? department.logo.length : 0;
// //       const logoPreview = department.logo ? department.logo.substring(0, 100) + '...' : null;
      
// //       return res.json({ 
// //         success: true, 
// //         found: true,
// //         data: {
// //           departmentId: department.departmentId,
// //           departmentName: department.departmentName,
// //           logoExists: logoExists,
// //           logoSize: logoSize,
// //           logoSizeMB: (logoSize / 1024 / 1024).toFixed(2),
// //           logoPreview: logoPreview,
// //           logoType: department.logo && department.logo.startsWith('data:') ? 
// //             department.logo.substring(0, 30) : 'Not base64 format'
// //         }
// //       });
// //     } else {
// //       return res.json({ 
// //         success: true, 
// //         found: false,
// //         message: `No department found with ID: ${departmentId}`
// //       });
// //     }
// //   } catch (error) {
// //     console.error('Error in getDepartmentLogo2:', error);
// //     return res.status(500).json({ 
// //       success: false, 
// //       error: 'Server error',
// //       details: error.message 
// //     });
// //   }
// // };


// //controllers\skilltestHallticket_controller.js
// const puppeteer = require('puppeteer');
// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');
// const archiver = require('archiver');
// const connection = require('../config/db1');

// // Store student data in memory
// let studentDataMemory = null;

// // ✅ NEW: Helper function to convert Excel decimal time to readable format (7:30 AM)
// function convertExcelTimeToReadable(excelTime) {
//   if (!excelTime || excelTime === 'N.A' || isNaN(excelTime)) {
//     return excelTime || 'N.A';
//   }
  
//   // Excel time is a fraction of 24 hours
//   const totalMinutes = Math.round(excelTime * 24 * 60);
//   let hours = Math.floor(totalMinutes / 60);
//   const minutes = totalMinutes % 60;
  
//   // Determine AM/PM
//   const period = hours >= 12 ? 'PM' : 'AM';
  
//   // Convert to 12-hour format
//   if (hours > 12) hours -= 12;
//   if (hours === 0) hours = 12;
  
//   // Format with leading zeros for minutes
//   const minutesStr = minutes.toString().padStart(2, '0');
  
//   return `${hours}:${minutesStr} ${period}`;
// }

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

//     // Store data in memory
//     studentDataMemory = data;

//     // Clean up uploaded file
//     fs.unlinkSync(req.file.path);

//     console.log(`✅ Student data uploaded: ${data.length} records stored in memory`);

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

// // Clear memory function
// function clearMemoryData() {
//   if (studentDataMemory) {
//     const recordCount = studentDataMemory.length;
//     studentDataMemory = null;
//     console.log(`🧹 Memory cleared. Previous record count: ${recordCount}`);
//   }
// }

// // Fetch department logo from database
// async function getDepartmentLogo(departmentId) {
//   try {
//     if (!departmentId) {
//       console.log('⚠ No departmentId provided');
//       return '';
//     }

//     console.log('🔍 Fetching logo for departmentId:', departmentId);

//     // Use async/await with mysql2/promise
//     const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
//     const [rows] = await connection.execute(query, [parseInt(departmentId)]);

//     console.log('📊 Query executed, rows returned:', rows.length);

//     if (rows.length > 0 && rows[0].logo) {
//       let logoData = rows[0].logo;
      
//       console.log('✓ Logo found, length:', logoData.length);
      
//       // Add data:image prefix if missing
//       if (!logoData.startsWith('data:image')) {
//         console.log('⚙️ Adding data:image prefix');
        
//         if (logoData.startsWith('/9j/')) {
//           logoData = `data:image/jpeg;base64,${logoData}`;
//         } else if (logoData.startsWith('iVBORw0KG')) {
//           logoData = `data:image/png;base64,${logoData}`;
//         } else if (logoData.startsWith('R0lGOD')) {
//           logoData = `data:image/gif;base64,${logoData}`;
//         } else {
//           logoData = `data:image/jpeg;base64,${logoData}`;
//         }
        
//         console.log('✓ Prefix added');
//       }
      
//       console.log('✅ RETURNING LOGO TO PDF GENERATOR');
//       return logoData;
//     } else {
//       console.log('⚠ No logo found for departmentId:', departmentId);
//       return '';
//     }
//   } catch (error) {
//     console.error('❌ Error fetching logo:', error.message);
//     return '';
//   }
// }

// // Generate and download single hall ticket PDF
// exports.downloadSkillTestHallTicket = async (req, res) => {
//   let browser = null;
  
//   try {
//     const { applicationNo } = req.params;
//     const departmentId = req.query.departmentId;
    
//     console.log('=== PDF GENERATION START ===');
//     console.log('Application No:', applicationNo);
//     console.log('Department ID:', departmentId);
    
//     if (!studentDataMemory) {
//       console.error('❌ No student data in memory');
//       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
//     }

//     console.log('✓ Student data in memory:', studentDataMemory.length, 'records');

//     const student = studentDataMemory.find(s => s.APPLICATION_NUMBER === applicationNo);
    
//     if (!student) {
//       console.error('❌ Student not found:', applicationNo);
//       return res.status(404).json({ error: 'Student not found with this application number' });
//     }

//     console.log('✓ Student found:', student.fullname || applicationNo);

//     // Fetch department logo from database (for RIGHT side)
//     const departmentLogoBase64 = await getDepartmentLogo(departmentId);
//     console.log('Step 1: Logo fetched ✓');

//     // ✅ UPDATED: Convert time fields and images to base64
//     const studentWithImages = {
//       ...student,
//       // Convert time fields from Excel decimal to readable format
//       reporting_time: convertExcelTimeToReadable(student.reporting_time),
//       gate_closure_time: convertExcelTimeToReadable(student.gate_closure_time),
//       start_time: convertExcelTimeToReadable(student.start_time),
//       end_time: convertExcelTimeToReadable(student.end_time),
//       // Images
//       leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'), // Left logo (default PWD)
//       logoBase64: departmentLogoBase64, // Right logo (dynamic department logo)
//       ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'), // Fallback for right logo
//       photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
//       signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
//       townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
//       qrCodeBase64: getImageAsBase64('qr-code-sh.png')
//     };
//     console.log('Step 2: Images converted & time fields formatted ✓');

//     // Read EJS template
//     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
//     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
//     console.log('Step 3: Template loaded ✓');
    
//     // Render EJS template with student data
//     const html = ejs.render(htmlTemplate, studentWithImages);
//     console.log('Step 4: HTML rendered ✓');
//     console.log('Step 4a: HTML length:', html.length);
    
//     // Launch Puppeteer
//     console.log('🚀 Launching Puppeteer...');
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
//     console.log('Step 5: Puppeteer launched ✓');
    
//     const page = await browser.newPage();
//     console.log('Step 6: New page created ✓');
    
//     // Set content
//     await page.setContent(html, { 
//       waitUntil: 'networkidle0',
//       timeout: 60000 
//     });
//     console.log('Step 7: Content set ✓');
    
//     // Wait for rendering
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     // Generate PDF
//     console.log('📄 Generating PDF...');
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
    
//     console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
//     // Send PDF
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=hallticket_${applicationNo}.pdf`);
//     res.setHeader('Content-Length', pdfBuffer.length);
    
//     // Don't clear memory on single download
//     res.end(pdfBuffer, 'binary', () => {
//       console.log('📤 PDF sent to client');
//       console.log('💾 Memory preserved for additional downloads');
//     });
    
//   } catch (error) {
//     console.error('❌ PDF generation error:', error);
//     if (browser) {
//       await browser.close();
//     }
    
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Failed to generate hall ticket PDF', details: error.message });
//     }
//   }
// };

// // Generate and download all hall tickets as ZIP file
// exports.downloadAllSkillTestHallTickets = async (req, res) => {
//   let browser = null;
  
//   try {
//     // Check if data exists in memory
//     if (!studentDataMemory) {
//       console.error('❌ No student data in memory');
//       return res.status(404).json({ error: 'No student data found. Please upload data first.' });
//     }

//     const studentData = studentDataMemory;
//     const departmentId = req.query.departmentId;
    
//     if (studentData.length === 0) {
//       return res.status(404).json({ error: 'No students found in the data' });
//     }

//     console.log(`=== BULK PDF GENERATION START ===`);
//     console.log(`Total students: ${studentData.length}`);
//     console.log('Department ID:', departmentId);

//     // Fetch department logo once for all students
//     const departmentLogoBase64 = await getDepartmentLogo(departmentId);

//     // Set response headers immediately
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets.zip');
    
//     // Create archive and pipe to response immediately
//     const archive = archiver('zip', { 
//       zlib: { level: 6 }
//     });
    
//     // Handle archive errors
//     archive.on('error', (err) => {
//       console.error('Archive error:', err);
//       clearMemoryData();
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

//         // ✅ UPDATED: Convert time fields and images to base64
//         const studentWithImages = {
//           ...student,
//           // Convert time fields from Excel decimal to readable format
//           reporting_time: convertExcelTimeToReadable(student.reporting_time),
//           gate_closure_time: convertExcelTimeToReadable(student.gate_closure_time),
//           start_time: convertExcelTimeToReadable(student.start_time),
//           end_time: convertExcelTimeToReadable(student.end_time),
//           // Images
//           leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
//           logoBase64: departmentLogoBase64,
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
//           waitUntil: 'domcontentloaded',
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
    
//     // Finalize archive and clear memory when done
//     archive.finalize();
    
//     // Clear memory when archive is finished
//     archive.on('end', () => {
//       console.log(`📤 ZIP file sent to client, clearing memory...`);
//       console.log(`ZIP generation completed: ${successCount} successful, ${errorCount} failed`);
//       clearMemoryData();
//     });
    
//   } catch (error) {
//     console.error('Bulk PDF generation error:', error);
//     if (browser) {
//       await browser.close();
//     }
    
//     // Clear memory on error
//     clearMemoryData();
    
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Failed to generate hall tickets', details: error.message });
//     }
//   }
// };

// // Check if data is loaded in memory
// exports.checkDataStatus = async (req, res) => {
//   try {
//     if (!studentDataMemory) {
//       return res.json({
//         status: 'no_data',
//         message: 'No student data loaded. Please upload an Excel file first.',
//         recordCount: 0
//       });
//     }

//     res.json({
//       status: 'data_loaded',
//       message: 'Student data is loaded in memory',
//       recordCount: studentDataMemory.length,
//       sampleRecord: studentDataMemory[0] ? {
//         APPLICATION_NUMBER: studentDataMemory[0].APPLICATION_NUMBER,
//         fullname: studentDataMemory[0].fullname
//       } : null
//     });
//   } catch (error) {
//     console.error('Check data status error:', error);
//     res.status(500).json({ error: 'Failed to check data status' });
//   }
// };

// // Manual clear endpoint
// exports.clearMemoryData = async (req, res) => {
//   try {
//     const previousCount = studentDataMemory ? studentDataMemory.length : 0;
//     clearMemoryData();
    
//     res.json({
//       success: true,
//       message: 'Memory data cleared successfully',
//       previousRecordCount: previousCount
//     });
//   } catch (error) {
//     console.error('Clear memory data error:', error);
//     res.status(500).json({ error: 'Failed to clear memory data' });
//   }
// };

// // Test endpoint to fetch department logo (for debugging)
// exports.getDepartmentLogo2 = async (req, res) => {
//   try {
//     const { departmentId } = req.params;
    
//     console.log('Testing logo fetch for departmentId:', departmentId);
    
//     if (!departmentId) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Department ID is required' 
//       });
//     }

//     const query = 'SELECT departmentId, departmentName, logo FROM departmentdb WHERE departmentId = ?';
//     const [rows] = await connection.execute(query, [parseInt(departmentId)]);

//     if (rows && rows.length > 0) {
//       const department = rows[0];
//       const logoExists = department.logo ? true : false;
//       const logoSize = department.logo ? department.logo.length : 0;
//       const logoPreview = department.logo ? department.logo.substring(0, 100) + '...' : null;
      
//       return res.json({ 
//         success: true, 
//         found: true,
//         data: {
//           departmentId: department.departmentId,
//           departmentName: department.departmentName,
//           logoExists: logoExists,
//           logoSize: logoSize,
//           logoSizeMB: (logoSize / 1024 / 1024).toFixed(2),
//           logoPreview: logoPreview,
//           logoType: department.logo && department.logo.startsWith('data:') ? 
//             department.logo.substring(0, 30) : 'Not base64 format'
//         }
//       });
//     } else {
//       return res.json({ 
//         success: true, 
//         found: false,
//         message: `No department found with ID: ${departmentId}`
//       });
//     }
//   } catch (error) {
//     console.error('Error in getDepartmentLogo2:', error);
//     return res.status(500).json({ 
//       success: false, 
//       error: 'Server error',
//       details: error.message 
//     });
//   }
// };



//controllers\skilltestHallticket_controller.js
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const archiver = require('archiver');
const connection = require('../config/db1');

// Store student data in memory
let studentDataMemory = null;

// ========== CONVERSION HELPER FUNCTIONS ==========

/**
 * Convert Excel date serial number to DD-MM-YYYY format
 * Excel stores dates as days since 1900-01-01
 * @param {number} serial - Excel date serial number (e.g., 45882)
 * @returns {string} - Formatted date (e.g., "13-08-2025")
 */
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) {
    return '';
  }
  
  try {
    // Excel date starts from 1900-01-01
    // Unix timestamp starts from 1970-01-01
    // Difference: 25569 days
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; // Convert days to seconds
    const date_info = new Date(utc_value * 1000); // Convert to milliseconds
    
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Date conversion error:', error);
    return '';
  }
}

/**
 * Convert Excel time decimal to HH:MM AM/PM format
 * Excel stores time as decimal fraction of 24 hours
 * @param {number} decimal - Excel time decimal (e.g., 0.3125 = 7:30 AM)
 * @returns {string} - Formatted time (e.g., "7:30 AM")
 */
function excelTimeToAMPM(decimal) {
  if (decimal === null || decimal === undefined || isNaN(decimal)) {
    return '';
  }
  
  try {
    // Convert decimal to total minutes
    const totalMinutes = Math.round(decimal * 24 * 60);
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12 for midnight
    
    const minutesStr = String(minutes).padStart(2, '0');
    
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (error) {
    console.error('Time conversion error:', error);
    return '';
  }
}

/**
 * Apply date and time conversions to student data
 * @param {object} student - Student data object from Excel
 * @returns {object} - Student data with converted dates and times
 */
function convertStudentDateTimeFields(student) {
  return {
    ...student,
    // Convert date fields
    batchdate: excelDateToJSDate(student.batchdate),
    
    // Convert time fields
    reporting_time: excelTimeToAMPM(student.reporting_time),
    gate_closure_time: excelTimeToAMPM(student.gate_closure_time),
    start_time: excelTimeToAMPM(student.start_time),
    end_time: excelTimeToAMPM(student.end_time)
  };
}

// ========== END CONVERSION FUNCTIONS ==========

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

    console.log(`✅ Student data uploaded: ${data.length} records stored in memory`);

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

// Fetch department logo from database
async function getDepartmentLogo(departmentId) {
  try {
    if (!departmentId) {
      console.log('⚠ No departmentId provided');
      return '';
    }

    console.log('🔍 Fetching logo for departmentId:', departmentId);

    const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
    const [rows] = await connection.execute(query, [parseInt(departmentId)]);

    console.log('📊 Query executed, rows returned:', rows.length);

    if (rows.length > 0 && rows[0].logo) {
      let logoData = rows[0].logo;
      
      console.log('✓ Logo found, length:', logoData.length);
      
      // Add data:image prefix if missing
      if (!logoData.startsWith('data:image')) {
        console.log('⚙️ Adding data:image prefix');
        
        if (logoData.startsWith('/9j/')) {
          logoData = `data:image/jpeg;base64,${logoData}`;
        } else if (logoData.startsWith('iVBORw0KG')) {
          logoData = `data:image/png;base64,${logoData}`;
        } else if (logoData.startsWith('R0lGOD')) {
          logoData = `data:image/gif;base64,${logoData}`;
        } else {
          logoData = `data:image/jpeg;base64,${logoData}`;
        }
        
        console.log('✓ Prefix added');
      }
      
      console.log('✅ RETURNING LOGO TO PDF GENERATOR');
      return logoData;
    } else {
      console.log('⚠ No logo found for departmentId:', departmentId);
      return '';
    }
  } catch (error) {
    console.error('❌ Error fetching logo:', error.message);
    return '';
  }
}

// Generate and download single hall ticket PDF
exports.downloadSkillTestHallTicket = async (req, res) => {
  let browser = null;
  
  try {
    const { applicationNo } = req.params;
    const departmentId = req.query.departmentId;
    
    console.log('=== PDF GENERATION START ===');
    console.log('Application No:', applicationNo);
    console.log('Department ID:', departmentId);
    
    if (!studentDataMemory) {
      console.error('❌ No student data in memory');
      return res.status(404).json({ error: 'No student data found. Please upload data first.' });
    }

    console.log('✓ Student data in memory:', studentDataMemory.length, 'records');

    const student = studentDataMemory.find(s => s.APPLICATION_NUMBER === applicationNo);
    
    if (!student) {
      console.error('❌ Student not found:', applicationNo);
      return res.status(404).json({ error: 'Student not found with this application number' });
    }

    console.log('✓ Student found:', student.fullname || applicationNo);

    // Fetch department logo from database (for RIGHT side)
    const departmentLogoBase64 = await getDepartmentLogo(departmentId);
    console.log('Step 1: Logo fetched ✓');

    // *** APPLY DATE/TIME CONVERSIONS HERE ***
    const convertedStudent = convertStudentDateTimeFields(student);
    console.log('Step 1.5: Date/Time fields converted ✓');
    console.log('  - batchdate:', student.batchdate, '→', convertedStudent.batchdate);
    console.log('  - reporting_time:', student.reporting_time, '→', convertedStudent.reporting_time);
    console.log('  - gate_closure_time:', student.gate_closure_time, '→', convertedStudent.gate_closure_time);
    console.log('  - start_time:', student.start_time, '→', convertedStudent.start_time);

    // Convert all images to base64
    const studentWithImages = {
      ...convertedStudent, // Use converted data instead of original student
      leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
      logoBase64: departmentLogoBase64,
      ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
      photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
      signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
      townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
      qrCodeBase64: getImageAsBase64('qr-code-sh.png')
    };
    console.log('Step 2: Images converted ✓');

    // Read EJS template
    const templatePath = path.join(__dirname, '../views/hallticket.ejs');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    console.log('Step 3: Template loaded ✓');
    
    // Render EJS template with student data
    const html = ejs.render(htmlTemplate, studentWithImages);
    console.log('Step 4: HTML rendered ✓');
    console.log('Step 4a: HTML length:', html.length);
    
    // Launch Puppeteer
    console.log('🚀 Launching Puppeteer...');
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
    console.log('Step 5: Puppeteer launched ✓');
    
    const page = await browser.newPage();
    console.log('Step 6: New page created ✓');
    
    // Set content
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    console.log('Step 7: Content set ✓');
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate PDF
    console.log('📄 Generating PDF...');
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
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=hallticket_${applicationNo}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer, 'binary', () => {
      console.log('📤 PDF sent to client');
      console.log('💾 Memory preserved for additional downloads');
    });
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    if (browser) {
      await browser.close();
    }
    
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
      console.error('❌ No student data in memory');
      return res.status(404).json({ error: 'No student data found. Please upload data first.' });
    }

    const studentData = studentDataMemory;
    const departmentId = req.query.departmentId;
    
    if (studentData.length === 0) {
      return res.status(404).json({ error: 'No students found in the data' });
    }

    console.log(`=== BULK PDF GENERATION START ===`);
    console.log(`Total students: ${studentData.length}`);
    console.log('Department ID:', departmentId);

    // Fetch department logo once for all students
    const departmentLogoBase64 = await getDepartmentLogo(departmentId);

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
      clearMemoryData();
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

        // *** APPLY DATE/TIME CONVERSIONS HERE ***
        const convertedStudent = convertStudentDateTimeFields(student);

        // Convert images to base64
        const studentWithImages = {
          ...convertedStudent, // Use converted data instead of original student
          leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
          logoBase64: departmentLogoBase64,
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

// Manual clear endpoint
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

// Test endpoint to fetch department logo (for debugging)
exports.getDepartmentLogo2 = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    console.log('Testing logo fetch for departmentId:', departmentId);
    
    if (!departmentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Department ID is required' 
      });
    }

    const query = 'SELECT departmentId, departmentName, logo FROM departmentdb WHERE departmentId = ?';
    const [rows] = await connection.execute(query, [parseInt(departmentId)]);

    if (rows && rows.length > 0) {
      const department = rows[0];
      const logoExists = department.logo ? true : false;
      const logoSize = department.logo ? department.logo.length : 0;
      const logoPreview = department.logo ? department.logo.substring(0, 100) + '...' : null;
      
      return res.json({ 
        success: true, 
        found: true,
        data: {
          departmentId: department.departmentId,
          departmentName: department.departmentName,
          logoExists: logoExists,
          logoSize: logoSize,
          logoSizeMB: (logoSize / 1024 / 1024).toFixed(2),
          logoPreview: logoPreview,
          logoType: department.logo && department.logo.startsWith('data:') ? 
            department.logo.substring(0, 30) : 'Not base64 format'
        }
      });
    } else {
      return res.json({ 
        success: true, 
        found: false,
        message: `No department found with ID: ${departmentId}`
      });
    }
  } catch (error) {
    console.error('Error in getDepartmentLogo2:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: error.message 
    });
  }
};
