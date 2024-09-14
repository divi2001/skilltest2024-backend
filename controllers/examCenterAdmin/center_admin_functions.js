
const connection = require('../../config/db1');
const { decrypt,encrypt } = require('../../config/encrypt');

exports.loginCenterAdmin= async (req, res) => {
    console.log("Trying center admin login");
    const { centerId, password } = req.body;
    // console.log("center: "+centerId+ " password: "+password);
    console.log(req.body);
    const centerdbQuery = 'SELECT center, centerpass FROM examcenterdb WHERE center = ?';
  
    try {
        const [results] = await connection.query(centerdbQuery, [centerId]);
        if (results.length > 0) {
            const admin = results[0];
            // console.log("data: "+admin);
            console.log(admin.centerpass);
            let decryptedStoredPassword;
            // try {
            //     console.log("entered:");
            //     decryptedStoredPassword = decrypt(admin.centerpass);
            // } catch (error) {
            //     // console.log(decryptedStoredPassword + password )
            //     console.error('Error decrypting provided password:', error);
            //     res.status(500).send('invalid credentials 4');
            //     return;
            // }

            // // Ensure both passwords are treated as strings
            // const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();

            try {
                console.log("admin pass: "+admin.centerpass + " provide pass: "+password);
                   
            } catch (error) {                
                return;
            }
            
            
            if (admin.centerpass === password) {
                // Set institute session
                req.session.centerId = admin.center;
                res.status(200).send('Logged in successfully as an center admin!');
                
            } else {
                res.status(401).send('Invalid credentials for center admin');
            }
        } else {
            res.status(404).send('center not found');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
  };