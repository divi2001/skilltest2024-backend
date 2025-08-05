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
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// 2. Header sanitization middleware to fix protocol violation
app.use((req, res, next) => {
  // Override res.setHeader to ensure proper line endings
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    // Sanitize header values to prevent protocol violations
    if (typeof value === 'string') {
      // Remove any CR/LF characters that could cause protocol violations
      value = value.replace(/[\r\n]/g, '');
    }
    return originalSetHeader.call(this, name, value);
  };
  next();
});

// 3. Security headers middleware (VULNERABILITY FIX #3 - Missing Security Headers)
app.use((req, res, next) => {
  try {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
  } catch (error) {
    console.error('Header setting error:', error);
  }
  next();
});

// 4. HTTP method restriction (VULNERABILITY FIX #4 - OPTIONS Method Enabled)
app.use((req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  next();
});

// Body parser middleware
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
  optionsSuccessStatus: 200,
  preflightContinue: false
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
    secure: true, // Always use secure cookies since we're forcing HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static file handling
const uploadsDir = path.join(__dirname,'uploads');

if(!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname,'uploads')));

// Routes
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

// 5. Error handling middleware (VULNERABILITY FIX #2 - Improper Error Handling)
app.use((err, req, res, next) => {
  // Log the detailed error for debugging (server-side only)
  console.error('Error:', err);
  
  // Send generic error message to client
  const statusCode = err.status || 500;
  
  // Ensure error response doesn't cause protocol violations
  try {
    res.status(statusCode).json({
      error: 'An error occurred while processing your request'
    });
  } catch (headerError) {
    // Fallback if there's still a header issue
    console.error('Header error in error handler:', headerError);
    res.end();
  }
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on https://www.shorthandonlineexam.in:${PORT}`);
});