// controllers\superAdminController\HallticketsGeneration.js
const PDFDocument = require('pdfkit');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const archiver = require('archiver');

function wrapText(text, maxWidth, pdfDoc) {
  let words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    let word = words[i];
    let width = pdfDoc.widthOfString(currentLine + ' ' + word);

    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

async function generateStudentHallTicket(doc, studentData, assets) {
  const { logoFile, qrFile, signFile, regularFont, boldFont } = assets;
  
  // Add a new page for each student
  doc.addPage();
  
  // Add watermark
  const addWatermark = () => {
    doc.save();
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const watermarkWidth = 350;
    const watermarkHeight = 350;
    const centerX = (pageWidth - watermarkWidth) / 2;
    const centerY = (pageHeight - watermarkHeight) / 2;
    doc.opacity(0.1);
    
    if (logoFile) {
      doc.image(logoFile, centerX, centerY, {
        width: watermarkWidth,
        height: watermarkHeight,
      });
    }
    
    doc.restore();
  };

  addWatermark();

  // Main border
  doc.roundedRect(20, 20, 555, 380, 40).stroke();
  
  // Logo
  if (logoFile) {
    doc.image(logoFile, 30, 20, {
      width: 75,
      height: 75,
    });
  }

  const pageWidth = 595.28;
  const textWidth = 400;
  const centerX = (pageWidth - textWidth) / 2;

  // Header text
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("MAHARASHTRA STATE COUNCIL OF EXAMINATIONS, PUNE", centerX, 35, {
      width: textWidth,
      align: "center",
    })
    .fontSize(11)
    .text("GCC COMPUTER SHORTHAND EXAMINATION DECEMBER 2024", centerX, 50, {
      width: textWidth,
      align: "center",
    })
    .text("ADMISSION CARD", centerX, 65, {
      width: textWidth,
      align: "center",
    });

  const textY = 20;
  // Student photo box
  const boxX = 410;
  const boxY = 80;
  const boxWidth = 70;
  const boxHeight = 85;
  doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

  const maxImageWidth = boxWidth - 10;
  const maxImageHeight = boxHeight - 10;

  try {
    if (studentData.image) {
      const base64Data = studentData.image.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imageBuffer, boxX + 5, boxY + 5, {
        width: maxImageWidth,
        height: maxImageHeight,
        fit: [maxImageWidth, maxImageHeight],
        align: 'center',
        valign: 'center'
      });
    }
  } catch (error) {
    console.error("Error processing image for student:", studentData.seatNo, error);
  }

  // Affix photo box
  doc.rect(485, 80, 70, 85).stroke();
  doc
    .fontSize(8)
    .text("Affix", 475, 70 + textY, { align: "center" })
    .text("Passport size", 470, 85 + textY, { align: "center" })
    .text("colour", 475, 100 + textY, { align: "center" })
    .text("Photograph", 470, 115 + textY, { align: "center" });

  // Signature box
  doc.rect(410, 175, 145, 40).stroke();

  // Student details
  const rightStart = 40;
  const leftStart = 230;

  // Left column details
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("SEAT NO : " + studentData.seatNo, rightStart, 110);
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("CANDIDATE NAME : " + studentData.candidateName, rightStart, 135);
  doc.text("MOTHER'S NAME : " + studentData.motherName, rightStart, 160);
  doc.text("CENTER NO : " + studentData.centerNo, rightStart, 185);
  doc.text("HANDICAP : " + studentData.handicap, rightStart, 205);
  doc.text("SUBJECT CODE : " + studentData.subjectCode, rightStart, 225);
  doc.text("BATCH : " + studentData.batch, rightStart, 245);
  doc.text("DATE : " + studentData.date, rightStart, 265);
  doc.text("EXAM TIME : " + studentData.examTime, rightStart, 285);

  // Right column details
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("PASSWORD : " + studentData.password, leftStart, 110);
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("INSTITUTE CODE : " + studentData.instituteCode, leftStart, 185);
  doc.text("SUBJECT : " + studentData.subject, leftStart, 225);
  doc.text("REPORTING TIME : " + studentData.reportingTime, leftStart, 265);

  // Exam center details
  const maxWidth = 330;
  doc.text("NAME / ADDRESS OF EXAM CENTER :", rightStart, 310);
  
  let yPosition = 330;
  const wrappedCenterName = wrapText(studentData.examCenter, maxWidth, doc);
  
  wrappedCenterName.forEach(line => {
      doc.text(line, rightStart, yPosition);
      yPosition += 15;
  });
  
  yPosition += 5;
  
  const wrappedAddress = wrapText(studentData.centerAddress, maxWidth, doc);
  wrappedAddress.forEach(line => {
      doc.text(line, rightStart, yPosition);
      yPosition += 15;
  });

  // Signature section
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Sign of Head of Institute / Principal & Stamp", 400, 220, {
      align: "center",
    });

  if (signFile) {
    doc.image(signFile, boxX + 20, 240, {
      width: maxImageWidth+45,
      height: maxImageHeight+45,
      fit: [maxImageWidth+40, maxImageHeight+40],
      align: 'center',
      valign: 'center'
    });
  }

  // Commissioner details
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("(Anuradha Oak)", 370, 320, { align: "center" })
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("COMMISSIONER", 370, 335, { align: "center" })
    .text("MAHARASHTRA STATE COUNCIL OF", 368, 350, { align: "center" })
    .text("EXAMINATION, PUNE", 380, 365, { align: "center" });

  // Instructions in Marathi - Now using the properly registered fonts with correct encoding
  doc
    .fontSize(12)
    .font(boldFont)
    .text("केंद्रसंचालक / संस्थाचालक / विद्यार्थ्यांना सूचना:", 20, 420, {
      align: "center",
      characterSpacing: 0,
      features: ['kern'],
      encoding: 'Identity-H' // Explicitly set encoding for Unicode text
    });
    
  function drawBullet(x, y) {
    doc
      .circle(x, y + 3, 1.5)
      .fillAndStroke("black");
  }
    
  const bulletStartX = 25;
  const textStartX = 35;
  const lineHeight = 20;
  let currentY = 440;
    
  // First bullet point with proper encoding
  drawBullet(bulletStartX, currentY+5);
  doc
    .fontSize(12)
    .font(regularFont)
    .text(
      "प्रवेशपत्रावरील नोंदी विद्यार्थी आणि संस्थाचालक यांनी परीक्षेपूर्वी तपासाव्यात. केंद्रसंचालक यांनी प्रवेशपत्रावर परस्पर कोणतीही दुरुस्ती करू नये. संगणकावरील प्रवेशपत्रामधील नोंदी योग्य असल्याची खात्री करूनच विद्यार्थ्यांस प्रश्नपत्रिका ओपन करून द्यावी.",
      textStartX,
      currentY,
      {
        width: 535,
        lineGap: 5,
        features: ['kern'],
        encoding: 'Identity-H'
      }
    );
    
  currentY += 45;
    
  // Second bullet point
  drawBullet(bulletStartX, currentY+4);
  doc.text(
    "केंद्रसंचालकांनी विद्यार्थ्यांची बैठक व्यवस्था त्यांचे आसन क्रमांकानुसार सलगपणे करावी.",
    textStartX,
    currentY,
    {
      width: 535,
      lineGap: 5,
      features: ['kern'],
      encoding: 'Identity-H'
    }
  );
    
  currentY += 25;
    
  // Third bullet point
  drawBullet(bulletStartX, currentY+4);
  doc.text(
    "संस्थाचालकांनी मॉक टेस्ट पूर्वी १.५ ते २ मीटर वायर असलेला PC/Desktop करिता साधा auxiliary पोर्ट असलेला हेडफोन परीक्षा केंद्रावर जमा करावा. मोबाइल एअरफोन, ब्लुटुथ, कोणतेही चिप असलेले हेडफोन चालणार नाही. संस्थाचालकांना सर्व परीक्षा संपल्यावरच हेडफोन परत नेता येतील.",
    textStartX,
    currentY,
    {
      width: 535,
      lineGap: 5,
      features: ['kern'],
      encoding: 'Identity-H'
    }
  );
    
  // General instructions
  doc
    .fontSize(12)
    .font(boldFont)
    .text("विद्यार्थ्यांसाठी सर्वसाधारण सूचना:", 20, 580, {
      align: "center",
      features: ['kern'],
      encoding: 'Identity-H'
    });
    
  doc
    .fontSize(12)
    .font(regularFont)
    .text(
      [
        "१. ऑनलाइन आवेदनपत्रात भरलेल्या माहितीनुसार विद्यार्थ्यांची प्रवेशपत्रे तयार करण्यात आली आहेत. प्रवेशपत्रावर दिलेल्या माहितीत विद्यार्थ्यांनी परस्पर कोणताही बदल करू नये.",
    
        "२. परीक्षेस प्रविष्ठ होण्यासाठी परीक्षार्थीने सदर मुळ प्रवेशपत्र तसेच अन्य कोणतेही मुळ फोटो ओळखपत्र सोबत आणणे आवश्यक आहे. (उदा. आधारकार्ड, पॅनकार्ड, मतदान ओळखपत्र, ड्रायव्हिंग लायसन्स, शाळा/महाविद्यालय ओळखपत्र, इत्यादी). प्रवेशपत्र व फोटो ओळखपत्र असल्याशिवाय परीक्षागृहात प्रवेश दिला जाणार नाही.",
    
        "३. परीक्षार्थीने परीक्षेच्या विहित वेळेच्या ४५ मिनिटे अगोदर परीक्षागृहात उपस्थित रहावे.",
    
        "४. सदर परीक्षा संगणकावर घेण्यात येत असल्यामुळे परीक्षा सुरू झाल्यानंतर जास्तीत जास्त १० मिनिटे उशिरापर्यंत परीक्षार्थ्यांस प्रवेश दिला जाईल. परीक्षार्थी जितकी मिनिटे उशिरा येईल तितकी मिनिटे किबोर्ड, माऊस, हेडफोन तपासणीच्या कालावधीतून १० मिनिटांच्या कमाल मर्यादेत कमी केली जातील. (उदा. परीक्षार्थी ७ मिनिटे परीक्षा कक्षात उशिरा उपस्थित झाल्यास त्यास किबोर्ड, माऊस, हेडफोन तपासणीसाठी वेळ मिळणार नाही.) यासाठी विद्यार्थ्याने परीक्षा कक्षात वेळेवर उपस्थित राहण्याची दक्षता घ्यावी.",
    
        "५. परीक्षा कक्षात समन्वयकांच्या (coordinator) मदतीने आसन क्रमांक (Seat Number) व पासवर्डद्वारे परीक्षेस प्रविष्ट व्हावे.",
    
        "६. परीक्षार्थीला स्वाक्षरीपटावर आपले नाव व फोटोसमोर स्वाक्षरी करणे बंधनकारक आहे, अन्यथा परीक्षार्थीची उपस्थिती ग्राह्य धरली जाणार नाही.",
    
        "७. परीक्षार्थीने मोबाईल फोन, कॅलक्युलेटर, पेजर इ. प्रकारचे इलेक्ट्रॉनिक साहित्य किंवा इतर कोणत्याही प्रकारचे आक्षेपार्ह कागदपत्रे परीक्षा कालावधीत स्वतःजवळ ठेवू नये. परीक्षा कालावधीत असे साहित्य स्वतःजवळ बाळगल्याचे आढळून आल्यास अथवा गैरप्रकार केल्याचे निदर्शनास आल्यास त्या परीक्षार्थीविरुद्ध भा.दं.वि. (IPC) अंतर्गत कारवाई करण्यात येईल.",
    
        "८. परीक्षा चालू असताना विद्यार्थ्यांने अन्यत्र कुठेही Click, Drag, Drop करू नये, आवश्यक असलेल्या बाबींशिवाय इतर बटणांचा वापर करू नये, असे केल्यास हा गैरप्रकार समजण्यात येईल. उदा. Ctrl+Alt+Del, Alt+Tab, Windows, Function keys (F1, F2......... F12), Refresh Button तसेच Windows key चा कोणत्याही combination मध्ये वापर करू नये.",
    
        "९. या परीक्षेत मराठी व हिंदी माध्यमासाठी मंगल (Mangal) फॉन्ट By default देण्यात येणार आहे. अन्य कोणताही फॉन्ट वापरता येणार नाही, याची उमेदवाराने नोंद घ्यावी.",
    
        "१०. मराठी व हिंदी परीक्षा चालू असताना ISM चा Scroll Lock/Num Lock लिप्यंतर (Transcription) करताना (On) करावे.",
    
        "११. ISM Software चालू केल्यानंतर त्याचा Floating Keyboard चालू असेल तर तो बंद करावा.",
    
        "१२. मराठी व हिंदी माध्यमाच्या विद्यार्थ्यांनी परीक्षा सुरू होण्यापूर्वी आपणास परीक्षेस देण्यात आलेल्या संगणकावर आय.एस.एम. (ISM) सुरू असल्याची खात्री करावी.",
    
        "१३. परीक्षा संपल्यानंतर केंद्रसंचालक व केंद्रसमन्वयक यांच्या परवानगीशिवाय परीक्षा कक्ष सोडू नये. तसेच परीक्षा कालावधीमध्ये कक्ष सोडून जाता येणार नाही.",
    
        "१४. परीक्षा सुरू असताना वीजपुरवठा खंडित होणे किंवा अन्य तांत्रिक कारणामुळे संगणक बंद झाल्यास केंद्रसंचालक व समन्वयक पर्यायी व्यवस्था करतील. त्यांच्या सूचनेनुसार विद्यार्थ्याने कार्यवाही करावी.",
    
        "१५. परीक्षा सुरू होण्यास तांत्रिक कारणामुळे उशीर झाल्यास परीक्षार्थ्यास पूर्ण कालावधी दिला जाईल.",
    
        "१६. परीक्षा कक्षामध्ये सी.सी.टी.व्ही. कॅमेरे कार्यरत आहेत याची परीक्षार्थ्याने नोंद घ्यावी.",
    
        "१७. परीक्षेसंबंधी दिलेल्या कोणत्याही सूचनेचा भंग केल्यास तो गैरप्रकार समजण्यात येईल व त्याची परीक्षा परिषदेने विहित केलेल्या कार्यपद्धतीप्रमाणे चौकशी करून उचित कार्यवाही केली जाईल याची नोंद घ्यावी.",
    
        "१८. महाराष्ट्र राज्य परीक्षा परिषदेच्या www.mscepune.in या संकेतस्थळावर प्रसिद्ध केलेल्या दिनांक १०/०४/२०२४ रोजी प्रसिद्ध केलेल्या संगणक लघुलेखन परीक्षेमधील कार्यपद्धती आणि YouTube लिंकद्वारे मा. अध्यक्ष परीक्षा परिषद यांनी केलेले मार्गदर्शनपर सूचना यांचे परीक्षार्थींनी काटेकोरपणे वाचन/अवलोकन करावे. सोबत QR कोड जोडला आहे.",
      ].join("\n"),
      30,
      610,
      {
        width: 555,
        lineGap: 7,
        features: ['kern'],
        encoding: 'Identity-H'
      }
    );
    
  // QR code
  if (qrFile) {
    doc.image(qrFile, 30, 670, { width: 500, height: 150 });
  }
}

