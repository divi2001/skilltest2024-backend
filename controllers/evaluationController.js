// // const connection = require('../config/db1');
// // const ExcelJS = require('exceljs');
// // const levenshtein = require('fastest-levenshtein');
// // const { Worker } = require('worker_threads');
// // const path = require('path');
// // const fs = require('fs');

// // // Preprocess text function
// // function preprocessText(text) {
// //     if (!text) return '';
// //     text = String(text);
// //     text = text.replace(/_x[0-9A-Fa-f]{4}_/g, '');
// //     text = text.replace(/[-.,\$#"'|?!(){}\[\]:]/g, ' ');
// //     text = text.replace(/à¥¤|\\u200d|â€œ|â€|â€˜|â€™|â€"|â€¦/g, ' ');
// //     text = text.replace(/\s{2,}/g, ' ').trim();
// //     return text;
// // }

// // // Tokenize text based on language
// // function tokenizeText(text, language) {
// //     if (['hi', 'mar'].includes(language)) {
// //         return text.match(/\S+/g) || [];
// //     } else if (language === 'en') {
// //         text = text.toLowerCase();
// //         return text.split(/\s+/);
// //     } else {
// //         return text.split(/\s+/);
// //     }
// // }

// // // Word similarity using SequenceMatcher equivalent
// // function wordSimilarity(word1, word2) {
// //     const len1 = word1.length;
// //     const len2 = word2.length;
// //     const maxLen = Math.max(len1, len2);
    
// //     if (maxLen === 0) return 1.0;
    
// //     const distance = levenshtein.distance(word1, word2);
// //     return (maxLen - distance) / maxLen;
// // }

// // // Check if two words should be combined
// // function isCompoundWordCandidate(word1, word2, target) {
// //     if (word1.toLowerCase() === target.toLowerCase() || 
// //         word2.toLowerCase() === target.toLowerCase()) {
// //         return false;
// //     }
    
// //     const combined = (word1 + word2).replace(/\s/g, '').toLowerCase();
// //     const targetClean = target.replace(/\s/g, '').toLowerCase();
    
// //     if (combined === targetClean) return true;
    
// //     if (combined.length === targetClean.length) {
// //         const similarity = wordSimilarity(combined, targetClean);
// //         return similarity > 0.8;
// //     }
    
// //     return false;
// // }

// // // Compare texts algorithm (simplified version)
// // function compareTexts(text1, text2, ignoreList) {
// //     if (!text1 || !text2) {
// //         return { is_empty: true };
// //     }

// //     text1 = preprocessText(text1);
// //     text2 = preprocessText(text2);
// //     const ignoreLower = ignoreList.map(w => preprocessText(w).toLowerCase());

// //     // Simple language detection (defaulting to 'en')
// //     const language = 'en';
    
// //     const tokens1 = tokenizeText(text1, language);
// //     const tokens2 = tokenizeText(text2, language);

// //     const added = [];
// //     const missed = [];
// //     const spelling = [];
// //     const grammar = [];
// //     const coloredWords = [];

// //     const m = tokens1.length;
// //     const n = tokens2.length;

// //     // Dynamic programming matrix
// //     const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

// //     // Fill matrix
// //     for (let i = 1; i <= m; i++) {
// //         for (let j = 1; j <= n; j++) {
// //             if (tokens1[i-1].toLowerCase() === tokens2[j-1].toLowerCase()) {
// //                 dp[i][j] = dp[i-1][j-1] + 1;
// //             } else {
// //                 const similarity = wordSimilarity(tokens1[i-1].toLowerCase(), tokens2[j-1].toLowerCase());
// //                 dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1], dp[i-1][j-1] + similarity);
// //             }
// //         }
// //     }

// //     // Backtrack to find alignment
// //     let i = m, j = n;
// //     const alignment = [];
    
// //     while (i > 0 && j > 0) {
// //         if (tokens1[i-1].toLowerCase() === tokens2[j-1].toLowerCase()) {
// //             alignment.push(['match', tokens1[i-1], tokens2[j-1]]);
// //             i--;
// //             j--;
// //         } else if (dp[i][j] === dp[i-1][j-1] + wordSimilarity(tokens1[i-1].toLowerCase(), tokens2[j-1].toLowerCase())) {
// //             alignment.push(['similar', tokens1[i-1], tokens2[j-1]]);
// //             i--;
// //             j--;
// //         } else if (dp[i][j] === dp[i-1][j]) {
// //             alignment.push(['delete', tokens1[i-1], null]);
// //             i--;
// //         } else {
// //             alignment.push(['insert', null, tokens2[j-1]]);
// //             j--;
// //         }
// //     }

// //     while (i > 0) {
// //         alignment.push(['delete', tokens1[i-1], null]);
// //         i--;
// //     }
// //     while (j > 0) {
// //         alignment.push(['insert', null, tokens2[j-1]]);
// //         j--;
// //     }

// //     alignment.reverse();

// //     // Process alignment
// //     for (const [op, word1, word2] of alignment) {
// //         if (op === 'match') {
// //             coloredWords.push({ word: word1, color: 'black' });
// //         } else if (op === 'similar') {
// //             if (word1 && word2 && (ignoreLower.includes(word1.toLowerCase()) || ignoreLower.includes(word2.toLowerCase()))) {
// //                 coloredWords.push({ word: word1, color: 'black' });
// //             } else if (word1 && word2) {
// //                 const similarity = wordSimilarity(word1.toLowerCase(), word2.toLowerCase());
                
// //                 if (similarity > 0.8) {
// //                     coloredWords.push({ word: word1, color: 'red' });
// //                     coloredWords.push({ word: word2, color: 'green' });
// //                     spelling.push([word1, word2]);
// //                 } else {
// //                     const dist = levenshtein.distance(word1, word2);
// //                     const maxLen = Math.max(word1.length, word2.length);
// //                     const similarityPct = ((maxLen - dist) / maxLen) * 100;

// //                     if (similarityPct >= 40) {
// //                         coloredWords.push({ word: word1, color: 'red' });
// //                         coloredWords.push({ word: word2, color: 'green' });
// //                         spelling.push([word1, word2]);
// //                     } else {
// //                         coloredWords.push({ word: word1, color: 'red' });
// //                         coloredWords.push({ word: word2, color: 'green' });
// //                         missed.push(word1);
// //                         added.push(word2);
// //                     }
// //                 }
// //             }
// //         } else if (op === 'delete') {
// //             if (word1 && !ignoreLower.includes(word1.toLowerCase())) {
// //                 coloredWords.push({ word: word1, color: 'red' });
// //                 missed.push(word1);
// //             } else if (word1) {
// //                 coloredWords.push({ word: word1, color: 'black' });
// //             }
// //         } else if (op === 'insert') {
// //             if (word2 && !ignoreLower.includes(word2.toLowerCase())) {
// //                 coloredWords.push({ word: word2, color: 'green' });
// //                 added.push(word2);
// //             } else if (word2) {
// //                 coloredWords.push({ word: word2, color: 'black' });
// //             }
// //         }
// //     }

// //     return {
// //         colored_words: coloredWords,
// //         missed: missed,
// //         added: added,
// //         spelling: spelling,
// //         grammar: grammar
// //     };
// // }

// // // Parse ignore list
// // function parseIgnoreList(ignoreText) {
// //     if (!ignoreText || ignoreText.trim() === '') return [];
    
// //     try {
// //         if (ignoreText.trim().startsWith('[')) {
// //             return JSON.parse(ignoreText);
// //         } else {
// //             const items = ignoreText.split(',').map(item => item.trim().replace(/["']/g, ''));
// //             return items.filter(item => item);
// //         }
// //     } catch {
// //         const items = ignoreText.split(',').map(item => item.trim().replace(/["']/g, ''));
// //         return items.filter(item => item);
// //     }
// // }

// // // Calculate marks
// // function calculateMarks(apiResult) {
// //     if (!apiResult || apiResult.is_empty) {
// //         return { marks: 0, isEmpty: true, totalMistakes: 0 };
// //     }

