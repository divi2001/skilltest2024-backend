// // // // // controllers/hallticketDepartment_controller.js
// // // // const db = require('../config/db1');
// // // // const puppeteer = require('puppeteer');
// // // // const fs = require('fs');
// // // // const path = require('path');
// // // // const ejs = require('ejs');
// // // // const archiver = require('archiver');

// // // // // ========== HELPER FUNCTIONS ==========

// // // // /**
// // // //  * Calculate gate closure time (30 minutes after reporting time)
// // // //  * @param {string} reportingTime - Time in HH:MM:SS format
// // // //  * @returns {string} - Gate closure time in HH:MM AM/PM format
// // // //  */
// // // // function calculateGateClosureTime(reportingTime) {
// // // //   if (!reportingTime) return 'N.A';
  
// // // //   try {
// // // //     const [hours, minutes] = reportingTime.split(':').map(Number);
// // // //     let totalMinutes = hours * 60 + minutes + 30; // Add 30 minutes
    
// // // //     let newHours = Math.floor(totalMinutes / 60);
// // // //     let newMinutes = totalMinutes % 60;
    
// // // //     const ampm = newHours >= 12 ? 'PM' : 'AM';
// // // //     newHours = newHours % 12;
// // // //     newHours = newHours ? newHours : 12; // Convert 0 to 12
    
// // // //     return `${newHours}:${String(newMinutes).padStart(2, '0')} ${ampm}`;
// // // //   } catch (error) {
// // // //     console.error('Error calculating gate closure time:', error);
// // // //     return 'N.A';
// // // //   }
// // // // }

// // // // /**
// // // //  * Convert MySQL TIME to HH:MM AM/PM format
// // // //  * @param {string} time - Time in HH:MM:SS format from MySQL
// // // //  * @returns {string} - Formatted time in HH:MM AM/PM
// // // //  */
// // // // function formatTimeToAMPM(time) {
// // // //   if (!time) return 'N.A';
  
// // // //   try {
// // // //     const [hours, minutes] = time.split(':').map(Number);
// // // //     const ampm = hours >= 12 ? 'PM' : 'AM';
    
// // // //     let displayHours = hours % 12;
// // // //     displayHours = displayHours ? displayHours : 12;
    
// // // //     return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
// // // //   } catch (error) {
// // // //     console.error('Error formatting time:', error);
// // // //     return 'N.A';
// // // //   }
// // // // }

// // // // /**
// // // //  * Convert MySQL DATE to DD-MM-YYYY format
// // // //  * @param {string} date - Date from MySQL (YYYY-MM-DD)
// // // //  * @returns {string} - Formatted date (DD-MM-YYYY)
// // // //  */
// // // // function formatDate(date) {
// // // //   if (!date) return 'N.A';
  
// // // //   try {
// // // //     const d = new Date(date);
// // // //     const day = String(d.getDate()).padStart(2, '0');
// // // //     const month = String(d.getMonth() + 1).padStart(2, '0');
// // // //     const year = d.getFullYear();
    
// // // //     return `${day}-${month}-${year}`;
// // // //   } catch (error) {
// // // //     console.error('Error formatting date:', error);
// // // //     return 'N.A';
// // // //   }
// // // // }

// // // // /**
// // // //  * Convert database student data to hall ticket format
// // // //  * @param {object} dbStudent - Student data from database
// // // //  * @returns {object} - Formatted student data for hall ticket
// // // //  */
// // // // function convertDBDataToHallTicketFormat(dbStudent) {
// // // //   return {
// // // //     // From database - direct mapping
// // // //     student_id: dbStudent.student_id,
// // // //     fullname: dbStudent.fullname || 'N.A',
// // // //     batchNo: dbStudent.batchNo || 'N.A',
// // // //     center_name: dbStudent.center_name || 'N.A',
// // // //     center_address: dbStudent.center_address || 'N.A',
// // // //     subject_name: dbStudent.subject_name || 'N.A',
    
// // // //     // From database - with conversion
// // // //     batchdate: formatDate(dbStudent.batchdate),
// // // //     reporting_time: formatTimeToAMPM(dbStudent.reporting_time),
// // // //     start_time: formatTimeToAMPM(dbStudent.start_time),
// // // //     end_time: formatTimeToAMPM(dbStudent.end_time),
// // // //     gate_closure_time: calculateGateClosureTime(dbStudent.reporting_time),
// // // //     disability: dbStudent.disability === 1 ? 'Yes' : 'No',
    
// // // //     // Missing fields - set as N.A
// // // //     newname: 'N.A',
// // // //     APPLICATION_NUMBER: dbStudent.student_id, // Use student_id as fallback
// // // //     disability_type: 'N.A',
    
// // // //     // Images - already base64 in database
// // // //     photoBase64: dbStudent.base64 || '',
// // // //     signBase64: dbStudent.sign_base64 || '',
    
// // // //     // Department ID for logo
// // // //     departmentId: dbStudent.departmentId
// // // //   };
// // // // }

// // // // /**
// // // //  * Fetch department logo from database
// // // //  */
// // // // async function getDepartmentLogo(departmentId) {
// // // //   try {
// // // //     if (!departmentId) {
// // // //       console.log('⚠ No departmentId provided');
// // // //       return '';
// // // //     }

// // // //     console.log('🔍 Fetching logo for departmentId:', departmentId);

// // // //     const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
// // // //     const [rows] = await db.execute(query, [parseInt(departmentId)]);

// // // //     console.log('📊 Query executed, rows returned:', rows.length);

// // // //     if (rows.length > 0 && rows[0].logo) {
// // // //       let logoData = rows[0].logo;
      
// // // //       console.log('✓ Logo found, length:', logoData.length);
      
// // // //       // Add data:image prefix if missing
// // // //       if (!logoData.startsWith('data:image')) {
// // // //         console.log('⚙️ Adding data:image prefix');
        
// // // //         if (logoData.startsWith('/9j/')) {
// // // //           logoData = `data:image/jpeg;base64,${logoData}`;
// // // //         } else if (logoData.startsWith('iVBORw0KG')) {
// // // //           logoData = `data:image/png;base64,${logoData}`;
// // // //         } else if (logoData.startsWith('R0lGOD')) {
// // // //           logoData = `data:image/gif;base64,${logoData}`;
// // // //         } else {
// // // //           logoData = `data:image/jpeg;base64,${logoData}`;
// // // //         }
        
// // // //         console.log('✓ Prefix added');
// // // //       }
      
// // // //       console.log('✅ RETURNING LOGO TO PDF GENERATOR');
// // // //       return logoData;
// // // //     } else {
// // // //       console.log('⚠ No logo found for departmentId:', departmentId);
// // // //       return '';
// // // //     }
// // // //   } catch (error) {
// // // //     console.error('❌ Error fetching logo:', error.message);
// // // //     return '';
// // // //   }
// // // // }

// // // // /**
// // // //  * Get image as base64 from file system
// // // //  */
// // // // function getImageAsBase64(imagePath) {
// // // //   try {
// // // //     const fullPath = path.join(__dirname, '../public/assets/skilltest', imagePath);
// // // //     if (fs.existsSync(fullPath)) {
// // // //       const imageBuffer = fs.readFileSync(fullPath);
// // // //       const ext = path.extname(fullPath).toLowerCase();
// // // //       let mimeType = 'image/jpeg';
      
// // // //       if (ext === '.png') mimeType = 'image/png';
// // // //       else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      
// // // //       return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
// // // //     }
// // // //     return '';
// // // //   } catch (error) {
// // // //     console.error(`Error reading image ${imagePath}:`, error.message);
// // // //     return '';
// // // //   }
// // // // }

// // // // // ========== CONTROLLER OBJECT ==========

// // // // const hallticketDepartmentController = {
  
// // // //   // ========== EXISTING FUNCTION ==========
  
// // // //   getDepartmentsForHallTickets: async (req, res) => {
// // // //     try {
// // // //       const query = `
// // // //         SELECT 
// // // //           departmentId,
// // // //           departmentName,
// // // //           examType,
// // // //           departmentStatus
// // // //         FROM departmentdb 
// // // //         ORDER BY departmentName ASC
// // // //       `;

// // // //       const [departments] = await db.execute(query);

// // // //       if (departments.length === 0) {
// // // //         return res.status(404).json({
// // // //           success: false,
// // // //           message: 'No active departments found'
// // // //         });
// // // //       }

// // // //       const validDepartments = departments.filter(dept => dept.examType);
// // // //       const invalidDepartments = departments.filter(dept => !dept.examType);

// // // //       if (invalidDepartments.length > 0) {
// // // //         console.warn(`Found ${invalidDepartments.length} departments without exam type:`, 
// // // //           invalidDepartments.map(d => d.departmentName));
// // // //       }

// // // //       res.status(200).json({
// // // //         success: true,
// // // //         message: 'Departments fetched successfully',
// // // //         data: validDepartments,
// // // //         totalDepartments: departments.length,
// // // //         validDepartments: validDepartments.length,
// // // //         departmentsWithoutExamType: invalidDepartments.length
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('Error fetching departments for hall tickets:', error);
// // // //       res.status(500).json({
// // // //         success: false,
// // // //         message: 'Internal server error while fetching departments',
// // // //         error: error.message
// // // //       });
// // // //     }
// // // //   },

// // // //   // ========== NEW FUNCTIONS FOR DATABASE-BASED GENERATION ==========

// // // //   /**
// // // //    * Get all exam centers for a specific department from students table
// // // //    */
// // // //   getCentersForDB: async (req, res) => {
// // // //     try {
// // // //       const { departmentId } = req.query;

// // // //       if (!departmentId) {
// // // //         return res.status(400).json({
// // // //           success: false,
// // // //           message: 'Department ID is required'
// // // //         });
// // // //       }

// // // //       const query = `
// // // //         SELECT DISTINCT 
// // // //           e.center,
// // // //           e.center_name,
// // // //           e.center_address
// // // //         FROM students s
// // // //         INNER JOIN examcenterdb e ON s.center = e.center
// // // //         WHERE s.departmentId = ?
// // // //         ORDER BY e.center_name ASC
// // // //       `;

// // // //       const [centers] = await db.execute(query, [parseInt(departmentId)]);

// // // //       res.status(200).json({
// // // //         success: true,
// // // //         message: 'Centers fetched successfully',
// // // //         data: centers,
// // // //         totalCenters: centers.length
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('Error fetching centers:', error);
// // // //       res.status(500).json({
// // // //         success: false,
// // // //         message: 'Internal server error while fetching centers',
// // // //         error: error.message
// // // //       });
// // // //     }
// // // //   },

// // // //   /**
// // // //    * Get all batches for a specific department from students table
// // // //    */
// // // //   getBatchesForDB: async (req, res) => {
// // // //     try {
// // // //       const { departmentId } = req.query;

// // // //       if (!departmentId) {
// // // //         return res.status(400).json({
// // // //           success: false,
// // // //           message: 'Department ID is required'
// // // //         });
// // // //       }

// // // //       const query = `
// // // //         SELECT DISTINCT 
// // // //           batchNo,
// // // //           batchdate
// // // //         FROM students
// // // //         WHERE departmentId = ?
// // // //           AND batchNo IS NOT NULL
// // // //           AND batchdate IS NOT NULL
// // // //         ORDER BY batchdate DESC, batchNo ASC
// // // //       `;

// // // //       const [batches] = await db.execute(query, [parseInt(departmentId)]);

// // // //       res.status(200).json({
// // // //         success: true,
// // // //         message: 'Batches fetched successfully',
// // // //         data: batches,
// // // //         totalBatches: batches.length
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('Error fetching batches:', error);
// // // //       res.status(500).json({
// // // //         success: false,
// // // //         message: 'Internal server error while fetching batches',
// // // //         error: error.message
// // // //       });
// // // //     }
// // // //   },

// // // //   /**
// // // //    * Get students by filters (departmentId is mandatory)
// // // //    */
// // // //   getStudentsByFilters: async (req, res) => {
// // // //     try {
// // // //       const { departmentId, center, batchNo, searchTerm } = req.query;

// // // //       // Department ID is mandatory
// // // //       if (!departmentId) {
// // // //         return res.status(400).json({
// // // //           success: false,
// // // //           message: 'Department ID is required'
// // // //         });
// // // //       }