async function loadAssets() {
  // Path to assets directory
  const assetsDir = path.join(__dirname, '../../public/assets');
  
  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Path to required files
  const logoPath = path.join(assetsDir, 'logo.png');
  const qrPath = path.join(assetsDir, 'qr.png');
  const signPath = path.join(assetsDir, 'sign_anuradha_oak.png');
  const fontsDir = path.join(assetsDir, 'fonts');
  
  // Create fonts directory if it doesn't exist
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }
  
  // Check if required files exist
  const logoFile = fs.existsSync(logoPath) ? logoPath : null;
  const qrFile = fs.existsSync(qrPath) ? qrPath : null;
  const signFile = fs.existsSync(signPath) ? signPath : null;
  
  // Font paths
  const regularFontPath = path.join(fontsDir, 'NotoSansDevanagari-Regular.ttf');
  const boldFontPath = path.join(fontsDir, 'NotoSansDevanagari-Bold.ttf');
  
  // Log font availability for debugging
  console.log('Regular font exists:', fs.existsSync(regularFontPath));
  console.log('Bold font exists:', fs.existsSync(boldFontPath));

  return {
    logoFile,
    qrFile,
    signFile,
    regularFontPath,
    boldFontPath
  };
}

async function registerFonts(doc, regularFontPath, boldFontPath) {
  let regularFont, boldFont;
  if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
    doc.registerFont('NotoSansDevanagari', regularFontPath);
    doc.registerFont('NotoSansDevanagari-Bold', boldFontPath);
    regularFont = 'NotoSansDevanagari';
    boldFont = 'NotoSansDevanagari-Bold';
    console.log('Devanagari fonts registered successfully');
  } else {
    regularFont = 'Helvetica';
    boldFont = 'Helvetica-Bold';
    console.warn('Devanagari fonts not found. Marathi text may not display correctly.');
  }
  return { regularFont, boldFont };
}

