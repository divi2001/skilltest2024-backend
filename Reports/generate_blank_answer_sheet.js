
// Create a document
// c
// This will print the Marathi text correctly in a UTF-8 capable console
const connection = require("../config/db1");
async function createBlankAnswerSheet(doc,data)  {
      
      // Constants for layout
      const headerHeight = 85;
      const lineGap = 30;
      
      // Function to create header
      function createHeader(doc, text1, text2) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(text1, {
             align: 'center'
           })
           .fontSize(12)
           .text(text2, {
             align: 'center'
           });
      }
      
      // Function to create a field
      function createField(doc, label, value = '', x, y) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`${label}`, x, y, {
             continued: true
           })
           .font('Helvetica')
           .text(`: ${value}`);
      }
      
      // Function to draw lines
      function drawLines(doc, startY, endY, gap) {
        for (let y = startY; y <= endY; y += gap) {
          doc.moveTo(40, y)
             .lineTo(doc.page.width - 40, y)
             .stroke();
        }
      }
      
      // Function to draw a single line
      function drawSingleLine(doc, y) {
        doc.moveTo(40, y)
           .lineTo(doc.page.width - 40, y)
           .stroke();
      }
      
      // Function to create a page
      function createPage(doc, isFirstPage) {
        createHeader(doc, data.departmentName, 'Skill Test Computer Shorthand Examination April 2025');
        
        let startY = headerHeight;
      
        // Draw line under the header
        
      
        if (isFirstPage) {
          drawSingleLine(doc, startY+5);
          createField(doc, 'Seat No', '', 40, startY + 15);
          createField(doc, 'Name', '', doc.page.width / 2, startY + 15);
          createField(doc, 'Subject', '', 40, startY + 35);
          createField(doc, 'Batch', '', doc.page.width / 2, startY + 35);
      
          // Draw horizontal line under the fields
          drawSingleLine(doc, startY + 50);
      
          startY += 80; // Adjust starting point for lines on the first page
        } else {
          startY += 30; // Gap after header line on subsequent pages
        }
      
        // Draw lines for writing
        drawLines(doc, startY, doc.page.height - 40, lineGap);
      }
      
      // Create first page
      createPage(doc, true);
      
      // Add a new page
      doc.addPage();
      
      // Create second page
      createPage(doc, false);
    
}
async function getData(center, batchNo) {
  try {
      // console.log(center, batchNo);
      const query = 'SELECT s.student_id , d.departmentName , d.logo from students as s JOIN departmentdb d ON s.departmentId = d.departmentId where s.batchNo = ? AND s.center = ?';
      const response = await connection.query(query, [batchNo, center]);
      
      return { 
          response: response[0], 
      };
  } catch (error) {
      console.error('Error in getData:', error);
      throw error;
  }
}

async function generateBlankAnswerSheet(doc, center, batchNo) {
  try {
      const Data = await getData(center, batchNo);
      console.log(Data);

      const response = Data.response;
      if (!Array.isArray(response) || response.length === 0) {
          throw new Error('No data returned from getData');
      }      

      const data = {
    
          departmentName : response[0].departmentName
      };

      createBlankAnswerSheet(doc, data);

  } catch (error) {
      console.error("Error generating report:", error);
      throw error;
  }
}


module.exports = {generateBlankAnswerSheet};