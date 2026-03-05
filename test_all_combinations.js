/**
 * =============================================================
 *  STUDENT EXAM DATA TESTER
 * =============================================================
 *  Tests all unique (subjectsId, qset, departmentId) combinations
 *  by picking one student per combo, logging in, and hitting
 *  every endpoint the WPF frontend uses — then printing a
 *  clear report of what data / audio URLs come back.
 *
 *  Usage:
 *    node test_all_combinations.js                  # test ALL combos
 *    node test_all_combinations.js --combo 1,1,10   # test specific subjectId,qset,departmentId
 *    node test_all_combinations.js --student 8251539083  # test specific student
 *    node test_all_combinations.js --batch 100      # only combos from batch 100
 * =============================================================
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

// ───────── Config ─────────
const BASE_URL = 'https://www.shorthandonlineexam.in';
const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};
const SECRET_KEY = process.env.SECRET_KEY;

// ───────── Encryption helpers (same as backend) ─────────
const key = crypto.createHash('sha256').update(SECRET_KEY).digest();

function encrypt(obj) {
    const plainText = JSON.stringify(obj);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText) {
    if (typeof encryptedText !== 'string') return encryptedText;
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) return encryptedText;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    try { return JSON.parse(decrypted); } catch { return decrypted; }
}

// ───────── Parse CLI args ─────────
function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--combo' && args[i + 1]) {
            const parts = args[i + 1].split(',');
            opts.filterCombo = { subjectsId: parts[0], qset: parts[1], departmentId: parts[2] };
            i++;
        } else if (args[i] === '--student' && args[i + 1]) {
            opts.filterStudent = args[i + 1];
            i++;
        } else if (args[i] === '--batch' && args[i + 1]) {
            opts.filterBatch = args[i + 1];
            i++;
        } else if (args[i] === '--skip-login') {
            opts.skipLogin = true;
        }
    }
    return opts;
}

// ───────── Create an axios client with cookie jar (session) ─────────
function createClient() {
    // Manual cookie jar using axios interceptors
    let cookies = [];

    const client = axios.create({
        baseURL: BASE_URL,
        withCredentials: true,
        timeout: 30000,
        headers: { 'User-Agent': 'ShorthandExamTester/1.0' },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    // Response interceptor: collect Set-Cookie headers
    client.interceptors.response.use(response => {
        const setCookies = response.headers['set-cookie'];
        if (setCookies) {
            for (const raw of setCookies) {
                const name = raw.split('=')[0].trim();
                // Replace existing cookie with same name
                cookies = cookies.filter(c => !c.startsWith(name + '='));
                cookies.push(raw.split(';')[0]); // store just name=value
            }
        }
        return response;
    });

    // Request interceptor: attach cookies
    client.interceptors.request.use(config => {
        if (cookies.length > 0) {
            config.headers['Cookie'] = cookies.join('; ');
        }
        return config;
    });

    return client;
}

// ───────── Database queries ─────────
async function getAllUniqueCombinations(pool, opts) {
    let query = `
        SELECT 
            s.subjectsId,
            s.qset,
            s.departmentId,
            d.departmentName,
            d.examType,
            sub.subject_name,
            sub.subject_name_short,
            COUNT(*) as student_count,
            MIN(s.student_id) as sample_student_id
        FROM students s
        LEFT JOIN departmentdb d ON s.departmentId = d.departmentId
        LEFT JOIN subjectsdb sub ON s.subjectsId = sub.subjectId AND d.examType = sub.examType
        WHERE 1=1
    `;
    const params = [];

    if (opts.filterCombo) {
        query += ' AND s.subjectsId = ? AND s.qset = ? AND s.departmentId = ?';
        params.push(opts.filterCombo.subjectsId, opts.filterCombo.qset, opts.filterCombo.departmentId);
    }
    if (opts.filterBatch) {
        query += ' AND s.batchNo = ?';
        params.push(opts.filterBatch);
    }
    if (opts.filterStudent) {
        query += ' AND s.student_id = ?';
        params.push(opts.filterStudent);
    }

    query += ' GROUP BY s.subjectsId, s.qset, s.departmentId ORDER BY s.departmentId, s.subjectsId, s.qset';

    const [rows] = await pool.query(query, params);
    return rows;
}

async function getStudentForTesting(pool, combo, opts) {
    if (opts.filterStudent) {
        const [rows] = await pool.query('SELECT * FROM students WHERE student_id = ?', [opts.filterStudent]);
        return rows[0] || null;
    }

    // Pick a student who is NOT logged in (loggedin = 0) for this combo
    const [rows] = await pool.query(
        `SELECT * FROM students 
         WHERE subjectsId = ? AND qset = ? AND departmentId = ? AND loggedin = 0
         ORDER BY student_id LIMIT 1`,
        [combo.subjectsId, combo.qset, combo.departmentId]
    );

    if (rows.length > 0) return rows[0];

    // If all are logged in, just pick any one (we'll need to reset it)
    const [allRows] = await pool.query(
        `SELECT * FROM students 
         WHERE subjectsId = ? AND qset = ? AND departmentId = ?
         ORDER BY student_id LIMIT 1`,
        [combo.subjectsId, combo.qset, combo.departmentId]
    );
    return allRows[0] || null;
}

async function getAudioDbEntry(pool, subjectId, qset, departmentId) {
    const [rows] = await pool.query(
        'SELECT * FROM audiodb WHERE subjectId = ? AND qset = ? AND departmentId = ?',
        [subjectId, qset, departmentId]
    );
    return rows[0] || null;
}

async function getBatchInfo(pool, batchNo) {
    const [rows] = await pool.query('SELECT * FROM batchdb WHERE batchNo = ?', [batchNo]);
    return rows[0] || null;
}

async function resetStudentLogin(pool, studentId) {
    await pool.query('UPDATE students SET loggedin = 0 WHERE student_id = ?', [studentId]);
}

// ───────── Test the full student flow via API ─────────
async function testStudentFlow(client, student, pool) {
    const results = {
        login: null,
        studentDetails: null,
        examStages: null,
        audios: null,
        controllerPass: null,
        errors: [],
    };

    const decryptedPassword = decrypt(student.password);

    // 1. LOGIN
    try {
        const loginPayload = {
            userId: student.student_id.toString(),
            password: encrypt(decryptedPassword),
            ipAddress: '127.0.0.1',
            diskIdentifier: 'TEST_DISK_ID',
            macAddress: 'TEST_MAC_ADDRESS',
        };

        // We need pcregistration for this center with our mac — let's register first
        // Check if test MAC exists
        const [existingRegs] = await pool.query(
            'SELECT * FROM pcregistration WHERE center = ? AND mac_address = ?',
            [student.center, 'TEST_MAC_ADDRESS']
        );

        if (existingRegs.length === 0) {
            await pool.query(
                'INSERT INTO pcregistration (center, ip_address, disk_id, mac_address) VALUES (?, ?, ?, ?)',
                [student.center, '127.0.0.1', 'TEST_DISK_ID', 'TEST_MAC_ADDRESS']
            );
        }

        // Ensure batch is active
        await pool.query('UPDATE batchdb SET batchstatus = 1 WHERE batchNo = ?', [student.batchNo]);

        // Ensure student is not logged in
        await resetStudentLogin(pool, student.student_id);

        const loginResp = await client.post('/student_login', loginPayload);
        results.login = { status: loginResp.status, data: loginResp.data };
    } catch (err) {
        results.login = { status: err.response?.status, data: err.response?.data || err.message };
        results.errors.push(`LOGIN FAILED: ${err.response?.data || err.message}`);
        return results; // Can't proceed without login
    }

    // 2. GET STUDENT DETAILS
    try {
        const detailsResp = await client.get('/student_details');
        const encryptedData = detailsResp.data;
        const decryptedData = {};
        for (const [k, v] of Object.entries(encryptedData)) {
            try { decryptedData[k] = decrypt(v); } catch { decryptedData[k] = v; }
        }
        results.studentDetails = decryptedData;
    } catch (err) {
        results.studentDetails = { error: err.response?.data || err.message };
        results.errors.push(`STUDENT_DETAILS FAILED: ${err.response?.data || err.message}`);
    }

    // 3. GET EXAM STAGES
    try {
        const stagesResp = await client.get('/get-examStages');
        results.examStages = stagesResp.data;
    } catch (err) {
        results.examStages = { error: err.response?.data || err.message };
        results.errors.push(`EXAM_STAGES FAILED: ${err.response?.data || err.message}`);
    }

    // 4. GET AUDIOS (THE KEY ONE)
    try {
        const audiosResp = await client.get('/audios');
        const encryptedData = audiosResp.data;
        const decryptedAudios = {};
        for (const [k, v] of Object.entries(encryptedData)) {
            if (v === null) {
                decryptedAudios[k] = null;
            } else {
                try { decryptedAudios[k] = decrypt(v); } catch { decryptedAudios[k] = v; }
            }
        }
        results.audios = decryptedAudios;
    } catch (err) {
        results.audios = { error: err.response?.data || err.message };
        results.errors.push(`AUDIOS FAILED: ${err.response?.data || err.message}`);
    }

    // 5. GET CONTROLLER PASSWORD
    try {
        const passResp = await client.get('/controller_pass');
        if (typeof passResp.data === 'object') {
            const decrypted = {};
            for (const [k, v] of Object.entries(passResp.data)) {
                try { decrypted[k] = decrypt(v); } catch { decrypted[k] = v; }
            }
            results.controllerPass = decrypted;
        } else {
            results.controllerPass = passResp.data;
        }
    } catch (err) {
        results.controllerPass = { error: err.response?.data || err.message };
        results.errors.push(`CONTROLLER_PASS FAILED: ${err.response?.data || err.message}`);
    }

    // 6. LOGOUT & RESET
    try {
        await client.get('/student_logout');
    } catch { /* ignore */ }
    await resetStudentLogin(pool, student.student_id);

    return results;
}