// // // //       let query = `
// // // //         SELECT 
// // // //           s.student_id,
// // // //           s.fullname,
// // // //           s.batchNo,
// // // //           s.batchdate,
// // // //           s.reporting_time,
// // // //           s.start_time,
// // // //           s.end_time,
// // // //           s.disability,
// // // //           s.departmentId,
// // // //           s.base64,
// // // //           s.sign_base64,
// // // //           s.center as centerCode,
// // // //           e.center_name,
// // // //           e.center_address,
// // // //           sub.subject_name
// // // //         FROM students s
// // // //         LEFT JOIN examcenterdb e ON s.center = e.center
// // // //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
// // // //         WHERE s.departmentId = ?
// // // //       `;

// // // //       const params = [parseInt(departmentId)];

// // // //       if (center && center !== 'all') {
// // // //         query += ' AND s.center = ?';
// // // //         params.push(parseInt(center));
// // // //       }

// // // //       if (batchNo && batchNo !== 'all') {
// // // //         query += ' AND s.batchNo = ?';
// // // //         params.push(parseInt(batchNo));
// // // //       }

// // // //       if (searchTerm) {
// // // //         query += ' AND (s.fullname LIKE ? OR s.student_id LIKE ?)';
// // // //         params.push(`%${searchTerm}%`, `%${searchTerm}%`);
// // // //       }

// // // //       query += ' ORDER BY s.fullname ASC';

// // // //       const [students] = await db.execute(query, params);

// // // //       // Convert to hall ticket format
// // // //       const formattedStudents = students.map(student => ({
// // // //         ...convertDBDataToHallTicketFormat(student),
// // // //         centerCode: student.centerCode,
// // // //         examType: 'SKILL'
// // // //       }));

// // // //       res.status(200).json({
// // // //         success: true,
// // // //         message: 'Students fetched successfully',
// // // //         data: formattedStudents,
// // // //         totalStudents: formattedStudents.length
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('Error fetching students:', error);
// // // //       res.status(500).json({
// // // //         success: false,
// // // //         message: 'Internal server error while fetching students',
// // // //         error: error.message
// // // //       });
// // // //     }
// // // //   },

// // // //   /**
// // // //    * Download single hall ticket from database
// // // //    */
// // // //   downloadSingleHallTicketFromDB: async (req, res) => {
// // // //     let browser = null;

// // // //     try {
// // // //       const { student_id } = req.params;
// // // //       const { departmentId } = req.query;

// // // //       console.log('=== DB PDF GENERATION START ===');
// // // //       console.log('Student ID:', student_id);
// // // //       console.log('Department ID:', departmentId);

// // // //       // Query student data with JOINs
// // // //       let query = `
// // // //         SELECT 
// // // //           s.student_id,
// // // //           s.fullname,
// // // //           s.batchNo,
// // // //           s.batchdate,
// // // //           s.reporting_time,
// // // //           s.start_time,
// // // //           s.end_time,
// // // //           s.disability,
// // // //           s.departmentId,
// // // //           s.base64,
// // // //           s.sign_base64,
// // // //           e.center_name,
// // // //           e.center_address,
// // // //           sub.subject_name
// // // //         FROM students s
// // // //         LEFT JOIN examcenterdb e ON s.center = e.center
// // // //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
// // // //         WHERE s.student_id = ?
// // // //       `;

// // // //       const params = [student_id];

// // // //       // Optional: Filter by departmentId if provided
// // // //       if (departmentId) {
// // // //         query += ' AND s.departmentId = ?';
// // // //         params.push(parseInt(departmentId));
// // // //       }

// // // //       const [students] = await db.execute(query, params);

// // // //       if (students.length === 0) {
// // // //         return res.status(404).json({ 
// // // //           error: 'Student not found with this ID' 
// // // //         });
// // // //       }

// // // //       const dbStudent = students[0];
// // // //       console.log('✓ Student found:', dbStudent.fullname);

// // // //       // Convert to hall ticket format
// // // //       const student = convertDBDataToHallTicketFormat(dbStudent);

// // // //       // Fetch department logo
// // // //       const departmentLogoBase64 = await getDepartmentLogo(departmentId || dbStudent.departmentId);
// // // //       console.log('Step 1: Logo fetched ✓');

// // // //       // Prepare student data with images
// // // //       const studentWithImages = {
// // // //         ...student,
// // // //         leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // // //         logoBase64: departmentLogoBase64,
// // // //         ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // // //         photoBase64: student.photoBase64,
// // // //         signBase64: student.signBase64,
// // // //         townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // // //         qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // // //       };
// // // //       console.log('Step 2: Images prepared ✓');

// // // //       // Read EJS template
// // // //       const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // // //       const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
// // // //       console.log('Step 3: Template loaded ✓');

// // // //       // Render EJS
// // // //       const html = ejs.render(htmlTemplate, studentWithImages);
// // // //       console.log('Step 4: HTML rendered ✓');

// // // //       // Launch Puppeteer
// // // //       console.log('🚀 Launching Puppeteer...');
// // // //       browser = await puppeteer.launch({
// // // //         headless: 'new',
// // // //         args: [
// // // //           '--no-sandbox',
// // // //           '--disable-setuid-sandbox',
// // // //           '--disable-dev-shm-usage',
// // // //           '--disable-accelerated-2d-canvas',
// // // //           '--disable-gpu'
// // // //         ]
// // // //       });
// // // //       console.log('Step 5: Puppeteer launched ✓');

// // // //       const page = await browser.newPage();
// // // //       await page.setContent(html, { 
// // // //         waitUntil: 'networkidle0',
// // // //         timeout: 60000 
// // // //       });
// // // //       console.log('Step 6: Content set ✓');

// // // //       await new Promise(resolve => setTimeout(resolve, 1000));

// // // //       console.log('📄 Generating PDF...');
// // // //       const pdfBuffer = await page.pdf({
// // // //         format: 'A4',
// // // //         printBackground: true,
// // // //         preferCSSPageSize: false,
// // // //         margin: { 
// // // //           top: '0mm', 
// // // //           right: '0mm', 
// // // //           bottom: '0mm', 
// // // //           left: '0mm' 
// // // //         }
// // // //       });

// // // //       await browser.close();
// // // //       console.log('✅ PDF generated successfully');

// // // //       res.setHeader('Content-Type', 'application/pdf');
// // // //       res.setHeader('Content-Disposition', `attachment; filename=hallticket_${student_id}.pdf`);
// // // //       res.setHeader('Content-Length', pdfBuffer.length);

// // // //       res.end(pdfBuffer, 'binary', () => {
// // // //         console.log('📤 PDF sent to client');
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('❌ DB PDF generation error:', error);
// // // //       if (browser) {
// // // //         await browser.close();
// // // //       }

// // // //       if (!res.headersSent) {
// // // //         res.status(500).json({ 
// // // //           error: 'Failed to generate hall ticket PDF', 
// // // //           details: error.message 
// // // //         });
// // // //       }
// // // //     }
// // // //   },

// // // //   /**
// // // //    * Download all hall tickets from database (departmentId is mandatory)
// // // //    */
// // // //   downloadAllHallTicketsFromDB: async (req, res) => {
// // // //     let browser = null;

// // // //     try {
// // // //       const { departmentId, center, batchNo } = req.query;

// // // //       // Department ID is mandatory
// // // //       if (!departmentId) {
// // // //         return res.status(400).json({
// // // //           success: false,
// // // //           error: 'Department ID is required'
// // // //         });
// // // //       }

// // // //       console.log('=== BULK DB PDF GENERATION START ===');
// // // //       console.log('Department ID:', departmentId);
// // // //       console.log('Center:', center);
// // // //       console.log('Batch No:', batchNo);

// // // //       // Query students with filters (departmentId is mandatory)
// // // //       let query = `
// // // //         SELECT 
// // // //           s.student_id,
// // // //           s.fullname,
// // // //           s.batchNo,
// // // //           s.batchdate,
// // // //           s.reporting_time,
// // // //           s.start_time,
// // // //           s.end_time,
// // // //           s.disability,
// // // //           s.departmentId,
// // // //           s.base64,
// // // //           s.sign_base64,
// // // //           e.center_name,
// // // //           e.center_address,
// // // //           sub.subject_name
// // // //         FROM students s
// // // //         LEFT JOIN examcenterdb e ON s.center = e.center
// // // //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId
// // // //         WHERE s.departmentId = ?
// // // //       `;

// // // //       const params = [parseInt(departmentId)];

// // // //       if (center && center !== 'all') {
// // // //         query += ' AND s.center = ?';
// // // //         params.push(parseInt(center));
// // // //       }

// // // //       if (batchNo && batchNo !== 'all') {
// // // //         query += ' AND s.batchNo = ?';
// // // //         params.push(parseInt(batchNo));
// // // //       }

// // // //       query += ' ORDER BY s.fullname ASC';

// // // //       const [students] = await db.execute(query, params);

// // // //       if (students.length === 0) {
// // // //         return res.status(404).json({ 
// // // //           error: 'No students found with the specified filters' 
// // // //         });
// // // //       }

// // // //       console.log(`Total students: ${students.length}`);

// // // //       // Fetch department logo once
// // // //       const departmentLogoBase64 = await getDepartmentLogo(departmentId);

// // // //       // Set response headers
// // // //       res.setHeader('Content-Type', 'application/zip');
// // // //       res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets_db.zip');

// // // //       // Create archive
// // // //       const archive = archiver('zip', { zlib: { level: 6 } });

// // // //       archive.on('error', (err) => {
// // // //         console.error('Archive error:', err);
// // // //         if (!res.headersSent) {
// // // //           res.status(500).json({ error: 'Failed to create ZIP archive' });
// // // //         }
// // // //       });

// // // //       archive.pipe(res);

// // // //       // Launch browser
// // // //       browser = await puppeteer.launch({
// // // //         headless: 'new',
// // // //         args: [
// // // //           '--no-sandbox',
// // // //           '--disable-setuid-sandbox',
// // // //           '--disable-dev-shm-usage',
// // // //           '--disable-accelerated-2d-canvas',
// // // //           '--disable-gpu'
// // // //         ]
// // // //       });

// // // //       const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // // //       const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

// // // //       let successCount = 0;
// // // //       let errorCount = 0;

// // // //       // Process each student
// // // //       for (let i = 0; i < students.length; i++) {
// // // //         const dbStudent = students[i];

// // // //         try {
// // // //           console.log(`Processing ${i + 1}/${students.length}: ${dbStudent.student_id}`);

// // // //           const student = convertDBDataToHallTicketFormat(dbStudent);

// // // //           const studentWithImages = {
// // // //             ...student,
// // // //             leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // // //             logoBase64: departmentLogoBase64,
// // // //             ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // // //             photoBase64: student.photoBase64,
// // // //             signBase64: student.signBase64,
// // // //             townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // // //             qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // // //           };

// // // //           const html = ejs.render(htmlTemplate, studentWithImages);

// // // //           const page = await browser.newPage();
// // // //           await page.setContent(html, { 
// // // //             waitUntil: 'domcontentloaded',
// // // //             timeout: 30000 
// // // //           });

// // // //           await new Promise(resolve => setTimeout(resolve, 300));

// // // //           const pdfBuffer = await page.pdf({
// // // //             format: 'A4',
// // // //             printBackground: true,
// // // //             preferCSSPageSize: false,
// // // //             margin: { 
// // // //               top: '0mm', 
// // // //               right: '0mm', 
// // // //               bottom: '0mm', 
// // // //               left: '0mm' 
// // // //             }
// // // //           });

// // // //           await page.close();

// // // //           const freshBuffer = Buffer.from(pdfBuffer);
// // // //           const filename = `hallticket_${dbStudent.student_id}.pdf`;
// // // //           archive.append(freshBuffer, { name: filename });

// // // //           successCount++;
// // // //           console.log(`✓ Added to ZIP: ${filename} (${successCount}/${students.length})`);

// // // //         } catch (error) {
// // // //           errorCount++;
// // // //           console.error(`✗ Error generating PDF for ${dbStudent.student_id}:`, error.message);

// // // //           const errorFilename = `ERROR_${dbStudent.student_id}.txt`;
// // // //           archive.append(
// // // //             `Failed to generate hall ticket for ${dbStudent.student_id}\nError: ${error.message}`, 
// // // //             { name: errorFilename }
// // // //           );
// // // //         }

// // // //         if (i < students.length - 1) {
// // // //           await new Promise(resolve => setTimeout(resolve, 200));
// // // //         }
// // // //       }

// // // //       await browser.close();
// // // //       browser = null;

// // // //       archive.finalize();

// // // //       archive.on('end', () => {
// // // //         console.log(`📤 ZIP file sent: ${successCount} successful, ${errorCount} failed`);
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('Bulk DB PDF generation error:', error);
// // // //       if (browser) {
// // // //         await browser.close();
// // // //       }

