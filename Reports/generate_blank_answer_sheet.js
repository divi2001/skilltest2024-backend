
// Create a document
async function createBlankAnswerSheet(doc)  {
      
      // Constants for layout
      const headerHeight = 60;
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
        createHeader(doc, 'MAHARASHTRA STATE COUNCIL OF EXAMINATION, PUNE', 'GCC COMPUTER SHORTHAND EXAMINATION SEPTEMBER 2024');
        
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

module.exports = {createBlankAnswerSheet};