// //     const totalMistakes = (apiResult.added?.length || 0) + 
// //                          (apiResult.missed?.length || 0) + 
// //                          (apiResult.spelling?.length || 0) + 
// //                          (apiResult.grammar?.length || 0);

// //     const marks = Math.max(0, 80 - (totalMistakes / 2));

// //     return { marks, isEmpty: false, totalMistakes };
// // }

// // // Main evaluation function
// // async function evaluateStudents(req, res) {
// //     try {
// //         const { departmentIds = [7] } = req.body;

// //         // Load all data
// //         const { students, answerPassages, studentPassages, ignoreLists } = await loadAllData(departmentIds);

// //         if (!students || students.length === 0) {
// //             return res.status(404).json({ error: 'No students found for the given departments' });
// //         }

// //         const results = [];
// //         const failedStudents = [];
// //         let passCount = 0;
// //         let failCount = 0;

// //         // Process each student
// //         for (const student of students) {
// //             try {
// //                 const result = await processStudent(student, answerPassages, studentPassages, ignoreLists);
                
// //                 if (result.success) {
// //                     results.push(result.result);
// //                     if (result.result.Pass_Status === 'Pass') passCount++;
// //                     else failCount++;

// //                     console.log(`Student ID: ${student.student_id} | ` +
// //                                `Added: ${result.result.PassageA_Added_Count}, ` +
// //                                `Missed: ${result.result.PassageA_Missed_Count}, ` +
// //                                `Spelling: ${result.result.PassageA_Spelling_Count}, ` +
// //                                `Grammar: ${result.result.PassageA_Grammar_Count} | ` +
// //                                `Total Mistakes: ${result.result.PassageA_Total_Mistakes} | ` +
// //                                `Marks: ${result.result.PassageA_Marks}`);
// //                 } else {
// //                     failedStudents.push({
// //                         Student_ID: student.student_id,
// //                         Subject_ID: 'N/A',
// //                         QSet: 'N/A',
// //                         Reason: result.error
// //                     });
// //                 }
// //             } catch (error) {
// //                 failedStudents.push({
// //                     Student_ID: student.student_id,
// //                     Subject_ID: 'N/A',
// //                     QSet: 'N/A',
// //                     Reason: error.message
// //                 });
// //             }
// //         }

// //         // Generate Excel
// //         const filename = await saveToExcel(results, failedStudents, departmentIds);

// //         res.json({
// //             success: true,
// //             totalStudents: students.length,
// //             processedStudents: results.length,
// //             failedStudents: failedStudents.length,
// //             passCount,
// //             failCount,
// //             passRate: results.length > 0 ? ((passCount / results.length) * 100).toFixed(2) : 0,
// //             excelFile: filename,
// //             results: results,
// //             failedStudents: failedStudents
// //         });

// //     } catch (error) {
// //         console.error('Evaluation error:', error);
// //         res.status(500).json({ error: error.message });
// //     }
// // }

// // // Load all data from database
// // async function loadAllData(departmentIds) {
// //     return new Promise((resolve, reject) => {
// //         connection.query(
// //             `SELECT student_id FROM expertreviewlog WHERE departmentId IN (?)`,
// //             [departmentIds],
// //             (error, expertreviewStudents) => {
// //                 if (error) return reject(error);
// //                 if (!expertreviewStudents || expertreviewStudents.length === 0) {
// //                     return resolve({ students: null, answerPassages: null, studentPassages: null, ignoreLists: null });
// //                 }

// //                 const studentIds = expertreviewStudents.map(s => s.student_id);

// //                 // Get student details
// //                 connection.query(
// //                     `SELECT student_id, subjectsId, qset, departmentId FROM students WHERE student_id IN (?)`,
// //                     [studentIds],
// //                     (error, students) => {
// //                         if (error) return reject(error);

// //                         // Get passages
// //                         connection.query(
// //                             `SELECT student_id, passageA, anspassageA FROM expertreviewlog WHERE student_id IN (?)`,
// //                             [studentIds],
// //                             (error, passages) => {
// //                                 if (error) return reject(error);

// //                                 const studentPassages = {};
// //                                 const answerPassages = {};
                                
// //                                 passages.forEach(p => {
// //                                     studentPassages[p.student_id] = { passageA: p.passageA };
// //                                     answerPassages[p.student_id] = { textPassageA: p.anspassageA };
// //                                 });

// //                                 // Get ignore lists
// //                                 const uniqueCombinations = [...new Set(students.map(s => `${s.subjectsId}-${s.departmentId}`))];
// //                                 const ignoreLists = {};

// //                                 let completed = 0;
// //                                 uniqueCombinations.forEach(combo => {
// //                                     const [subjectId, deptId] = combo.split('-');
                                    
// //                                     connection.query(
// //                                         `SELECT subjectId, departmentId, Q1PA, Q1PB, Q2PA, Q2PB, Q3PA, Q3PB, Q4PA, Q4PB 
// //                                          FROM qsetdb WHERE subjectId = ? AND departmentId = ?`,
// //                                         [subjectId, deptId],
// //                                         (error, ignoreResult) => {
// //                                             completed++;
                                            
// //                                             if (!error && ignoreResult && ignoreResult.length > 0) {
// //                                                 const key = `${subjectId}-${deptId}`;
// //                                                 ignoreLists[key] = {
// //                                                     1: {
// //                                                         A: parseIgnoreList(ignoreResult[0].Q1PA),
// //                                                         B: parseIgnoreList(ignoreResult[0].Q1PB)
// //                                                     },
// //                                                     2: {
// //                                                         A: parseIgnoreList(ignoreResult[0].Q2PA),
// //                                                         B: parseIgnoreList(ignoreResult[0].Q2PB)
// //                                                     },
// //                                                     3: {
// //                                                         A: parseIgnoreList(ignoreResult[0].Q3PA),
// //                                                         B: parseIgnoreList(ignoreResult[0].Q3PB)
// //                                                     },
// //                                                     4: {
// //                                                         A: parseIgnoreList(ignoreResult[0].Q4PA),
// //                                                         B: parseIgnoreList(ignoreResult[0].Q4PB)
// //                                                     }
// //                                                 };
// //                                             }

// //                                             if (completed === uniqueCombinations.length) {
// //                                                 resolve({ students, answerPassages, studentPassages, ignoreLists });
// //                                             }
// //                                         }
// //                                     );
// //                                 });

// //                                 if (uniqueCombinations.length === 0) {
// //                                     resolve({ students, answerPassages, studentPassages, ignoreLists });
// //                                 }
// //                             }
// //                         );
// //                     }
// //                 );
// //             }
// //         );
// //     });
// // }

// // // Process single student
// // async function processStudent(studentData, answerPassages, studentPassages, ignoreLists) {
// //     try {
// //         const studentId = studentData.student_id;
// //         const subjectId = studentData.subjectsId;
// //         const qset = studentData.qset;
// //         const departmentId = studentData.departmentId;

// //         if (!answerPassages[studentId]) {
// //             return {
// //                 success: false,
// //                 error: `No answer passages found for student ${studentId}`
// //             };
// //         }

// //         if (!studentPassages[studentId]) {
// //             return {
// //                 success: false,
// //                 error: `No student passages found for student ${studentId}`
// //             };
// //         }

// //         const answerData = answerPassages[studentId];
// //         const studentDataPassages = studentPassages[studentId];

// //         // Get ignore list
// //         let ignoreListA = [];
// //         const ignoreKey = `${subjectId}-${departmentId}`;
// //         if (ignoreLists[ignoreKey] && ignoreLists[ignoreKey][qset]) {
// //             ignoreListA = ignoreLists[ignoreKey][qset].A || [];
// //         }

// //         // Compare texts
// //         const resultA = compareTexts(
// //             studentDataPassages.passageA,
// //             answerData.textPassageA,
// //             ignoreListA
// //         );

// //         if (!resultA) {
// //             return {
// //                 success: false,
// //                 error: 'Passage A comparison failed'
// //             };
// //         }

// //         const { marks, isEmpty, totalMistakes } = calculateMarks(resultA);
// //         const passStatus = marks >= 32 ? 'Pass' : 'Fail';