// // // //       if (!res.headersSent) {
// // // //         res.status(500).json({ 
// // // //           error: 'Failed to generate hall tickets', 
// // // //           details: error.message 
// // // //         });
// // // //       }
// // // //     }
// // // //   },

// // // //   /**
// // // //    * Check database data status for a specific department
// // // //    */
// // // //   checkDBDataStatus: async (req, res) => {
// // // //     try {
// // // //       const { departmentId } = req.query;

// // // //       if (!departmentId) {
// // // //         return res.status(400).json({
// // // //           success: false,
// // // //           message: 'Department ID is required'
// // // //         });
// // // //       }

// // // //       const query = `
// // // //         SELECT COUNT(*) as totalStudents
// // // //         FROM students
// // // //         WHERE departmentId = ?
// // // //       `;

// // // //       const [result] = await db.execute(query, [parseInt(departmentId)]);

// // // //       res.json({
// // // //         success: true,
// // // //         status: 'data_available',
// // // //         message: 'Database data is available',
// // // //         totalStudents: result[0].totalStudents,
// // // //         departmentId: parseInt(departmentId)
// // // //       });

// // // //     } catch (error) {
// // // //       console.error('Check DB data status error:', error);
// // // //       res.status(500).json({ 
// // // //         success: false,
// // // //         error: 'Failed to check data status' 
// // // //       });
// // // //     }
// // // //   }

// // // // };

// // // // module.exports = hallticketDepartmentController;



// // // // controllers/hallticketDepartment_controller.js
// // // const db = require('../config/db1');
// // // const puppeteer = require('puppeteer');
// // // const fs = require('fs');
// // // const path = require('path');
// // // const ejs = require('ejs');
// // // const archiver = require('archiver');

// // // // ========== HELPER FUNCTIONS ==========

// // // /**
// // //  * Calculate gate closure time (30 minutes after reporting time)
// // //  * @param {string} reportingTime - Time in HH:MM:SS format
// // //  * @returns {string} - Gate closure time in HH:MM AM/PM format
// // //  */
// // // function calculateGateClosureTime(reportingTime) {
// // //   if (!reportingTime) return 'N.A';
  
// // //   try {
// // //     const [hours, minutes] = reportingTime.split(':').map(Number);
// // //     let totalMinutes = hours * 60 + minutes + 30; // Add 30 minutes
    
// // //     let newHours = Math.floor(totalMinutes / 60);
// // //     let newMinutes = totalMinutes % 60;
    
// // //     const ampm = newHours >= 12 ? 'PM' : 'AM';
// // //     newHours = newHours % 12;
// // //     newHours = newHours ? newHours : 12; // Convert 0 to 12
    
// // //     return `${newHours}:${String(newMinutes).padStart(2, '0')} ${ampm}`;
// // //   } catch (error) {
// // //     console.error('Error calculating gate closure time:', error);
// // //     return 'N.A';
// // //   }
// // // }

// // // /**
// // //  * Convert MySQL TIME to HH:MM AM/PM format
// // //  * @param {string} time - Time in HH:MM:SS format from MySQL
// // //  * @returns {string} - Formatted time in HH:MM AM/PM
// // //  */
// // // function formatTimeToAMPM(time) {
// // //   if (!time) return 'N.A';
  
// // //   try {
// // //     const [hours, minutes] = time.split(':').map(Number);
// // //     const ampm = hours >= 12 ? 'PM' : 'AM';
    
// // //     let displayHours = hours % 12;
// // //     displayHours = displayHours ? displayHours : 12;
    
// // //     return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
// // //   } catch (error) {
// // //     console.error('Error formatting time:', error);
// // //     return 'N.A';
// // //   }
// // // }

// // // /**
// // //  * Convert MySQL DATE to DD-MM-YYYY format
// // //  * @param {string} date - Date from MySQL (YYYY-MM-DD)
// // //  * @returns {string} - Formatted date (DD-MM-YYYY)
// // //  */
// // // function formatDate(date) {
// // //   if (!date) return 'N.A';
  
// // //   try {
// // //     const d = new Date(date);
// // //     const day = String(d.getDate()).padStart(2, '0');
// // //     const month = String(d.getMonth() + 1).padStart(2, '0');
// // //     const year = d.getFullYear();
    
// // //     return `${day}-${month}-${year}`;
// // //   } catch (error) {
// // //     console.error('Error formatting date:', error);
// // //     return 'N.A';
// // //   }
// // // }

// // // /**
// // //  * Convert database student data to hall ticket format
// // //  * @param {object} dbStudent - Student data from database
// // //  * @returns {object} - Formatted student data for hall ticket
// // //  */
// // // function convertDBDataToHallTicketFormat(dbStudent) {
// // //   return {
// // //     // From database - direct mapping
// // //     student_id: dbStudent.student_id,
// // //     fullname: dbStudent.fullname || 'N.A',
// // //     batchNo: dbStudent.batchNo || 'N.A',
// // //     center_name: dbStudent.center_name || 'N.A',
// // //     center_address: dbStudent.center_address || 'N.A',
// // //     subject_name: dbStudent.subject_name || 'N.A',
    
// // //     // From database - with conversion
// // //     batchdate: formatDate(dbStudent.batchdate),
// // //     reporting_time: formatTimeToAMPM(dbStudent.reporting_time),
// // //     start_time: formatTimeToAMPM(dbStudent.start_time),
// // //     end_time: formatTimeToAMPM(dbStudent.end_time),
// // //     gate_closure_time: calculateGateClosureTime(dbStudent.reporting_time),
// // //     disability: dbStudent.disability === 1 ? 'Yes' : 'No',
    
// // //     // Missing fields - set as N.A
// // //     newname: 'N.A',
// // //     APPLICATION_NUMBER: dbStudent.student_id, // Use student_id as fallback
// // //     disability_type: 'N.A',
    
// // //     // Images - already base64 in database
// // //     photoBase64: dbStudent.base64 || '',
// // //     signBase64: dbStudent.sign_base64 || '',
    
// // //     // Department ID for logo
// // //     departmentId: dbStudent.departmentId
// // //   };
// // // }

// // // /**
// // //  * Fetch department logo from database
// // //  */
// // // async function getDepartmentLogo(departmentId) {
// // //   try {
// // //     if (!departmentId) {
// // //       console.log('⚠ No departmentId provided');
// // //       return '';
// // //     }

// // //     console.log('🔍 Fetching logo for departmentId:', departmentId);

// // //     const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
// // //     const [rows] = await db.execute(query, [parseInt(departmentId)]);

// // //     console.log('📊 Query executed, rows returned:', rows.length);

// // //     if (rows.length > 0 && rows[0].logo) {
// // //       let logoData = rows[0].logo;
      
// // //       console.log('✓ Logo found, length:', logoData.length);
      
// // //       // Add data:image prefix if missing
// // //       if (!logoData.startsWith('data:image')) {
// // //         console.log('⚙️ Adding data:image prefix');
        
// // //         if (logoData.startsWith('/9j/')) {
// // //           logoData = `data:image/jpeg;base64,${logoData}`;
// // //         } else if (logoData.startsWith('iVBORw0KG')) {
// // //           logoData = `data:image/png;base64,${logoData}`;
// // //         } else if (logoData.startsWith('R0lGOD')) {
// // //           logoData = `data:image/gif;base64,${logoData}`;
// // //         } else {
// // //           logoData = `data:image/jpeg;base64,${logoData}`;
// // //         }
        
// // //         console.log('✓ Prefix added');
// // //       }
      
// // //       console.log('✅ RETURNING LOGO TO PDF GENERATOR');
// // //       return logoData;
// // //     } else {
// // //       console.log('⚠ No logo found for departmentId:', departmentId);
// // //       return '';
// // //     }
// // //   } catch (error) {
// // //     console.error('❌ Error fetching logo:', error.message);
// // //     return '';
// // //   }
// // // }

// // // /**
// // //  * Get image as base64 from file system
// // //  */
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

// // // // ========== CONTROLLER OBJECT ==========

// // // const hallticketDepartmentController = {
  
// // //   // ========== EXISTING FUNCTION ==========
  
// // //   getDepartmentsForHallTickets: async (req, res) => {
// // //     try {
// // //       const query = `
// // //         SELECT 
// // //           departmentId,
// // //           departmentName,
// // //           examType,
// // //           departmentStatus
// // //         FROM departmentdb 
// // //         ORDER BY departmentName ASC
// // //       `;

// // //       const [departments] = await db.execute(query);

// // //       if (departments.length === 0) {
// // //         return res.status(404).json({
// // //           success: false,
// // //           message: 'No active departments found'
// // //         });
// // //       }

// // //       const validDepartments = departments.filter(dept => dept.examType);
// // //       const invalidDepartments = departments.filter(dept => !dept.examType);

// // //       if (invalidDepartments.length > 0) {
// // //         console.warn(`Found ${invalidDepartments.length} departments without exam type:`, 
// // //           invalidDepartments.map(d => d.departmentName));
// // //       }

// // //       res.status(200).json({
// // //         success: true,
// // //         message: 'Departments fetched successfully',
// // //         data: validDepartments,
// // //         totalDepartments: departments.length,
// // //         validDepartments: validDepartments.length,
// // //         departmentsWithoutExamType: invalidDepartments.length
// // //       });

// // //     } catch (error) {
// // //       console.error('Error fetching departments for hall tickets:', error);
// // //       res.status(500).json({
// // //         success: false,
// // //         message: 'Internal server error while fetching departments',
// // //         error: error.message
// // //       });
// // //     }
// // //   },

// // //   // ========== NEW FUNCTIONS FOR DATABASE-BASED GENERATION ==========

// // //   /**
// // //    * Get all exam centers for a specific department from students table
// // //    */
// // //   getCentersForDB: async (req, res) => {
// // //     try {
// // //       const { departmentId } = req.query;

// // //       if (!departmentId) {
// // //         return res.status(400).json({
// // //           success: false,
// // //           message: 'Department ID is required'
// // //         });
// // //       }

// // //       const query = `
// // //         SELECT DISTINCT 
// // //           e.center,
// // //           e.center_name,
// // //           e.center_address
// // //         FROM students s
// // //         INNER JOIN examcenterdb e ON s.center = e.center
// // //         WHERE s.departmentId = ?
// // //         ORDER BY e.center_name ASC
// // //       `;

// // //       const [centers] = await db.execute(query, [parseInt(departmentId)]);

// // //       res.status(200).json({
// // //         success: true,
// // //         message: 'Centers fetched successfully',
// // //         data: centers,
// // //         totalCenters: centers.length
// // //       });

// // //     } catch (error) {
// // //       console.error('Error fetching centers:', error);
// // //       res.status(500).json({
// // //         success: false,
// // //         message: 'Internal server error while fetching centers',
// // //         error: error.message
// // //       });
// // //     }
// // //   },

// // //   /**
// // //    * Get all batches for a specific department from students table
// // //    */
// // //   getBatchesForDB: async (req, res) => {
// // //     try {
// // //       const { departmentId } = req.query;

// // //       if (!departmentId) {
// // //         return res.status(400).json({
// // //           success: false,
// // //           message: 'Department ID is required'
// // //         });
// // //       }

// // //       const query = `
// // //         SELECT DISTINCT 
// // //           batchNo,
// // //           batchdate
// // //         FROM students
// // //         WHERE departmentId = ?
// // //           AND batchNo IS NOT NULL
// // //           AND batchdate IS NOT NULL
// // //         ORDER BY batchdate DESC, batchNo ASC
// // //       `;

// // //       const [batches] = await db.execute(query, [parseInt(departmentId)]);

// // //       res.status(200).json({
// // //         success: true,
// // //         message: 'Batches fetched successfully',
// // //         data: batches,
// // //         totalBatches: batches.length
// // //       });

// // //     } catch (error) {
// // //       console.error('Error fetching batches:', error);
// // //       res.status(500).json({
// // //         success: false,
// // //         message: 'Internal server error while fetching batches',
// // //         error: error.message
// // //       });
// // //     }
// // //   },

// // //   /**
// // //    * Get students by filters (departmentId is mandatory)
// // //    * ✅ FIXED: Added examType filter to prevent duplicates
// // //    */
// // //   getStudentsByFilters: async (req, res) => {
// // //     try {
// // //       const { departmentId, center, batchNo, searchTerm } = req.query;

// // //       // Department ID is mandatory
// // //       if (!departmentId) {
// // //         return res.status(400).json({
// // //           success: false,
// // //           message: 'Department ID is required'
// // //         });
// // //       }

