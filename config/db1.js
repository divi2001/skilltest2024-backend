const mysql = require('mysql2/promise');
require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    charset: 'utf8mb4',
    connectionLimit: 50,         // Reduced to a reasonable number
    queueLimit: 0,
    enableKeepAlive: true,      // Add this
    keepAliveInitialDelay: 0,   // Add this
    idleTimeout: 60000,         // Connection timeout after 60 seconds of inactivity
    maxIdle: 10,                // Maximum number of idle connections to keep
    namedPlaceholders: true     // Optional: for better query parameter handling
});

// Add error handling
connection.on('error', (err) => {
    console.error('Database pool error:', err);
});

// Add connection monitoring (optional)
setInterval(async () => {
    try {
        const [rows] = await connection.query('SELECT 1');
    } catch (err) {
        console.error('Connection check failed:', err);
    }
}, 60000);

module.exports = connection;