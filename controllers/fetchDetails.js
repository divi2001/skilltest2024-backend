const connection =  require("../config/db1");


exports.fetchSubject = async (req,res) => {
    try {
        
        const [rows] = await connection.execute('SELECT * FROM subjectsdb');
        
        // Transform the data to include only necessary fields
        if(rows.length === 0) return res.status(404).json({"message":"No subjects found!!"});
        const subjects = rows.map(row => ({
          subjectId: row.subjectId,
          subject_name: row.subject_name,
          subject_name_short: row.subject_name_short
        }));
    
        res.status(201).json({"message":"Subjects Fetched Successfully!!",subjects});
      } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}