// //         const result = {
// //             Student_ID: studentId,
// //             Department_ID: departmentId,
// //             Subject_ID: subjectId,
// //             QSet: qset,
// //             PassageA_IgnoreList: ignoreListA.join(', ') || 'None',
// //             PassageA_Marks: Math.round(marks * 100) / 100,
// //             PassageA_Empty: isEmpty,
// //             PassageA_Added: resultA.added?.join(', ') || '',
// //             PassageA_Added_Count: resultA.added?.length || 0,
// //             PassageA_Missed: resultA.missed?.join(', ') || '',
// //             PassageA_Missed_Count: resultA.missed?.length || 0,
// //             PassageA_Spelling: resultA.spelling?.map(s => s.join(' -> ')).join(', ') || '',
// //             PassageA_Spelling_Count: resultA.spelling?.length || 0,
// //             PassageA_Grammar: resultA.grammar?.join(', ') || '',
// //             PassageA_Grammar_Count: resultA.grammar?.length || 0,
// //             PassageA_Total_Mistakes: totalMistakes,
// //             Total_Marks: Math.round(marks * 100) / 100,
// //             Pass_Status: passStatus,
// //             Timestamp: new Date().toISOString()
// //         };

// //         return {
// //             success: true,
// //             result: result,
// //             marks: marks,
// //             department_id: departmentId
// //         };

// //     } catch (error) {
// //         return {
// //             success: false,
// //             error: error.message
// //         };
// //     }
// // }

// // // Save to Excel
// // async function saveToExcel(results, failedStudents, departmentIds) {
// //     const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
// //     const deptStr = departmentIds.join('_');
// //     const filename = `evaluation_results_depts_${deptStr}_${timestamp}.xlsx`;
// //     const filepath = path.join(__dirname, '../reports', filename);

// //     // Create reports directory if it doesn't exist
// //     const reportsDir = path.join(__dirname, '../reports');
// //     if (!fs.existsSync(reportsDir)) {
// //         fs.mkdirSync(reportsDir, { recursive: true });
// //     }

// //     const workbook = new ExcelJS.Workbook();

// //     // Results sheet
// //     if (results.length > 0) {
// //         const resultsSheet = workbook.addWorksheet('Results');
// //         resultsSheet.columns = [
// //             { header: 'Student_ID', key: 'Student_ID', width: 15 },
// //             { header: 'Department_ID', key: 'Department_ID', width: 15 },
// //             { header: 'Subject_ID', key: 'Subject_ID', width: 15 },
// //             { header: 'QSet', key: 'QSet', width: 10 },
// //             { header: 'PassageA_Marks', key: 'PassageA_Marks', width: 15 },
// //             { header: 'PassageA_Added_Count', key: 'PassageA_Added_Count', width: 20 },
// //             { header: 'PassageA_Missed_Count', key: 'PassageA_Missed_Count', width: 20 },
// //             { header: 'PassageA_Spelling_Count', key: 'PassageA_Spelling_Count', width: 22 },
// //             { header: 'PassageA_Grammar_Count', key: 'PassageA_Grammar_Count', width: 22 },
// //             { header: 'PassageA_Total_Mistakes', key: 'PassageA_Total_Mistakes', width: 22 },
// //             { header: 'Total_Marks', key: 'Total_Marks', width: 15 },
// //             { header: 'Pass_Status', key: 'Pass_Status', width: 12 },
// //             { header: 'Timestamp', key: 'Timestamp', width: 20 }
// //         ];
// //         results.forEach(result => resultsSheet.addRow(result));
// //     }

// //     // Failed sheet
// //     if (failedStudents.length > 0) {
// //         const failedSheet = workbook.addWorksheet('Failed');
// //         failedSheet.columns = [
// //             { header: 'Student_ID', key: 'Student_ID', width: 15 },
// //             { header: 'Subject_ID', key: 'Subject_ID', width: 15 },
// //             { header: 'QSet', key: 'QSet', width: 10 },
// //             { header: 'Reason', key: 'Reason', width: 50 }
// //         ];
// //         failedStudents.forEach(failed => failedSheet.addRow(failed));
// //     }

// //     // Department Summary
// //     const deptSummaryData = [];
// //     departmentIds.forEach(deptId => {
// //         const deptResults = results.filter(r => r.Department_ID === deptId);
// //         if (deptResults.length > 0) {
// //             const deptPass = deptResults.filter(r => r.Pass_Status === 'Pass').length;
// //             const deptFail = deptResults.length - deptPass;
// //             const deptAvgMarks = deptResults.reduce((sum, r) => sum + r.Total_Marks, 0) / deptResults.length;
// //             const deptPassRate = (deptPass / deptResults.length) * 100;

// //             deptSummaryData.push({
// //                 Department_ID: deptId,
// //                 Total_Students: deptResults.length,
// //                 Pass_Count: deptPass,
// //                 Fail_Count: deptFail,
// //                 Pass_Rate_Percent: Math.round(deptPassRate * 10) / 10,
// //                 Average_Marks: Math.round(deptAvgMarks * 100) / 100
// //             });
// //         }
// //     });

// //     if (deptSummaryData.length > 0) {
// //         const deptSummarySheet = workbook.addWorksheet('Department_Summary');
// //         deptSummarySheet.columns = [
// //             { header: 'Department_ID', key: 'Department_ID', width: 15 },
// //             { header: 'Total_Students', key: 'Total_Students', width: 15 },
// //             { header: 'Pass_Count', key: 'Pass_Count', width: 12 },
// //             { header: 'Fail_Count', key: 'Fail_Count', width: 12 },
// //             { header: 'Pass_Rate_Percent', key: 'Pass_Rate_Percent', width: 18 },
// //             { header: 'Average_Marks', key: 'Average_Marks', width: 15 }
// //         ];
// //         deptSummaryData.forEach(data => deptSummarySheet.addRow(data));
// //     }

// //     // Overall Summary
// //     const totalStudents = results.length + failedStudents.length;
// //     const successRate = totalStudents > 0 ? (results.length / totalStudents) * 100 : 0;
// //     const passCount = results.filter(r => r.Pass_Status === 'Pass').length;
// //     const failCount = results.length - passCount;
// //     const avgMarks = results.length > 0 ? results.reduce((sum, r) => sum + r.Total_Marks, 0) / results.length : 0;
// //     const passRate = results.length > 0 ? (passCount / results.length) * 100 : 0;

// //     const summarySheet = workbook.addWorksheet('Overall_Summary');
// //     summarySheet.columns = [
// //         { header: 'Metric', key: 'Metric', width: 30 },
// //         { header: 'Value', key: 'Value', width: 20 }
// //     ];
// //     summarySheet.addRow({ Metric: 'Total Students', Value: totalStudents });
// //     summarySheet.addRow({ Metric: 'Successful Processing', Value: results.length });
// //     summarySheet.addRow({ Metric: 'Failed Processing', Value: failedStudents.length });
// //     summarySheet.addRow({ Metric: 'Processing Success Rate (%)', Value: Math.round(successRate * 10) / 10 });
// //     summarySheet.addRow({ Metric: 'Academic Pass', Value: passCount });
// //     summarySheet.addRow({ Metric: 'Academic Fail', Value: failCount });
// //     summarySheet.addRow({ Metric: 'Academic Pass Rate (%)', Value: Math.round(passRate * 10) / 10 });
// //     summarySheet.addRow({ Metric: 'Average Marks', Value: Math.round(avgMarks * 100) / 100 });

// //     await workbook.xlsx.writeFile(filepath);
// //     return filename;
// // }

// // // Download Excel endpoint
// // async function downloadExcel(req, res) {
// //     try {
// //         const { filename } = req.params;
// //         const filepath = path.join(__dirname, '../reports', filename);

// //         if (!fs.existsSync(filepath)) {
// //             return res.status(404).json({ error: 'File not found' });
// //         }

// //         res.download(filepath, filename);
// //     } catch (error) {
// //         res.status(500).json({ error: error.message });
// //     }
// // }

