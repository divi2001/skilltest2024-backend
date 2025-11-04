// controllers/skilltestHallticket_controller.js
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const db = require('../config/db1');

// Store student data in memory
let studentDataMemory = null;

// ========== CONVERSION HELPER FUNCTIONS ==========

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) {
    return '';
  }
  
  try {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Date conversion error:', error);
    return '';
  }
}

function excelTimeToAMPM(decimal) {
  if (decimal === null || decimal === undefined || isNaN(decimal)) {
    return '';
  }
  
  try {
    const totalMinutes = Math.round(decimal * 24 * 60);
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const minutesStr = String(minutes).padStart(2, '0');
    
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (error) {
    console.error('Time conversion error:', error);
    return '';
  }
}

function convertStudentDateTimeFields(student) {
  return {
    ...student,
    batchdate: excelDateToJSDate(student.batchdate),
    reporting_time: excelTimeToAMPM(student.reporting_time),
    gate_closure_time: excelTimeToAMPM(student.gate_closure_time),
    start_time: excelTimeToAMPM(student.start_time),
    end_time: excelTimeToAMPM(student.end_time)
  };
}

// ========== FOLDER MANAGEMENT FUNCTIONS ==========

function createHallTicketFolder(departmentId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const folderName = `halltickets_excel_dept${departmentId}_${timestamp}`;
  const folderPath = path.join(__dirname, '../public/generated_halltickets', folderName);
  
  const baseDir = path.join(__dirname, '../public/generated_halltickets');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log('📁 Created base directory: generated_halltickets');
  }
  
  fs.mkdirSync(folderPath, { recursive: true });
  console.log(`📁 Created folder: ${folderName}`);
  
  return { folderPath, folderName };
}

