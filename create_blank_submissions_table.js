// Script to create blank_passage_submissions table
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createBlankSubmissionsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    try {
        console.log('Creating blank_passage_submissions table...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS blank_passage_submissions (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                student_id BIGINT NOT NULL,
                passage_type ENUM('passageA', 'passageB') NOT NULL,
                submitted_at DATETIME NOT NULL,
                center INT,
                batchNo INT,
                center_comment LONGTEXT NULL,
                commented_by VARCHAR(255) NULL,
                commented_at DATETIME NULL,
                viewed_by_admin BOOLEAN DEFAULT FALSE,
                INDEX idx_student_id (student_id),
                INDEX idx_center (center),
                INDEX idx_batchNo (batchNo),
                INDEX idx_submitted_at (submitted_at)
            )
        `;

        await connection.query(createTableQuery);
        console.log('✅ blank_passage_submissions table created successfully!');

        // Verify table structure
        const [columns] = await connection.query('SHOW COLUMNS FROM blank_passage_submissions');
        console.log('\nTable structure:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type}`);
        });

    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await connection.end();
    }
}

createBlankSubmissionsTable();
