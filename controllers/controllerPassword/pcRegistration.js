const pcRegistrationDTO = require('../../dto/pcRegistrationDTO');
const connection = require('../../config/db1');


exports.getPcRegistrations = async (req, res) => {

    const centerCode = req.session.centerId;

    // console.log("CenterCode: "+centerCode);

    const query = 'select id, center, ip_address, disk_id, mac_address, os, ram from pcregistration where center = ?;';

    try {
        const [results] = await connection.query(query, [centerCode]);

        // console.log("result: "+results);
        if (results.length > 0) {
            const pcResitrationDto = results.map(result => {
                const pcRegistrationDet = new pcRegistrationDTO(
                    result.id,
                    result.center,
                    result.ip_address,
                    result.disk_id,
                    result.mac_address,
                    result.os || 'N/A',
                    result.ram || 'N/A'
                )
                return pcRegistrationDet;
            }
            )

            res.status(200).json(pcResitrationDto);
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
}

exports.removePcRegistration = async (req, res) => {
    const centerCode = req.session.centerId;
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ "message": "ID is required for deletion" });
    }

    const query = 'DELETE FROM pcregistration WHERE id = ? AND center = ?';

    try {
        const [results] = await connection.query(query, [id, centerCode]);
        // console.log(results);

        if (results.affectedRows > 0) {
            res.status(200).json({
                "message": "PC registration removed successfully",
                "deletedRows": results.affectedRows
            });
        } else {
            res.status(404).json({
                "message": "No matching PC registration found"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": "Internal Server Error" });
    }
}

