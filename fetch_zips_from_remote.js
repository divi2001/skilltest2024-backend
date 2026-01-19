const fs = require('fs');
const path = require('path');
const axios = require('axios');
const connection = require('./config/db1'); // Adjust path to config/db1.js

const BASE_URL = 'http://13.204.48.33:8000/typing_passage_logs/';
const DOWNLOAD_DIR = path.join(__dirname, 'downloaded_passage_logs');

// ========== BATCH CONFIGURATION ==========
// Specify which batches to fetch. Set to null to fetch all batches.
const BATCHES_TO_FETCH = [101, 102, 103, 104]; // Only fetch these specific batches
// const BATCHES_TO_FETCH = null; // Uncomment to fetch ALL batches
// =========================================

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const downloadFile = async (filename) => {
    if (!filename) return;

    const fileUrl = `${BASE_URL}${filename}`;
    const filePath = path.join(DOWNLOAD_DIR, filename);

    // Skip if already exists (optional, but good for resuming)
    if (fs.existsSync(filePath)) {
        console.log(`[SKIP] ${filename} already exists.`);
        return;
    }

    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`[SUCCESS] Downloaded: ${filename}`);
                resolve();
            });
            writer.on('error', (err) => {
                console.error(`[ERROR] Writing ${filename}:`, err.message);
                reject(err);
            });
        });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`[NOT FOUND] ${filename} not found on server.`);
        } else {
            console.error(`[ERROR] Downloading ${filename}:`, error.message);
        }
    }
};

const fetchAndDownloadZips = async () => {
    try {
        console.log('Fetching filenames from trackrecord table...');

        // Build query with optional batch filtering
        let query = `
            SELECT 
                tr.student_id, 
                tr.PA_filename, 
                tr.PB_filename,
                s.batchNo
            FROM trackrecord tr
            INNER JOIN students s ON tr.student_id = s.student_id
        `;

        let queryParams = [];

        if (BATCHES_TO_FETCH && BATCHES_TO_FETCH.length > 0) {
            const placeholders = BATCHES_TO_FETCH.map(() => '?').join(',');
            query += ` WHERE s.batchNo IN (${placeholders})`;
            queryParams = BATCHES_TO_FETCH;
            console.log(`Filtering for batches: ${BATCHES_TO_FETCH.join(', ')}`);
        } else {
            console.log('Fetching ALL batches');
        }

        query += ' ORDER BY s.batchNo, tr.student_id';

        const [rows] = await connection.query(query, queryParams);

        console.log(`Found ${rows.length} records. Starting downloads...`);

        // Show batch distribution
        if (rows.length > 0) {
            const batchCounts = {};
            rows.forEach(r => {
                batchCounts[r.batchNo] = (batchCounts[r.batchNo] || 0) + 1;
            });
            console.log('Batch distribution:');
            Object.keys(batchCounts).sort().forEach(batch => {
                console.log(`  Batch ${batch}: ${batchCounts[batch]} students`);
            });
            console.log('');
        }

        // Process sequentially to avoid overwhelming the server or network
        // Or use Promise.all with chunks for concurrency if needed.
        // For simplicity and safety, we'll do sequential or small batches.

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const record of rows) {
            console.log(`Processing Student ${record.student_id} (Batch ${record.batchNo})...`);

            if (record.PA_filename) {
                await downloadFile(record.PA_filename);
            }
            if (record.PB_filename) {
                await downloadFile(record.PB_filename);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('All downloads completed!');
        console.log(`Total records processed: ${rows.length}`);
        console.log('='.repeat(60));

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Script failed:', error);
        await connection.end();
        process.exit(1);
    }
};

fetchAndDownloadZips();
