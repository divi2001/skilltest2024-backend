const connection = require("../../config/db1")



exports.getAllBatches = async (req, res) => {
    try {
        const query = 'SELECT * FROM batchdb ';
        const [batches] = await connection.execute(query);
        console.log(batches);
        res.status(200).json({
            success: true,
            data: batches
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching batches',
            error: error.message
        });
    }
};

exports.updateBatchStatus = async (req, res) => {
    const { batchNo, status } = req.body;
    console.log(req.body)
    if (!batchNo || typeof status !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'Invalid input. Batch number and status are required.'
        });
    }

    try {
        const query = 'UPDATE batchdb SET batchstatus = ? WHERE batchNo = ?';
        const [result] = await connection.execute(query, [status, batchNo]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Batch ${batchNo} status updated successfully`,
            data: {
                batchNo,
                status
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating batch status',
            error: error.message
        });
    }
};
