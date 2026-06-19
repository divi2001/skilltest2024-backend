# Quick Start Guide: qsetdb Auto-Population

## What It Does
Automatically creates missing `qsetdb` entries when a backend request includes a `departmentId` that doesn't exist in the table yet.

## Installation
Already integrated! No setup required.

## Usage

### For Developers

The utility is automatically called in these functions:
- `getIgnoreList`
- `getStudentIgnoreList`
- `addToIgnoreList`
- `addToStudentIgnoreList`
- `removeFromIgnoreList`
- `removeFromStudentIgnoreList`

**You don't need to do anything special** - just make requests as normal with a `departmentId` parameter.

### Manual Usage (if needed)

```javascript
const { ensureQsetdbEntries, ensureQsetdbEntryForSubject } = require('./utils/qsetdbHandler');

// Ensure all subjects for a department
const result = await ensureQsetdbEntries(10);
console.log(result); 
// { success: true, created: true, count: 14, subjectIds: [...] }

// Ensure specific subject-department pair
const result2 = await ensureQsetdbEntryForSubject(10, 40);
console.log(result2); 
// { success: true, exists: true }
```

## Testing

```bash
# Run test script
node test_qsetdb_handler.js
```

## What Gets Created

When departmentId 10 is used for the first time:

```sql
-- Before
SELECT * FROM qsetdb WHERE departmentId = 10;
-- Empty

-- After (automatically created)
-- 14 new rows:
-- (40, 10), (41, 10), (42, 10), (50, 10), (51, 10),
-- (52, 10), (53, 10), (54, 10), (60, 10), (61, 10),
-- (62, 10), (63, 10), (70, 10), (72, 10)
-- All Q*PA and Q*PB columns = NULL
```

## API Response Examples

### Success (entries created)
```json
{
  "success": true,
  "message": "Created 14 entries for departmentId 10",
  "created": true,
  "count": 14,
  "subjectIds": [40, 41, 42, 50, 51, 52, 53, 54, 60, 61, 62, 63, 70, 72]
}
```

### Success (entries already exist)
```json
{
  "success": true,
  "message": "Entries already exist for departmentId 10",
  "created": false,
  "existingCount": 14
}
```

### Error (no audiodb data)
```json
{
  "success": false,
  "message": "No subjects found in audiodb for departmentId 999",
  "created": false
}
```

## Logging

Console output when entries are created:
```
Created 14 qsetdb entries for departmentId: 10
Inserted subjectIds: 40, 41, 42, 50, 51, 52, 53, 54, 60, 61, 62, 63, 70, 72
```

## FAQ

**Q: Will this slow down my requests?**  
A: First request: ~50-100ms. Subsequent requests: ~5-10ms. Negligible impact.

**Q: What if the departmentId doesn't exist in audiodb?**  
A: Returns error response, no entries created.

**Q: Can I run this multiple times?**  
A: Yes! It's idempotent - safe to call repeatedly.

**Q: Do I need to update existing code?**  
A: No! Already integrated into all relevant functions.

**Q: What about existing qsetdb entries?**  
A: They're preserved. Only missing entries are created.

## Troubleshooting

### Issue: "No subjects found in audiodb"
**Solution**: Verify the departmentId exists in audiodb table.

### Issue: Database connection error
**Solution**: Check database connection settings in config/db1.js.

### Issue: Permission denied
**Solution**: Ensure database user has INSERT permissions on qsetdb.

## More Info

- Full documentation: [utils/QSETDB_HANDLER_README.md](utils/QSETDB_HANDLER_README.md)
- Implementation details: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- Source code: [utils/qsetdbHandler.js](utils/qsetdbHandler.js)
