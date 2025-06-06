
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // Add this line
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    charset: 'utf8mb4',
    connectionLimit: 100000,
    queueLimit: 0
});

module.exports = connection;