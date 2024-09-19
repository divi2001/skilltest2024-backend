const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

const connection = mysql.createPool({
    host: "13.233.102.6",
    port: process.env.DB_PORT || 3306, // Add this line
    user: "tanuj",
    password: "Tigertan1$$1",
    database: 'mpsc',
    waitForConnections: true,
    charset: 'utf8mb4',
    connectionLimit: 100000,
    queueLimit: 0
});

module.exports = connection;