// ───────── Direct DB check (no login needed) ─────────
async function directDbCheck(pool, combo, student) {
    const results = {
        student: {
            student_id: student.student_id,
            fullname: student.fullname,
            subjectsId: student.subjectsId,
            qset: student.qset,
            departmentId: student.departmentId,
            batchNo: student.batchNo,
            center: student.center,
            IsShorthand: student.IsShorthand,
            IsTypewriting: student.IsTypewriting,
            disability: student.disability,
            loggedin: student.loggedin,
            done: student.done,
        },
        subject: null,
        audio: null,
        batch: null,
        issues: [],
    };

    // Check subject exists
    const deptQuery = 'SELECT examType FROM departmentdb WHERE departmentId = ?';
    const [depts] = await pool.query(deptQuery, [student.departmentId]);
    const examType = depts.length > 0 ? depts[0].examType : 'GCC';

    const [subjects] = await pool.query(
        'SELECT * FROM subjectsdb WHERE subjectId = ? AND examType = ?',
        [student.subjectsId, examType]
    );

    if (subjects.length === 0) {
        results.issues.push(`SUBJECT NOT FOUND: subjectId=${student.subjectsId}, examType=${examType}`);
    } else {
        results.subject = subjects[0];
    }

    // Check audio exists
    const audio = await getAudioDbEntry(pool, student.subjectsId, student.qset, student.departmentId);
    if (!audio) {
        results.issues.push(`AUDIO NOT FOUND: subjectId=${student.subjectsId}, qset=${student.qset}, departmentId=${student.departmentId}`);
    } else {
        results.audio = {
            id: audio.id,
            subjectId: audio.subjectId,
            qset: audio.qset,
            departmentId: audio.departmentId,
            code_a: audio.code_a,
            code_b: audio.code_b,
            code_t: audio.code_t,
            audio1: audio.audio1,
            audio2: audio.audio2,
            testaudio: audio.testaudio,
            passage1: audio.passage1 ? `[${audio.passage1.length} chars]` : null,
            passage2: audio.passage2 ? `[${audio.passage2.length} chars]` : null,
            textPassageA: audio.textPassageA ? `[${audio.textPassageA.length} chars]` : null,
            textPassageB: audio.textPassageB ? `[${audio.textPassageB.length} chars]` : null,
        };

        // Check audio URLs are not empty
        if (!audio.audio1) results.issues.push('audio1 URL is NULL/empty');
        if (!audio.audio2) results.issues.push('audio2 URL is NULL/empty');
        if (!audio.testaudio) results.issues.push('testaudio URL is NULL/empty');
        if (!audio.passage1) results.issues.push('passage1 text is NULL/empty');
        if (!audio.passage2) results.issues.push('passage2 text is NULL/empty');
    }

    // Check batch
    const batch = await getBatchInfo(pool, student.batchNo);
    if (!batch) {
        results.issues.push(`BATCH NOT FOUND: batchNo=${student.batchNo}`);
    } else {
        results.batch = batch;
        if (batch.batchstatus !== 1) {
            results.issues.push(`BATCH NOT ACTIVE: batchNo=${student.batchNo}, status=${batch.batchstatus}`);
        }
    }

    // Check password
    try {
        const pwd = decrypt(student.password);
        results.student.decryptedPassword = pwd;
    } catch (e) {
        results.issues.push(`PASSWORD DECRYPT FAILED: ${e.message}`);
    }

    return results;
}

