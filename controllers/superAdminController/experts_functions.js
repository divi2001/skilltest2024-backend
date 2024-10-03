const connection = require("../../config/db1")

exports.getAllExperts = async(req,res)=>{

    try {
        let query =  `select * from expertdb`;
        
        const [results] = await connection.query(query);

        if (results.length === 0) {
            return res.status(404).json({ "message": "No expert review logs found for this department" });
        }

        res.status(201).json({"message":"experts fethed successfully",results});
    } catch (error) {
        console.log("error fetching experts",error);
        res.status(500).json({"message":"Internal Server Error"});
    }
}

exports.updateExpertsdb = async (req,res) => {

    const {experts , paper_check , paper_mod , super_mod ,updateAll} = req.body;

    
        const fieldsToUpdate = [];
        const values = [];
        if (paper_check !== undefined) {
            fieldsToUpdate.push('paper_check = ?');
            values.push(paper_check);
        }
        if (paper_mod !== undefined) {
            fieldsToUpdate.push('paper_mod = ?');
            values.push(paper_mod);
        }
        if (super_mod !== undefined) {
            fieldsToUpdate.push('super_mod = ?');
            values.push(super_mod);
        }
    
        // Validate input
        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }
    try {
        let query = 'UPDATE expertdb SET ' + fieldsToUpdate.join(', ');
        if (!updateAll && (!experts || experts.length === 0)) {
            return res.status(400).json({ message: "No experts specified for update" });
        }
        if (!updateAll) {
            query += ' WHERE expertId IN (?)';
            values.push(experts);
        }
        
        const [result] = await connection.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No experts found or no changes made" });
        }

        res.status(200).json({
            message: `Successfully updated ${result.affectedRows} expert(s)`,
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Error updating expert fields:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
    
}

exports.insertExpert = async (req, res) => {
    const { password, expert_name , expertId } = req.body;

    // Validate input
    if (!password || !expert_name) {
        return res.status(400).json({ message: "Both password and expert_name are required" });
    }
    
    try {
        const super_mod = true;
        const query = 'INSERT INTO expertdb (expertId,password, expert_name , super_mod) VALUES (?,?, ? ,?)';
        const values = [expertId , password, expert_name , super_mod];

        const [result] = await connection.query(query, values);

        res.status(201).json({
            message: "Expert successfully inserted",
        });

    } catch (error) {
        console.error('Error inserting expert:', error);
        res.status(500).json({ message: "Internal Server error" });
    }
}