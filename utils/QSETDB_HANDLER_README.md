# qsetdb Handler Utility

## Overview

The `qsetdbHandler` utility automatically ensures that `qsetdb` table entries exist for any `departmentId` used in backend requests. This prevents errors when querying or updating ignore lists for departments that don't yet have entries in `qsetdb`.

## Purpose

When a request is received containing a `departmentId`:
1. **Check** if the `departmentId` exists in `qsetdb`
2. **Create entries** automatically if missing, based on `audiodb` mappings
3. **Preserve** existing subject-qset relationships

## Database Schema

### qsetdb Table
Stores ignore lists for each subject, qset, and passage combination per department:
- `id`: Auto-increment primary key
- `subjectId`: Subject identifier
- `departmentId`: Department identifier
- `Q1PA` through `Q8PB`: Text columns for ignore lists (qset 1-8, passages A-B)

### audiodb Table (Source of Truth)
Contains audio passage data with department-subject-qset mappings:
- `subjectId`: Subject identifier
- `qset`: Question set number (1-8)
- `departmentId`: Department identifier
- Additional audio and passage data

## Implementation

### Location
```
utils/qsetdbHandler.js
```

### Functions

#### 1. `ensureQsetdbEntries(departmentId)`

Ensures all subjects for a department have entries in qsetdb.

**Parameters:**
- `departmentId` (number): The department ID to check/create entries for

**Returns:**
```javascript
{
    success: boolean,        // Operation success status
    message: string,         // Descriptive message
    created: boolean,        // Whether new entries were created
    count: number,          // Number of entries created (if created)
    subjectIds: array,      // Array of subjectIds inserted (if created)
    existingCount: number   // Count of existing entries (if not created)
}
```

**Behavior:**
1. Checks if `departmentId` exists in `qsetdb`
2. If exists: Returns success with existing count
3. If not exists:
   - Queries `audiodb` for all distinct `subjectIds` for that `departmentId`
   - Creates one `qsetdb` entry per `subjectId` with all Q*PA/Q*PB columns as NULL
   - Returns success with created count and subject IDs

**Example:**
```javascript
const { ensureQsetdbEntries } = require('./utils/qsetdbHandler');

const result = await ensureQsetdbEntries(10);
// Returns: { success: true, created: true, count: 12, subjectIds: [40,41,42,...] }
```

#### 2. `ensureQsetdbEntryForSubject(departmentId, subjectId)`

Ensures a specific subject-department pair exists in qsetdb.

**Parameters:**
- `departmentId` (number): The department ID
- `subjectId` (number): The subject ID

**Returns:**
```javascript
{
    success: boolean,
    message: string,
    exists: boolean,     // True if entry already existed
    ...                  // Additional fields from ensureQsetdbEntries if created
}
```

**Behavior:**
1. Checks if the specific `subjectId`-`departmentId` pair exists in `qsetdb`
2. If exists: Returns immediately
3. If not: Calls `ensureQsetdbEntries()` to create all entries for the department

**Example:**
```javascript
const { ensureQsetdbEntryForSubject } = require('./utils/qsetdbHandler');

const result = await ensureQsetdbEntryForSubject(10, 40);
// Returns: { success: true, exists: true } or creates all entries
```

## Integration

### Usage in Controllers

The utility is integrated into all `studentSpecific.js` functions that interact with `qsetdb`:

1. **getIgnoreList** - Validates before fetching ignore list
2. **getStudentIgnoreList** - Validates before fetching student-specific ignore list
3. **addToIgnoreList** - Validates before adding words
4. **addToStudentIgnoreList** - Validates before adding student-specific words
5. **removeFromIgnoreList** - Validates before removing words
6. **removeFromStudentIgnoreList** - Validates before removing student-specific words

### Integration Pattern

```javascript
const { ensureQsetdbEntryForSubject } = require('../../utils/qsetdbHandler');

// In any function that accesses qsetdb:
async function someFunction(req, res) {
    const { subjectId, departmentId } = req.body;
    
    try {
        // Ensure qsetdb entries exist
        await ensureQsetdbEntryForSubject(departmentId, subjectId);
        
        // Proceed with normal qsetdb operations
        const query = `SELECT ... FROM qsetdb WHERE ...`;
        // ...
    } catch (err) {
        // Handle errors
    }
}
```

## Data Flow

```
Request with departmentId
    ↓
ensureQsetdbEntryForSubject(departmentId, subjectId)
    ↓
Check: Does subjectId + departmentId exist in qsetdb?
    ↓
    ├─ YES → Return { success: true, exists: true }
    │
    └─ NO → ensureQsetdbEntries(departmentId)
            ↓
            Query audiodb for all subjectIds with this departmentId
            ↓
            Create qsetdb entries for each subjectId
            ↓
            Return { success: true, created: true, count: N }
```

## Example Scenario

### Initial State
```sql
-- audiodb has entries for departmentId 10
SELECT DISTINCT subjectId FROM audiodb WHERE departmentId = 10;
-- Results: 40, 41, 42, 50, 51, 52, 53, 54, 60, 61, 62, 63, 70, 72

-- qsetdb does NOT have entries for departmentId 10
SELECT * FROM qsetdb WHERE departmentId = 10;
-- Results: Empty set
```

### Request Received
```javascript
POST /api/getIgnoreList
Body: {
    subjectId: 40,
    qset: 1,
    activePassage: "A",
    departmentId: 10
}
```

### Automatic Handling
1. `ensureQsetdbEntryForSubject(10, 40)` is called
2. Checks qsetdb: No entries found for departmentId 10
3. Queries audiodb: Finds 14 distinct subjectIds for departmentId 10
4. Creates 14 new rows in qsetdb:
   ```sql
   INSERT INTO qsetdb (subjectId, departmentId, Q1PA, Q1PB, ...)
   VALUES 
   (40, 10, NULL, NULL, ...),
   (41, 10, NULL, NULL, ...),
   ...
   (72, 10, NULL, NULL, ...);
   ```
5. Returns success
6. Original query proceeds normally

### Result
```sql
SELECT * FROM qsetdb WHERE departmentId = 10;
-- Now returns 14 rows, ready for use
```

## Testing

Run the test script:
```bash
node test_qsetdb_handler.js
```

### Test Cases
1. Create entries for new departmentId
2. Verify no duplicates created on subsequent calls
3. Test specific subject-department validation
4. Handle non-existent departmentIds gracefully

## Error Handling

- **Missing departmentId**: Returns `{ success: false, message: 'departmentId is required' }`
- **No audiodb data**: Returns `{ success: false, message: 'No subjects found...' }`
- **Database errors**: Rolls back transaction, returns error details
- **Validation errors**: Returns descriptive error messages

## Benefits

1. **Automatic**: No manual intervention needed
2. **Safe**: Uses transactions to ensure data consistency
3. **Efficient**: Only creates entries when needed
4. **Idempotent**: Safe to call multiple times
5. **Auditable**: Logs all actions to console
6. **Reusable**: Single utility handles all cases

## Maintenance

### Adding New Qset Columns
If new qset columns are added (e.g., Q9PA, Q9PB):
1. Update the `INSERT` statement in `ensureQsetdbEntries()`
2. Add new column names to the column list
3. Add NULL values for new columns

### Future Enhancements
- Bulk validation for multiple departments
- Caching mechanism to reduce database queries
- Admin endpoint to pre-populate departments
- Scheduled job to sync audiodb → qsetdb
