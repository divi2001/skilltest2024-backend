const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require("fs");
const cors = require('cors');

// routes 
const adminFunctionRouter = require('./routes/admin_functions_routes');
const examcentereRoutes = require('./routes/examcenter_routes')
const trackStudentRoutes = require('./routes/trackStudentRoute')
const pdfRoutes = require('./routes/pdf_routes');
const fetchRoutes = require('./routes/fetchDetails_routes');
const dataInputRoutes = require('./routes/data_input_routes')
const studentRoutes = require('./routes/student_exam_routes')
const examDashBoardRoutes = require("./routes/examCenterAuth-dashboard")
const examDashboardDetailsRoutes = require("./routes/examCenterDetails-dashboard");
const departmentRoutes = require("./routes/department_routes");
const answerSheetRoutes = require("./routes/answerSheet_routes");
const typingRoutes = require('./routes/students/typingRoutes')
const excelRouter = require('./routes/dataImportExport/excelImportRoutes')
const superAdminTrackDashboardRoute = require('./routes/superAdmin_updateDb');

// ExpertRoutes
const expertLoginRoutes = require('./routes/expertsCheckingRoutes/expertsAuthRoutes'); //ExpertLoginRoutes
const expertDashboardStage3Routes = require('./routes/expertsCheckingRoutes/studentSpecificRoutes')

const app = express();
const PORT = 3000;

// Force HTTPS redirect (for all environments)
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CORS configuration
const corsOptions = {
  origin: ['*', 'http://localhost:3001', 'http://192.168.1.102:3001/'],// Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

// Use CORS with the above options
app.use(cors(corsOptions));

app.use(cors({
  origin: ['*', 'http://3.109.1.101:3000', 'http://3.109.1.101:3001', 'http://3.109.1.101:3002', 'http://43.204.22.53:5000', 'https://www.shorthandonlineexam.in', 'http://65.0.124.197:5000','http://65.0.124.197:5000/api/compare'],
  credentials: true
}));

// Add security headers middleware
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'");
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
});

app.use(session({
  secret: 'divis@GeYT',
  resave: false,
  saveUninitialized: false, // Changed to false for better security
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Enable in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // Add this for CSRF protection
  }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const uploadsDir = path.join(__dirname,'uploads');

if(!fs.existsSync(uploadsDir)){
  fs.mkdir(uploadsDir);
}

app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname,'uploads')));

// Disable unnecessary HTTP methods
app.use((req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  next();
});

app.use(studentRoutes)
app.use(examcentereRoutes)
app.use(dataInputRoutes)
app.use(adminFunctionRouter)
app.use(examDashBoardRoutes);
app.use(examDashboardDetailsRoutes);
app.use(trackStudentRoutes);
app.use(pdfRoutes);
app.use(fetchRoutes);
app.use(departmentRoutes);
app.use(answerSheetRoutes);
app.use(typingRoutes)
app.use(excelRouter)
app.use(superAdminTrackDashboardRoute);

//Expert Routes
app.use(expertLoginRoutes);
app.use(expertDashboardStage3Routes);

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  // console.log(`Server running on www.shorthandonlineexam.in`);
  console.log(`Server running on http://localhost:${PORT}`);
});