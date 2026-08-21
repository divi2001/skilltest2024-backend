// Loaded first so anything below can read .env (PORT, DB credentials, SECRET_KEY).
require('dotenv').config();

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
const blankPassageRoutes = require('./routes/blank_passage_routes');

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
// Overridable so this API can move off 3000 when another local service is already there.
const PORT = Number(process.env.PORT) || 3000;

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
  origin: ['*', 'http://3.109.1.101:3000', 'http://3.109.1.101:3001', 'http://3.109.1.101:3002', 'http://43.204.22.53:5000', 'https://www.shorthandonlineexam.in', 'http://65.0.124.197:5000', 'http://65.0.124.197:5000/api/compare', 'http://checking.shorthandonlineexam.in', 'https://checking.shorthandonlineexam.in/'],
  credentials: true
}));

// ✅ STEP 4: Session middleware
// Sessions are persisted in MySQL rather than the default in-memory store. MemoryStore keeps
// sessions in the Node process, so ANY restart - a pm2 crash-restart, a redeploy, watch-mode
// reload - wiped every session at once and logged all centers out mid-exam (most noticeably
// around report downloads/uploads). A DB-backed store survives restarts.
require('dotenv').config();
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  createDatabaseTable: true,          // auto-creates the `sessions` table on first boot
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000     // keep in step with cookie maxAge below
});
// Never let a transient store hiccup take the process down.
sessionStore.on('error', (err) => console.error('[session store]', err.message));

// The 'error' listener above is NOT enough on its own. express-mysql-session runs
// its expired-session sweep with
//     setInterval(this.clearExpiredSessions.bind(this), interval)
// and clearExpiredSessions() rethrows on failure. setInterval discards the
// returned promise, so a failed sweep becomes an unhandled rejection — which Node
// 20 turns into a process exit — and it never reaches the 'error' listener.
//
// That killed the server mid-run: the 15-minute sweep fired during a long marks
// calculation, found a pooled connection the database had already dropped, and
// took the whole process down with ECONNRESET. Run the sweep ourselves so the
// failure is caught. The pool discards the dead connection, so the next sweep
// gets a fresh one and recovers on its own.
sessionStore.clearExpirationInterval();
const SESSION_SWEEP_INTERVAL = 15 * 60 * 1000;
setInterval(() => {
  sessionStore.clearExpiredSessions().catch((err) => {
    console.error('[session store] expired-session sweep failed:', err.code || err.message);
  });
}, SESSION_SWEEP_INTERVAL).unref();   // must not hold the process open on shutdown

// Safety net for the same class of failure anywhere else. A stray rejection
// should be loud, not fatal — losing a 15-minute calculation to an unrelated
// transient is worse than carrying on. uncaughtException is deliberately NOT
// handled here: that one leaves the process in an undefined state.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.stack : reason);
});

app.use(session({
  secret: 'divis@GeYT',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,           // don't write a row for every anonymous visitor
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
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

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
app.use('/api/blank-submissions', blankPassageRoutes);
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

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`✅ Server running on https://checking.shorthandonlineexam.in`);
//   console.log(`✅ Max payload size: 500mb`);
// });

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`✅ Server running on http://103.17.193.168:${PORT}`);
//   console.log(`✅ Max payload size: 500mb`);
// });

// app.listen(PORT, 'localhost', () => {
//   console.log(`✅ Server running on https://www.shorthandonlineexam.in`);
//   console.log(`✅ Max payload size: 500mb`);
// });