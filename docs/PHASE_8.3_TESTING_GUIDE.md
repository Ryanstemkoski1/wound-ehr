# Phase 8.3 Testing Guide - Wound-Based Visit Assessment Form

## Overview
This guide tests the new wound-based assessment form with wound switcher, radio buttons, checkboxes, and progress tracking.

---

## Prerequisites

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Login as any role** (tenant_admin, facility_admin, or user)

3. **Have test data**:
   - At least one patient
   - Patient should have multiple wounds (test both 2-5 wounds and 6+ wounds scenarios)
   - At least one visit for that patient

---

## Test 1: Create Wounds for Testing

### Steps:
1. Go to **Patients** page
2. Click on a patient
3. Scroll to **Wounds** section
4. Click **Add Wound** button

5. **Create 3 wounds** (for tabs layout test):
   - Wound 1: Location: "Left heel", Type: "Pressure Injury"
   - Wound 2: Location: "Right ankle", Type: "Diabetic Ulcer"
   - Wound 3: Location: "Sacrum", Type: "Pressure Injury"

6. **Optional: Create 6+ wounds** (for sidebar layout test):
   - Add 3 more wounds with different locations

✅ **Expected Result**: Multiple active wounds created for the patient

---

## Test 2: Access Assessment Form

### Steps:
1. From patient detail page, scroll to **Visits** section
2. Find a visit or create a new visit
3. Click on the visit card
4. Click **New Assessment** button

✅ **Expected Result**: 
- Redirected to `/dashboard/patients/[id]/visits/[visitId]/assessments/new`
- Multi-wound assessment form loads

---

## Test 3: Wound Switcher - Tabs Layout (2-5 wounds)

### If you have 2-5 wounds:

1. **Check Progress Indicator**:
   - Should show: "Wound 1 of 3" badge
   - Should show: "0 / 3 completed (0%)"
   - Progress bar should be empty (0% width)

2. **Check Tabs**:
   - All wounds shown as tabs horizontally
   - First tab should be active (highlighted in teal)
   - Each tab shows: Wound number and location
   - Example: "Wound 1 - Left heel"

3. **Click Different Tabs**:
   - Click "Wound 2" tab
   - Badge updates to "Wound 2 of 3"
   - Tab becomes active (teal background)
   - Form content updates

✅ **Expected Result**: 
- Tabs layout visible
- Easy switching between wounds
- Progress indicator updates
- No sidebar layout

---

## Test 4: Wound Switcher - Sidebar Layout (6+ wounds)

### If you have 6+ wounds:

1. **Check Progress Indicator**:
   - Card at top showing "Assessment Progress"
   - Badge: "0 / 6"
   - Progress bar: 0% complete
   - Text: "0% complete"

2. **Check Sidebar**:
   - Vertical list of all wounds
   - Scrollable area (max height 400px)
   - First wound highlighted (active)
   - Each wound shows:
     - Number badge (or checkmark if complete)
     - Wound number
     - Location
     - Wound type
   - Active wound has chevron icon (→)

3. **Click Different Wounds**:
   - Click on Wound 3
   - Wound 3 becomes active (teal background)
   - Form updates to show Wound 3 data

✅ **Expected Result**: 
- Sidebar layout visible
- Scrollable wound list
- Easy navigation
- No tabs layout

---

## Test 5: Form Fields - Radio Buttons (Single Select)

### Test Wound Type:
1. Scroll to **Wound Classification** card
2. Look for "Wound Type *" section
3. Should see radio buttons (not dropdown) for:
   - Pressure Injury
   - Diabetic Ulcer
   - Venous Ulcer
   - Arterial Ulcer
   - Surgical Wound
   - Traumatic Wound
   - Burn
   - Other

4. **Click "Pressure Injury"**
   - Radio button selected
   - Only one can be selected at a time

5. **Click "Diabetic Ulcer"**
   - Previous selection cleared
   - New selection active

### Test Other Radio Button Fields:
- **Pressure Stage**: 6 options (Stage 1-4, Unstageable, DTI)
- **Healing Status**: 6 options (Initial, Healing, Stable, Declined, Healed, Sign-off)
- **Exudate Amount**: 4 options (None, Minimal, Moderate, Heavy)
- **Exudate Type**: 4 options (Serous, Sanguineous, Purulent, Serosanguineous)
- **Odor**: 4 options (None, Mild, Moderate, Strong)

✅ **Expected Result**: 
- All radio buttons work
- Labels are clickable (cursor changes to pointer)
- Only one option can be selected per field
- Clear visual feedback when selected

---

## Test 6: Form Fields - Checkboxes (Multi-Select)

### Test Infection Signs:
1. Scroll to **Signs of Infection** card
2. Should see checkboxes for 8 options:
   - Increased warmth
   - Erythema/redness
   - Edema/swelling
   - Purulent drainage
   - Increased pain
   - Delayed healing
   - Friable granulation tissue
   - Foul odor

3. **Select Multiple Options**:
   - Click "Increased warmth" checkbox
   - Click "Erythema/redness" checkbox
   - Click "Purulent drainage" checkbox

4. **Verify Multiple Selection**:
   - All 3 checkboxes should be checked
   - Can select as many as needed

5. **Uncheck One**:
   - Click "Erythema/redness" again
   - Only that checkbox unchecks

### Test "At Risk" Checkbox:
- In Wound Classification section
- Single checkbox: "At risk of reopening"
- Can toggle on/off independently

✅ **Expected Result**: 
- Multiple checkboxes can be selected
- Labels are clickable
- Independent selection/deselection
- Visual feedback on selection

---

## Test 7: Required Fields & Validation

### Fill Minimum Required Fields:
1. **Wound Type**: Select "Pressure Injury"
2. **Healing Status**: Select "Initial"
3. **Length**: Enter "5.5"
4. **Width**: Enter "3.2"

