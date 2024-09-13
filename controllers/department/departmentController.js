const connection = require('../../config/db1');
const {decrypt} = require("../../config/encrypt");
exports.departementLogin = async (req,res) => {

    console.log("Trying center admin login");
    const { departmentId, password } = req.body;
    // console.log("center: "+centerId+ " password: "+password);
    console.log(req.body);
    const departmentdbQuery = 'SELECT departmentId, departmentPassword FROM departmentdb WHERE departmentId = ?';
  
    try {
        const [results] = await connection.query(departmentdbQuery, [departmentId]);
        if (results.length > 0) {
            const admin = results[0];
            // console.log("data: "+admin);
            console.log(admin)
            // let decryptedStoredPassword = await decrypt(admin.departmentPassword);
            // console.log(decryptedStoredPassword);
            // try {

            //     console.log("admin pass: "+admin.departmentPassword + " provide pass: "+password);
                   
            // } catch (error) {                
            //     console.log(error);
            // }

            
            if (admin.departmentPassword === password) {
                // Set institute session
                req.session.departmentId = admin.departmentId;
                res.status(200).send('Logged in successfully as an department admin!');
                
            } else {
                res.status(401).send('Invalid credentials for center admin');
            }
        } else {
            res.status(404).send('department not found');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
}