// // //       let query = `
// // //         SELECT 
// // //           s.student_id,
// // //           s.fullname,
// // //           s.batchNo,
// // //           s.batchdate,
// // //           s.reporting_time,
// // //           s.start_time,
// // //           s.end_time,
// // //           s.disability,
// // //           s.departmentId,
// // //           s.base64,
// // //           s.sign_base64,
// // //           s.center as centerCode,
// // //           e.center_name,
// // //           e.center_address,
// // //           sub.subject_name
// // //         FROM students s
// // //         LEFT JOIN examcenterdb e ON s.center = e.center
// // //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = 'SKILL'
// // //         WHERE s.departmentId = ?
// // //       `;

// // //       const params = [parseInt(departmentId)];

// // //       if (center && center !== 'all') {
// // //         query += ' AND s.center = ?';
// // //         params.push(parseInt(center));
// // //       }

// // //       if (batchNo && batchNo !== 'all') {
// // //         query += ' AND s.batchNo = ?';
// // //         params.push(parseInt(batchNo));
// // //       }

// // //       if (searchTerm) {
// // //         query += ' AND (s.fullname LIKE ? OR s.student_id LIKE ?)';
// // //         params.push(`%${searchTerm}%`, `%${searchTerm}%`);
// // //       }

// // //       query += ' ORDER BY s.fullname ASC';

// // //       console.log('📊 Executing query with params:', params);
// // //       const [students] = await db.execute(query, params);
// // //       console.log(`✓ Query returned ${students.length} students`);

// // //       // Convert to hall ticket format
// // //       const formattedStudents = students.map(student => ({
// // //         ...convertDBDataToHallTicketFormat(student),
// // //         centerCode: student.centerCode,
// // //         examType: 'SKILL'
// // //       }));

// // //       res.status(200).json({
// // //         success: true,
// // //         message: 'Students fetched successfully',
// // //         data: formattedStudents,
// // //         totalStudents: formattedStudents.length
// // //       });

// // //     } catch (error) {
// // //       console.error('Error fetching students:', error);
// // //       res.status(500).json({
// // //         success: false,
// // //         message: 'Internal server error while fetching students',
// // //         error: error.message
// // //       });
// // //     }
// // //   },

// // //   /**
// // //    * Download single hall ticket from database
// // //    * ✅ FIXED: Added examType filter to prevent duplicates
// // //    */
// // //   downloadSingleHallTicketFromDB: async (req, res) => {
// // //     let browser = null;

// // //     try {
// // //       const { student_id } = req.params;
// // //       const { departmentId } = req.query;

// // //       console.log('=== DB PDF GENERATION START ===');
// // //       console.log('Student ID:', student_id);
// // //       console.log('Department ID:', departmentId);

// // //       // Query student data with JOINs
// // //       let query = `
// // //         SELECT 
// // //           s.student_id,
// // //           s.fullname,
// // //           s.batchNo,
// // //           s.batchdate,
// // //           s.reporting_time,
// // //           s.start_time,
// // //           s.end_time,
// // //           s.disability,
// // //           s.departmentId,
// // //           s.base64,
// // //           s.sign_base64,
// // //           e.center_name,
// // //           e.center_address,
// // //           sub.subject_name
// // //         FROM students s
// // //         LEFT JOIN examcenterdb e ON s.center = e.center
// // //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = 'SKILL'
// // //         WHERE s.student_id = ?
// // //       `;

// // //       const params = [student_id];

// // //       // Optional: Filter by departmentId if provided
// // //       if (departmentId) {
// // //         query += ' AND s.departmentId = ?';
// // //         params.push(parseInt(departmentId));
// // //       }

// // //       const [students] = await db.execute(query, params);

// // //       if (students.length === 0) {
// // //         return res.status(404).json({ 
// // //           error: 'Student not found with this ID' 
// // //         });
// // //       }

// // //       if (students.length > 1) {
// // //         console.warn(`⚠ Warning: Multiple records found for student_id ${student_id}. Using first record.`);
// // //       }

// // //       const dbStudent = students[0];
// // //       console.log('✓ Student found:', dbStudent.fullname);

// // //       // Convert to hall ticket format
// // //       const student = convertDBDataToHallTicketFormat(dbStudent);

// // //       // Fetch department logo
// // //       const departmentLogoBase64 = await getDepartmentLogo(departmentId || dbStudent.departmentId);
// // //       console.log('Step 1: Logo fetched ✓');

// // //       // Prepare student data with images
// // //       const studentWithImages = {
// // //         ...student,
// // //         leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // //         logoBase64: departmentLogoBase64,
// // //         ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // //         photoBase64: student.photoBase64,
// // //         signBase64: student.signBase64,
// // //         townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // //         qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // //       };
// // //       console.log('Step 2: Images prepared ✓');

// // //       // Read EJS template
// // //       const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // //       const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
// // //       console.log('Step 3: Template loaded ✓');

// // //       // Render EJS
// // //       const html = ejs.render(htmlTemplate, studentWithImages);
// // //       console.log('Step 4: HTML rendered ✓');

// // //       // Launch Puppeteer
// // //       console.log('🚀 Launching Puppeteer...');
// // //       browser = await puppeteer.launch({
// // //         headless: 'new',
// // //         args: [
// // //           '--no-sandbox',
// // //           '--disable-setuid-sandbox',
// // //           '--disable-dev-shm-usage',
// // //           '--disable-accelerated-2d-canvas',
// // //           '--disable-gpu'
// // //         ]
// // //       });
// // //       console.log('Step 5: Puppeteer launched ✓');

// // //       const page = await browser.newPage();
// // //       await page.setContent(html, { 
// // //         waitUntil: 'networkidle0',
// // //         timeout: 60000 
// // //       });
// // //       console.log('Step 6: Content set ✓');

// // //       await new Promise(resolve => setTimeout(resolve, 1000));

// // //       console.log('📄 Generating PDF...');
// // //       const pdfBuffer = await page.pdf({
// // //         format: 'A4',
// // //         printBackground: true,
// // //         preferCSSPageSize: false,
// // //         margin: { 
// // //           top: '0mm', 
// // //           right: '0mm', 
// // //           bottom: '0mm', 
// // //           left: '0mm' 
// // //         }
// // //       });

// // //       await browser.close();
// // //       console.log('✅ PDF generated successfully');

// // //       res.setHeader('Content-Type', 'application/pdf');
// // //       res.setHeader('Content-Disposition', `attachment; filename=hallticket_${student_id}.pdf`);
// // //       res.setHeader('Content-Length', pdfBuffer.length);

// // //       res.end(pdfBuffer, 'binary', () => {
// // //         console.log('📤 PDF sent to client');
// // //       });

// // //     } catch (error) {
// // //       console.error('❌ DB PDF generation error:', error);
// // //       if (browser) {
// // //         await browser.close();
// // //       }

// // //       if (!res.headersSent) {
// // //         res.status(500).json({ 
// // //           error: 'Failed to generate hall ticket PDF', 
// // //           details: error.message 
// // //         });
// // //       }
// // //     }
// // //   },

// // //   /**
// // //    * Download all hall tickets from database (departmentId is mandatory)
// // //    * ✅ FIXED: Added examType filter to prevent duplicates
// // //    */
// // //   downloadAllHallTicketsFromDB: async (req, res) => {
// // //     let browser = null;

// // //     try {
// // //       const { departmentId, center, batchNo } = req.query;

// // //       // Department ID is mandatory
// // //       if (!departmentId) {
// // //         return res.status(400).json({
// // //           success: false,
// // //           error: 'Department ID is required'
// // //         });
// // //       }

// // //       console.log('=== BULK DB PDF GENERATION START ===');
// // //       console.log('Department ID:', departmentId);
// // //       console.log('Center:', center);
// // //       console.log('Batch No:', batchNo);

// // //       // Query students with filters (departmentId is mandatory)
// // //       let query = `
// // //         SELECT 
// // //           s.student_id,
// // //           s.fullname,
// // //           s.batchNo,
// // //           s.batchdate,
// // //           s.reporting_time,
// // //           s.start_time,
// // //           s.end_time,
// // //           s.disability,
// // //           s.departmentId,
// // //           s.base64,
// // //           s.sign_base64,
// // //           e.center_name,
// // //           e.center_address,
// // //           sub.subject_name
// // //         FROM students s
// // //         LEFT JOIN examcenterdb e ON s.center = e.center
// // //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = 'SKILL'
// // //         WHERE s.departmentId = ?
// // //       `;

// // //       const params = [parseInt(departmentId)];

// // //       if (center && center !== 'all') {
// // //         query += ' AND s.center = ?';
// // //         params.push(parseInt(center));
// // //       }

// // //       if (batchNo && batchNo !== 'all') {
// // //         query += ' AND s.batchNo = ?';
// // //         params.push(parseInt(batchNo));
// // //       }

// // //       query += ' ORDER BY s.fullname ASC';

// // //       console.log('📊 Executing bulk query with params:', params);
// // //       const [students] = await db.execute(query, params);

// // //       if (students.length === 0) {
// // //         return res.status(404).json({ 
// // //           error: 'No students found with the specified filters' 
// // //         });
// // //       }

// // //       console.log(`Total students: ${students.length}`);

// // //       // Fetch department logo once
// // //       const departmentLogoBase64 = await getDepartmentLogo(departmentId);

// // //       // Set response headers
// // //       res.setHeader('Content-Type', 'application/zip');
// // //       res.setHeader('Content-Disposition', 'attachment; filename=all_halltickets_db.zip');

// // //       // Create archive
// // //       const archive = archiver('zip', { zlib: { level: 6 } });

// // //       archive.on('error', (err) => {
// // //         console.error('Archive error:', err);
// // //         if (!res.headersSent) {
// // //           res.status(500).json({ error: 'Failed to create ZIP archive' });
// // //         }
// // //       });

// // //       archive.pipe(res);

// // //       // Launch browser
// // //       browser = await puppeteer.launch({
// // //         headless: 'new',
// // //         args: [
// // //           '--no-sandbox',
// // //           '--disable-setuid-sandbox',
// // //           '--disable-dev-shm-usage',
// // //           '--disable-accelerated-2d-canvas',
// // //           '--disable-gpu'
// // //         ]
// // //       });

// // //       const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// // //       const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

// // //       let successCount = 0;
// // //       let errorCount = 0;

// // //       // Process each student
// // //       for (let i = 0; i < students.length; i++) {
// // //         const dbStudent = students[i];

// // //         try {
// // //           console.log(`Processing ${i + 1}/${students.length}: ${dbStudent.student_id}`);

// // //           const student = convertDBDataToHallTicketFormat(dbStudent);

// // //           const studentWithImages = {
// // //             ...student,
// // //             leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
// // //             logoBase64: departmentLogoBase64,
// // //             ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// // //             photoBase64: student.photoBase64,
// // //             signBase64: student.signBase64,
// // //             townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// // //             qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// // //           };

// // //           const html = ejs.render(htmlTemplate, studentWithImages);

// // //           const page = await browser.newPage();
// // //           await page.setContent(html, { 
// // //             waitUntil: 'domcontentloaded',
// // //             timeout: 30000 
// // //           });

// // //           await new Promise(resolve => setTimeout(resolve, 300));

// // //           const pdfBuffer = await page.pdf({
// // //             format: 'A4',
// // //             printBackground: true,
// // //             preferCSSPageSize: false,
// // //             margin: { 
// // //               top: '0mm', 
// // //               right: '0mm', 
// // //               bottom: '0mm', 
// // //               left: '0mm' 
// // //             }
// // //           });

// // //           await page.close();

// // //           const freshBuffer = Buffer.from(pdfBuffer);
// // //           const filename = `hallticket_${dbStudent.student_id}.pdf`;
// // //           archive.append(freshBuffer, { name: filename });

// // //           successCount++;
// // //           console.log(`✓ Added to ZIP: ${filename} (${successCount}/${students.length})`);

// // //         } catch (error) {
// // //           errorCount++;
// // //           console.error(`✗ Error generating PDF for ${dbStudent.student_id}:`, error.message);

// // //           const errorFilename = `ERROR_${dbStudent.student_id}.txt`;
// // //           archive.append(
// // //             `Failed to generate hall ticket for ${dbStudent.student_id}\nError: ${error.message}`, 
// // //             { name: errorFilename }
// // //           );
// // //         }

// // //         if (i < students.length - 1) {
// // //           await new Promise(resolve => setTimeout(resolve, 200));
// // //         }
// // //       }