### Check Area Auto-Calculation:
- Area field should auto-calculate: "17.60" (5.5 × 3.2)
- Area field is disabled (grey background)

✅ **Expected Result**: 
- Area calculates automatically
- No manual input needed for area

---

## Test 8: Complete Wound & Progress Tracking

### Complete First Wound:
1. Fill all required fields (Wound Type, Healing Status, Length, Width)
2. Optionally fill other fields:
   - Depth: "1.2"
   - Epithelial: "10"
   - Granulation: "60"
   - Slough: "30"
   - Exudate Amount: Select "Moderate"
   - Pain Level: "3"
   - Assessment Notes: "Wound showing signs of healing"

3. **Check Progress Indicator**:
   - Green checkmark appears next to "Current assessment complete"
   - Message: "Current assessment complete" with checkmark icon

4. **Switch to Wound 2**:
   - Click Wound 2 tab (or sidebar item)
   - Progress should update:
     - "1 / 3 completed (33%)"
     - Progress bar shows ~33% filled (teal color)
   - Wound 1 tab/item should now show checkmark ✓

✅ **Expected Result**: 
- Completed wound marked with checkmark
- Progress percentage updates
- Progress bar fills proportionally
- Can switch between wounds without losing data

---

## Test 9: Data Persistence Between Wounds

### Enter Partial Data in Wound 2:
1. Select Wound Type: "Diabetic Ulcer"
2. Enter Length: "4.0"
3. **DON'T** fill Healing Status or Width (incomplete)

### Switch to Wound 3:
1. Click Wound 3 tab/item
2. Fill complete data:
   - Wound Type: "Pressure Injury"
   - Healing Status: "Stable"
   - Length: "6.0"
   - Width: "4.5"

### Switch Back to Wound 2:
1. Click Wound 2 tab/item
2. **Verify Data Preserved**:
   - Wound Type still shows "Diabetic Ulcer"
   - Length still shows "4.0"
   - Other fields empty as before

✅ **Expected Result**: 
- Data persists when switching wounds
- No data loss
- Each wound maintains its own state

---

## Test 10: Submit All Assessments

### Complete All Required Wounds:
1. Go to Wound 2
2. Complete missing fields:
   - Healing Status: "Healing"
   - Width: "3.0"

3. **Check Progress**:
   - Should show "2 / 3 completed (67%)"
   - Only Wound 2 needs completion

4. Switch to Wound 2 and complete it

5. **Final Progress**:
   - Should show "3 / 3 completed (100%)"
   - Progress bar fully filled (teal)
   - All wound tabs/items show checkmarks

### Submit:
1. Click **"Save All Assessments"** button at bottom
2. Should see "Saving..." text while processing

✅ **Expected Result**: 
- All assessments saved to database
- Redirected to visit detail page
- Success message or updated view
- All 3 assessments created

---

## Test 11: Cancel Functionality

### Test Cancel:
1. Start a new assessment
2. Fill some fields
3. Click **"Cancel"** button at bottom left

✅ **Expected Result**: 
- Redirected back to visit detail page
- No assessments saved
- Confirm no partial data saved

---

## Test 12: Visual & Accessibility

### Check Visual Design:
- [ ] Cards have proper spacing and borders
- [ ] Radio buttons and checkboxes are visually distinct
- [ ] Active states are clear (teal color)
- [ ] Progress bar is visible and color-coded (teal)
- [ ] Separators divide sections clearly
- [ ] Responsive design (test on mobile/tablet if possible)

### Check Accessibility:
- [ ] All labels are properly associated with inputs
- [ ] Clicking labels selects radio/checkbox
- [ ] Cursor changes to pointer on clickable labels
- [ ] Tab navigation works (keyboard only)
- [ ] Form sections have proper headings

✅ **Expected Result**: 
- Professional appearance
- Easy to use
- Accessible for all users

---

## Test 13: Edge Cases

### Test with 1 Wound:
- Should still show progress indicator
- Should show tabs layout (not sidebar)
- Should work normally

### Test with 10+ Wounds:
- Should use sidebar layout
- Should be scrollable
- All wounds accessible

### Test with Empty Wound (No Data):
- Switch between wounds without entering any data
- Should not mark as complete
- Should allow saving (will skip empty wounds)

✅ **Expected Result**: 
- Form handles all edge cases gracefully
- No crashes or errors

---

## Common Issues & Troubleshooting

### Issue: Radio buttons not working
- **Check**: Make sure `npx shadcn@latest add radio-group` was run
- **Check**: Component exists at `components/ui/radio-group.tsx`

### Issue: Progress not updating
- **Check**: Fill all REQUIRED fields: Wound Type, Healing Status, Length, Width
- **Check**: Browser console for errors

### Issue: Form submission fails
- **Check**: Network tab for API errors
- **Check**: Server logs for validation errors
- **Check**: At least one wound has data entered

### Issue: "Cannot find module" errors
- **Solution**: Run `npm install` to ensure all dependencies installed

---

## Success Criteria

Phase 8.3 is successful if:

✅ Wound switcher displays correctly (tabs OR sidebar based on count)  
✅ Radio buttons replace all single-select dropdowns  
✅ Checkboxes replace all multi-select dropdowns  
✅ Progress indicator shows current wound and completion status  
✅ Progress bar updates visually  
✅ Data persists when switching between wounds  
✅ Checkmarks appear on completed wounds  
✅ Form submits all assessments successfully  
✅ Area auto-calculates from length × width  
✅ All fields are accessible and functional  
✅ Form is responsive and visually appealing

---

## Report Issues

If you find bugs:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Check server terminal for errors
4. Note which wound number/browser/device
5. Report with screenshots if possible
