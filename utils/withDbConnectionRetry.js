const TRANSIENT_DB_ERROR_CODES = new Set([
    "ECONNRESET",
    "PROTOCOL_CONNECTION_LOST",
    "ETIMEDOUT",
    "EPIPE",
    "ECONNREFUSED"
]);

function isTransientDbError(error) {
    return Boolean(error && TRANSIENT_DB_ERROR_CODES.has(error.code));
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDbConnectionRetry(pool, callback, options = {}) {
    const retries = Number(options.retries ?? 2);
    const retryDelayMs = Number(options.retryDelayMs ?? 300);

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        let connection;

        try {
            connection = await pool.getConnection();
            await connection.ping();
            return await callback(connection, attempt + 1);
        } catch (error) {
            lastError = error;

            if (!isTransientDbError(error) || attempt === retries) {
                throw error;
            }

            console.warn(
                `[WARN] Transient DB error on attempt ${attempt + 1}/${retries + 1}: ${error.code}. Retrying in ${retryDelayMs}ms...`
            );
            await delay(retryDelayMs);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    throw lastError;
}

module.exports = {
    withDbConnectionRetry,
    isTransientDbError
};
