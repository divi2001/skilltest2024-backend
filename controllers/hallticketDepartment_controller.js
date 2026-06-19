//controllers/hallticketDepartment_controller.js
const db = require('../config/db1');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');


// ✅ IMPORT GCC TBC GENERATION LOGIC (FRIEND'S ADDITION)
const { generateGccTbcHallTicketFromDB, generateGccTbcBulkHallTicketsFromDB } = require('./superAdminController/HallticketsGeneration');


// ✅ IMPORT DECRYPT FUNCTION (FRIEND'S ADDITION)
const { decrypt } = require('../config/encrypt');


// ========== HELPER FUNCTIONS ==========


// ✅ PASSWORD DECRYPTION FUNCTION (FRIEND'S UNIQUE FUNCTION #1)
/**
 * Decrypt password using your existing encrypt.js decrypt function
 * @param {string} encryptedPassword - Encrypted password from database (format: iv:encryptedData)
 * @returns {string} - Decrypted plain text password
 */
function decryptPassword(encryptedPassword) {
  try {
    if (!encryptedPassword) {
      console.log('⚠️ No password provided');
      return 'N/A';
    }

    console.log('🔐 Decrypting password...');
    
    // Check if password is in encrypted format (iv:encryptedData)
    if (!encryptedPassword.includes(':')) {
      console.log('ℹ️ Password not in encrypted format, returning as-is');
      return encryptedPassword;
    }

    // ✅ Use your existing decrypt function
    const decrypted = decrypt(encryptedPassword);
    
    // If decrypted value is an object, extract password field
    if (typeof decrypted === 'object' && decrypted.password) {
      console.log('✅ Password decrypted successfully (from object)');
      return decrypted.password;
    }
    
    // If decrypted value is a string, return it
    console.log('✅ Password decrypted successfully');
    return decrypted;

  } catch (error) {
    console.error('❌ Password decryption error:', error.message);
    console.log('⚠️ Returning original encrypted value');
    return encryptedPassword;
  }
}


function calculateGateClosureTime(reportingTime) {
  if (!reportingTime) return 'N.A';
  
  try {
    const [hours, minutes] = reportingTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + 30;
    
    let newHours = Math.floor(totalMinutes / 60);
    let newMinutes = totalMinutes % 60;
    
    const ampm = newHours >= 12 ? 'PM' : 'AM';
    newHours = newHours % 12;
    newHours = newHours ? newHours : 12;
    
    return `${newHours}:${String(newMinutes).padStart(2, '0')} ${ampm}`;
  } catch (error) {
    console.error('Error calculating gate closure time:', error);
    return 'N.A';
  }
}


function formatTimeToAMPM(time) {
  if (!time) return 'N.A';
  
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    let displayHours = hours % 12;
    displayHours = displayHours ? displayHours : 12;
    
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'N.A';
  }
}


function formatDate(date) {
  if (!date) return 'N.A';
  
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N.A';
  }
}


// ✅ FIXED: Format Base64 to Data URI
/**
 * Converts raw Base64 string to proper data URI format
 * @param {string} base64String - Raw Base64 string from database
 * @param {string} mimeType - MIME type (default: image/jpeg)
 * @returns {string} - Formatted data URI or empty string
 */
function formatImageBase64(base64String, mimeType = 'image/jpeg') {
  try {
    // Handle null/undefined
    if (!base64String) {
      console.warn('⚠️ No base64 data provided');
      return '';
    }

    // Convert to string if needed
    const base64Str = String(base64String).trim();

    // If empty after trim
    if (base64Str === '') {
      console.warn('⚠️ Base64 string is empty');
      return '';
    }

    // If already a data URI, return as is
    if (base64Str.startsWith('data:')) {
      console.log('✓ Base64 is already a data URI');
      return base64Str;
    }

    // Validate Base64 format
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Str)) {
      console.error('❌ Invalid Base64 format detected');
      return '';
    }

    // Create data URI
    const dataUri = `data:${mimeType};base64,${base64Str}`;
    console.log(`✓ Base64 formatted to data URI (length: ${dataUri.length} chars)`);
    return dataUri;

  } catch (error) {
    console.error('❌ Error formatting Base64:', error.message);
    return '';
  }
}