// // module.exports = {
// //     evaluateStudents,
// //     downloadExcel
// // };




// const connection = require('../config/db1');
// const ExcelJS = require('exceljs');
// const levenshtein = require('fastest-levenshtein');
// const path = require('path');
// const fs = require('fs');

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// function preprocessText(text) {
//     if (!text) return '';
//     text = String(text);
//     text = text.replace(/_x[0-9A-Fa-f]{4}_/g, '');
//     text = text.replace(/[-.,\$#"'|?!(){}\[\]:]/g, ' ');
//     text = text.replace(/à¥¤|\\u200d|â€œ|â€|â€˜|â€™|â€"|â€¦/g, ' ');
//     text = text.replace(/\s{2,}/g, ' ').trim();
//     return text;
// }

// function tokenizeText(text, language) {
//     if (['hi', 'mar'].includes(language)) {
//         return text.match(/\S+/g) || [];
//     } else {
//         text = text.toLowerCase();
//         return text.split(/\s+/);
//     }
// }

// function wordSimilarity(word1, word2) {
//     const len1 = word1.length;
//     const len2 = word2.length;
//     const maxLen = Math.max(len1, len2);
    
//     if (maxLen === 0) return 1.0;
    
//     const distance = levenshtein.distance(word1, word2);
//     return (maxLen - distance) / maxLen;
// }

// // OPTIMIZED: Simplified text comparison algorithm
// function compareTexts(text1, text2, ignoreList) {
//     if (!text1 || !text2) {
//         return { is_empty: true };
//     }

//     text1 = preprocessText(text1);
//     text2 = preprocessText(text2);
    
//     if (!text1 || !text2) {
//         return { is_empty: true };
//     }

//     const ignoreLower = ignoreList.map(w => preprocessText(w).toLowerCase());
//     const language = 'en';
    
//     const tokens1 = tokenizeText(text1, language);
//     const tokens2 = tokenizeText(text2, language);

//     const added = [];
//     const missed = [];
//     const spelling = [];
//     const grammar = [];

//     // Use Sets for O(1) lookups instead of O(n)
//     const tokens2Set = new Set(tokens2.map(t => t.toLowerCase()));
//     const tokens1Set = new Set(tokens1.map(t => t.toLowerCase()));
//     const ignoreSet = new Set(ignoreLower);

//     // Find missed words
//     for (const word of tokens1) {
//         const wordLower = word.toLowerCase();
        
//         if (ignoreSet.has(wordLower)) continue;
        
//         if (!tokens2Set.has(wordLower)) {
//             let foundSimilar = false;
            
//             // Check for spelling similarity
//             for (const word2 of tokens2) {
//                 const similarity = wordSimilarity(wordLower, word2.toLowerCase());
//                 if (similarity > 0.8 && similarity < 1.0) {
//                     spelling.push([word, word2]);
//                     foundSimilar = true;
//                     break;
//                 }
//             }
            
//             if (!foundSimilar) {
//                 missed.push(word);
//             }
//         }
//     }

//     // Find added words
//     for (const word of tokens2) {
//         const wordLower = word.toLowerCase();
        
//         if (ignoreSet.has(wordLower)) continue;
        
//         if (!tokens1Set.has(wordLower)) {
//             const alreadyInSpelling = spelling.some(s => s[1].toLowerCase() === wordLower);
//             if (!alreadyInSpelling) {
//                 added.push(word);
//             }
//         }
//     }

//     return {
//         colored_words: [],
//         missed: missed,
//         added: added,
//         spelling: spelling,
//         grammar: grammar
//     };
// }

// function parseIgnoreList(ignoreText) {
//     if (!ignoreText || ignoreText.trim() === '') return [];
    
//     try {
//         if (ignoreText.trim().startsWith('[')) {
//             return JSON.parse(ignoreText);
//         } else {
//             const items = ignoreText.split(',').map(item => item.trim().replace(/["']/g, ''));
//             return items.filter(item => item);
//         }
//     } catch {
//         const items = ignoreText.split(',').map(item => item.trim().replace(/["']/g, ''));
//         return items.filter(item => item);
//     }
// }

// function calculateMarks(apiResult) {
//     if (!apiResult || apiResult.is_empty) {
//         return { marks: 0, isEmpty: true, totalMistakes: 0 };
//     }

//     const totalMistakes = (apiResult.added?.length || 0) + 
//                          (apiResult.missed?.length || 0) + 
//                          (apiResult.spelling?.length || 0) + 
//                          (apiResult.grammar?.length || 0);

//     const marks = Math.max(0, 80 - (totalMistakes / 2));

//     return { marks, isEmpty: false, totalMistakes };
// }

// // ============================================
// // OPTIMIZED DATABASE LOADING (Parallel Queries)
// // ============================================

// async function loadAllData(departmentIds) {
//     try {
//         // Query 1: Get student IDs from expertreviewlog
//         const expertreviewStudents = await new Promise((resolve, reject) => {
//             connection.query(
//                 `SELECT student_id FROM expertreviewlog WHERE department_id IN (?)`,
//                 [departmentIds],
//                 (error, results) => error ? reject(error) : resolve(results)
//             );
//         });

//         if (!expertreviewStudents || expertreviewStudents.length === 0) {
//             return { students: null, answerPassages: null, studentPassages: null, ignoreLists: null };
//         }

//         const studentIds = expertreviewStudents.map(s => s.student_id);
//         console.log(`Found ${studentIds.length} students in expertreviewlog`);

//         // OPTIMIZATION: Run all 3 queries in parallel using Promise.all
//         const [students, passages] = await Promise.all([
//             new Promise((resolve, reject) => {
//                 connection.query(
//                     `SELECT student_id, subject_id, qset, department_id FROM students WHERE student_id IN (?)`,
//                     [studentIds],
//                     (error, results) => error ? reject(error) : resolve(results)
//                 );
//             }),
//             new Promise((resolve, reject) => {
//                 connection.query(
//                     `SELECT student_id, passageA, anspassageA FROM expertreviewlog WHERE student_id IN (?)`,
//                     [studentIds],
//                     (error, results) => error ? reject(error) : resolve(results)
//                 );
//             })
//         ]);

//         console.log(`Loaded ${students.length} student details and ${passages.length} passages`);

//         // Transform passages into lookup objects
//         const studentPassages = {};
//         const answerPassages = {};
        
//         passages.forEach(p => {
//             studentPassages[p.student_id] = { passageA: p.passageA };
//             answerPassages[p.student_id] = { textPassageA: p.anspassageA };
//         });

//         // Get unique subject-department combinations
//         const uniqueCombinations = [...new Set(students.map(s => `${s.subject_id}-${s.department_id}`))];
        
//         if (uniqueCombinations.length === 0) {
//             return { students, answerPassages, studentPassages, ignoreLists: {} };
//         }

//         console.log(`Loading ignore lists for ${uniqueCombinations.length} combinations...`);

//         // OPTIMIZATION: Load all ignore lists in parallel
//         const ignoreResults = await Promise.all(
//             uniqueCombinations.map(combo => {
//                 const [subjectId, deptId] = combo.split('-');
//                 return new Promise((resolve) => {
//                     connection.query(
//                         `SELECT subject_id, department_id, Q1PA, Q1PB, Q2PA, Q2PB, Q3PA, Q3PB, Q4PA, Q4PB 
//                          FROM qsetdb WHERE subject_id = ? AND department_id = ?`,
//                         [subjectId, deptId],
//                         (error, results) => {
//                             if (error || !results || results.length === 0) {
//                                 return resolve({ key: combo, data: null });
//                             }
//                             resolve({ key: combo, data: results[0] });
//                         }
//                     );
//                 });
//             })
//         );

