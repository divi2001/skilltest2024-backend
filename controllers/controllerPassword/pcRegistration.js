const pcRegistrationDTO = require('../../dto/pcRegistrationDTO');
const connection = require('../../config/db1');


exports.getPcRegistrations = async (req, res) => {
    
    const centerCode = req.session.centerId;

    console.log("CenterCode: "+centerCode);

    const query = 'select center, ip_address, disk_id, mac_address from pcregistration where center = ?;';

    try{
        const [results] = await connection.query(query, [centerCode]);
        
        console.log("result: "+results);
        if (results.length > 0) {
            const pcResitrationDto = results.map(result => {
                const pcRegistrationDet = new pcRegistrationDTO(
                    result.center,
                    result.ip_address,
                    result.disk_id,
                    result.mac_address,
                    )
                    return pcRegistrationDet;
                }
            )
            
            res.status(200).json(pcResitrationDto);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}

exports.removePcRegistration = async (req, res) => {
    const centerCode = req.session.centerId;
    const { ip_address, disk_id, mac_address } = req.body;

    console.log("center:", centerCode);
    console.log("ip_address:", ip_address);
    console.log("disk_id:", disk_id);
    console.log("mac_address:", mac_address);

    const query = 'DELETE FROM pcregistration WHERE center = ? AND ip_address = ? AND mac_address = ? AND disk_id = ?';

    try {
        const [results] = await connection.query(query, [centerCode, ip_address, mac_address, disk_id]);
        console.log(results);
        
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
        res.status(500).json({"message": "Internal Server Error"});
    }
}