// // //       await browser.close();
// // //       browser = null;

// // //       archive.finalize();

// // //       archive.on('end', () => {
// // //         console.log(`📤 ZIP file sent: ${successCount} successful, ${errorCount} failed`);
// // //       });

// // //     } catch (error) {
// // //       console.error('Bulk DB PDF generation error:', error);
// // //       if (browser) {
// // //         await browser.close();
// // //       }

// // //       if (!res.headersSent) {
// // //         res.status(500).json({ 
// // //           error: 'Failed to generate hall tickets', 
// // //           details: error.message 
// // //         });
// // //       }
// // //     }
// // //   },

// // //   /**
// // //    * Check database data status for a specific department
// // //    */
// // //   checkDBDataStatus: async (req, res) => {
// // //     try {
// // //       const { departmentId } = req.query;

// // //       if (!departmentId) {
// // //         return res.status(400).json({
// // //           success: false,
// // //           message: 'Department ID is required'
// // //         });
// // //       }

// // //       const query = `
// // //         SELECT COUNT(*) as totalStudents
// // //         FROM students
// // //         WHERE departmentId = ?
// // //       `;

// // //       const [result] = await db.execute(query, [parseInt(departmentId)]);

// // //       res.json({
// // //         success: true,
// // //         status: 'data_available',
// // //         message: 'Database data is available',
// // //         totalStudents: result[0].totalStudents,
// // //         departmentId: parseInt(departmentId)
// // //       });

// // //     } catch (error) {
// // //       console.error('Check DB data status error:', error);
// // //       res.status(500).json({ 
// // //         success: false,
// // //         error: 'Failed to check data status' 
// // //       });
// // //     }
// // //   }

// // // };

// // // module.exports = hallticketDepartmentController;



// // // controllers/hallticketDepartment_controller.js
// // const db = require('../config/db1');
// // const puppeteer = require('puppeteer');
// // const fs = require('fs');
// // const path = require('path');
// // const ejs = require('ejs');

// // // ========== HELPER FUNCTIONS ==========

// // function calculateGateClosureTime(reportingTime) {
// //   if (!reportingTime) return 'N.A';
  
// //   try {
// //     const [hours, minutes] = reportingTime.split(':').map(Number);
// //     let totalMinutes = hours * 60 + minutes + 30;
    
// //     let newHours = Math.floor(totalMinutes / 60);
// //     let newMinutes = totalMinutes % 60;
    
// //     const ampm = newHours >= 12 ? 'PM' : 'AM';
// //     newHours = newHours % 12;
// //     newHours = newHours ? newHours : 12;
    
// //     return `${newHours}:${String(newMinutes).padStart(2, '0')} ${ampm}`;
// //   } catch (error) {
// //     console.error('Error calculating gate closure time:', error);
// //     return 'N.A';
// //   }
// // }

// // function formatTimeToAMPM(time) {
// //   if (!time) return 'N.A';
  
// //   try {
// //     const [hours, minutes] = time.split(':').map(Number);
// //     const ampm = hours >= 12 ? 'PM' : 'AM';
    
// //     let displayHours = hours % 12;
// //     displayHours = displayHours ? displayHours : 12;
    
// //     return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
// //   } catch (error) {
// //     console.error('Error formatting time:', error);
// //     return 'N.A';
// //   }
// // }

// // function formatDate(date) {
// //   if (!date) return 'N.A';
  
// //   try {
// //     const d = new Date(date);
// //     const day = String(d.getDate()).padStart(2, '0');
// //     const month = String(d.getMonth() + 1).padStart(2, '0');
// //     const year = d.getFullYear();
    
// //     return `${day}-${month}-${year}`;
// //   } catch (error) {
// //     console.error('Error formatting date:', error);
// //     return 'N.A';
// //   }
// // }

// // function convertDBDataToHallTicketFormat(dbStudent) {
// //   return {
// //     student_id: dbStudent.student_id,
// //     fullname: dbStudent.fullname || 'N.A',
// //     batchNo: dbStudent.batchNo || 'N.A',
// //     center_name: dbStudent.center_name || 'N.A',
// //     center_address: dbStudent.center_address || 'N.A',
// //     subject_name: dbStudent.subject_name || 'N.A',
// //     batchdate: formatDate(dbStudent.batchdate),
// //     reporting_time: formatTimeToAMPM(dbStudent.reporting_time),
// //     start_time: formatTimeToAMPM(dbStudent.start_time),
// //     end_time: formatTimeToAMPM(dbStudent.end_time),
// //     gate_closure_time: calculateGateClosureTime(dbStudent.reporting_time),
// //     disability: dbStudent.disability === 1 ? 'Yes' : 'No',
// //     newname: 'N.A',
// //     APPLICATION_NUMBER: dbStudent.student_id,
// //     disability_type: 'N.A',
// //     photoBase64: dbStudent.base64 || '',
// //     signBase64: dbStudent.sign_base64 || '',
// //     departmentId: dbStudent.departmentId
// //   };
// // }

// // async function getDepartmentLogo(departmentId) {
// //   try {
// //     if (!departmentId) {
// //       console.log('⚠ No departmentId provided');
// //       return '';
// //     }

// //     console.log('🔍 Fetching logo for departmentId:', departmentId);

// //     const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
// //     const [rows] = await db.execute(query, [parseInt(departmentId)]);

// //     console.log('📊 Query executed, rows returned:', rows.length);

// //     if (rows.length > 0 && rows[0].logo) {
// //       let logoData = rows[0].logo;
      
// //       console.log('✓ Logo found, length:', logoData.length);
      
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

// // // ========== FOLDER MANAGEMENT FUNCTIONS ==========

// // function createHallTicketFolder(departmentId) {
// //   const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
// //   const folderName = `halltickets_db_dept${departmentId}_${timestamp}`;
// //   const folderPath = path.join(__dirname, '../public/generated_halltickets', folderName);
  
// //   const baseDir = path.join(__dirname, '../public/generated_halltickets');
// //   if (!fs.existsSync(baseDir)) {
// //     fs.mkdirSync(baseDir, { recursive: true });
// //     console.log('📁 Created base directory: generated_halltickets');
// //   }
  
// //   fs.mkdirSync(folderPath, { recursive: true });
// //   console.log(`📁 Created folder: ${folderName}`);
  
// //   return { folderPath, folderName };
// // }

// // function cleanupOldFolders() {
// //   try {
// //     const baseFolder = path.join(__dirname, '../public/generated_halltickets');
// //     if (!fs.existsSync(baseFolder)) return;
    
// //     const folders = fs.readdirSync(baseFolder);
// //     const now = Date.now();
// //     const twentyFourHours = 24 * 60 * 60 * 1000;
    
// //     folders.forEach(folder => {
// //       const folderPath = path.join(baseFolder, folder);
// //       const stats = fs.statSync(folderPath);
      
// //       if (now - stats.mtimeMs > twentyFourHours) {
// //         fs.rmSync(folderPath, { recursive: true, force: true });
// //         console.log(`🗑️ Cleaned up old folder: ${folder}`);
// //       }
// //     });
// //   } catch (error) {
// //     console.error('Error cleaning up old folders:', error);
// //   }
// // }

// // // ========== CONTROLLER OBJECT ==========

// // const hallticketDepartmentController = {
  
// //   getDepartmentsForHallTickets: async (req, res) => {
// //     try {
// //       const query = `
// //         SELECT 
// //           departmentId,
// //           departmentName,
// //           examType,
// //           departmentStatus
// //         FROM departmentdb 
// //         ORDER BY departmentName ASC
// //       `;

// //       const [departments] = await db.execute(query);

// //       if (departments.length === 0) {
// //         return res.status(404).json({
// //           success: false,
// //           message: 'No active departments found'
// //         });
// //       }

// //       const validDepartments = departments.filter(dept => dept.examType);
// //       const invalidDepartments = departments.filter(dept => !dept.examType);

// //       if (invalidDepartments.length > 0) {
// //         console.warn(`Found ${invalidDepartments.length} departments without exam type:`, 
// //           invalidDepartments.map(d => d.departmentName));
// //       }

// //       res.status(200).json({
// //         success: true,
// //         message: 'Departments fetched successfully',
// //         data: validDepartments,
// //         totalDepartments: departments.length,
// //         validDepartments: validDepartments.length,
// //         departmentsWithoutExamType: invalidDepartments.length
// //       });

// //     } catch (error) {
// //       console.error('Error fetching departments for hall tickets:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Internal server error while fetching departments',
// //         error: error.message
// //       });
// //     }
// //   },

// //   getCentersForDB: async (req, res) => {
// //     try {
// //       const { departmentId } = req.query;

// //       if (!departmentId) {
// //         return res.status(400).json({
// //           success: false,
// //           message: 'Department ID is required'
// //         });
// //       }

// //       const query = `
// //         SELECT DISTINCT 
// //           e.center,
// //           e.center_name,
// //           e.center_address
// //         FROM students s
// //         INNER JOIN examcenterdb e ON s.center = e.center
// //         WHERE s.departmentId = ?
// //         ORDER BY e.center_name ASC
// //       `;

// //       const [centers] = await db.execute(query, [parseInt(departmentId)]);

// //       res.status(200).json({
// //         success: true,
// //         message: 'Centers fetched successfully',
// //         data: centers,
// //         totalCenters: centers.length
// //       });

// //     } catch (error) {
// //       console.error('Error fetching centers:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Internal server error while fetching centers',
// //         error: error.message
// //       });
// //     }
// //   },

// //   getBatchesForDB: async (req, res) => {
// //     try {
// //       const { departmentId } = req.query;

// //       if (!departmentId) {
// //         return res.status(400).json({
// //           success: false,
// //           message: 'Department ID is required'
// //         });
// //       }

// //       const query = `
// //         SELECT DISTINCT 
// //           batchNo,
// //           batchdate
// //         FROM students
// //         WHERE departmentId = ?
// //           AND batchNo IS NOT NULL
// //           AND batchdate IS NOT NULL
// //         ORDER BY batchdate DESC, batchNo ASC
// //       `;

// //       const [batches] = await db.execute(query, [parseInt(departmentId)]);

// //       res.status(200).json({
// //         success: true,
// //         message: 'Batches fetched successfully',
// //         data: batches,
// //         totalBatches: batches.length
// //       });

// //     } catch (error) {
// //       console.error('Error fetching batches:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Internal server error while fetching batches',
// //         error: error.message
// //       });
// //     }
// //   },

// //   getStudentsByFilters: async (req, res) => {
// //     try {
// //       const { departmentId, center, batchNo, searchTerm } = req.query;

// //       if (!departmentId) {
// //         return res.status(400).json({
// //           success: false,
// //           message: 'Department ID is required'
// //         });
// //       }

// //       let query = `
// //         SELECT 
// //           s.student_id,
// //           s.fullname,
// //           s.batchNo,
// //           s.batchdate,
// //           s.reporting_time,
// //           s.start_time,
// //           s.end_time,
// //           s.disability,
// //           s.departmentId,
// //           s.base64,
// //           s.sign_base64,
// //           s.center as centerCode,
// //           e.center_name,
// //           e.center_address,
// //           sub.subject_name
// //         FROM students s
// //         LEFT JOIN examcenterdb e ON s.center = e.center
// //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = 'SKILL'
// //         WHERE s.departmentId = ?
// //       `;

// //       const params = [parseInt(departmentId)];

// //       if (center && center !== 'all') {
// //         query += ' AND s.center = ?';
// //         params.push(parseInt(center));
// //       }

// //       if (batchNo && batchNo !== 'all') {
// //         query += ' AND s.batchNo = ?';
// //         params.push(parseInt(batchNo));
// //       }

// //       if (searchTerm) {
// //         query += ' AND (s.fullname LIKE ? OR s.student_id LIKE ?)';
// //         params.push(`%${searchTerm}%`, `%${searchTerm}%`);
// //       }

// //       query += ' ORDER BY s.fullname ASC';

// //       console.log('📊 Executing query with params:', params);
// //       const [students] = await db.execute(query, params);
// //       console.log(`✓ Query returned ${students.length} students`);

// //       const formattedStudents = students.map(student => ({
// //         ...convertDBDataToHallTicketFormat(student),
// //         centerCode: student.centerCode,
// //         examType: 'SKILL'
// //       }));

// //       res.status(200).json({
// //         success: true,
// //         message: 'Students fetched successfully',
// //         data: formattedStudents,
// //         totalStudents: formattedStudents.length
// //       });

