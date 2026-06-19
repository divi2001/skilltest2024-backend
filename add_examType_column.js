// Migration script to add examType column to departmentdb table
const db = require('./config/db1');

async function addExamTypeColumn() {
  try {
    console.log('Starting migration: Adding examType column to departmentdb...');
    
    // Check if column already exists
    const [columns] = await db.execute(`
      SHOW COLUMNS FROM departmentdb LIKE 'examType'
    `);
    
    if (columns.length > 0) {
      console.log('✓ examType column already exists');
      return;
    }
    
    // Add the column with default value 'SH'
    await db.execute(`
      ALTER TABLE departmentdb 
      ADD COLUMN examType VARCHAR(10) DEFAULT 'SH' 
      COMMENT 'Exam type: SH for Shorthand/Skill Test, GCC for GCC TBC'
    `);
    
    console.log('✓ examType column added successfully');
    
    // Update all existing records to have 'SH' as default
    const [result] = await db.execute(`
      UPDATE departmentdb 
      SET examType = 'SH' 
      WHERE examType IS NULL OR examType = ''
    `);
    
    console.log(`✓ Updated ${result.affectedRows} rows with default examType 'SH'`);
    
    // Verify the change
    const [departments] = await db.execute(`
      SELECT departmentId, departmentName, examType 
      FROM departmentdb
    `);
    
    console.log('\nCurrent departments with exam types:');
    departments.forEach(dept => {
      console.log(`  - ${dept.departmentName}: ${dept.examType}`);
    });
    
    console.log('\n✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await db.end();
  }
}

// Run the migration
addExamTypeColumn()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
