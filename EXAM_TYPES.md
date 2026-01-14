# Exam Type Configuration

## Overview
The system supports two exam types for hall ticket generation:

## Exam Types

### 1. **SH (Shorthand / Skill Test)** - DEFAULT
- **Value:** `SH` or `SKILL`
- **Description:** Used for Shorthand and Skill Test exams
- **Features:**
  - Supports both Shorthand (लघुलेखन) and Typewriting (टंकलेखन) QR codes
  - Allows customization of hall ticket layout
  - Uses EJS template with customizable logos and invigilator text
  - QR code selection options: `sh`, `tw`, or `both`

### 2. **GCC (GCC TBC)**
- **Value:** `GCC`
- **Description:** Used for GCC TBC exams
- **Features:**
  - Uses PDFKit template (different from Skill Test)
  - No QR code selection modal
  - No customization modal
  - Default QR type is always `both`

## Database Configuration

### departmentdb Table
The `examType` column has been added to the `departmentdb` table:
```sql
ALTER TABLE departmentdb 
ADD COLUMN examType VARCHAR(10) DEFAULT 'SH';
```

### Default Behavior
- **All departments default to 'SH' (Skill Test)** if not specified
- Frontend normalizes 'SH' to 'SKILL' for consistency
- Backend handles both 'SH', 'SKILL', and 'GCC' values

## How It Works

### Frontend Flow
1. User selects department from dropdown
2. System detects exam type from department record
3. If exam type is 'SH', normalize to 'SKILL'
4. Show appropriate modals based on exam type:
   - **GCC:** Skip QR and customization modals → direct to generation
   - **SKILL:** Show QR modal → Show customization modal → Generate

### Backend Flow
1. API `/api/hallticket-departments/departments` returns departments with examType
2. If examType is missing, default to 'SH'
3. Hall ticket generation routes to appropriate template:
   - **GCC:** Uses PDFKit template from `generateGccTbcHallTicketFromDB()`
   - **SKILL:** Uses EJS template from `generateSkillTestHallTicketFromDB()`

## Updating Department Exam Type

To change a department's exam type, update the database directly:

```sql
-- Set department to SKILL (Shorthand) type
UPDATE departmentdb 
SET examType = 'SH' 
WHERE departmentId = <your_dept_id>;

-- Set department to GCC type
UPDATE departmentdb 
SET examType = 'GCC' 
WHERE departmentId = <your_dept_id>;
```

## Migration
Run the migration script to add the examType column:
```bash
node add_examType_column.js
```

This will:
- Add the `examType` column if it doesn't exist
- Set default value to 'SH' for all existing departments
- Show current department exam types

## Notes
- The default exam type is **'SH' (Skill Test/Shorthand)**
- Frontend accepts 'SH', 'SKILL', and 'GCC'
- Backend normalizes values for consistency
- Each exam type has its own hall ticket template and generation logic