// //     } catch (error) {
// //       console.error('Error fetching students:', error);
// //       res.status(500).json({
// //         success: false,
// //         message: 'Internal server error while fetching students',
// //         error: error.message
// //       });
// //     }
// //   },

// //   downloadSingleHallTicketFromDB: async (req, res) => {
// //     let browser = null;

// //     try {
// //       const { student_id } = req.params;
// //       const { departmentId } = req.query;

// //       console.log('=== DB PDF GENERATION START ===');
// //       console.log('Student ID:', student_id);
// //       console.log('Department ID:', departmentId);

// //       let query = `
// //         SELECT 
// //           s.student_id,
// //           s.fullname,
// //           s.batchNo,
// //           s.batchdate,
// //           s.reporting_time,
// //           s.start_time,
// //           s.end_time,
// //           s.disability,
// //           s.departmentId,
// //           s.base64,
// //           s.sign_base64,
// //           e.center_name,
// //           e.center_address,
// //           sub.subject_name
// //         FROM students s
// //         LEFT JOIN examcenterdb e ON s.center = e.center
// //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = 'SKILL'
// //         WHERE s.student_id = ?
// //       `;

// //       const params = [student_id];

// //       if (departmentId) {
// //         query += ' AND s.departmentId = ?';
// //         params.push(parseInt(departmentId));
// //       }

// //       const [students] = await db.execute(query, params);

// //       if (students.length === 0) {
// //         return res.status(404).json({ 
// //           error: 'Student not found with this ID' 
// //         });
// //       }

// //       if (students.length > 1) {
// //         console.warn(`⚠ Warning: Multiple records found for student_id ${student_id}. Using first record.`);
// //       }

// //       const dbStudent = students[0];
// //       console.log('✓ Student found:', dbStudent.fullname);

// //       const student = convertDBDataToHallTicketFormat(dbStudent);

// //       const departmentLogoBase64 = await getDepartmentLogo(departmentId || dbStudent.departmentId);
// //       console.log('Step 1: Logo fetched ✓');

// //       const studentWithImages = {
// //         ...student,
// //         leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
// //         logoBase64: departmentLogoBase64,
// //         ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// //         photoBase64: student.photoBase64,
// //         signBase64: student.signBase64,
// //         townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// //         qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// //       };
// //       console.log('Step 2: Images prepared ✓');

// //       const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// //       const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
// //       console.log('Step 3: Template loaded ✓');

// //       const html = ejs.render(htmlTemplate, studentWithImages);
// //       console.log('Step 4: HTML rendered ✓');

// //       console.log('🚀 Launching Puppeteer...');
// //       browser = await puppeteer.launch({
// //         headless: 'new',
// //         args: [
// //           '--no-sandbox',
// //           '--disable-setuid-sandbox',
// //           '--disable-dev-shm-usage',
// //           '--disable-accelerated-2d-canvas',
// //           '--disable-gpu'
// //         ]
// //       });
// //       console.log('Step 5: Puppeteer launched ✓');

// //       const page = await browser.newPage();
// //       await page.setContent(html, { 
// //         waitUntil: 'networkidle0',
// //         timeout: 60000 
// //       });
// //       console.log('Step 6: Content set ✓');

// //       await new Promise(resolve => setTimeout(resolve, 1000));

// //       console.log('📄 Generating PDF...');
// //       const pdfBuffer = await page.pdf({
// //         format: 'A4',
// //         printBackground: true,
// //         preferCSSPageSize: false,
// //         margin: { 
// //           top: '0mm', 
// //           right: '0mm', 
// //           bottom: '0mm', 
// //           left: '0mm' 
// //         }
// //       });

// //       await browser.close();
// //       console.log('✅ PDF generated successfully');

// //       res.setHeader('Content-Type', 'application/pdf');
// //       res.setHeader('Content-Disposition', `attachment; filename=hallticket_${student_id}.pdf`);
// //       res.setHeader('Content-Length', pdfBuffer.length);

// //       res.end(pdfBuffer, 'binary', () => {
// //         console.log('📤 PDF sent to client');
// //       });

// //     } catch (error) {
// //       console.error('❌ DB PDF generation error:', error);
// //       if (browser) {
// //         await browser.close();
// //       }

// //       if (!res.headersSent) {
// //         res.status(500).json({ 
// //           error: 'Failed to generate hall ticket PDF', 
// //           details: error.message 
// //         });
// //       }
// //     }
// //   },

// //   // ========== ✅ BULK DOWNLOAD - SAVE TO FOLDER ==========

// //   downloadAllHallTicketsFromDB: async (req, res) => {
// //     let browser = null;

// //     try {
// //       const { departmentId, center, batchNo } = req.query;

// //       if (!departmentId) {
// //         return res.status(400).json({
// //           success: false,
// //           error: 'Department ID is required'
// //         });
// //       }

// //       console.log('=== BULK DB FOLDER GENERATION START ===');
// //       console.log('Department ID:', departmentId);
// //       console.log('Center:', center);
// //       console.log('Batch No:', batchNo);

// //       cleanupOldFolders();

// //       const { folderPath, folderName } = createHallTicketFolder(departmentId);

// //       let query = `
// //         SELECT 
// //           s.student_id,
// //           s.fullname,
// //           s.batchNo,
// //           s.batchdate,
// //           s.reporting_time,
// //           s.start_time,
// //           s.end_time,
// //           s.disability,
// //           s.departmentId,
// //           s.base64,
// //           s.sign_base64,
// //           e.center_name,
// //           e.center_address,
// //           sub.subject_name
// //         FROM students s
// //         LEFT JOIN examcenterdb e ON s.center = e.center
// //         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = 'SKILL'
// //         WHERE s.departmentId = ?
// //       `;

// //       const params = [parseInt(departmentId)];

// //       if (center && center !== 'all') {
// //         query += ' AND s.center = ?';
// //         params.push(parseInt(center));
// //       }

// //       if (batchNo && batchNo !== 'all') {
// //         query += ' AND s.batchNo = ?';
// //         params.push(parseInt(batchNo));
// //       }

// //       query += ' ORDER BY s.fullname ASC';

// //       console.log('📊 Executing bulk query with params:', params);
// //       const [students] = await db.execute(query, params);

// //       if (students.length === 0) {
// //         return res.status(404).json({ 
// //           success: false,
// //           error: 'No students found with the specified filters' 
// //         });
// //       }

// //       console.log(`Total students: ${students.length}`);

// //       const departmentLogoBase64 = await getDepartmentLogo(departmentId);

// //       browser = await puppeteer.launch({
// //         headless: 'new',
// //         args: [
// //           '--no-sandbox',
// //           '--disable-setuid-sandbox',
// //           '--disable-dev-shm-usage',
// //           '--disable-accelerated-2d-canvas',
// //           '--disable-gpu'
// //         ]
// //       });

// //       const templatePath = path.join(__dirname, '../views/hallticket.ejs');
// //       const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

// //       let successCount = 0;
// //       let errorCount = 0;
// //       const generatedFiles = [];

// //       for (let i = 0; i < students.length; i++) {
// //         const dbStudent = students[i];

// //         try {
// //           console.log(`Processing ${i + 1}/${students.length}: ${dbStudent.student_id}`);

// //           const student = convertDBDataToHallTicketFormat(dbStudent);

// //           const studentWithImages = {
// //             ...student,
// //             leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
// //             logoBase64: departmentLogoBase64,
// //             ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
// //             photoBase64: student.photoBase64,
// //             signBase64: student.signBase64,
// //             townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
// //             qrCodeBase64: getImageAsBase64('qr-code-sh.png')
// //           };

// //           const html = ejs.render(htmlTemplate, studentWithImages);

// //           const page = await browser.newPage();
// //           await page.setContent(html, { 
// //             waitUntil: 'domcontentloaded',
// //             timeout: 30000 
// //           });

// //           await new Promise(resolve => setTimeout(resolve, 300));

// //           const pdfBuffer = await page.pdf({
// //             format: 'A4',
// //             printBackground: true,
// //             preferCSSPageSize: false,
// //             margin: { 
// //               top: '0mm', 
// //               right: '0mm', 
// //               bottom: '0mm', 
// //               left: '0mm' 
// //             }
// //           });

// //           await page.close();

// //           const filename = `hallticket_${dbStudent.student_id}.pdf`;
// //           const filePath = path.join(folderPath, filename);
// //           fs.writeFileSync(filePath, pdfBuffer);

// //           generatedFiles.push({
// //             student_id: dbStudent.student_id,
// //             fullname: dbStudent.fullname,
// //             filename: filename,
// //             downloadUrl: `/generated_halltickets/${folderName}/${filename}`
// //           });

// //           successCount++;
// //           console.log(`✓ Saved to folder: ${filename} (${successCount}/${students.length})`);

// //         } catch (error) {
// //           errorCount++;
// //           console.error(`✗ Error generating PDF for ${dbStudent.student_id}:`, error.message);
// //         }

// //         if (i < students.length - 1) {
// //           await new Promise(resolve => setTimeout(resolve, 200));
// //         }
// //       }

// //       await browser.close();
// //       browser = null;

// //       console.log(`✅ DB generation complete: ${successCount} successful, ${errorCount} failed`);

// //       res.json({
// //         success: true,
// //         message: `Generated ${successCount} hall tickets successfully`,
// //         folderName: folderName,
// //         folderPath: `/generated_halltickets/${folderName}`,
// //         totalFiles: successCount,
// //         files: generatedFiles,
// //         errors: errorCount
// //       });

// //     } catch (error) {
// //       console.error('Bulk DB folder generation error:', error);
// //       if (browser) {
// //         await browser.close();
// //       }

// //       if (!res.headersSent) {
// //         res.status(500).json({ 
// //           success: false,
// //           error: 'Failed to generate hall tickets', 
// //           details: error.message 
// //         });
// //       }
// //     }
// //   },

// //   checkDBDataStatus: async (req, res) => {
// //     try {
// //       const { departmentId } = req.query;

// //       if (!departmentId) {
// //         return res.status(400).json({
// //           success: false,
// //           message: 'Department ID is required'
// //         });
// //       }

// //       const query = `
// //         SELECT COUNT(*) as totalStudents
// //         FROM students
// //         WHERE departmentId = ?
// //       `;

// //       const [result] = await db.execute(query, [parseInt(departmentId)]);

// //       res.json({
// //         success: true,
// //         status: 'data_available',
// //         message: 'Database data is available',
// //         totalStudents: result[0].totalStudents,
// //         departmentId: parseInt(departmentId)
// //       });

// //     } catch (error) {
// //       console.error('Check DB data status error:', error);
// //       res.status(500).json({ 
// //         success: false,
// //         error: 'Failed to check data status' 
// //       });
// //     }
// //   }

// // };

// // module.exports = hallticketDepartmentController;



// // controllers/hallticketDepartment_controller.js
// const db = require('../config/db1');
// const puppeteer = require('puppeteer');
// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');
// const ejs = require('ejs');

// // ========== IMPORT GCC TBC GENERATION LOGIC ==========
// const { generateGccTbcHallTicketFromDB } = require('./superAdminController/HallticketsGeneration');

// // ========== HELPER FUNCTIONS ==========

// function calculateGateClosureTime(reportingTime) {
//   if (!reportingTime) return 'N.A';
  
//   try {
//     const [hours, minutes] = reportingTime.split(':').map(Number);
//     let totalMinutes = hours * 60 + minutes + 30;
    
//     let newHours = Math.floor(totalMinutes / 60);
//     let newMinutes = totalMinutes % 60;
    
//     const ampm = newHours >= 12 ? 'PM' : 'AM';
//     newHours = newHours % 12;
//     newHours = newHours ? newHours : 12;
    
//     return `${newHours}:${String(newMinutes).padStart(2, '0')} ${ampm}`;
//   } catch (error) {
//     console.error('Error calculating gate closure time:', error);
//     return 'N.A';
//   }
// }

// function formatTimeToAMPM(time) {
//   if (!time) return 'N.A';
  
//   try {
//     const [hours, minutes] = time.split(':').map(Number);
//     const ampm = hours >= 12 ? 'PM' : 'AM';
    
//     let displayHours = hours % 12;
//     displayHours = displayHours ? displayHours : 12;
    
//     return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
//   } catch (error) {
//     console.error('Error formatting time:', error);
//     return 'N.A';
//   }
// }

// function formatDate(date) {
//   if (!date) return 'N.A';
  
//   try {
//     const d = new Date(date);
//     const day = String(d.getDate()).padStart(2, '0');
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const year = d.getFullYear();
    