function convertDBDataToHallTicketFormat(dbStudent) {
  return {
    student_id: dbStudent.student_id,
    fullname: dbStudent.fullname || '',
    batchNo: dbStudent.batchNo || '',
    center_name: dbStudent.center_name || '',
    center_address: dbStudent.center_address || '',
    subject_name: dbStudent.subject_name || '',
    batchdate: formatDate(dbStudent.batchdate),
    reporting_time: formatTimeToAMPM(dbStudent.reporting_time),
    start_time: formatTimeToAMPM(dbStudent.start_time),
    end_time: formatTimeToAMPM(dbStudent.end_time),
    gate_closure_time: calculateGateClosureTime(dbStudent.reporting_time),
    disability: dbStudent.disability === 1 ? 'Yes' : 'No',
    newname: 'N.A',
    APPLICATION_NUMBER: dbStudent.student_id,
    disability_type: 'N.A',
    photoBase64: formatImageBase64(dbStudent.base64, 'image/jpeg'),  // ✅ FIXED
    signBase64: formatImageBase64(dbStudent.sign_base64, 'image/jpeg'),  // ✅ FIXED
    departmentId: dbStudent.departmentId
  };
}


async function getDepartmentLogo(departmentId) {
  try {
    if (!departmentId) {
      console.log('⚠ No departmentId provided');
      return '';
    }

    console.log('🔍 Fetching logo for departmentId:', departmentId);

    const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
    const [rows] = await db.execute(query, [parseInt(departmentId)]);

    console.log('📊 Query executed, rows returned:', rows.length);

    if (rows.length > 0 && rows[0].logo) {
      let logoData = rows[0].logo;
      
      console.log('✓ Logo found, length:', logoData.length);
      
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


// ✅ EXAM TYPE DETECTION FUNCTION (FRIEND'S UNIQUE FUNCTION #2)
async function getDepartmentExamType(departmentId) {
  try {
    if (!departmentId) return null;
    
    const query = 'SELECT examType FROM departmentdb WHERE departmentId = ?';
    const [rows] = await db.execute(query, [parseInt(departmentId)]);
    
    if (rows.length > 0) {
      return rows[0].examType;
    }
    return null;
  } catch (error) {
    console.error('Error fetching exam type:', error);
    return null;
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


// ========== FOLDER MANAGEMENT FUNCTIONS ==========


// ✅ ENHANCED FOLDER CREATION (FRIEND'S UNIQUE FUNCTION #3)
function createHallTicketFolder(departmentId, examType = 'db') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const folderName = `halltickets_${examType}_dept${departmentId}_${timestamp}`;
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


// ✅ SKILL TEST GENERATION FUNCTION (FRIEND'S UNIQUE FUNCTION #4) - FIXED
/**
 * Generates Skill Test Hall Ticket PDF using EJS template
 * This is isolated from GCC generation for cleaner code organization
 */
async function generateSkillTestHallTicketFromDB(dbStudent, res, departmentId, customization = null, qrType = 'both') {
  let browser = null;
  
  try {
    const student = convertDBDataToHallTicketFormat(dbStudent);
    const departmentDetails = await getDepartmentDetails(departmentId || dbStudent.departmentId);

    // ✅ LOAD BOTH QR CODES
    const { qrCodeBase64, qrCodeTwBase64 } = loadQRCodes(qrType);
    console.log('✓ QR codes loaded for single ticket generation:', { 
      hasShorthand: !!qrCodeBase64, 
      hasTypewriting: !!qrCodeTwBase64 
    });

    // ✅ YOUR CUSTOMIZATION LOGIC - merged with friend's approach
    const hasLeftLogo = customization?.leftLogoBase64 && customization.leftLogoBase64.trim() !== '';
    const hasRightLogo = customization?.rightLogoBase64 && customization.rightLogoBase64.trim() !== '';
    const hasInvigilatorImage = customization?.invigilatorImageBase64 && customization.invigilatorImageBase64.trim() !== '';

    const studentWithImages = {
      ...student,
      leftLogoBase64: hasLeftLogo ? customization.leftLogoBase64 : getImageAsBase64('pwd_logo1.jpg'),
      logoBase64: hasRightLogo ? customization.rightLogoBase64 : departmentDetails.logo,
      ashokStambhBase64: hasRightLogo ? customization.rightLogoBase64 : getImageAsBase64('pwd_logo2.jpeg'),
      photoBase64: student.photoBase64,  // ✅ Already formatted by formatImageBase64()
      signBase64: student.signBase64,    // ✅ Already formatted by formatImageBase64()
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

    const templatePath = path.join(__dirname, '../views/hallticket.ejs');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(htmlTemplate, studentWithImages);

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
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=hallticket_${dbStudent.student_id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer, 'binary');
    console.log('✅ Skill Test PDF sent successfully');

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}


// ========== CONTROLLER OBJECT ==========


const hallticketDepartmentController = {
  
  getDepartmentsForHallTickets: async (req, res) => {
    try {
      const query = `
        SELECT 
          departmentId,
          departmentName,
          examType,
          departmentStatus
        FROM departmentdb 
        ORDER BY departmentName ASC
      `;

      const [departments] = await db.execute(query);

      if (departments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active departments found'
        });
      }

      const validDepartments = departments.filter(dept => dept.examType);
      const invalidDepartments = departments.filter(dept => !dept.examType);

      if (invalidDepartments.length > 0) {
        console.warn(`Found ${invalidDepartments.length} departments without exam type:`, 
          invalidDepartments.map(d => d.departmentName));
      }

      res.status(200).json({
        success: true,
        message: 'Departments fetched successfully',
        data: validDepartments,
        totalDepartments: departments.length,
        validDepartments: validDepartments.length,
        departmentsWithoutExamType: invalidDepartments.length
      });

    } catch (error) {
      console.error('Error fetching departments for hall tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching departments',
        error: error.message
      });
    }
  },

  getCentersForDB: async (req, res) => {
    try {
      const { departmentId } = req.query;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      const query = `
        SELECT DISTINCT 
          e.center,
          e.center_name,
          e.center_address
        FROM students s
        INNER JOIN examcenterdb e ON s.center = e.center
        WHERE s.departmentId = ?
        ORDER BY e.center_name ASC
      `;

      const [centers] = await db.execute(query, [parseInt(departmentId)]);

      res.status(200).json({
        success: true,
        message: 'Centers fetched successfully',
        data: centers,
        totalCenters: centers.length
      });

    } catch (error) {
      console.error('Error fetching centers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching centers',
        error: error.message
      });
    }
  },

  getBatchesForDB: async (req, res) => {
    try {
      const { departmentId } = req.query;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      const query = `
        SELECT DISTINCT 
          batchNo,
          batchdate
        FROM students
        WHERE departmentId = ?
          AND batchNo IS NOT NULL
          AND batchdate IS NOT NULL
        ORDER BY batchdate DESC, batchNo ASC
      `;

      const [batches] = await db.execute(query, [parseInt(departmentId)]);

      res.status(200).json({
        success: true,
        message: 'Batches fetched successfully',
        data: batches,
        totalBatches: batches.length
      });

    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching batches',
        error: error.message
      });
    }
  },

  getStudentsByFilters: async (req, res) => {
    try {
      const { departmentId, center, batchNo, searchTerm } = req.query;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      // ✅ USE DYNAMIC EXAM TYPE (FRIEND'S APPROACH)
      const examType = await getDepartmentExamType(departmentId);

      let query = `
        SELECT 
          s.student_id,
          s.fullname,
          s.batchNo,
          s.batchdate,
          s.reporting_time,
          s.start_time,
          s.end_time,
          s.disability,
          s.departmentId,
          s.base64,
          s.sign_base64,
          s.center as centerCode,
          e.center_name,
          e.center_address,
          sub.subject_name
        FROM students s
        LEFT JOIN examcenterdb e ON s.center = e.center
        LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = ?
        WHERE s.departmentId = ?
      `;

      const params = [examType || 'SKILL', parseInt(departmentId)];

      if (center && center !== 'all') {
        query += ' AND s.center = ?';
        params.push(parseInt(center));
      }

      if (batchNo && batchNo !== 'all') {
        query += ' AND s.batchNo = ?';
        params.push(parseInt(batchNo));
      }

      if (searchTerm) {
        query += ' AND (s.fullname LIKE ? OR s.student_id LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      query += ' ORDER BY s.fullname ASC';

      console.log('📊 Executing query with params:', params);
      const [students] = await db.execute(query, params);
      console.log(`✓ Query returned ${students.length} students`);

      const formattedStudents = students.map(student => ({
        ...convertDBDataToHallTicketFormat(student),
        centerCode: student.centerCode,
        examType: examType || 'SKILL'
      }));

      res.status(200).json({
        success: true,
        message: 'Students fetched successfully',
        data: formattedStudents,
        totalStudents: formattedStudents.length
      });

    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching students',
        error: error.message
      });
    }
  },

  // ✅ UPDATED: Single download with exam type routing + password decryption
  downloadSingleHallTicketFromDB: async (req, res) => {
    let browser = null;

    try {
      const { student_id } = req.params;
      const { departmentId, qrType } = req.query;
      
      // ✅ Get customization from request body (YOUR FEATURE)
      const customization = req.body?.customization || null;

      console.log('=== DB PDF GENERATION START ===');
      console.log('Student ID:', student_id);
      console.log('Department ID:', departmentId);
      console.log('QR Type:', qrType || 'both (default)');
      console.log('Customization Received:', customization ? 'YES' : 'NO');

      // ✅ DETECT EXAM TYPE (FRIEND'S FEATURE)
      const examType = await getDepartmentExamType(departmentId);
      console.log('📋 Exam Type:', examType);

      if (!examType) {
        return res.status(400).json({
          error: 'Could not determine exam type for this department'
        });
      }

      let query = `
        SELECT 
          s.student_id,
          s.fullname,
          s.mothername,
          s.batchNo,
          s.batchdate,
          s.reporting_time,
          s.start_time,
          s.end_time,
          s.disability,
          s.departmentId,
          s.base64,
          s.sign_base64,
          s.InstituteId,
          s.courseId,
          s.password,
          e.center,
          e.center_name,
          e.center_address,
          sub.subject_name,
          sub.subjectId
        FROM students s
        LEFT JOIN examcenterdb e ON s.center = e.center
        LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = ?
        WHERE s.student_id = ?
      `;

      const params = [examType, student_id];

      if (departmentId) {
        query += ' AND s.departmentId = ?';
        params.push(parseInt(departmentId));
      }

      const [students] = await db.execute(query, params);

      if (students.length === 0) {
        return res.status(404).json({ 
          error: 'Student not found with this ID' 
        });
      }

      const dbStudent = students[0];
      console.log('✓ Student found:', dbStudent.fullname);

      // ✅ DEBUG: Log image data status
      console.log('🔍 DEBUG - Image Data Status:');
      console.log('  Photo base64:', dbStudent.base64 ? `Present (${dbStudent.base64.substring(0, 30)}...)` : 'NULL');
      console.log('  Signature base64:', dbStudent.sign_base64 ? `Present (${dbStudent.sign_base64.substring(0, 30)}...)` : 'NULL');

      // ✅ DECRYPT PASSWORD (FRIEND'S FEATURE)
      if (dbStudent.password) {
        console.log('🔐 Decrypting password for student:', dbStudent.student_id);
        dbStudent.decryptedPassword = decryptPassword(dbStudent.password);
        console.log('Password status:', dbStudent.decryptedPassword !== 'N/A' ? '✓ Decrypted' : '✗ Failed');
      } else {
        console.log('⚠️ No password field in database');
        dbStudent.decryptedPassword = 'N/A';
      }

      // ✅ ROUTE TO CORRECT GENERATOR (FRIEND'S FEATURE)
      if (examType === 'GCC') {
        console.log('🎨 Using GCC TBC template (PDFKit)');
        return await generateGccTbcHallTicketFromDB(dbStudent, res, departmentId);
      } else if (examType === 'SKILL') {
        console.log('🎨 Using Skill Test template (EJS) with your customization');
        return await generateSkillTestHallTicketFromDB(dbStudent, res, departmentId, customization, qrType);
      } else {
        return res.status(400).json({
          error: `Unsupported exam type: ${examType}`
        });
      }

    } catch (error) {
      console.error('❌ DB PDF generation error:', error);
      if (browser) {
        await browser.close();
      }

      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to generate hall ticket PDF', 
          details: error.message 
        });
      }
    }
  },

  // ✅ UPDATED: Bulk download with exam type routing + password decryption
  downloadAllHallTicketsFromDB: async (req, res) => {
    let browser = null;

    try {
      const { departmentId, center, batchNo, qrType } = req.query;
      
      // ✅ Get customization from request body (YOUR FEATURE)
      const customization = req.body?.customization || null;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          error: 'Department ID is required'
        });
      }

      console.log('=== BULK DB FOLDER GENERATION START ===');
      console.log('Department ID:', departmentId);
      console.log('Center:', center);
      console.log('Batch No:', batchNo);
      console.log('QR Type:', qrType || 'both (default)');
      console.log('Customization Received:', customization ? 'YES' : 'NO');

      // ✅ DETECT EXAM TYPE (FRIEND'S FEATURE)
      const examType = await getDepartmentExamType(departmentId);
      console.log('📋 Exam Type:', examType);

      if (!examType) {
        return res.status(400).json({
          success: false,
          error: 'Could not determine exam type for this department'
        });
      }

      cleanupOldFolders();

      // ✅ USE ENHANCED FOLDER CREATION WITH EXAM TYPE (FRIEND'S FEATURE)
      const { folderPath, folderName } = createHallTicketFolder(departmentId, examType);

      let query = `
        SELECT 
          s.student_id,
          s.fullname,
          s.mothername,
          s.batchNo,
          s.batchdate,
          s.reporting_time,
          s.start_time,
          s.end_time,
          s.disability,
          s.departmentId,
          s.base64,
          s.sign_base64,
          s.InstituteId,
          s.courseId,
          s.password,
          e.center,
          e.center_name,
          e.center_address,
          sub.subject_name,
          sub.subjectId
        FROM students s
        LEFT JOIN examcenterdb e ON s.center = e.center
        LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = ?
        WHERE s.departmentId = ?
      `;

      const params = [examType, parseInt(departmentId)];

      if (center && center !== 'all') {
        query += ' AND s.center = ?';
        params.push(parseInt(center));
      }

      if (batchNo && batchNo !== 'all') {
        query += ' AND s.batchNo = ?';
        params.push(parseInt(batchNo));
      }

      query += ' ORDER BY s.fullname ASC';

      console.log('📊 Executing bulk query with params:', params);
      const [students] = await db.execute(query, params);

      if (students.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'No students found with the specified filters' 
        });
      }

      console.log(`Total students: ${students.length}`);

      // ✅ DECRYPT PASSWORDS FOR ALL STUDENTS (FRIEND'S FEATURE)
      console.log('🔐 Decrypting passwords for all students...');
      let decryptedCount = 0;
      students.forEach(student => {
        if (student.password) {
          student.decryptedPassword = decryptPassword(student.password);
          if (student.decryptedPassword !== 'N/A') {
            decryptedCount++;
          }
        } else {
          student.decryptedPassword = 'N/A';
        }
      });
      console.log(`✅ Decrypted ${decryptedCount} out of ${students.length} passwords`);

      let successCount = 0;
      let errorCount = 0;
      const generatedFiles = [];

      // ✅ ROUTE BASED ON EXAM TYPE (FRIEND'S FEATURE)
      if (examType === 'GCC') {
        console.log('🎨 Using GCC TBC template (PDFKit) for bulk');
        
        const result = await generateGccTbcBulkHallTicketsFromDB(
          students,
          folderPath,
          folderName,
          departmentId
        );

        successCount = result.successCount;
        errorCount = result.errorCount;
        generatedFiles.push(...result.files);

      } else if (examType === 'SKILL') {
        console.log('🎨 Using Skill Test template (EJS) for bulk with your customization');

        const departmentDetails = await getDepartmentDetails(departmentId);
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

        for (let i = 0; i < students.length; i++) {
          const dbStudent = students[i];

          try {
            console.log(`Processing ${i + 1}/${students.length}: ${dbStudent.student_id}`);

            const student = convertDBDataToHallTicketFormat(dbStudent);

            // ✅ Apply customization if valid, else defaults
            const studentWithImages = {
              ...student,
              leftLogoBase64: hasLeftLogo ? customization.leftLogoBase64 : getImageAsBase64('pwd_logo1.jpg'),
              logoBase64: hasRightLogo ? customization.rightLogoBase64 : departmentDetails.logo,
              ashokStambhBase64: hasRightLogo ? customization.rightLogoBase64 : getImageAsBase64('pwd_logo2.jpeg'),
              photoBase64: student.photoBase64,  // ✅ Already formatted
              signBase64: student.signBase64,    // ✅ Already formatted
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

            const filename = `hallticket_${dbStudent.student_id}.pdf`;
            const filePath = path.join(folderPath, filename);
            fs.writeFileSync(filePath, pdfBuffer);

            generatedFiles.push({
              student_id: dbStudent.student_id,
              fullname: dbStudent.fullname,
              filename: filename,
              downloadUrl: `/generated_halltickets/${folderName}/${filename}`
            });

            successCount++;
            console.log(`✓ Saved to folder: ${filename} (${successCount}/${students.length})`);

          } catch (error) {
            errorCount++;
            console.error(`✗ Error generating PDF for ${dbStudent.student_id}:`, error.message);
          }

          if (i < students.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        await browser.close();
        browser = null;
      }

      console.log(`✅ DB generation complete: ${successCount} successful, ${errorCount} failed`);

      res.json({
        success: true,
        message: `Generated ${successCount} hall tickets successfully`,
        examType: examType,
        folderName: folderName,
        folderPath: `/generated_halltickets/${folderName}`,
        totalFiles: successCount,
        files: generatedFiles,
        errors: errorCount
      });

    } catch (error) {
      console.error('Bulk DB folder generation error:', error);
      if (browser) {
        await browser.close();
      }

      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          error: 'Failed to generate hall tickets', 
          details: error.message 
        });
      }
    }
  },

  checkDBDataStatus: async (req, res) => {
    try {
      const { departmentId } = req.query;

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      const query = `
        SELECT COUNT(*) as totalStudents
        FROM students
        WHERE departmentId = ?
      `;

      const [result] = await db.execute(query, [parseInt(departmentId)]);

      res.json({
        success: true,
        status: 'data_available',
        message: 'Database data is available',
        totalStudents: result[0].totalStudents,
        departmentId: parseInt(departmentId)
      });

    } catch (error) {
      console.error('Check DB data status error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to check data status' 
      });
    }
  }

};

module.exports = hallticketDepartmentController;