//         // Build ignore lists lookup object
//         const ignoreLists = {};
//         ignoreResults.forEach(({ key, data }) => {
//             if (data) {
//                 ignoreLists[key] = {
//                     1: {
//                         A: parseIgnoreList(data.Q1PA),
//                         B: parseIgnoreList(data.Q1PB)
//                     },
//                     2: {
//                         A: parseIgnoreList(data.Q2PA),
//                         B: parseIgnoreList(data.Q2PB)
//                     },
//                     3: {
//                         A: parseIgnoreList(data.Q3PA),
//                         B: parseIgnoreList(data.Q3PB)
//                     },
//                     4: {
//                         A: parseIgnoreList(data.Q4PA),
//                         B: parseIgnoreList(data.Q4PB)
//                     }
//                 };
//             }
//         });

//         console.log('All data loaded successfully');
//         return { students, answerPassages, studentPassages, ignoreLists };

//     } catch (error) {
//         console.error('Error in loadAllData:', error);
//         throw error;
//     }
// }

// // ============================================
// // PROCESS SINGLE STUDENT
// // ============================================

// async function processStudent(studentData, answerPassages, studentPassages, ignoreLists) {
//     try {
//         const studentId = studentData.student_id;
//         const subjectId = studentData.subject_id;
//         const qset = studentData.qset;
//         const departmentId = studentData.department_id;

//         if (!answerPassages[studentId]) {
//             return {
//                 success: false,
//                 error: `No answer passages found for student ${studentId}`
//             };
//         }

//         if (!studentPassages[studentId]) {
//             return {
//                 success: false,
//                 error: `No student passages found for student ${studentId}`
//             };
//         }

//         const answerData = answerPassages[studentId];
//         const studentDataPassages = studentPassages[studentId];

//         // Get ignore list
//         let ignoreListA = [];
//         const ignoreKey = `${subjectId}-${departmentId}`;
//         if (ignoreLists[ignoreKey] && ignoreLists[ignoreKey][qset]) {
//             ignoreListA = ignoreLists[ignoreKey][qset].A || [];
//         }

//         // Compare texts
//         const resultA = compareTexts(
//             studentDataPassages.passageA,
//             answerData.textPassageA,
//             ignoreListA
//         );

//         if (!resultA) {
//             return {
//                 success: false,
//                 error: 'Passage A comparison failed'
//             };
//         }

//         const { marks, isEmpty, totalMistakes } = calculateMarks(resultA);
//         const passStatus = marks >= 32 ? 'Pass' : 'Fail';

//         const result = {
//             Student_ID: studentId,
//             Department_ID: departmentId,
//             Subject_ID: subjectId,
//             QSet: qset,
//             PassageA_IgnoreList: ignoreListA.join(', ') || 'None',
//             PassageA_Marks: Math.round(marks * 100) / 100,
//             PassageA_Empty: isEmpty,
//             PassageA_Added: resultA.added?.join(', ') || '',
//             PassageA_Added_Count: resultA.added?.length || 0,
//             PassageA_Missed: resultA.missed?.join(', ') || '',
//             PassageA_Missed_Count: resultA.missed?.length || 0,
//             PassageA_Spelling: resultA.spelling?.map(s => s.join(' -> ')).join(', ') || '',
//             PassageA_Spelling_Count: resultA.spelling?.length || 0,
//             PassageA_Grammar: resultA.grammar?.join(', ') || '',
//             PassageA_Grammar_Count: resultA.grammar?.length || 0,
//             PassageA_Total_Mistakes: totalMistakes,
//             Total_Marks: Math.round(marks * 100) / 100,
//             Pass_Status: passStatus,
//             Timestamp: new Date().toISOString()
//         };

//         return {
//             success: true,
//             result: result,
//             marks: marks,
//             department_id: departmentId
//         };

//     } catch (error) {
//         return {
//             success: false,
//             error: error.message
//         };
//     }
// }

// // ============================================
// // MAIN EVALUATION FUNCTION (OPTIMIZED WITH PROMISE.ALL BATCHES)
// // ============================================

// async function evaluateStudents(req, res) {
//     try {
//         const { departmentIds = [7, 8, 9] } = req.body;

//         console.log('Starting evaluation for departments:', departmentIds);
//         const startTime = Date.now();

//         // Load all data
//         const { students, answerPassages, studentPassages, ignoreLists } = await loadAllData(departmentIds);

//         if (!students || students.length === 0) {
//             return res.status(404).json({ error: 'No students found for the given departments' });
//         }

//         console.log(`Processing ${students.length} students in parallel batches...`);

//         const results = [];
//         const failedStudents = [];
//         let passCount = 0;
//         let failCount = 0;

//         // **OPTIMIZATION: Process students in parallel batches using Promise.all**
//         const BATCH_SIZE = 50; // Adjust based on your needs (20-100 is good)
//         const totalBatches = Math.ceil(students.length / BATCH_SIZE);

//         for (let i = 0; i < students.length; i += BATCH_SIZE) {
//             const batch = students.slice(i, i + BATCH_SIZE);
//             const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            
//             console.log(`⚡ Processing batch ${batchNumber}/${totalBatches} (${batch.length} students)...`);

//             // Process all students in this batch concurrently
//             const batchResults = await Promise.all(
//                 batch.map(student => 
//                     processStudent(student, answerPassages, studentPassages, ignoreLists)
//                         .catch(error => ({
//                             success: false,
//                             error: error.message,
//                             studentId: student.student_id
//                         }))
//                 )
//             );

//             // Collect results from this batch
//             batchResults.forEach((result, index) => {
//                 const student = batch[index];
                
//                 if (result.success) {
//                     results.push(result.result);
//                     if (result.result.Pass_Status === 'Pass') passCount++;
//                     else failCount++;
//                 } else {
//                     failedStudents.push({
//                         Student_ID: student.student_id,
//                         Subject_ID: 'N/A',
//                         QSet: 'N/A',
//                         Reason: result.error
//                     });
//                 }
//             });

//             const progress = Math.min(i + BATCH_SIZE, students.length);
//             const percentage = ((progress / students.length) * 100).toFixed(1);
//             console.log(`✓ Batch ${batchNumber} completed. Progress: ${progress}/${students.length} (${percentage}%)`);
//         }

//         console.log('Generating Excel file...');
//         const filename = await saveToExcel(results, failedStudents, departmentIds);

//         const endTime = Date.now();
//         const totalTime = ((endTime - startTime) / 1000).toFixed(2);
//         console.log(`✅ Evaluation complete in ${totalTime} seconds!`);
        
//         res.json({
//             success: true,
//             totalStudents: students.length,
//             processedStudents: results.length,
//             failedStudents: failedStudents.length,
//             passCount,
//             failCount,
//             passRate: results.length > 0 ? ((passCount / results.length) * 100).toFixed(2) : 0,
//             excelFile: filename,
//             processingTime: `${totalTime}s`,
//             results: results,
//             failedStudents: failedStudents
//         });

//     } catch (error) {
//         console.error('FATAL ERROR in evaluateStudents:', error);
//         console.error('Stack trace:', error.stack);
        
//         if (!res.headersSent) {
//             res.status(500).json({ 
//                 error: error.message,
//                 message: 'Server encountered an error during evaluation'
//             });
//         }
//     }
// }

// // ============================================
// // SAVE TO EXCEL (Same as before)
// // ============================================

// async function saveToExcel(results, failedStudents, departmentIds) {
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
//     const deptStr = departmentIds.join('_');
//     const filename = `evaluation_results_depts_${deptStr}_${timestamp}.xlsx`;
//     const filepath = path.join(__dirname, '../reports', filename);

//     const reportsDir = path.join(__dirname, '../reports');
//     if (!fs.existsSync(reportsDir)) {
//         fs.mkdirSync(reportsDir, { recursive: true });
//     }

//     const workbook = new ExcelJS.Workbook();