//     return `${day}-${month}-${year}`;
//   } catch (error) {
//     console.error('Error formatting date:', error);
//     return 'N.A';
//   }
// }

// function convertDBDataToHallTicketFormat(dbStudent) {
//   return {
//     student_id: dbStudent.student_id,
//     fullname: dbStudent.fullname || 'N.A',
//     batchNo: dbStudent.batchNo || 'N.A',
//     center_name: dbStudent.center_name || 'N.A',
//     center_address: dbStudent.center_address || 'N.A',
//     subject_name: dbStudent.subject_name || 'N.A',
//     batchdate: formatDate(dbStudent.batchdate),
//     reporting_time: formatTimeToAMPM(dbStudent.reporting_time),
//     start_time: formatTimeToAMPM(dbStudent.start_time),
//     end_time: formatTimeToAMPM(dbStudent.end_time),
//     gate_closure_time: calculateGateClosureTime(dbStudent.reporting_time),
//     disability: dbStudent.disability === 1 ? 'Yes' : 'No',
//     newname: 'N.A',
//     APPLICATION_NUMBER: dbStudent.student_id,
//     disability_type: 'N.A',
//     photoBase64: dbStudent.base64 || '',
//     signBase64: dbStudent.sign_base64 || '',
//     departmentId: dbStudent.departmentId
//   };
// }

// async function getDepartmentLogo(departmentId) {
//   try {
//     if (!departmentId) {
//       console.log('⚠ No departmentId provided');
//       return '';
//     }

//     console.log('🔍 Fetching logo for departmentId:', departmentId);

//     const query = 'SELECT logo FROM departmentdb WHERE departmentId = ?';
//     const [rows] = await db.execute(query, [parseInt(departmentId)]);

//     console.log('📊 Query executed, rows returned:', rows.length);

//     if (rows.length > 0 && rows[0].logo) {
//       let logoData = rows[0].logo;
      
//       console.log('✓ Logo found, length:', logoData.length);
      
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

// // ========== NEW: CHECK DEPARTMENT EXAM TYPE ==========
// async function getDepartmentExamType(departmentId) {
//   try {
//     if (!departmentId) return null;
    
//     const query = 'SELECT examType FROM departmentdb WHERE departmentId = ?';
//     const [rows] = await db.execute(query, [parseInt(departmentId)]);
    
//     if (rows.length > 0) {
//       return rows[0].examType; // Returns 'SKILL' or 'GCC'
//     }
//     return null;
//   } catch (error) {
//     console.error('Error fetching exam type:', error);
//     return null;
//   }
// }

// // ========== FOLDER MANAGEMENT FUNCTIONS ==========

// function createHallTicketFolder(departmentId, examType) {
//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
//   const folderName = `halltickets_${examType}_dept${departmentId}_${timestamp}`;
//   const folderPath = path.join(__dirname, '../public/generated_halltickets', folderName);
  
//   const baseDir = path.join(__dirname, '../public/generated_halltickets');
//   if (!fs.existsSync(baseDir)) {
//     fs.mkdirSync(baseDir, { recursive: true });
//     console.log('📁 Created base directory: generated_halltickets');
//   }
  
//   fs.mkdirSync(folderPath, { recursive: true });
//   console.log(`📁 Created folder: ${folderName}`);
  
//   return { folderPath, folderName };
// }

// function cleanupOldFolders() {
//   try {
//     const baseFolder = path.join(__dirname, '../public/generated_halltickets');
//     if (!fs.existsSync(baseFolder)) return;
    
//     const folders = fs.readdirSync(baseFolder);
//     const now = Date.now();
//     const twentyFourHours = 24 * 60 * 60 * 1000;
    
//     folders.forEach(folder => {
//       const folderPath = path.join(baseFolder, folder);
//       const stats = fs.statSync(folderPath);
      
//       if (now - stats.mtimeMs > twentyFourHours) {
//         fs.rmSync(folderPath, { recursive: true, force: true });
//         console.log(`🗑️ Cleaned up old folder: ${folder}`);
//       }
//     });
//   } catch (error) {
//     console.error('Error cleaning up old folders:', error);
//   }
// }

// // ========== SKILL TEST GENERATION (EXTRACTED) ==========
// async function generateSkillTestHallTicketFromDB(dbStudent, res, departmentId) {
//   let browser = null;
  
//   try {
//     const student = convertDBDataToHallTicketFormat(dbStudent);
//     const departmentLogoBase64 = await getDepartmentLogo(departmentId || dbStudent.departmentId);

//     const studentWithImages = {
//       ...student,
//       leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
//       logoBase64: departmentLogoBase64,
//       ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
//       photoBase64: student.photoBase64,
//       signBase64: student.signBase64,
//       townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
//       qrCodeBase64: getImageAsBase64('qr-code-sh.png')
//     };

//     const templatePath = path.join(__dirname, '../views/hallticket.ejs');
//     const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
//     const html = ejs.render(htmlTemplate, studentWithImages);

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
//     await page.setContent(html, { 
//       waitUntil: 'networkidle0',
//       timeout: 60000 
//     });

//     await new Promise(resolve => setTimeout(resolve, 1000));

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

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=hallticket_skill_${dbStudent.student_id}.pdf`);
//     res.setHeader('Content-Length', pdfBuffer.length);

//     res.end(pdfBuffer, 'binary');
//     console.log('✅ Skill Test PDF sent successfully');

//   } catch (error) {
//     if (browser) await browser.close();
//     throw error;
//   }
// }

// // ========== CONTROLLER OBJECT ==========

// const hallticketDepartmentController = {
  
//   getDepartmentsForHallTickets: async (req, res) => {
//     try {
//       const query = `
//         SELECT 
//           departmentId,
//           departmentName,
//           examType,
//           departmentStatus
//         FROM departmentdb 
//         ORDER BY departmentName ASC
//       `;

//       const [departments] = await db.execute(query);

//       if (departments.length === 0) {
//         return res.status(404).json({
//           success: false,
//           message: 'No active departments found'
//         });
//       }

//       const validDepartments = departments.filter(dept => dept.examType);
//       const invalidDepartments = departments.filter(dept => !dept.examType);

//       if (invalidDepartments.length > 0) {
//         console.warn(`Found ${invalidDepartments.length} departments without exam type:`, 
//           invalidDepartments.map(d => d.departmentName));
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Departments fetched successfully',
//         data: validDepartments,
//         totalDepartments: departments.length,
//         validDepartments: validDepartments.length,
//         departmentsWithoutExamType: invalidDepartments.length
//       });

//     } catch (error) {
//       console.error('Error fetching departments for hall tickets:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error while fetching departments',
//         error: error.message
//       });
//     }
//   },

//   getCentersForDB: async (req, res) => {
//     try {
//       const { departmentId } = req.query;

//       if (!departmentId) {
//         return res.status(400).json({
//           success: false,
//           message: 'Department ID is required'
//         });
//       }

//       const query = `
//         SELECT DISTINCT 
//           e.center,
//           e.center_name,
//           e.center_address
//         FROM students s
//         INNER JOIN examcenterdb e ON s.center = e.center
//         WHERE s.departmentId = ?
//         ORDER BY e.center_name ASC
//       `;

//       const [centers] = await db.execute(query, [parseInt(departmentId)]);

//       res.status(200).json({
//         success: true,
//         message: 'Centers fetched successfully',
//         data: centers,
//         totalCenters: centers.length
//       });

//     } catch (error) {
//       console.error('Error fetching centers:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error while fetching centers',
//         error: error.message
//       });
//     }
//   },

//   getBatchesForDB: async (req, res) => {
//     try {
//       const { departmentId } = req.query;

//       if (!departmentId) {
//         return res.status(400).json({
//           success: false,
//           message: 'Department ID is required'
//         });
//       }

//       const query = `
//         SELECT DISTINCT 
//           batchNo,
//           batchdate
//         FROM students
//         WHERE departmentId = ?
//           AND batchNo IS NOT NULL
//           AND batchdate IS NOT NULL
//         ORDER BY batchdate DESC, batchNo ASC
//       `;

//       const [batches] = await db.execute(query, [parseInt(departmentId)]);

//       res.status(200).json({
//         success: true,
//         message: 'Batches fetched successfully',
//         data: batches,
//         totalBatches: batches.length
//       });

//     } catch (error) {
//       console.error('Error fetching batches:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error while fetching batches',
//         error: error.message
//       });
//     }
//   },

//   getStudentsByFilters: async (req, res) => {
//     try {
//       const { departmentId, center, batchNo, searchTerm } = req.query;

//       if (!departmentId) {
//         return res.status(400).json({
//           success: false,
//           message: 'Department ID is required'
//         });
//       }

//       // Get exam type to filter subjectsdb correctly
//       const examType = await getDepartmentExamType(departmentId);

//       let query = `
//         SELECT 
//           s.student_id,
//           s.fullname,
//           s.batchNo,
//           s.batchdate,
//           s.reporting_time,
//           s.start_time,
//           s.end_time,
//           s.disability,
//           s.departmentId,
//           s.base64,
//           s.sign_base64,
//           s.center as centerCode,
//           e.center_name,
//           e.center_address,
//           sub.subject_name
//         FROM students s
//         LEFT JOIN examcenterdb e ON s.center = e.center
//         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = ?
//         WHERE s.departmentId = ?
//       `;

//       const params = [examType, parseInt(departmentId)];

//       if (center && center !== 'all') {
//         query += ' AND s.center = ?';
//         params.push(parseInt(center));
//       }

//       if (batchNo && batchNo !== 'all') {
//         query += ' AND s.batchNo = ?';
//         params.push(parseInt(batchNo));
//       }

//       if (searchTerm) {
//         query += ' AND (s.fullname LIKE ? OR s.student_id LIKE ?)';
//         params.push(`%${searchTerm}%`, `%${searchTerm}%`);
//       }

//       query += ' ORDER BY s.fullname ASC';

//       console.log('📊 Executing query with params:', params);
//       const [students] = await db.execute(query, params);
//       console.log(`✓ Query returned ${students.length} students`);

//       const formattedStudents = students.map(student => ({
//         ...convertDBDataToHallTicketFormat(student),
//         centerCode: student.centerCode,
//         examType: examType
//       }));

//       res.status(200).json({
//         success: true,
//         message: 'Students fetched successfully',
//         data: formattedStudents,
//         totalStudents: formattedStudents.length
//       });

//     } catch (error) {
//       console.error('Error fetching students:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error while fetching students',
//         error: error.message
//       });
//     }
//   },

//   // ========== ✅ UPDATED: SINGLE DOWNLOAD WITH DYNAMIC TEMPLATE ==========
//   downloadSingleHallTicketFromDB: async (req, res) => {
//     let browser = null;

//     try {
//       const { student_id } = req.params;
//       const { departmentId } = req.query;

//       console.log('=== DB PDF GENERATION START ===');
//       console.log('Student ID:', student_id);
//       console.log('Department ID:', departmentId);

//       // ✅ CHECK EXAM TYPE FIRST
//       const examType = await getDepartmentExamType(departmentId);
//       console.log('📋 Exam Type:', examType);

//       if (!examType) {
//         return res.status(400).json({
//           error: 'Could not determine exam type for this department'
//         });
//       }

//       // Query student data
//       let query = `
//         SELECT 
//           s.student_id,
//           s.fullname,
//           s.batchNo,
//           s.batchdate,
//           s.reporting_time,
//           s.start_time,
//           s.end_time,
//           s.disability,
//           s.departmentId,
//           s.base64,
//           s.sign_base64,
//           s.InstituteId,
//           s.mothername,
//           s.password,
//           s.courseId,
//           e.center,
//           e.center_name,
//           e.center_address,
//           sub.subject_name,
//           sub.subjectId
//         FROM students s
//         LEFT JOIN examcenterdb e ON s.center = e.center
//         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = ?
//         WHERE s.student_id = ?
//       `;

//       const params = [examType, student_id];

//       if (departmentId) {
//         query += ' AND s.departmentId = ?';
//         params.push(parseInt(departmentId));
//       }

//       const [students] = await db.execute(query, params);

//       if (students.length === 0) {
//         return res.status(404).json({ 
//           error: 'Student not found with this ID' 
//         });
//       }

//       const dbStudent = students[0];
//       console.log('✓ Student found:', dbStudent.fullname);