async function loadStudentData() {
  const filePath = path.join(__dirname, '../../public/uploads/students_with_base64_final.xlsx');
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error('Student data file not found. Please upload the file first.');
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet);

  return excelData.map(row => ({
    seatNo: row['student_id']?.toString(),
    instituteId: row['InstituteId']?.toString(),
    candidateName: row['fullname'],
    motherName: row['mothername'],
    centerNo: row['center']?.toString(),
    handicap: row['Handicap'] ?? " ",
    subjectCode: row['subjectsId']?.toString(),
    batch: row['batchNo']?.toString(),
    date: row['batchdate'],
    examTime: row['start_time'],
    password: row['password']?.toString(),
    instituteCode: row['InstituteId']?.toString(),
    subject: row['SUBNAME'],
    reportingTime: row['reporting_time'],
    examCenter: row['center_name'],
    centerAddress: row['center_address'],
    image: row["base64"]
  }));
}

async function downloadHallTicketForStudent(req, res){
    try {
        const { seatNo } = req.params;
        const students = await loadStudentData();
        const assets = await loadAssets();

        const student = students.find(student => student.seatNo === seatNo);

        if (!student) {
            return res.status(404).json({
                error: `No student found with seat number: ${seatNo}`
            });
        }

        const doc = new PDFDocument({
            size: "A4",
            margins: {
                top: 20,
                bottom: 20,
                left: 30,
                right: 30,
            },
            info: {
                Title: `Hall Ticket for ${seatNo}`,
                Author: 'Examination System',
                Producer: 'PDFKit with UTF-8 support'
            },
            autoFirstPage: false
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=student_${seatNo}_hall_ticket.pdf`);

        // Handle errors during piping
        doc.on('error', (err) => {
            console.error('PDF stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: "PDF generation failed" });
            }
        });

        doc.pipe(res);

        const { regularFont, boldFont } = await registerFonts(doc, assets.regularFontPath, assets.boldFontPath);

        await generateStudentHallTicket(doc, student, {
            ...assets,
            regularFont,
            boldFont
        });

        doc.end();

    } catch (error) {
        console.error("PDF generation error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                error: "Failed to generate PDF: " + error.message
            })
        }
    }
}

async function downloadHallTicketsForInstitute(req, res) {
  try {
    const { instituteId } = req.params;
    const students = await loadStudentData();
    const assets = await loadAssets();

    const instituteStudents = students.filter(
      (student) => student.instituteId === instituteId
    );

    if (instituteStudents.length === 0) {
      return res.status(404).json({
        error: `No students found for institute ID: ${instituteId}`,
      });
    }

    // Create PDF document with proper encoding support
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 20,
        bottom: 20,
        left: 30,
        right: 30,
      },
      info: {
        Title: `Institute ${instituteId} Hall Tickets`,
        Author: 'Examination System',
        Producer: 'PDFKit with UTF-8 support'
      },
      autoFirstPage: false  // Don't create first page automatically
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=institute_${instituteId}_hall_tickets.pdf`);
    doc.pipe(res);
    
    const { regularFont, boldFont } = await registerFonts(doc, assets.regularFontPath, assets.boldFontPath);

    for (const studentData of instituteStudents) {
      await generateStudentHallTicket(doc, studentData, {
        ...assets,
        regularFont,
        boldFont
      });
    }

    doc.end();

  } catch (error) {
    console.error("PDF generation error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF: " + error.message });
    }
  }
}

