
const connection = require('../../config/db1');
const moment = require('moment-timezone');

exports.loginCenterAdmin= async (req, res) => {
    console.log("Trying center admin login");
    const { centerId, password } = req.body;
    console.log("center: "+centerId+ " password: "+password);
    const centerdbQuery = 'SELECT center, centerpass FROM examcenterdb WHERE center = ?';
    
    try {
        const [results] = await connection.query(centerdbQuery, [centerId]);
        if (results.length > 0) {
            const admin = results[0];
            console.log("data: "+admin);
            console.log(admin)
            let decryptedStoredPassword;
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
  




exports.isAbletoDownload = async (req, res) => {
    try {
        // if(!req.session.centerId) return res.status(403).json({"message":"Admin is not logged in"});

        const query = "SELECT * FROM batchdb WHERE batchdate = ?";
        const today = moment().format('YYYY-MM-DD');
        const [batches] = await connection.query(query, [today]);

        if (batches.length === 0) {
            return res.status(404).json({"message": "There are no batches today"});
        }

        const currentTime = moment();
        const downloadableBatches = batches.filter(batch => {
            const batchDate = moment(batch.batchdate).format('YYYY-MM-DD');
            const downloadTime = moment(`${batchDate} ${batch.Download_Time}`, 'YYYY-MM-DD HH:mm:ss');
            const startTime = moment(`${batchDate} ${batch.Start_Time}`, 'YYYY-MM-DD h:mm A');
            
            return currentTime.isSameOrAfter(downloadTime) && currentTime.isBefore(startTime);
        }).map(batch => {
            const batchDate = moment(batch.batchdate).format('YYYY-MM-DD');
            const downloadTime = moment(`${batchDate} ${batch.Download_Time}`, 'YYYY-MM-DD HH:mm:ss');
            const startTime = moment(`${batchDate} ${batch.Start_Time}`, 'YYYY-MM-DD h:mm A');
            
            return {
                batchNo: batch.batchNo,
                batchdate: batch.batchdate,
                Reporting_Time: batch.Reporting_Time,
                Start_Time: batch.Start_Time,
                End_Time: batch.End_Time,
                batchstatus: batch.batchstatus,
                Download_Time: batch.Download_Time,
                isDownloadable: true,
                downloadTimeFormatted: downloadTime.format('hh:mm A'),
                startTimeFormatted: startTime.format('hh:mm A'),
                currentTimeFormatted: currentTime.format('hh:mm A')
            };
        });

        if (downloadableBatches.length === 0) {
            return res.status(404).json({"message": "No batches are currently available for download"});
        }

        res.json(downloadableBatches);

    } catch (error) {
        console.error(error);
        res.status(500).json({"message": "Internal Server Error"});
    }
};