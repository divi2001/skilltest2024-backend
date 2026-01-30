// utils/qsetdbHandler.js
const connection = require('../config/db1');

/**
 * Ensures that qsetdb has entries for the given departmentId.
 * If entries don't exist, creates them based on audiodb mappings.
 * 
 * @param {number} departmentId - The department ID to check/create entries for
 * @returns {Promise<Object>} - Result object with status and message
 */
async function ensureQsetdbEntries(departmentId) {
    if (!departmentId) {
        return {
            success: false,
            message: 'departmentId is required',
            created: false
        };
    }

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        // Check if departmentId already exists in qsetdb
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM qsetdb 
            WHERE departmentId = ?
        `;
        const [checkResults] = await conn.query(checkQuery, [departmentId]);

        if (checkResults[0].count > 0) {
            await conn.commit();
            console.log(`qsetdb entries already exist for departmentId: ${departmentId}`);
            return {
                success: true,
                message: `Entries already exist for departmentId ${departmentId}`,
                created: false,
                existingCount: checkResults[0].count
            };
        }

        // Fetch distinct subjectIds from audiodb for this departmentId
        const fetchSubjectsQuery = `
            SELECT DISTINCT subjectId 
            FROM audiodb 
            WHERE departmentId = ?
            ORDER BY subjectId
        `;
        const [subjects] = await conn.query(fetchSubjectsQuery, [departmentId]);

        if (subjects.length === 0) {
            await conn.commit();
            console.log(`No subjects found in audiodb for departmentId: ${departmentId}`);
            return {
                success: false,
                message: `No subjects found in audiodb for departmentId ${departmentId}`,
                created: false
            };
        }

        // Create entries in qsetdb for each subjectId
        const insertQuery = `
            INSERT INTO qsetdb (subjectId, departmentId, Q1PA, Q1PB, Q2PA, Q2PB, Q3PA, Q3PB, Q4PA, Q4PB, Q5PA, Q5PB, Q6PA, Q6PB, Q7PA, Q7PB, Q8PA, Q8PB)
            VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
        `;

        const insertedSubjects = [];
        for (const subject of subjects) {
            await conn.query(insertQuery, [subject.subjectId, departmentId]);
            insertedSubjects.push(subject.subjectId);
        }

        await conn.commit();
        console.log(`Created ${subjects.length} qsetdb entries for departmentId: ${departmentId}`);
        console.log(`Inserted subjectIds: ${insertedSubjects.join(', ')}`);

        return {
            success: true,
            message: `Created ${subjects.length} entries for departmentId ${departmentId}`,
            created: true,
            count: subjects.length,
            subjectIds: insertedSubjects
        };

    } catch (err) {
        if (conn) await conn.rollback();
        console.error(`Error ensuring qsetdb entries for departmentId ${departmentId}:`, err);
        return {
            success: false,
            message: 'Database error occurred',
            error: err.message,
            created: false
        };
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Checks if a departmentId exists in qsetdb for a specific subjectId.
 * If not, ensures entries are created.
 * 
 * @param {number} departmentId - The department ID
 * @param {number} subjectId - The subject ID
 * @returns {Promise<Object>} - Result object with status
 */
async function ensureQsetdbEntryForSubject(departmentId, subjectId) {
    if (!departmentId || !subjectId) {
        return {
            success: false,
            message: 'departmentId and subjectId are required'
        };
    }

    try {
        // Check if specific subjectId-departmentId pair exists in qsetdb
        const checkQuery = `
            SELECT id 
            FROM qsetdb 
            WHERE departmentId = ? AND subjectId = ?
            LIMIT 1
        `;
        const [results] = await connection.query(checkQuery, [departmentId, subjectId]);

        if (results.length > 0) {
            return {
                success: true,
                message: 'Entry exists',
                exists: true
            };
        }

        // If not, ensure all entries for this department are created
        const result = await ensureQsetdbEntries(departmentId);
        return result;

    } catch (err) {
        console.error(`Error checking qsetdb entry for departmentId ${departmentId}, subjectId ${subjectId}:`, err);
        return {
            success: false,
            message: 'Database error occurred',
            error: err.message
        };
    }
}

module.exports = {
    ensureQsetdbEntries,
    ensureQsetdbEntryForSubject
};
