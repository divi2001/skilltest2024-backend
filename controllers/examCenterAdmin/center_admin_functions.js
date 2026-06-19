
const connection = require('../../config/db1');
const { decrypt } = require('../../config/encrypt');


exports.loginCenterAdmin = async (req, res) => {
    console.log("Trying center admin login");
    const { centerId, password } = req.body;
    // console.log("center: "+centerId+ " password: "+password);
    console.log(req.body);
    const centerdbQuery = 'SELECT center, centerpass FROM examcenterdb WHERE center = ?';

    try {
        const [results] = await connection.query(centerdbQuery, [centerId]);
        if (results.length > 0) {
            const admin = results[0];
            console.log("data: " + admin);
            console.log(admin.centerpass);

            // centerpass is stored encrypted in examcenterdb
            const storedPassword = String(decrypt(admin.centerpass)).trim();
            const enteredPassword = String(password).trim();

            console.log("admin pass: " + storedPassword + " provided pass: " + enteredPassword);

            if (storedPassword === enteredPassword) {
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
        console.log(err);
        res.status(500).send(err.message);
    }
};