//       // ✅ ROUTE TO CORRECT TEMPLATE BASED ON EXAM TYPE
//       if (examType === 'GCC') {
//         console.log('🎨 Using GCC TBC template (PDFKit)');
//         return await generateGccTbcHallTicketFromDB(dbStudent, res, departmentId);
//       } else if (examType === 'SKILL') {
//         console.log('🎨 Using Skill Test template (EJS)');
//         return await generateSkillTestHallTicketFromDB(dbStudent, res, departmentId);
//       } else {
//         return res.status(400).json({
//           error: `Unsupported exam type: ${examType}`
//         });
//       }

//     } catch (error) {
//       console.error('❌ DB PDF generation error:', error);
//       if (browser) {
//         await browser.close();
//       }

//       if (!res.headersSent) {
//         res.status(500).json({ 
//           error: 'Failed to generate hall ticket PDF', 
//           details: error.message 
//         });
//       }
//     }
//   },

//   // ========== ✅ UPDATED: BULK DOWNLOAD WITH DYNAMIC TEMPLATE ==========
//   downloadAllHallTicketsFromDB: async (req, res) => {
//     let browser = null;

//     try {
//       const { departmentId, center, batchNo } = req.query;

//       if (!departmentId) {
//         return res.status(400).json({
//           success: false,
//           error: 'Department ID is required'
//         });
//       }

//       console.log('=== BULK DB FOLDER GENERATION START ===');
//       console.log('Department ID:', departmentId);
//       console.log('Center:', center);
//       console.log('Batch No:', batchNo);

//       // ✅ CHECK EXAM TYPE FIRST
//       const examType = await getDepartmentExamType(departmentId);
//       console.log('📋 Exam Type:', examType);

//       if (!examType) {
//         return res.status(400).json({
//           success: false,
//           error: 'Could not determine exam type for this department'
//         });
//       }

//       cleanupOldFolders();

//       const { folderPath, folderName } = createHallTicketFolder(departmentId, examType);

//       let query = `
//         SELECT 
//           s.student_id,
//           s.fullname,
//           s.batchNo,
//           s.batchdate,
//           s.reporting_time,
//           s.start_time,
//           s.end_time,
//           s.disability,
//           s.departmentId,
//           s.base64,
//           s.sign_base64,
//           s.InstituteId,
//           s.mothername,
//           s.password,
//           s.courseId,
//           e.center,
//           e.center_name,
//           e.center_address,
//           sub.subject_name,
//           sub.subjectId
//         FROM students s
//         LEFT JOIN examcenterdb e ON s.center = e.center
//         LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND sub.examType = ?
//         WHERE s.departmentId = ?
//       `;

//       const params = [examType, parseInt(departmentId)];

//       if (center && center !== 'all') {
//         query += ' AND s.center = ?';
//         params.push(parseInt(center));
//       }

//       if (batchNo && batchNo !== 'all') {
//         query += ' AND s.batchNo = ?';
//         params.push(parseInt(batchNo));
//       }

//       query += ' ORDER BY s.fullname ASC';

//       console.log('📊 Executing bulk query with params:', params);
//       const [students] = await db.execute(query, params);

//       if (students.length === 0) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'No students found with the specified filters' 
//         });
//       }

//       console.log(`Total students: ${students.length}`);

//       let successCount = 0;
//       let errorCount = 0;
//       const generatedFiles = [];

//       // ✅ ROUTE TO CORRECT GENERATION METHOD
//       if (examType === 'GCC') {
//         console.log('🎨 Using GCC TBC template (PDFKit) for bulk');
        
//         // Import GCC bulk function
//         const { generateGccTbcBulkHallTicketsFromDB } = require('./superAdminController/HallticketsGeneration');
        
//         const result = await generateGccTbcBulkHallTicketsFromDB(
//           students,
//           folderPath,
//           folderName,
//           departmentId
//         );

//         successCount = result.successCount;
//         errorCount = result.errorCount;
//         generatedFiles.push(...result.files);

//       } else if (examType === 'SKILL') {
//         console.log('🎨 Using Skill Test template (EJS) for bulk');

//         const departmentLogoBase64 = await getDepartmentLogo(departmentId);

//         browser = await puppeteer.launch({
//           headless: 'new',
//           args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-accelerated-2d-canvas',
//             '--disable-gpu'
//           ]
//         });

//         const templatePath = path.join(__dirname, '../views/hallticket.ejs');
//         const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

//         for (let i = 0; i < students.length; i++) {
//           const dbStudent = students[i];

//           try {
//             console.log(`Processing ${i + 1}/${students.length}: ${dbStudent.student_id}`);

//             const student = convertDBDataToHallTicketFormat(dbStudent);

//             const studentWithImages = {
//               ...student,
//               leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
//               logoBase64: departmentLogoBase64,
//               ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
//               photoBase64: student.photoBase64,
//               signBase64: student.signBase64,
//               townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
//               qrCodeBase64: getImageAsBase64('qr-code-sh.png')
//             };

//             const html = ejs.render(htmlTemplate, studentWithImages);

//             const page = await browser.newPage();
//             await page.setContent(html, { 
//               waitUntil: 'domcontentloaded',
//               timeout: 30000 
//             });

//             await new Promise(resolve => setTimeout(resolve, 300));

//             const pdfBuffer = await page.pdf({
//               format: 'A4',
//               printBackground: true,
//               preferCSSPageSize: false,
//               margin: { 
//                 top: '0mm', 
//                 right: '0mm', 
//                 bottom: '0mm', 
//                 left: '0mm' 
//               }
//             });

//             await page.close();

//             const filename = `hallticket_${dbStudent.student_id}.pdf`;
//             const filePath = path.join(folderPath, filename);
//             fs.writeFileSync(filePath, pdfBuffer);

//             generatedFiles.push({
//               student_id: dbStudent.student_id,
//               fullname: dbStudent.fullname,
//               filename: filename,
//               downloadUrl: `/generated_halltickets/${folderName}/${filename}`
//             });

//             successCount++;
//             console.log(`✓ Saved to folder: ${filename} (${successCount}/${students.length})`);

//           } catch (error) {
//             errorCount++;
//             console.error(`✗ Error generating PDF for ${dbStudent.student_id}:`, error.message);
//           }

//           if (i < students.length - 1) {
//             await new Promise(resolve => setTimeout(resolve, 200));
//           }
//         }

//         await browser.close();
//         browser = null;
//       }

//       console.log(`✅ DB generation complete: ${successCount} successful, ${errorCount} failed`);

//       res.json({
//         success: true,
//         message: `Generated ${successCount} hall tickets successfully`,
//         examType: examType,
//         folderName: folderName,
//         folderPath: `/generated_halltickets/${folderName}`,
//         totalFiles: successCount,
//         files: generatedFiles,
//         errors: errorCount
//       });

//     } catch (error) {
//       console.error('Bulk DB folder generation error:', error);
//       if (browser) {
//         await browser.close();
//       }

//       if (!res.headersSent) {
//         res.status(500).json({ 
//           success: false,
//           error: 'Failed to generate hall tickets', 
//           details: error.message 
//         });
//       }
//     }
//   },

//   checkDBDataStatus: async (req, res) => {
//     try {
//       const { departmentId } = req.query;

//       if (!departmentId) {
//         return res.status(400).json({
//           success: false,
//           message: 'Department ID is required'
//         });
//       }

//       const query = `
//         SELECT COUNT(*) as totalStudents
//         FROM students
//         WHERE departmentId = ?
//       `;

//       const [result] = await db.execute(query, [parseInt(departmentId)]);

//       res.json({
//         success: true,
//         status: 'data_available',
//         message: 'Database data is available',
//         totalStudents: result[0].totalStudents,
//         departmentId: parseInt(departmentId)
//       });

//     } catch (error) {
//       console.error('Check DB data status error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to check data status' 
//       });
//     }
//   }

// };

// module.exports = hallticketDepartmentController;



// controllers/hallticketDepartment_controller.js
const db = require('../config/db1');
const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// ✅ IMPORT YOUR EXISTING DECRYPT FUNCTION
const { decrypt } = require('../config/encrypt');

// ========== IMPORT GCC TBC GENERATION LOGIC ==========
const { generateGccTbcHallTicketFromDB, generateGccTbcBulkHallTicketsFromDB } = require('./superAdminController/HallticketsGeneration');

// ========== PASSWORD DECRYPTION WRAPPER ==========

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

// ========== HELPER FUNCTIONS ==========

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

function convertDBDataToHallTicketFormat(dbStudent) {
  return {
    student_id: dbStudent.student_id,
    fullname: dbStudent.fullname || 'N.A',
    batchNo: dbStudent.batchNo || 'N.A',
    center_name: dbStudent.center_name || 'N.A',
    center_address: dbStudent.center_address || 'N.A',
    subject_name: dbStudent.subject_name || 'N.A',
    batchdate: formatDate(dbStudent.batchdate),
    reporting_time: formatTimeToAMPM(dbStudent.reporting_time),
    start_time: formatTimeToAMPM(dbStudent.start_time),
    end_time: formatTimeToAMPM(dbStudent.end_time),
    gate_closure_time: calculateGateClosureTime(dbStudent.reporting_time),
    disability: dbStudent.disability === 1 ? 'Yes' : 'No',
    newname: 'N.A',
    APPLICATION_NUMBER: dbStudent.student_id,
    disability_type: 'N.A',
    photoBase64: dbStudent.base64 || '',
    signBase64: dbStudent.sign_base64 || '',
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

// ========== FOLDER MANAGEMENT FUNCTIONS ==========

function createHallTicketFolder(departmentId, examType) {
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

// ========== SKILL TEST GENERATION ==========
async function generateSkillTestHallTicketFromDB(dbStudent, res, departmentId) {
  let browser = null;
  
  try {
    const student = convertDBDataToHallTicketFormat(dbStudent);
    const departmentLogoBase64 = await getDepartmentLogo(departmentId || dbStudent.departmentId);

    const studentWithImages = {
      ...student,
      leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
      logoBase64: departmentLogoBase64,
      ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
      photoBase64: student.photoBase64,
      signBase64: student.signBase64,
      townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
      qrCodeBase64: getImageAsBase64('qr-code-sh.png')
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
    res.setHeader('Content-Disposition', `attachment; filename=hallticket_skill_${dbStudent.student_id}.pdf`);
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

      const params = [examType, parseInt(departmentId)];

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
        examType: examType
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

  // ✅ UPDATED: Single download with password decryption
  downloadSingleHallTicketFromDB: async (req, res) => {
    let browser = null;

    try {
      const { student_id } = req.params;
      const { departmentId } = req.query;

      console.log('=== DB PDF GENERATION START ===');
      console.log('Student ID:', student_id);
      console.log('Department ID:', departmentId);

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

      // ✅ DECRYPT PASSWORD BEFORE GENERATING PDF
      if (dbStudent.password) {
        console.log('🔐 Decrypting password for student:', dbStudent.student_id);
        dbStudent.decryptedPassword = decryptPassword(dbStudent.password);
        console.log('Password status:', dbStudent.decryptedPassword !== 'N/A' ? '✓ Decrypted' : '✗ Failed');
      } else {
        console.log('⚠️ No password field in database');
        dbStudent.decryptedPassword = 'N/A';
      }

      if (examType === 'GCC') {
        console.log('🎨 Using GCC TBC template (PDFKit)');
        return await generateGccTbcHallTicketFromDB(dbStudent, res, departmentId);
      } else if (examType === 'SKILL') {
        console.log('🎨 Using Skill Test template (EJS)');
        return await generateSkillTestHallTicketFromDB(dbStudent, res, departmentId);
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

  // ✅ UPDATED: Bulk download with password decryption
  downloadAllHallTicketsFromDB: async (req, res) => {
    let browser = null;

    try {
      const { departmentId, center, batchNo } = req.query;

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

      const examType = await getDepartmentExamType(departmentId);
      console.log('📋 Exam Type:', examType);

      if (!examType) {
        return res.status(400).json({
          success: false,
          error: 'Could not determine exam type for this department'
        });
      }

      cleanupOldFolders();

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

      // ✅ DECRYPT PASSWORDS FOR ALL STUDENTS
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
        console.log('🎨 Using Skill Test template (EJS) for bulk');

        const departmentLogoBase64 = await getDepartmentLogo(departmentId);

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

            const studentWithImages = {
              ...student,
              leftLogoBase64: getImageAsBase64('pwd_logo1.jpg'),
              logoBase64: departmentLogoBase64,
              ashokStambhBase64: getImageAsBase64('pwd_logo2.jpeg'),
              photoBase64: student.photoBase64,
              signBase64: student.signBase64,
              townPlanningSignBase64: getImageAsBase64('town_planning_sign.jpg'),
              qrCodeBase64: getImageAsBase64('qr-code-sh.png')
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