//     // Results sheet
//     if (results.length > 0) {
//         const resultsSheet = workbook.addWorksheet('Results');
//         resultsSheet.columns = [
//             { header: 'Student_ID', key: 'Student_ID', width: 15 },
//             { header: 'Department_ID', key: 'Department_ID', width: 15 },
//             { header: 'Subject_ID', key: 'Subject_ID', width: 15 },
//             { header: 'QSet', key: 'QSet', width: 10 },
//             { header: 'PassageA_Marks', key: 'PassageA_Marks', width: 15 },
//             { header: 'PassageA_Added_Count', key: 'PassageA_Added_Count', width: 20 },
//             { header: 'PassageA_Missed_Count', key: 'PassageA_Missed_Count', width: 20 },
//             { header: 'PassageA_Spelling_Count', key: 'PassageA_Spelling_Count', width: 22 },
//             { header: 'PassageA_Grammar_Count', key: 'PassageA_Grammar_Count', width: 22 },
//             { header: 'PassageA_Total_Mistakes', key: 'PassageA_Total_Mistakes', width: 22 },
//             { header: 'Total_Marks', key: 'Total_Marks', width: 15 },
//             { header: 'Pass_Status', key: 'Pass_Status', width: 12 },
//             { header: 'Timestamp', key: 'Timestamp', width: 20 }
//         ];
//         results.forEach(result => resultsSheet.addRow(result));
//     }

//     // Failed sheet
//     if (failedStudents.length > 0) {
//         const failedSheet = workbook.addWorksheet('Failed');
//         failedSheet.columns = [
//             { header: 'Student_ID', key: 'Student_ID', width: 15 },
//             { header: 'Subject_ID', key: 'Subject_ID', width: 15 },
//             { header: 'QSet', key: 'QSet', width: 10 },
//             { header: 'Reason', key: 'Reason', width: 50 }
//         ];
//         failedStudents.forEach(failed => failedSheet.addRow(failed));
//     }

//     // Department Summary
//     const deptSummaryData = [];
//     departmentIds.forEach(deptId => {
//         const deptResults = results.filter(r => r.Department_ID === deptId);
//         if (deptResults.length > 0) {
//             const deptPass = deptResults.filter(r => r.Pass_Status === 'Pass').length;
//             const deptFail = deptResults.length - deptPass;
//             const deptAvgMarks = deptResults.reduce((sum, r) => sum + r.Total_Marks, 0) / deptResults.length;
//             const deptPassRate = (deptPass / deptResults.length) * 100;

//             deptSummaryData.push({
//                 Department_ID: deptId,
//                 Total_Students: deptResults.length,
//                 Pass_Count: deptPass,
//                 Fail_Count: deptFail,
//                 Pass_Rate_Percent: Math.round(deptPassRate * 10) / 10,
//                 Average_Marks: Math.round(deptAvgMarks * 100) / 100
//             });
//         }
//     });

//     if (deptSummaryData.length > 0) {
//         const deptSummarySheet = workbook.addWorksheet('Department_Summary');
//         deptSummarySheet.columns = [
//             { header: 'Department_ID', key: 'Department_ID', width: 15 },
//             { header: 'Total_Students', key: 'Total_Students', width: 15 },
//             { header: 'Pass_Count', key: 'Pass_Count', width: 12 },
//             { header: 'Fail_Count', key: 'Fail_Count', width: 12 },
//             { header: 'Pass_Rate_Percent', key: 'Pass_Rate_Percent', width: 18 },
//             { header: 'Average_Marks', key: 'Average_Marks', width: 15 }
//         ];
//         deptSummaryData.forEach(data => deptSummarySheet.addRow(data));
//     }

//     // Overall Summary
//     const totalStudents = results.length + failedStudents.length;
//     const successRate = totalStudents > 0 ? (results.length / totalStudents) * 100 : 0;
//     const avgMarks = results.length > 0 ? results.reduce((sum, r) => sum + r.Total_Marks, 0) / results.length : 0;
//     const passRate = results.length > 0 ? (passCount / results.length) * 100 : 0;

//     const summarySheet = workbook.addWorksheet('Overall_Summary');
//     summarySheet.columns = [
//         { header: 'Metric', key: 'Metric', width: 30 },
//         { header: 'Value', key: 'Value', width: 20 }
//     ];
//     summarySheet.addRow({ Metric: 'Total Students', Value: totalStudents });
//     summarySheet.addRow({ Metric: 'Successful Processing', Value: results.length });
//     summarySheet.addRow({ Metric: 'Failed Processing', Value: failedStudents.length });
//     summarySheet.addRow({ Metric: 'Processing Success Rate (%)', Value: Math.round(successRate * 10) / 10 });
//     summarySheet.addRow({ Metric: 'Academic Pass', Value: passCount });
//     summarySheet.addRow({ Metric: 'Academic Fail', Value: failCount });
//     summarySheet.addRow({ Metric: 'Academic Pass Rate (%)', Value: Math.round(passRate * 10) / 10 });
//     summarySheet.addRow({ Metric: 'Average Marks', Value: Math.round(avgMarks * 100) / 100 });

//     await workbook.xlsx.writeFile(filepath);
//     return filename;
// }

// async function downloadExcel(req, res) {
//     try {
//         const { filename } = req.params;
//         const filepath = path.join(__dirname, '../reports', filename);

//         if (!fs.existsSync(filepath)) {
//             return res.status(404).json({ error: 'File not found' });
//         }

//         res.download(filepath, filename);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }

// module.exports = {
//     evaluateStudents,
//     downloadExcel
// };


const connection = require('../config/db1');
const ExcelJS = require('exceljs');
const levenshtein = require('fastest-levenshtein');
const path = require('path');
const fs = require('fs');

// ============================================
// HELPER FUNCTIONS
// ============================================

