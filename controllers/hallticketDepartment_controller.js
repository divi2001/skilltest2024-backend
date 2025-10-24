// controllers/hallticketDepartment_controller.js
const db = require('../config/db1'); 

const hallticketDepartmentController = {
  
  getDepartmentsForHallTickets: async (req, res) => {
    try {
      const query = `
        SELECT 
          departmentId,
          departmentName,
          examType,
          departmentStatus
        FROM departmentdb 
        ORDER BY departmentName ASC
      `;

      const [departments] = await db.execute(query);

      if (departments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active departments found'
        });
      }

      // Filter out departments without exam type and log for debugging
      const validDepartments = departments.filter(dept => dept.examType);
      const invalidDepartments = departments.filter(dept => !dept.examType);

      if (invalidDepartments.length > 0) {
        console.warn(`Found ${invalidDepartments.length} departments without exam type:`, 
          invalidDepartments.map(d => d.departmentName));
      }

      res.status(200).json({
        success: true,
        message: 'Departments fetched successfully',
        data: validDepartments, // Only return departments with exam types
        totalDepartments: departments.length,
        validDepartments: validDepartments.length,
        departmentsWithoutExamType: invalidDepartments.length
      });

    } catch (error) {
      console.error('Error fetching departments for hall tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching departments',
        error: error.message
      });
    }
  }
};

module.exports = hallticketDepartmentController;
