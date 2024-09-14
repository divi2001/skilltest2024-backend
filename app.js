const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
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

const app = express();
const PORT = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3001', 'http://192.168.1.102:3001/'],// Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

// // Use CORS with the above options
app.use(cors(corsOptions));

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


//Test Route
app.get("/",(req,res)=>{

  res.send("<h1>I am Inevitable!!</h1>");
})
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  