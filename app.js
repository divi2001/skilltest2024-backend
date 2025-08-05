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

// Custom logging function for detailed error tracking
const logError = (context, error, req = null) => {
  const timestamp = new Date().toISOString();
  const userAgent = req ? req.get('User-Agent') || 'Unknown' : 'N/A';
  const ip = req ? req.ip || req.connection.remoteAddress || 'Unknown' : 'N/A';
  
  console.error(`[${timestamp}] ${context} Error:`, {
    message: error.message,
    stack: error.stack,
    userAgent,
    ip,
    url: req ? req.url : 'N/A',
    method: req ? req.method : 'N/A',
    headers: req ? JSON.stringify(req.headers, null, 2) : 'N/A'
  });
};

// 1. HTTPS redirect middleware (VULNERABILITY FIX #1 - Insecure Communication)
app.use((req, res, next) => {
  try {
    if (req.header('x-forwarded-proto') !== 'https') {
      console.log(`HTTPS redirect for: ${req.url} from IP: ${req.ip}`);
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  } catch (error) {
    logError('HTTPS Redirect', error, req);
    next();
  }
});

// 2. Enhanced header sanitization middleware to fix protocol violation
app.use((req, res, next) => {
  try {
    // Store original methods
    const originalSetHeader = res.setHeader;
    const originalWriteHead = res.writeHead;
    const originalEnd = res.end;
    const originalSend = res.send;
    const originalJson = res.json;

    // Override setHeader with comprehensive sanitization
    res.setHeader = function(name, value) {
      try {
        if (typeof value === 'string') {
          // Remove CR, LF, and other control characters that cause protocol violations
          value = value.replace(/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          // Ensure no leading/trailing whitespace
          value = value.trim();
        }
        
        // Validate header name
        if (typeof name === 'string') {
          name = name.replace(/[\r\n\x00-\x1F\x7F]/g, '');
        }
        
        return originalSetHeader.call(this, name, value);
      } catch (headerError) {
        logError('SetHeader', headerError, req);
        console.error(`Problematic header - Name: "${name}", Value: "${value}"`);
        return this;
      }
    };

    // Override writeHead to handle status line issues
    res.writeHead = function(statusCode, statusMessage, headers) {
      try {
        // Sanitize status message if provided
        if (typeof statusMessage === 'string') {
          statusMessage = statusMessage.replace(/[\r\n\x00-\x1F\x7F]/g, '');
        }
        
        // Sanitize headers object if provided
        if (headers && typeof headers === 'object') {
          Object.keys(headers).forEach(key => {
            if (typeof headers[key] === 'string') {
              headers[key] = headers[key].replace(/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
            }
          });
        }
        
        return originalWriteHead.call(this, statusCode, statusMessage, headers);
      } catch (writeHeadError) {
        logError('WriteHead', writeHeadError, req);
        console.error(`WriteHead error - StatusCode: ${statusCode}, Message: "${statusMessage}"`);
        return originalWriteHead.call(this, statusCode);
      }
    };

    // Override send method
    res.send = function(body) {
      try {
        return originalSend.call(this, body);
      } catch (sendError) {
        logError('Send', sendError, req);
        if (!this.headersSent) {
          this.status(500);
          return originalEnd.call(this, 'Internal Server Error');
        }
        return originalEnd.call(this);
      }
    };

    // Override json method
    res.json = function(obj) {
      try {
        return originalJson.call(this, obj);
      } catch (jsonError) {
        logError('JSON', jsonError, req);
        if (!this.headersSent) {
          this.status(500);
          return originalSend.call(this, '{"error":"Internal Server Error"}');
        }
        return originalEnd.call(this);
      }
    };

    // Override end method
    res.end = function(chunk, encoding) {
      try {
        return originalEnd.call(this, chunk, encoding);
      } catch (endError) {
        logError('End', endError, req);
        return originalEnd.call(this);
      }
    };

    next();
  } catch (error) {
    logError('Header Sanitization Middleware', error, req);
    next();
  }
});

// 3. Security headers middleware (VULNERABILITY FIX #3 - Missing Security Headers)
app.use((req, res, next) => {
  try {
    // Set headers one by one with error handling
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    };

    Object.entries(headers).forEach(([name, value]) => {
      try {
        res.setHeader(name, value);
      } catch (headerError) {
        console.error(`Failed to set header ${name}:`, headerError);
      }
    });
  } catch (error) {
    logError('Security Headers', error, req);
  }
  next();
});

// 4. HTTP method restriction (VULNERABILITY FIX #4 - OPTIONS Method Enabled)
app.use((req, res, next) => {
  try {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (!allowedMethods.includes(req.method)) {
      console.log(`Blocked method ${req.method} from ${req.ip} for ${req.url}`);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    next();
  } catch (error) {
    logError('Method Restriction', error, req);
    next();
  }
});

// Body parser middleware with error handling
app.use((req, res, next) => {
  bodyParser.urlencoded({ extended: true })(req, res, (err) => {
    if (err) {
      logError('Body Parser URL', err, req);
      return res.status(400).json({ error: 'Invalid request data' });
    }
    next();
  });
});

app.use((req, res, next) => {
  bodyParser.json()(req, res, (err) => {
    if (err) {
      logError('Body Parser JSON', err, req);
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
    next();
  });
});

// CORS configuration with enhanced error handling
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3001', 
      'http://192.168.1.102:3001',
      'http://3.109.1.101:3000', 
      'http://3.109.1.101:3001', 
      'http://3.109.1.101:3002', 
      'http://43.204.22.53:5000', 
      'https://www.shorthandonlineexam.in', 
      'http://65.0.124.197:5000'
    ];
    
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use((req, res, next) => {
  cors(corsOptions)(req, res, (err) => {
    if (err) {
      logError('CORS', err, req);
      return res.status(403).json({ error: 'CORS policy violation' });
    }
    next();
  });
});

// Updated session configuration with error handling
app.use((req, res, next) => {
  session({
    secret: 'divis@GeYT',
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })(req, res, (err) => {
    if (err) {
      logError('Session', err, req);
    }
    next();
  });
});

// Static file handling
const uploadsDir = path.join(__dirname,'uploads');

if(!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname,'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
  next();
});

// Routes with error wrapping
const routeErrorHandler = (router) => {
  return (req, res, next) => {
    try {
      router(req, res, next);
    } catch (error) {
      logError('Route Handler', error, req);
      next(error);
    }
  };
};

app.use(routeErrorHandler(studentRoutes));
app.use(routeErrorHandler(examcentereRoutes));
app.use(routeErrorHandler(dataInputRoutes));
app.use(routeErrorHandler(adminFunctionRouter));
app.use(routeErrorHandler(examDashBoardRoutes));
app.use(routeErrorHandler(examDashboardDetailsRoutes));
app.use(routeErrorHandler(trackStudentRoutes));
app.use(routeErrorHandler(pdfRoutes));
app.use(routeErrorHandler(fetchRoutes));
app.use(routeErrorHandler(departmentRoutes));
app.use(routeErrorHandler(answerSheetRoutes));
app.use(routeErrorHandler(typingRoutes));
app.use(routeErrorHandler(excelRouter));
app.use(routeErrorHandler(superAdminTrackDashboardRoute));

// Expert Routes
app.use(routeErrorHandler(expertLoginRoutes));
app.use(routeErrorHandler(expertDashboardStage3Routes));

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  } catch (error) {
    logError('Static File Serve', error, req);
    res.status(404).json({ error: 'Page not found' });
  }
});

// 5. Enhanced error handling middleware (VULNERABILITY FIX #2 - Improper Error Handling)
app.use((err, req, res, next) => {
  logError('Global Error Handler', err, req);
  
  const statusCode = err.status || err.statusCode || 500;
  
  // Check if headers have already been sent
  if (res.headersSent) {
    console.error('Headers already sent, cannot send error response');
    return;
  }
  
  try {
    // Ensure we can set the status
    res.status(statusCode);
    
    // Try to send JSON response
    res.json({
      error: 'An error occurred while processing your request',
      timestamp: new Date().toISOString()
    });
  } catch (responseError) {
    logError('Error Response', responseError, req);
    
    // Final fallback - just end the response
    try {
      res.end('Internal Server Error');
    } catch (finalError) {
      console.error('Final error handler failed:', finalError);
    }
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Don't exit in production, just log
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on https://www.shorthandonlineexam.in:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Process ID: ${process.pid}`);
});