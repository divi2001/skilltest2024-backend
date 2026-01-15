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

const excelDataUploadRoutes = require('./routes/excelDataUploadRoutes');

const newDepartmentRoutes = require('./routes/newDepartment_routes');
const hallticketDepartmentRoutes = require('./routes/hallticketDepartment_routes');
const skilltestHallticketRoutes = require('./routes/skilltestHallticket_routes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const mockRoutes = require('./routes/mockRoutes');

const app = express();
const PORT = 3000;

// ✅ STEP 1: Set INCREASED body-parser limits FIRST (BEFORE any middleware)
app.use(bodyParser.urlencoded({ extended: true, limit: '500mb' }));
app.use(bodyParser.json({ limit: '500mb' }));

// ✅ STEP 2: Also use express with same limits
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// ✅ STEP 3: CORS configuration
const corsOptions = {
  origin: ['*', 'http://localhost:3001', 'http://192.168.1.102:3001/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

// Additional CORS for other origins
app.use(cors({
  origin: ['*', 'http://3.109.1.101:3000', 'http://3.109.1.101:3001', 'http://3.109.1.101:3002', 'http://43.204.22.53:5000', 'https://www.shorthandonlineexam.in', 'http://65.0.124.197:5000', 'http://65.0.124.197:5000/api/compare'],
  credentials: true
}));

// ✅ STEP 4: Session middleware
app.use(session({
  secret: 'divis@GeYT',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ✅ STEP 5: Set EJS as view engine BEFORE routes
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ STEP 6: Static files and uploads
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'uploads')));

// ✅ STEP 7: All routes AFTER middleware
app.use('/api/excel', excelDataUploadRoutes);
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
app.use('/api/new-department', newDepartmentRoutes);
app.use('/api/hallticket-departments', hallticketDepartmentRoutes);
app.use('/api/skilltest-halltickets', skilltestHallticketRoutes, hallticketDepartmentRoutes);
app.use('/api', mockRoutes);
app.use('/api/v1/evaluation', evaluationRoutes);
app.use(require('./routes/report_settings_routes'));

// Expert Routes
app.use(expertLoginRoutes);
app.use(expertDashboardStage3Routes);

// ✅ STEP 8: Static build files LAST
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, 'localhost', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Max payload size: 500mb`);
});