// ───────── Audio URL validation ─────────
async function validateAudioUrl(url) {
    if (!url) return { valid: false, reason: 'URL is null/empty' };
    try {
        const resp = await axios.head(url, {
            timeout: 10000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });
        return { valid: resp.status === 200, status: resp.status, contentType: resp.headers['content-type'] };
    } catch (err) {
        return { valid: false, reason: err.message, status: err.response?.status };
    }
}

// ───────── Pretty print ─────────
function printSeparator(char = '═', len = 80) {
    console.log(char.repeat(len));
}

function printHeader(text) {
    printSeparator();
    console.log(`  ${text}`);
    printSeparator();
}

function printSubHeader(text) {
    console.log(`\n  ── ${text} ──`);
}

function printKeyValue(key, value, indent = 4) {
    const padding = ' '.repeat(indent);
    const displayValue = value === null ? 'NULL' : value === undefined ? 'UNDEFINED' : value;
    console.log(`${padding}${key.padEnd(25)}: ${displayValue}`);
}

// ───────── Main ─────────
async function main() {
    const opts = parseArgs();
    const pool = mysql.createPool(DB_CONFIG);

    console.log('\n');
    printHeader('STUDENT EXAM DATA TESTER');
    console.log(`  Base URL : ${BASE_URL}`);
    console.log(`  Database : ${DB_CONFIG.database}@${DB_CONFIG.host}`);
    console.log(`  Time     : ${new Date().toLocaleString()}`);

    if (opts.filterCombo) console.log(`  Filter   : combo ${opts.filterCombo.subjectsId},${opts.filterCombo.qset},${opts.filterCombo.departmentId}`);
    if (opts.filterStudent) console.log(`  Filter   : student ${opts.filterStudent}`);
    if (opts.filterBatch) console.log(`  Filter   : batch ${opts.filterBatch}`);

    printSeparator();

    // 1. Get all unique combinations
    const combos = await getAllUniqueCombinations(pool, opts);
    console.log(`\n  Found ${combos.length} unique (subjectsId, qset, departmentId) combinations\n`);

    if (combos.length === 0) {
        console.log('  No combinations found matching your filters. Exiting.');
        await pool.end();
        return;
    }

    // Summary table header
    console.log('  #   SubjectId  QSet  DeptId  DeptName                  ExamType  Subject                        Students');
    console.log('  ' + '─'.repeat(120));

    for (let i = 0; i < combos.length; i++) {
        const c = combos[i];
        console.log(
            `  ${String(i + 1).padStart(2)}  ${String(c.subjectsId).padStart(9)}  ${String(c.qset).padStart(4)}  ${String(c.departmentId).padStart(6)}  ${(c.departmentName || 'N/A').padEnd(24)}  ${(c.examType || '?').padEnd(8)}  ${(c.subject_name || 'N/A').padEnd(30)}  ${c.student_count}`
        );
    }

    // 2. Test each combination
    const allResults = [];
    let passCount = 0;
    let failCount = 0;

    for (let i = 0; i < combos.length; i++) {
        const combo = combos[i];
        printHeader(`COMBO ${i + 1}/${combos.length}:  subjectsId=${combo.subjectsId}  qset=${combo.qset}  departmentId=${combo.departmentId}`);
        console.log(`  Department : ${combo.departmentName || 'N/A'} (${combo.examType || '?'})`);
        console.log(`  Subject    : ${combo.subject_name || 'N/A'} (${combo.subject_name_short || ''})`);
        console.log(`  Students   : ${combo.student_count}`);

        // Pick a student
        const student = await getStudentForTesting(pool, combo, opts);
        if (!student) {
            console.log('  ⚠ No student found for this combination. Skipping.');
            failCount++;
            continue;
        }

        console.log(`  Test Student: ${student.student_id} (${student.fullname})`);

        // ── Direct DB Check ──
        printSubHeader('DATABASE CHECK (Direct)');
        const dbCheck = await directDbCheck(pool, combo, student);

        printKeyValue('Student ID', dbCheck.student.student_id);
        printKeyValue('Name', dbCheck.student.fullname);
        printKeyValue('Batch', dbCheck.student.batchNo);
        printKeyValue('Center', dbCheck.student.center);
        printKeyValue('IsShorthand', dbCheck.student.IsShorthand);
        printKeyValue('IsTypewriting', dbCheck.student.IsTypewriting);
        printKeyValue('Disability', dbCheck.student.disability);
        printKeyValue('Password (decrypted)', dbCheck.student.decryptedPassword || 'FAILED');

        if (dbCheck.subject) {
            printSubHeader('Subject Info');
            printKeyValue('Subject ID', dbCheck.subject.subjectId);
            printKeyValue('Subject Name', dbCheck.subject.subject_name);
            printKeyValue('ExamType', dbCheck.subject.examType);
            printKeyValue('Passage Timer', dbCheck.subject.passage_timer);
            printKeyValue('Demo Timer', dbCheck.subject.demo_timer);
            printKeyValue('Daily Timer', dbCheck.subject.daily_timer);
            printKeyValue('Disability Timer', dbCheck.subject.disability_passage_timer);
            printKeyValue('Typing Timer', dbCheck.subject.typing_timer);
        }

        if (dbCheck.audio) {
            printSubHeader('Audio DB Entry');
            printKeyValue('Audio DB ID', dbCheck.audio.id);
            printKeyValue('Code A', dbCheck.audio.code_a);
            printKeyValue('Code B', dbCheck.audio.code_b);
            printKeyValue('Code T', dbCheck.audio.code_t);
            printKeyValue('Audio 1 URL', dbCheck.audio.audio1);
            printKeyValue('Audio 2 URL', dbCheck.audio.audio2);
            printKeyValue('Test Audio URL', dbCheck.audio.testaudio);
            printKeyValue('Passage 1', dbCheck.audio.passage1);
            printKeyValue('Passage 2', dbCheck.audio.passage2);
            printKeyValue('TextPassage A', dbCheck.audio.textPassageA);
            printKeyValue('TextPassage B', dbCheck.audio.textPassageB);

            // Validate audio URLs
            printSubHeader('Audio URL Validation');
            const urls = [
                { name: 'Audio 1 (Passage A)', url: dbCheck.audio.audio1 },
                { name: 'Audio 2 (Passage B)', url: dbCheck.audio.audio2 },
                { name: 'Test Audio (Trial)', url: dbCheck.audio.testaudio },
            ];

            for (const u of urls) {
                if (u.url && u.url !== 'NULL' && u.url !== 'null') {
                    const validation = await validateAudioUrl(u.url);
                    const status = validation.valid ? 'OK' : `FAIL (${validation.reason || validation.status})`;
                    printKeyValue(u.name, `${status}  →  ${u.url}`);
                } else {
                    printKeyValue(u.name, 'MISSING (null)');
                }
            }
        }

        if (dbCheck.batch) {
            printSubHeader('Batch Info');
            printKeyValue('Batch No', dbCheck.batch.batchNo);
            printKeyValue('Batch Date', dbCheck.batch.batchdate);
            printKeyValue('Batch Status', dbCheck.batch.batchstatus === 1 ? 'ACTIVE' : `INACTIVE (${dbCheck.batch.batchstatus})`);
            printKeyValue('Start Time', dbCheck.batch.start_time);
            printKeyValue('End Time', dbCheck.batch.end_time);
        }

        // ── API Flow Test ──
        if (!opts.skipLogin) {
            printSubHeader('API FLOW TEST (Mimicking Frontend)');
            const client = createClient();

            try {
                const apiResults = await testStudentFlow(client, student, pool);

                // Login
                printKeyValue('Login', apiResults.login?.status === 200 ? `OK (${apiResults.login.data})` : `FAIL (${apiResults.login?.status}: ${apiResults.login?.data})`);

                // Student Details from API
                if (apiResults.studentDetails && !apiResults.studentDetails.error) {
                    printSubHeader('Student Details (from API, decrypted)');
                    const importantFields = ['student_id', 'fullname', 'subjectsId', 'qset', 'departmentId',
                        'subject_name', 'subject_name_short', 'batchNo', 'batchdate', 'center',
                        'IsShorthand', 'IsTypewriting', 'examType', 'passage_timer', 'demo_timer'];
                    for (const field of importantFields) {
                        if (apiResults.studentDetails[field] !== undefined) {
                            printKeyValue(field, apiResults.studentDetails[field]);
                        }
                    }
                } else {
                    printKeyValue('Student Details', `ERROR: ${apiResults.studentDetails?.error}`);
                }

                // Exam Stages
                if (apiResults.examStages && !apiResults.examStages.error) {
                    printSubHeader('Exam Stages');
                    if (apiResults.examStages.examStages) {
                        const stages = apiResults.examStages.examStages;
                        const completed = Object.entries(stages).filter(([, v]) => v).map(([k]) => k);
                        const pending = Object.entries(stages).filter(([, v]) => !v).map(([k]) => k);
                        printKeyValue('Completed', completed.length > 0 ? completed.join(', ') : 'None');
                        printKeyValue('Pending', pending.length > 0 ? pending.join(', ') : 'None');
                    }
                }

                // Audios from API  
                if (apiResults.audios && !apiResults.audios.error) {
                    printSubHeader('Audios (from API, decrypted)');
                    for (const [k, v] of Object.entries(apiResults.audios)) {
                        if (typeof v === 'string' && v.length > 200) {
                            printKeyValue(k, `[${v.length} chars]`);
                        } else {
                            printKeyValue(k, v);
                        }
                    }
                } else {
                    printKeyValue('Audios', `ERROR: ${apiResults.audios?.error}`);
                }

                // Controller Pass
                if (apiResults.controllerPass && !apiResults.controllerPass.error) {
                    printSubHeader('Controller Password');
                    for (const [k, v] of Object.entries(apiResults.controllerPass)) {
                        printKeyValue(k, v);
                    }
                }

                if (apiResults.errors.length > 0) {
                    printSubHeader('ERRORS');
                    for (const err of apiResults.errors) {
                        console.log(`    ✗ ${err}`);
                    }
                }

            } catch (err) {
                console.log(`    ✗ API test failed: ${err.message}`);
            }
        }

        // ── Issues ──
        if (dbCheck.issues.length > 0) {
            printSubHeader('ISSUES FOUND');
            for (const issue of dbCheck.issues) {
                console.log(`    ✗ ${issue}`);
            }
            failCount++;
        } else {
            console.log(`\n    ✓ All checks passed for this combination`);
            passCount++;
        }

        allResults.push({
            combo: `${combo.subjectsId}-${combo.qset}-${combo.departmentId}`,
            department: combo.departmentName,
            subject: combo.subject_name,
            studentCount: combo.student_count,
            sampleStudent: student.student_id,
            issues: dbCheck.issues,
            hasAudio: !!dbCheck.audio,
            hasSubject: !!dbCheck.subject,
        });
    }

    // ── Final Summary ──
    printHeader('FINAL SUMMARY');
    console.log(`  Total Combinations : ${combos.length}`);
    console.log(`  Passed             : ${passCount}`);
    console.log(`  Failed             : ${failCount}`);
    console.log('');

    // Summary table
    console.log('  Combo (sub-qset-dept)     Subject                  Dept                      Audio  Status');
    console.log('  ' + '─'.repeat(110));

    for (const r of allResults) {
        const status = r.issues.length === 0 ? '✓ OK' : `✗ ${r.issues.length} issue(s)`;
        console.log(
            `  ${r.combo.padEnd(26)} ${(r.subject || 'N/A').padEnd(24)} ${(r.department || 'N/A').padEnd(24)}  ${r.hasAudio ? 'YES' : 'NO '}    ${status}`
        );
    }

    // Print all issues
    const allIssues = allResults.filter(r => r.issues.length > 0);
    if (allIssues.length > 0) {
        printSubHeader('ALL ISSUES');
        for (const r of allIssues) {
            console.log(`\n  ${r.combo} (${r.subject || 'N/A'} / ${r.department || 'N/A'}):`);
            for (const issue of r.issues) {
                console.log(`    ✗ ${issue}`);
            }
        }
    }

    console.log('\n');
    await pool.end();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