function cleanupOldFolders() {
  try {
    const baseFolder = path.join(__dirname, '../public/generated_halltickets');
    if (!fs.existsSync(baseFolder)) return;
    
    const folders = fs.readdirSync(baseFolder);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    folders.forEach(folder => {
      const folderPath = path.join(baseFolder, folder);
      const stats = fs.statSync(folderPath);
      
      if (now - stats.mtimeMs > twentyFourHours) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`🗑️ Cleaned up old folder: ${folder}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old folders:', error);
  }
}

// ========== IMAGE CONVERSION ==========

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

function clearMemoryData() {
  if (studentDataMemory) {
    const recordCount = studentDataMemory.length;
    studentDataMemory = null;
    console.log(`🧹 Memory cleared. Previous record count: ${recordCount}`);
  }
}

async function getDepartmentDetails(departmentId) {
  try {
    if (!departmentId) {
      console.log('⚠ No departmentId provided for details');
      return { 
        name: 'Public Works Department', 
        logo: '' 
      };
    }

    console.log('🔍 Fetching department details for:', departmentId);

    const query = 'SELECT departmentName, logo FROM departmentdb WHERE departmentId = ?';
    const [rows] = await db.execute(query, [parseInt(departmentId)]);

    if (rows.length > 0) {
      let logoData = rows[0].logo;
      
      if (logoData && !logoData.startsWith('data:image')) {
        if (logoData.startsWith('/9j/')) {
          logoData = `data:image/jpeg;base64,${logoData}`;
        } else if (logoData.startsWith('iVBORw0KG')) {
          logoData = `data:image/png;base64,${logoData}`;
        } else if (logoData.startsWith('R0lGOD')) {
          logoData = `data:image/gif;base64,${logoData}`;
        } else {
          logoData = `data:image/jpeg;base64,${logoData}`;
        }
      }
      
      let departmentName = rows[0].departmentName || 'Public Works Department';
      
      const originalName = departmentName;
      
      departmentName = departmentName
        .replace(/^Government of Maharashtra\s*-?\s*/i, '')
        .replace(/^GOVERNMENT OF MAHARASHTRA\s*-?\s*/i, '')
        .trim();
      
      console.log('✅ Department details fetched:', {
        originalName: originalName,
        cleanedName: departmentName,
        hasLogo: !!logoData
      });
      
      return {
        name: departmentName,
        logo: logoData || ''
      };
    }

    console.log('⚠ No department found, returning defaults');
    return { name: 'Public Works Department', logo: '' };
    
  } catch (error) {
    console.error('❌ Error fetching department details:', error.message);
    return { name: 'Public Works Department', logo: '' };
  }
}

function loadQRCodes(qrType) {
  let qrCodeBase64 = '';
  let qrCodeTwBase64 = '';

  console.log(`🔍 Loading QR codes with type: ${qrType}`);

  if (qrType === 'sh') {
    qrCodeBase64 = getImageAsBase64('qr-code-sh.png');
    console.log('✓ Loaded Shorthand QR only');
  } else if (qrType === 'tw') {
    qrCodeTwBase64 = getImageAsBase64('qr-code-tw.png');
    console.log('✓ Loaded Typewriting QR only');
  } else {
    qrCodeBase64 = getImageAsBase64('qr-code-sh.png');
    qrCodeTwBase64 = getImageAsBase64('qr-code-tw.png');
    console.log('✓ Loaded both QR codes');
  }

  return { qrCodeBase64, qrCodeTwBase64 };
}

// ========== EXCEL UPLOAD ==========

exports.uploadSkillTestStudentData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    studentDataMemory = data;

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

// ========== SINGLE DOWNLOAD - UPDATED WITH CUSTOMIZATION ==========

exports.downloadSkillTestHallTicket = async (req, res) => {
  let browser = null;
  
  try {
    const { applicationNo } = req.params;
    const { departmentId, qrType } = req.query;
    
    // ✅ NEW: Get customization from request body
    const customization = req.body?.customization || null;

    console.log('=== EXCEL PDF GENERATION START ===');
    console.log('Application No:', applicationNo);
    console.log('Department ID:', departmentId);
    console.log('QR Type:', qrType || 'both (default)');
    console.log('Customization Received:', customization ? 'YES - Using Custom Images' : 'NO - Using Default Images');
    
    if (!studentDataMemory) {
      console.error('❌ No student data in memory');
      return res.status(404).json({ error: 'No student data found. Please upload data first.' });
    }

    const student = studentDataMemory.find(s => s.APPLICATION_NUMBER === applicationNo);
    
    if (!student) {
      console.error('❌ Student not found:', applicationNo);
      return res.status(404).json({ error: 'Student not found with this application number' });
    }

    console.log('✓ Student found:', student.fullname || applicationNo);

    const departmentDetails = await getDepartmentDetails(departmentId);
    console.log('Step 1: Department details fetched ✓');

    const convertedStudent = convertStudentDateTimeFields(student);
    console.log('Step 1.5: Date/Time fields converted ✓');

    const { qrCodeBase64, qrCodeTwBase64 } = loadQRCodes(qrType);

    // ✅ CHECK customization validity
    const hasLeftLogo = customization?.leftLogoBase64 && customization.leftLogoBase64.trim() !== '';
    const hasRightLogo = customization?.rightLogoBase64 && customization.rightLogoBase64.trim() !== '';
    const hasInvigilatorImage = customization?.invigilatorImageBase64 && customization.invigilatorImageBase64.trim() !== '';

    // ✅ UPDATED: Use custom images if available, else default
    const studentWithImages = {
      ...convertedStudent,
      leftLogoBase64: hasLeftLogo ? customization.leftLogoBase64 : getImageAsBase64('pwd_logo1.jpg'),
      logoBase64: hasRightLogo ? customization.rightLogoBase64 : departmentDetails.logo,
      ashokStambhBase64: hasRightLogo ? customization.rightLogoBase64 : getImageAsBase64('pwd_logo2.jpeg'),
      photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
      signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
      townPlanningSignBase64: hasInvigilatorImage ? customization.invigilatorImageBase64 : getImageAsBase64('town_planning_sign.jpg'),
      qrCodeBase64: qrCodeBase64,
      qrCodeTwBase64: qrCodeTwBase64,
      departmentName: departmentDetails.name,
      // ✅ Use custom text ONLY if provided
      invigilatorText: (customization?.invigilatorText && Object.keys(customization.invigilatorText).length > 0 && customization.invigilatorText.title?.trim()) 
        ? customization.invigilatorText 
        : {
            title: 'नियंत्रक अधिकारी',
            line1: 'मुख्य अभियंता',
            line2: 'सा.बां.प्रादेशिक विभाग मुंबई तथा,',
            line3: 'अध्यक्ष राज्यस्तरीय समन्वय समिती.'
          }
    };

    console.log('Step 2: Images prepared ✓');
    console.log('Left Logo:', hasLeftLogo ? 'CUSTOM' : 'DEFAULT');
    console.log('Right Logo:', hasRightLogo ? 'CUSTOM' : 'DEFAULT');
    console.log('Invigilator Image:', hasInvigilatorImage ? 'CUSTOM' : 'DEFAULT');
    
    const templatePath = path.join(__dirname, '../views/hallticket.ejs');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    console.log('Step 3: Template loaded ✓');
    
    const html = ejs.render(htmlTemplate, studentWithImages);
    console.log('Step 4: HTML rendered ✓');
    
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
    
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    console.log('Step 7: Content set ✓');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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

// ========== BULK DOWNLOAD - UPDATED WITH CUSTOMIZATION ==========

exports.downloadAllSkillTestHallTickets = async (req, res) => {
  let browser = null;
  
  try {
    if (!studentDataMemory) {
      console.error('❌ No student data in memory');
      return res.status(404).json({ 
        success: false,
        error: 'No student data found. Please upload data first.' 
      });
    }

    const studentData = studentDataMemory;
    const { departmentId, qrType } = req.query;
    
    // ✅ NEW: Get customization from request body
    const customization = req.body?.customization || null;
    
    if (studentData.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No students found in the data' 
      });
    }

    console.log(`=== BULK EXCEL FOLDER GENERATION START ===`);
    console.log(`Total students: ${studentData.length}`);
    console.log('Department ID:', departmentId);
    console.log('QR Type:', qrType || 'both (default)');
    console.log('Customization Received:', customization ? 'YES - Using Custom Images' : 'NO - Using Default Images');

    cleanupOldFolders();

    const { folderPath, folderName } = createHallTicketFolder(departmentId || 'unknown');

    const departmentDetails = await getDepartmentDetails(departmentId);
    console.log('✓ Department details fetched for bulk generation');

    const { qrCodeBase64, qrCodeTwBase64 } = loadQRCodes(qrType);
    
    // ✅ Check customization validity once
    const hasLeftLogo = customization?.leftLogoBase64 && customization.leftLogoBase64.trim() !== '';
    const hasRightLogo = customization?.rightLogoBase64 && customization.rightLogoBase64.trim() !== '';
    const hasInvigilatorImage = customization?.invigilatorImageBase64 && customization.invigilatorImageBase64.trim() !== '';
    
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
    
    let successCount = 0;
    let errorCount = 0;
    const generatedFiles = [];
    
    for (let i = 0; i < studentData.length; i++) {
      const student = studentData[i];
      
      try {
        console.log(`Processing ${i + 1}/${studentData.length}: ${student.APPLICATION_NUMBER}`);

        const convertedStudent = convertStudentDateTimeFields(student);

        // ✅ UPDATED: Use custom images if available
        const studentWithImages = {
          ...convertedStudent,
          leftLogoBase64: hasLeftLogo ? customization.leftLogoBase64 : getImageAsBase64('pwd_logo1.jpg'),
          logoBase64: hasRightLogo ? customization.rightLogoBase64 : departmentDetails.logo,
          ashokStambhBase64: hasRightLogo ? customization.rightLogoBase64 : getImageAsBase64('pwd_logo2.jpeg'),
          photoBase64: getImageAsBase64(`pwd_photo_new_resized/${student.photo || 'default.jpg'}`),
          signBase64: getImageAsBase64(`pwd_sign_new_resized/${student.sign || 'default.jpg'}`),
          townPlanningSignBase64: hasInvigilatorImage ? customization.invigilatorImageBase64 : getImageAsBase64('town_planning_sign.jpg'),
          qrCodeBase64: qrCodeBase64,
          qrCodeTwBase64: qrCodeTwBase64,
          departmentName: departmentDetails.name,
          invigilatorText: (customization?.invigilatorText && Object.keys(customization.invigilatorText).length > 0 && customization.invigilatorText.title?.trim()) 
            ? customization.invigilatorText 
            : {
                title: 'नियंत्रक अधिकारी',
                line1: 'मुख्य अभियंता',
                line2: 'सा.बां.प्रादेशिक विभाग मुंबई तथा,',
                line3: 'अध्यक्ष राज्यस्तरीय समन्वय समिती.'
              }
        };

        const html = ejs.render(htmlTemplate, studentWithImages);
        
        const page = await browser.newPage();
        
        await page.setContent(html, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
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
        
        const filename = `hallticket_${student.APPLICATION_NUMBER}.pdf`;
        const filePath = path.join(folderPath, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        generatedFiles.push({
          application_number: student.APPLICATION_NUMBER,
          fullname: student.fullname,
          filename: filename,
          downloadUrl: `/generated_halltickets/${folderName}/${filename}`
        });
        
        successCount++;
        console.log(`✓ Saved to folder: ${filename} (${successCount}/${studentData.length})`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error generating PDF for ${student.APPLICATION_NUMBER}:`, error.message);
      }
      
      if (i < studentData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    await browser.close();
    browser = null;
    
    console.log(`✅ Excel generation complete: ${successCount} successful, ${errorCount} failed`);
    
    clearMemoryData();
    
    res.json({
      success: true,
      message: `Generated ${successCount} hall tickets successfully`,
      folderName: folderName,
      folderPath: `/generated_halltickets/${folderName}`,
      totalFiles: successCount,
      files: generatedFiles,
      errors: errorCount
    });
    
  } catch (error) {
    console.error('Bulk Excel folder generation error:', error);
    if (browser) {
      await browser.close();
    }
    
    clearMemoryData();
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate hall tickets', 
        details: error.message 
      });
    }
  }
};

// ========== OTHER FUNCTIONS ==========

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
    const [rows] = await db.execute(query, [parseInt(departmentId)]);

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
