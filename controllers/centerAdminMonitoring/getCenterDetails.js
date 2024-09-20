const connection = require('../../config/db1');
const ExamCenterDTO = require('../../dto/examCenterDb');
const encryptionInterface = require('../../config/encrypt')

exports.getExamCenterDetails = async (req, res) => {
    const center = req.session.centerId;
    // console.log(center);

    // console.log("getting exam center details Center: " + center);
    const query = 'SELECT * FROM examcenterdb WHERE center = ?';
    const countQuery = 'SELECT COUNT(*) AS pcCount FROM pcregistration WHERE center = ?';
    console.log("Checking the number of registered PCs for the center");
    const [countResults] = await connection.query(countQuery, [center]);
    const pcCount = countResults[0].pcCount;

    try {
        const [results] = await connection.query(query, [center]);

        if (results.length > 0) {
            const examCenterDTO = results.map(result => {
                const examCenter = new ExamCenterDTO(
                    result.center,
                    result.center_name,
                    result.center_address,
                    result.pc_count,
                    result.max_pc,
                );
                // if (typeof examCenter.center_address === 'string') {
                //     console.log("examCenter.center_address is a string: "+ examCenter.center_address);
                //     examCenter.center_address = encryptionInterface.decrypt(examCenter.center_address);
                // }
                // console.log("examCenter.center_address: " + examCenter.center_address);
                return examCenter;
            });
            res.status(200).json({ examCenterDTO, pcCount });
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        console.log("getExamCenterDetails: " + err);
        res.status(500).send(err.message);
    }
}
exports.getPcregistrationdetails = async (req, res) => {
    const center = req.session.centerId;
    try {
        const query = `SELECT 
    e.center,
    e.max_pc,
    e.pc_count,
    COUNT(p.id) AS registered_pc_count
FROM 
    examcenterdb e
LEFT JOIN 
    pcregistration p ON e.center = p.center
GROUP BY 
    e.center, e.max_pc, e.pc_count
ORDER BY 
    e.center;`

    const [results] =await connection.query(query);
    // console.log(results);
    res.status(200).json({results})
    } catch (error) {
         console.log(error);
         res.status(500).json({"error":error});
    }
}