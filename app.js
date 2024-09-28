const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
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
const superAdminTrackDashboardRoute = require('./routes/superAdmin_updateDb')


const app = express();
const PORT = 3000;
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

app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'", "example.com"],
      "img-src": ["'self'", "https: data:"]
    }
  })
)

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; connect-src 'self' https://www.shorthandonlineexam.in; img-src 'self' data:;"
  );
  next();
});

// // Use CORS with the above options
app.use(cors(corsOptions));

app.use(cors({
  origin: ['*','http://3.109.1.101:3000', 'http://3.109.1.101:3001', 'http://3.109.1.101:3002', 'http://43.204.22.53:5000','http://localhost:3000'],
  credentials: true
}));


app.use(session({
  secret: 'divis@GeYT',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production", // Ensure cookies are sent over HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));


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


app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:3000`);
  });
  