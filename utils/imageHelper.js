const fs = require('fs');
const path = require('path');

// Convert images to base64 for embedding
exports.getImageBase64 = (imagePath) => {
  try {
    const fullPath = path.join(__dirname, '../public', imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Image read error:', error);
    return '';
  }
};

// Prepare student data with base64 images
exports.prepareStudentData = (student) => {
  return {
    ...student,
    logoBase64: this.getImageBase64('pwd_logo1.jpg'),
    ashokStambhBase64: this.getImageBase64('pwd_logo2.jpeg'),
    photoBase64: this.getImageBase64(`pwd_photo_new_resized/${student.photo}`),
    signBase64: this.getImageBase64(`pwd_sign_new_resized/${student.sign}`),
    townPlanningSignBase64: this.getImageBase64('town_planning_sign.jpg'),
    qrCodeBase64: this.getImageBase64('qr-code-sh.png')
  };
};
