# Delete Function Maintenance Guide

## ⚠️ CRITICAL: Read This Before Adding New Features

Every time you add a **new table** or **foreign key relationship** to `students`, `profiles`, or `auth.users`, you **MUST** update the delete function.

## Quick Checklist

When adding a new feature that creates a table:

- [ ] Does the table have a foreign key to `students.id`, `profiles.id`, or `auth.users.id`?
- [ ] If YES → Add deletion code to `netlify/functions/delete-auth-user.js`
- [ ] Add the table to the `knownTables` array in the validation function
- [ ] Add the table to the maintenance comment at the top of the file
- [ ] Add the table to the `referenceChecks` array for debugging
- [ ] Run `npm run check-delete` to verify

## Step-by-Step Instructions

### 1. Identify the Foreign Key

Check your new table:
```sql
-- Example: If you create a table like this:
CREATE TABLE new_feature (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  ...
);
```

### 2. Add Deletion Code

In `netlify/functions/delete-auth-user.js`, add deletion code **BEFORE** the `students` table deletion:

```javascript
// X. Delete new_feature (student_id)
try {
  const { error: newFeatureError } = await supabaseAdmin
    .from('new_feature')
    .delete()
    .eq('student_id', userId)
  if (newFeatureError && !newFeatureError.message?.includes('does not exist')) {
    console.warn('Error deleting new_feature:', newFeatureError.message)
  } else {
    console.log('New feature records deleted successfully')
  }
} catch (e) {
  console.log('New feature table may not exist, skipping deletion')
}
```

### 3. Update the Validation Function

Add your table to the `knownTables` array:

```javascript
const knownTables = [
  // ... existing tables ...
  'new_feature'  // ← Add here
]
```

### 4. Update the Maintenance Comment

Update the numbered list at the top of the file:

```javascript
 * 21. New feature (student_id) ⚠️ ADDED
```

### 5. Add to Reference Checks

Add to the `referenceChecks` array (for debugging):

```javascript
{ table: 'new_feature', column: 'student_id' },
```

### 6. Verify

Run the validation script:
```bash
npm run check-delete
```

This will automatically detect if you've missed anything!

## Automated Validation

The delete function now includes **automatic validation** that:
- Checks for foreign key relationships before deletion
- Warns you if tables are missing from the deletion list
- Helps catch issues before they cause problems

## Common Mistakes

### ❌ Forgetting to add the table
**Symptom**: Deletion fails with foreign key constraint error
**Fix**: Add the table to deletion code

### ❌ Wrong deletion order
**Symptom**: Deletion fails because child records still exist
**Fix**: Delete child tables before parent tables

### ❌ Not handling table existence
**Symptom**: Function crashes if table doesn't exist
**Fix**: Wrap in try-catch or check for "does not exist" errors

## Testing

After updating the delete function:

1. Create a test student
2. Add data to your new table for that student
3. Try to delete the student
4. Verify:
   - Student is deleted
   - All related records in your new table are deleted
   - No foreign key constraint errors

## Need Help?

If deletion keeps failing:
1. Check Netlify function logs for specific error messages
2. Run `npm run check-delete` to see what's missing
3. Check the `referenceChecks` output in the logs
4. Verify the deletion order is correct (children before parents)

## Remember

**The maintenance comment alone is NOT enough!** Always:
- ✅ Add the deletion code
- ✅ Update the validation function
- ✅ Run the check script
- ✅ Test the deletion

This automated validation will catch most issues, but you still need to add the deletion code!
