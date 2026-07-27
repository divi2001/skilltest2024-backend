const mysql = require("mysql2/promise");
require("dotenv").config();

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 20);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    charset: "utf8mb4",
    connectionLimit,
    maxIdle: connectionLimit,
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS || 60000),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

module.exports = pool;