function preprocessText(text) {
    if (!text) return '';
    text = String(text);
    text = text.replace(/_x[0-9A-Fa-f]{4}_/g, '');
    text = text.replace(/[-.,\$#"'|?!(){}\[\]:]/g, ' ');
    text = text.replace(/à¥¤|\\u200d|â€œ|â€|â€˜|â€™|â€"|â€¦/g, ' ');
    text = text.replace(/\s{2,}/g, ' ').trim();
    return text;
}

function tokenizeText(text, language) {
    if (['hi', 'mar'].includes(language)) {
        return text.match(/\S+/g) || [];
    } else {
        text = text.toLowerCase();
        return text.split(/\s+/);
    }
}

function wordSimilarity(word1, word2) {
    const len1 = word1.length;
    const len2 = word2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1.0;
    
    const distance = levenshtein.distance(word1, word2);
    return (maxLen - distance) / maxLen;
}

// OPTIMIZED: Simplified text comparison algorithm
function compareTexts(text1, text2, ignoreList) {
    if (!text1 || !text2) {
        return { is_empty: true };
    }

    text1 = preprocessText(text1);
    text2 = preprocessText(text2);
    
    if (!text1 || !text2) {
        return { is_empty: true };
    }

    const ignoreLower = ignoreList.map(w => preprocessText(w).toLowerCase());
    const language = 'en';
    
    const tokens1 = tokenizeText(text1, language);
    const tokens2 = tokenizeText(text2, language);

    const added = [];
    const missed = [];
    const spelling = [];
    const grammar = [];

    // Use Sets for O(1) lookups instead of O(n)
    const tokens2Set = new Set(tokens2.map(t => t.toLowerCase()));
    const tokens1Set = new Set(tokens1.map(t => t.toLowerCase()));
    const ignoreSet = new Set(ignoreLower);

    // Find missed words
    for (const word of tokens1) {
        const wordLower = word.toLowerCase();
        
        if (ignoreSet.has(wordLower)) continue;
        
        if (!tokens2Set.has(wordLower)) {
            let foundSimilar = false;
            
            // Check for spelling similarity
            for (const word2 of tokens2) {
                const similarity = wordSimilarity(wordLower, word2.toLowerCase());
                if (similarity > 0.8 && similarity < 1.0) {
                    spelling.push([word, word2]);
                    foundSimilar = true;
                    break;
                }
            }
            
            if (!foundSimilar) {
                missed.push(word);
            }
        }
    }

    // Find added words
    for (const word of tokens2) {
        const wordLower = word.toLowerCase();
        
        if (ignoreSet.has(wordLower)) continue;
        
        if (!tokens1Set.has(wordLower)) {
            const alreadyInSpelling = spelling.some(s => s[1].toLowerCase() === wordLower);
            if (!alreadyInSpelling) {
                added.push(word);
            }
        }
    }

    return {
        colored_words: [],
        missed: missed,
        added: added,
        spelling: spelling,
        grammar: grammar
    };
}

function parseIgnoreList(ignoreText) {
    if (!ignoreText || ignoreText.trim() === '') return [];
    
    try {
        if (ignoreText.trim().startsWith('[')) {
            return JSON.parse(ignoreText);
        } else {
            const items = ignoreText.split(',').map(item => item.trim().replace(/["']/g, ''));
            return items.filter(item => item);
        }
    } catch {
        const items = ignoreText.split(',').map(item => item.trim().replace(/["']/g, ''));
        return items.filter(item => item);
    }
}

function calculateMarks(apiResult) {
    if (!apiResult || apiResult.is_empty) {
        return { marks: 0, isEmpty: true, totalMistakes: 0 };
    }

    const totalMistakes = (apiResult.added?.length || 0) + 
                         (apiResult.missed?.length || 0) + 
                         (apiResult.spelling?.length || 0) + 
                         (apiResult.grammar?.length || 0);

    const marks = Math.max(0, 80 - (totalMistakes / 2));

    return { marks, isEmpty: false, totalMistakes };
}

// ============================================
// OPTIMIZED DATABASE LOADING (Parallel Queries)
// ============================================

async function loadAllData(departmentIds) {
    try {
        // ✅ CORRECTED: Using departmentId (camelCase)
        const expertreviewStudents = await new Promise((resolve, reject) => {
            connection.query(
                `SELECT student_id FROM expertreviewlog WHERE departmentId IN (?)`,
                [departmentIds],
                (error, results) => error ? reject(error) : resolve(results)
            );
        });

        if (!expertreviewStudents || expertreviewStudents.length === 0) {
            return { students: null, answerPassages: null, studentPassages: null, ignoreLists: null };
        }

        const studentIds = expertreviewStudents.map(s => s.student_id);
        console.log(`Found ${studentIds.length} students in expertreviewlog`);

        // ✅ CORRECTED: Using camelCase column names (subjectId, departmentId)
        const [students, passages] = await Promise.all([
            new Promise((resolve, reject) => {
                connection.query(
                    `SELECT student_id, subjectId, qset, departmentId FROM students WHERE student_id IN (?)`,
                    [studentIds],
                    (error, results) => error ? reject(error) : resolve(results)
                );
            }),
            new Promise((resolve, reject) => {
                connection.query(
                    `SELECT student_id, passageA, ansPassageA FROM expertreviewlog WHERE student_id IN (?)`,
                    [studentIds],
                    (error, results) => error ? reject(error) : resolve(results)
                );
            })
        ]);

        console.log(`Loaded ${students.length} student details and ${passages.length} passages`);

        // Transform passages into lookup objects
        const studentPassages = {};
        const answerPassages = {};
        
        passages.forEach(p => {
            studentPassages[p.student_id] = { passageA: p.passageA };
            // ✅ CORRECTED: Using ansPassageA (camelCase with capital P)
            answerPassages[p.student_id] = { textPassageA: p.ansPassageA };
        });

        // ✅ CORRECTED: Using camelCase column names
        const uniqueCombinations = [...new Set(students.map(s => `${s.subjectId}-${s.departmentId}`))];
        
        if (uniqueCombinations.length === 0) {
            return { students, answerPassages, studentPassages, ignoreLists: {} };
        }

        console.log(`Loading ignore lists for ${uniqueCombinations.length} combinations...`);

        // ✅ CORRECTED: Using camelCase column names in qsetdb query
        const ignoreResults = await Promise.all(
            uniqueCombinations.map(combo => {
                const [subjectId, deptId] = combo.split('-');
                return new Promise((resolve) => {
                    connection.query(
                        `SELECT subjectId, departmentId, Q1PA, Q1PB, Q2PA, Q2PB, Q3PA, Q3PB, Q4PA, Q4PB 
                         FROM qsetdb WHERE subjectId = ? AND departmentId = ?`,
                        [subjectId, deptId],
                        (error, results) => {
                            if (error || !results || results.length === 0) {
                                return resolve({ key: combo, data: null });
                            }
                            resolve({ key: combo, data: results[0] });
                        }
                    );
                });
            })
        );

        // Build ignore lists lookup object
        const ignoreLists = {};
        ignoreResults.forEach(({ key, data }) => {
            if (data) {
                ignoreLists[key] = {
                    1: {
                        A: parseIgnoreList(data.Q1PA),
                        B: parseIgnoreList(data.Q1PB)
                    },
                    2: {
                        A: parseIgnoreList(data.Q2PA),
                        B: parseIgnoreList(data.Q2PB)
                    },
                    3: {
                        A: parseIgnoreList(data.Q3PA),
                        B: parseIgnoreList(data.Q3PB)
                    },
                    4: {
                        A: parseIgnoreList(data.Q4PA),
                        B: parseIgnoreList(data.Q4PB)
                    }
                };
            }
        });

        console.log('All data loaded successfully');
        return { students, answerPassages, studentPassages, ignoreLists };

    } catch (error) {
        console.error('Error in loadAllData:', error);
        throw error;
    }
}

// ============================================
// PROCESS SINGLE STUDENT
// ============================================

async function processStudent(studentData, answerPassages, studentPassages, ignoreLists) {
    try {
        const studentId = studentData.student_id;
        // ✅ CORRECTED: Using camelCase property names
        const subjectId = studentData.subjectId;
        const qset = studentData.qset;
        const departmentId = studentData.departmentId;

        if (!answerPassages[studentId]) {
            return {
                success: false,
                error: `No answer passages found for student ${studentId}`
            };
        }

        if (!studentPassages[studentId]) {
            return {
                success: false,
                error: `No student passages found for student ${studentId}`
            };
        }

        const answerData = answerPassages[studentId];
        const studentDataPassages = studentPassages[studentId];

        // Get ignore list
        let ignoreListA = [];
        const ignoreKey = `${subjectId}-${departmentId}`;
        if (ignoreLists[ignoreKey] && ignoreLists[ignoreKey][qset]) {
            ignoreListA = ignoreLists[ignoreKey][qset].A || [];
        }

        // Compare texts
        const resultA = compareTexts(
            studentDataPassages.passageA,
            answerData.textPassageA,
            ignoreListA
        );

        if (!resultA) {
            return {
                success: false,
                error: 'Passage A comparison failed'
            };
        }

        const { marks, isEmpty, totalMistakes } = calculateMarks(resultA);
        const passStatus = marks >= 32 ? 'Pass' : 'Fail';

        const result = {
            Student_ID: studentId,
            Department_ID: departmentId,
            Subject_ID: subjectId,
            QSet: qset,
            PassageA_IgnoreList: ignoreListA.join(', ') || 'None',
            PassageA_Marks: Math.round(marks * 100) / 100,
            PassageA_Empty: isEmpty,
            PassageA_Added: resultA.added?.join(', ') || '',
            PassageA_Added_Count: resultA.added?.length || 0,
            PassageA_Missed: resultA.missed?.join(', ') || '',
            PassageA_Missed_Count: resultA.missed?.length || 0,
            PassageA_Spelling: resultA.spelling?.map(s => s.join(' -> ')).join(', ') || '',
            PassageA_Spelling_Count: resultA.spelling?.length || 0,
            PassageA_Grammar: resultA.grammar?.join(', ') || '',
            PassageA_Grammar_Count: resultA.grammar?.length || 0,
            PassageA_Total_Mistakes: totalMistakes,
            Total_Marks: Math.round(marks * 100) / 100,
            Pass_Status: passStatus,
            Timestamp: new Date().toISOString()
        };

        return {
            success: true,
            result: result,
            marks: marks,
            department_id: departmentId
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// MAIN EVALUATION FUNCTION (OPTIMIZED WITH PROMISE.ALL BATCHES)
// ============================================

async function evaluateStudents(req, res) {
    try {
        const { departmentIds = [7, 8, 9] } = req.body;

        console.log('Starting evaluation for departments:', departmentIds);
        const startTime = Date.now();

        // Load all data
        const { students, answerPassages, studentPassages, ignoreLists } = await loadAllData(departmentIds);

        if (!students || students.length === 0) {
            return res.status(404).json({ error: 'No students found for the given departments' });
        }

        console.log(`Processing ${students.length} students in parallel batches...`);

        const results = [];
        const failedStudents = [];
        let passCount = 0;
        let failCount = 0;

        // **OPTIMIZATION: Process students in parallel batches using Promise.all**
        const BATCH_SIZE = 50; // Adjust based on your needs (20-100 is good)
        const totalBatches = Math.ceil(students.length / BATCH_SIZE);

        for (let i = 0; i < students.length; i += BATCH_SIZE) {
            const batch = students.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            
            console.log(`⚡ Processing batch ${batchNumber}/${totalBatches} (${batch.length} students)...`);

            // Process all students in this batch concurrently
            const batchResults = await Promise.all(
                batch.map(student => 
                    processStudent(student, answerPassages, studentPassages, ignoreLists)
                        .catch(error => ({
                            success: false,
                            error: error.message,
                            studentId: student.student_id
                        }))
                )
            );

            // Collect results from this batch
            batchResults.forEach((result, index) => {
                const student = batch[index];
                
                if (result.success) {
                    results.push(result.result);
                    if (result.result.Pass_Status === 'Pass') passCount++;
                    else failCount++;
                } else {
                    failedStudents.push({
                        Student_ID: student.student_id,
                        Subject_ID: 'N/A',
                        QSet: 'N/A',
                        Reason: result.error
                    });
                }
            });

            const progress = Math.min(i + BATCH_SIZE, students.length);
            const percentage = ((progress / students.length) * 100).toFixed(1);
            console.log(`✓ Batch ${batchNumber} completed. Progress: ${progress}/${students.length} (${percentage}%)`);
        }

        console.log('Generating Excel file...');
        const filename = await saveToExcel(results, failedStudents, departmentIds);

        const endTime = Date.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`✅ Evaluation complete in ${totalTime} seconds!`);
        
        res.json({
            success: true,
            totalStudents: students.length,
            processedStudents: results.length,
            failedStudents: failedStudents.length,
            passCount,
            failCount,
            passRate: results.length > 0 ? ((passCount / results.length) * 100).toFixed(2) : 0,
            excelFile: filename,
            processingTime: `${totalTime}s`,
            results: results,
            failedStudents: failedStudents
        });

    } catch (error) {
        console.error('FATAL ERROR in evaluateStudents:', error);
        console.error('Stack trace:', error.stack);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: error.message,
                message: 'Server encountered an error during evaluation'
            });
        }
    }
}

// ============================================
// SAVE TO EXCEL
// ============================================

async function saveToExcel(results, failedStudents, departmentIds) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const deptStr = departmentIds.join('_');
    const filename = `evaluation_results_depts_${deptStr}_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, '../reports', filename);

    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();

    // Results sheet
    if (results.length > 0) {
        const resultsSheet = workbook.addWorksheet('Results');
        resultsSheet.columns = [
            { header: 'Student_ID', key: 'Student_ID', width: 15 },
            { header: 'Department_ID', key: 'Department_ID', width: 15 },
            { header: 'Subject_ID', key: 'Subject_ID', width: 15 },
            { header: 'QSet', key: 'QSet', width: 10 },
            { header: 'PassageA_Marks', key: 'PassageA_Marks', width: 15 },
            { header: 'PassageA_Added_Count', key: 'PassageA_Added_Count', width: 20 },
            { header: 'PassageA_Missed_Count', key: 'PassageA_Missed_Count', width: 20 },
            { header: 'PassageA_Spelling_Count', key: 'PassageA_Spelling_Count', width: 22 },
            { header: 'PassageA_Grammar_Count', key: 'PassageA_Grammar_Count', width: 22 },
            { header: 'PassageA_Total_Mistakes', key: 'PassageA_Total_Mistakes', width: 22 },
            { header: 'Total_Marks', key: 'Total_Marks', width: 15 },
            { header: 'Pass_Status', key: 'Pass_Status', width: 12 },
            { header: 'Timestamp', key: 'Timestamp', width: 20 }
        ];
        results.forEach(result => resultsSheet.addRow(result));
    }

    // Failed sheet
    if (failedStudents.length > 0) {
        const failedSheet = workbook.addWorksheet('Failed');
        failedSheet.columns = [
            { header: 'Student_ID', key: 'Student_ID', width: 15 },
            { header: 'Subject_ID', key: 'Subject_ID', width: 15 },
            { header: 'QSet', key: 'QSet', width: 10 },
            { header: 'Reason', key: 'Reason', width: 50 }
        ];
        failedStudents.forEach(failed => failedSheet.addRow(failed));
    }

    // Department Summary
    const deptSummaryData = [];
    departmentIds.forEach(deptId => {
        const deptResults = results.filter(r => r.Department_ID === deptId);
        if (deptResults.length > 0) {
            const deptPass = deptResults.filter(r => r.Pass_Status === 'Pass').length;
            const deptFail = deptResults.length - deptPass;
            const deptAvgMarks = deptResults.reduce((sum, r) => sum + r.Total_Marks, 0) / deptResults.length;
            const deptPassRate = (deptPass / deptResults.length) * 100;

            deptSummaryData.push({
                Department_ID: deptId,
                Total_Students: deptResults.length,
                Pass_Count: deptPass,
                Fail_Count: deptFail,
                Pass_Rate_Percent: Math.round(deptPassRate * 10) / 10,
                Average_Marks: Math.round(deptAvgMarks * 100) / 100
            });
        }
    });

    if (deptSummaryData.length > 0) {
        const deptSummarySheet = workbook.addWorksheet('Department_Summary');
        deptSummarySheet.columns = [
            { header: 'Department_ID', key: 'Department_ID', width: 15 },
            { header: 'Total_Students', key: 'Total_Students', width: 15 },
            { header: 'Pass_Count', key: 'Pass_Count', width: 12 },
            { header: 'Fail_Count', key: 'Fail_Count', width: 12 },
            { header: 'Pass_Rate_Percent', key: 'Pass_Rate_Percent', width: 18 },
            { header: 'Average_Marks', key: 'Average_Marks', width: 15 }
        ];
        deptSummaryData.forEach(data => deptSummarySheet.addRow(data));
    }

    // Overall Summary
    const totalStudents = results.length + failedStudents.length;
    const successRate = totalStudents > 0 ? (results.length / totalStudents) * 100 : 0;
    const avgMarks = results.length > 0 ? results.reduce((sum, r) => sum + r.Total_Marks, 0) / results.length : 0;
    const passRate = results.length > 0 ? ((results.filter(r => r.Pass_Status === 'Pass').length / results.length) * 100) : 0;

    const summarySheet = workbook.addWorksheet('Overall_Summary');
    summarySheet.columns = [
        { header: 'Metric', key: 'Metric', width: 30 },
        { header: 'Value', key: 'Value', width: 20 }
    ];
    summarySheet.addRow({ Metric: 'Total Students', Value: totalStudents });
    summarySheet.addRow({ Metric: 'Successful Processing', Value: results.length });
    summarySheet.addRow({ Metric: 'Failed Processing', Value: failedStudents.length });
    summarySheet.addRow({ Metric: 'Processing Success Rate (%)', Value: Math.round(successRate * 10) / 10 });
    summarySheet.addRow({ Metric: 'Academic Pass', Value: results.filter(r => r.Pass_Status === 'Pass').length });
    summarySheet.addRow({ Metric: 'Academic Fail', Value: results.filter(r => r.Pass_Status === 'Fail').length });
    summarySheet.addRow({ Metric: 'Academic Pass Rate (%)', Value: Math.round(passRate * 10) / 10 });
    summarySheet.addRow({ Metric: 'Average Marks', Value: Math.round(avgMarks * 100) / 100 });

    await workbook.xlsx.writeFile(filepath);
    return filename;
}

async function downloadExcel(req, res) {
    try {
        const { filename } = req.params;
        const filepath = path.join(__dirname, '../reports', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filepath, filename);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    evaluateStudents,
    downloadExcel
};