async function downloadAllHallTickets(req, res) {
  try {
    const students = await loadStudentData();
    const assets = await loadAssets();

    const instituteGroups = students.reduce((groups, student) => {
      const key = student.instituteId;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(student);
      return groups;
    }, {});

    const tempDir = path.join(__dirname, '../../temp_pdfs');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir);

    for (const [instituteId, instituteStudents] of Object.entries(instituteGroups)) {
      const pdfPath = path.join(tempDir, `${instituteId}.pdf`);
      
      // Create PDF document with proper encoding
      const pdfDoc = new PDFDocument({
        size: "A4",
        margins: {
          top: 20,
          bottom: 20,
          left: 30,
          right: 30,
        },
        info: {
          Title: `Institute ${instituteId} Hall Tickets`,
          Author: 'Examination System',
          Producer: 'PDFKit with UTF-8 support'
        },
        autoFirstPage: false  // Don't create first page automatically
      });
      
      const pdfStream = fs.createWriteStream(pdfPath);
      pdfDoc.pipe(pdfStream);
      pdfDoc.setMaxListeners(100);
      
      const { regularFont, boldFont } = await registerFonts(pdfDoc, assets.regularFontPath, assets.boldFontPath);

      for (const studentData of instituteStudents) {
        await generateStudentHallTicket(pdfDoc, studentData, {
          ...assets,
          regularFont,
          boldFont
        });
      }

      pdfDoc.end();
      await new Promise(resolve => pdfStream.on('finish', resolve));
      console.log(`PDF generated for institute ${instituteId}`);
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = 'hall_tickets.zip';

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);

    archive.pipe(res);

    const pdfFiles = fs.readdirSync(tempDir);
    for (const pdfFile of pdfFiles) {
      archive.file(path.join(tempDir, pdfFile), { name: pdfFile });
    }

    await archive.finalize();

    // Clean up temporary files
    setTimeout(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }, 1000);

  } catch (error) {
    console.error("Error generating PDFs:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDFs: " + error.message });
    }
  }
}

module.exports = {
  downloadHallTicketsForInstitute,
  downloadAllHallTickets,
  downloadHallTicketForStudent
};