const connection = require('./config/db1');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ---------------------------------------------------------
// INPUT: Add the MAC addresses you want to check/delete here
// ---------------------------------------------------------
const TARGET_MACS = [
    '0CEF15223CDC',
    '0072EE1ABF17',
];
// ---------------------------------------------------------

async function processMacAddresses() {
    try {
        if (TARGET_MACS.length === 0) {
            console.log('Please edit the script and add MAC addresses to the TARGET_MACS array.');
            process.exit(0);
        }

        console.log(`Checking ${TARGET_MACS.length} MAC addresses...`);

        // Fetch records matching the MAC addresses
        // Since it's an array, we can use IN clause, but we need to match strings carefully.
        const placeholders = TARGET_MACS.map(() => '?').join(',');
        const query = `SELECT id, mac_address, center, disk_id FROM pcregistration WHERE mac_address IN (${placeholders})`;
        const [rows] = await connection.query(query, TARGET_MACS);

        if (rows.length === 0) {
            console.log('No records found for the provided MAC addresses.');
            process.exit(0);
        }

        console.log('\n--- FOUND RECORDS ---');
        console.table(rows.map(r => ({
            ID: r.id,
            MAC: r.mac_address,
            Center: r.center,
            DiskID: r.disk_id
        })));

        rl.question('\nDo you want to DELETE these records? (yes/no): ', async (answer) => {
            if (answer.trim().toLowerCase() === 'yes') {
                const idsToDelete = rows.map(r => r.id);
                const deleteQuery = `DELETE FROM pcregistration WHERE id IN (${idsToDelete.map(() => '?').join(',')})`;

                try {
                    const [result] = await connection.query(deleteQuery, idsToDelete);
                    console.log(`\nSuccessfully deleted ${result.affectedRows} records.`);
                } catch (delErr) {
                    console.error('Error deleting records:', delErr);
                }
            } else {
                console.log('\nOperation cancelled. No records were deleted.');
            }

            rl.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

// Handle query errors or connection issues
processMacAddresses();
