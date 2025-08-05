// app.js
// This is the main entry point for the Shorthand Online Exam backend application.
// It sets up the server, middleware, routes, and security configurations.
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

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

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

// CORS configuration (KEEP ONLY THIS - REMOVE THE DUPLICATE)
// For the more restrictive approach, disable preflight completely
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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false, // Don't pass control to next handler
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};

// Use CORS with the above options
app.use(cors(corsOptions));

app.use(cors({
  origin: ['*', 'http://3.109.1.101:3000', 'http://3.109.1.101:3001', 'http://3.109.1.101:3002', 'http://43.204.22.53:5000', 'https://www.shorthandonlineexam.in', 'http://65.0.124.197:5000','http://65.0.124.197:5000/api/compare'],
  credentials: true
}));

// Add security headers middleware
// Add security headers middleware (UPDATE THIS SECTION)
app.use((req, res, next) => {
  // Strict-Transport-Security (HSTS) - Force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
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
  
  // Permissions Policy - Restrict browser features
  res.setHeader('Permissions-Policy', 
    'geolocation=(), ' +
    'camera=(), ' +
    'microphone=(), ' +
    'accelerometer=(), ' +
    'ambient-light-sensor=(), ' +
    'autoplay=(), ' +
    'battery=(), ' +
    'display-capture=(), ' +
    'document-domain=(), ' +
    'encrypted-media=(), ' +
    'fullscreen=(), ' +
    'gyroscope=(), ' +
    'magnetometer=(), ' +
    'midi=(), ' +
    'payment=(), ' +
    'picture-in-picture=(), ' +
    'publickey-credentials-get=(), ' +
    'screen-wake-lock=(), ' +
    'sync-xhr=(), ' +
    'usb=(), ' +
    'web-share=(), ' +
    'xr-spatial-tracking=()'
  );
  
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

// Disable unnecessary HTTP methods (REPLACE YOUR CURRENT MIDDLEWARE)
app.use((req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  
  // Handle OPTIONS method specifically
  if (req.method === 'OPTIONS') {
    // Check if this is a CORS preflight request
    const origin = req.headers.origin;
    const corsOrigins = [
      'http://localhost:3001', 
      'http://192.168.1.102:3001',
      'http://3.109.1.101:3000', 
      'http://3.109.1.101:3001', 
      'http://3.109.1.101:3002', 
      'http://43.204.22.53:5000', 
      'https://www.shorthandonlineexam.in', 
      'http://65.0.124.197:5000'
    ];
    
    // Only allow OPTIONS for valid CORS preflight requests
    if (origin && corsOrigins.includes(origin) && req.headers['access-control-request-method']) {
      // This is a valid CORS preflight request - let CORS middleware handle it
      return next();
    } else {
      // This is a standalone OPTIONS request - block it
      console.log('Blocked standalone OPTIONS request from:', req.ip, 'User-Agent:', req.get('User-Agent'));
      return res.status(405).json({ 
        error: 'Method Not Allowed',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Check other methods
  if (!allowedMethods.includes(req.method)) {
    // Log the blocked request for security monitoring
    console.log('Blocked HTTP method:', req.method, 'from IP:', req.ip, 'to URL:', req.url, 'User-Agent:', req.get('User-Agent'));
    
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      allow: allowedMethods.join(', '), // Tell client which methods are allowed
      timestamp: new Date().toISOString()
    });
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

// Global error handling middleware (ADD THIS BEFORE app.listen())
app.use((err, req, res, next) => {
  // Log detailed error information server-side for debugging
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Determine error type and send generic response
  let statusCode = 500;
  let message = 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
  } else if (err.name === 'UnauthorizedError' || err.status === 401) {
    statusCode = 401;
    message = 'Authentication failed';
  } else if (err.status === 403) {
    statusCode = 403;
    message = 'Access denied';
  } else if (err.status === 404) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.status === 429) {
    statusCode = 429;
    message = 'Too many requests';
  }

  // Send generic error response
  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString()
  });
});

// Handle 404 errors (ADD THIS BEFORE the global error handler)
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Resource not found',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on https://www.shorthandonlineexam.in`);
});