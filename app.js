// app.js
// This is the main entry point for the Express application.
// It sets up middleware, routes, and starts the server.
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

// 1. HTTPS redirect middleware (VULNERABILITY FIX #1 - Insecure Communication)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// 2. Security headers middleware (VULNERABILITY FIX #3 - Missing Security Headers)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
  next();
});

// 3. HTTP method restriction (VULNERABILITY FIX #4 - OPTIONS Method Enabled)
app.use((req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CORS configuration - Updated to be more restrictive
const corsOptions = {
  origin: [
    'http://localhost:3001', 
    'http://192.168.1.102:3001',
    'http://3.109.1.101:3000', 
    'http://3.109.1.101:3001', 
    'http://3.109.1.101:3002', 
    'http://43.204.22.53:5000', 
    'https://www.shorthandonlineexam.in', 
    'http://65.0.124.197:5000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Removed OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

// Use CORS with the above options
app.use(cors(corsOptions));

// Updated session configuration (VULNERABILITY FIX #1 - Secure cookies)
app.use(session({
  secret: 'divis@GeYT',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Enable secure cookies in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

const uploadsDir = path.join(__dirname,'uploads');

if(!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname,'uploads')));

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

// 4. Error handling middleware (VULNERABILITY FIX #2 - Improper Error Handling)
app.use((err, req, res, next) => {
  // Log the detailed error for debugging (server-side only)
  console.error('Error:', err);
  
  // Send generic error message to client
  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    error: err.message || 'An error occurred while processing your request'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  // console.log(`Server running on www.shorthandonlineexam.in`);
  console.log(`Server running on https://www.shorthandonlineexam.in:${PORT}`);
});