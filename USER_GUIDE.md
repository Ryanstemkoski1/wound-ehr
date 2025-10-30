# Wound EHR - User Guide

**Version**: 2.0  
**Last Updated**: 2024  
**For**: Healthcare providers, wound care specialists, administrative staff

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Patient Management](#patient-management)
4. [Wound Assessment](#wound-assessment)
5. [Visit Scheduling](#visit-scheduling)
6. [Billing System](#billing-system)
7. [Photo Management](#photo-management)
8. [PDF Export & Reporting](#pdf-export--reporting)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Accessibility Features](#accessibility-features)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Resolution**: Minimum 320px width (mobile-optimized)
- **Internet Connection**: Required for all features
- **Recommended**: Desktop/tablet for optimal assessment form experience

### First-Time Login
1. Navigate to the application URL
2. Click "Sign In" or "Create Account"
3. Enter your email and password
4. For new accounts, verify your email address
5. You'll be redirected to the Dashboard

### Account Setup
- Your account is tied to your facility
- Contact your administrator to be added to the correct facility
- Default view shows patients assigned to your facility

---

## Dashboard Overview

The Dashboard is your central hub for quick access to key metrics and recent activity.

### Statistics Cards

1. **Total Patients**: Number of active patients in your facility
2. **Active Wounds**: Currently tracked wounds across all patients
3. **Pending Visits**: Incomplete or scheduled visits needing attention
4. **Total Visits**: All-time visit count

### Charts (Analytics)

**Wound Status Distribution (Pie Chart)**:
- Shows breakdown of wounds by status: Active, Healing, Healed
- Hover over sections for exact counts
- Colors: Teal (Active), Green (Healing), Amber (Healed)

**Visits Over Time (Bar Chart)**:
- Displays visit trends for the last 6 months
- Helps identify busy periods
- Y-axis shows visit count per month

**Healing Progress Trends (Line Chart)**:
- Tracks wound healing status over 8 weeks
- Three lines: Improving (green), Stable (blue), Declined (red)
- Useful for identifying care effectiveness

### Quick Actions

- **Add New Patient**: Register a new patient
- **Schedule Visit**: Book an appointment
- **View Billing**: Access billing reports

### Recent Activity

- **Recent Visits**: Last 5 patient visits with status indicators
- Click any visit to view full details

---

## Patient Management

### Registering a New Patient

**Steps**:
1. Click "Add New Patient" from Dashboard or Patients page
2. Fill out the form across three tabs:
   - **Demographics**: Basic info, contact details
   - **Insurance**: Primary and secondary insurance
   - **Medical Info**: Allergies, medical history

**Required Fields** (marked with red *):
- Facility
- First Name
- Last Name
- Date of Birth
- Gender
- Medical Record Number (MRN)

**Tips**:
- MRN must be unique per facility
- Emergency contact is optional but recommended
- You can add multiple allergies and medical conditions

3. Click "Create Patient" at the bottom
4. Success toast will appear confirming creation
5. You'll be redirected to the patient list

### Searching for Patients

**Search Options**:
- By name (first or last)
- By Medical Record Number (MRN)
- By facility (filter dropdown)

**Steps**:
1. Navigate to Patients page
2. Use the search bar at the top
3. Or select a facility from the filter dropdown
4. Results update automatically as you type

### Editing Patient Information

**Steps**:
1. Click on a patient card to view details
2. Click the "Edit" button (top right)
3. Update information across any tab
4. Click "Update Patient"
5. Success toast confirms the update

### Deleting a Patient

**⚠️ Warning**: This action cannot be undone. All associated wounds, visits, and assessments will be permanently deleted.

**Steps**:
1. Navigate to patient detail page
2. Click the red "Delete" button
3. Confirm deletion in the dialog
4. Patient and all related data are removed

---

## Wound Assessment

### Adding a New Wound

**Steps**:
1. Go to patient detail page
2. Click "Add" in the Active Wounds section
3. Fill out the form:
   - **Wound Number**: Auto-generated or manual entry
   - **Anatomical Location**: Select from dropdown (70+ locations)
   - **Wound Type**: Pressure injury, diabetic, surgical, etc.
   - **Onset Date**: When the wound first appeared
   - **Status**: Active, Healing, or Healed

4. Click "Create Wound"
5. Success toast appears

**Anatomical Locations Include**:
- Head, neck, chest, abdomen, back
- Sacrum, coccyx (common pressure injury sites)
- Upper extremities (shoulders, arms, elbows, hands)
- Lower extremities (hips, thighs, knees, legs, ankles, feet, heels)

### Performing a Wound Assessment

**When to Assess**:
- During each patient visit
- As part of the visit workflow
- When wound status changes significantly

**Steps**:
1. Schedule or open an existing visit
2. Click "New Assessment" from the visit detail page
3. **Fill out the assessment form**:

**Part 1: Wound Measurements**
- Length (cm): Longest dimension
- Width (cm): Perpendicular to length
- Depth (cm): Deepest point
- Area (cm²): Calculated automatically
- Undermining: Extent of tissue loss under intact skin
- Tunneling: Extent of tissue destruction along tissue planes

**Part 2: Wound Bed Assessment**
- Tissue Types: Necrotic, slough, granulation, epithelial (percentages must total 100%)
- Exudate Amount: None, minimal, moderate, copious
- Exudate Type: Serous, serosanguineous, sanguineous, purulent
- Odor: None, mild, moderate, strong

**Part 3: Wound Edges & Periwound**
- Edge Description: Attached, not attached, rolled under
- Periwound Skin: Intact, macerated, erythematous, indurated
- Pain Level: 0-10 scale
- Signs of Infection: Yes/No

**Part 4: Treatment Plan**
- Cleansing Method
- Dressings Applied
- Debridement Performed (if any)
- Additional Treatments
- Clinical Notes

4. Attach photos if available (see Photo Management section)
5. Click "Submit Assessment"
6. Assessment is saved to the visit

**Tips**:
- Measurements should be in centimeters
- Area is auto-calculated from length × width
- Tissue type percentages must equal 100%
- Be specific in clinical notes for continuity of care

---

## Visit Scheduling

### Creating a New Visit

**From Calendar**:
1. Navigate to Calendar page
2. Click "New Visit" button
3. Select patient from dropdown
4. Choose visit date and type
5. Save

**From Patient Detail**:
1. Go to patient detail page
2. Click "Add" in Recent Visits section
3. Fill out visit form

### Visit Form Fields

**Required**:
- Patient (auto-filled if from patient detail)
- Visit Date
- Visit Type: Initial, Follow-up, Discharge, Consultation

**Optional**:
- Time Spent (minutes)
- Visit Status: Incomplete (default), Complete
- Clinical Notes
- Follow-up Date
- Follow-up Notes

**Billing Information**:
- CPT Codes (procedure codes)
- ICD-10 Codes (diagnosis codes)
- Modifiers (if applicable)
- Time-based billing toggle

### Visit Types Explained

- **Initial**: First visit for a new patient or new wound
- **Follow-up**: Regular check-up or dressing change
- **Discharge**: Final visit, wound healed or transferred
- **Consultation**: Assessment for referral or specialist review

### Marking a Visit as Complete

**Steps**:
1. Open the visit detail page
2. Perform all assessments
3. Click "Edit Visit"
4. Change status to "Complete"
5. Save

**Why Mark Complete?**:
- Tracks workflow progress
- Filters pending visits on dashboard
- Required for accurate reporting

---

## Billing System

### Understanding Billing Codes

**CPT Codes** (Current Procedural Terminology):
- Describe medical procedures performed
- Examples:
  - `97597` - Debridement, selective (first 20 sq cm)
  - `97598` - Each additional 20 sq cm
  - `97602` - Wound care, non-selective debridement

**ICD-10 Codes** (International Classification of Diseases):
- Describe diagnoses and conditions
- Examples:
  - `L89.154` - Pressure ulcer of sacral region, stage 4
  - `E11.621` - Type 2 diabetes with foot ulcer
  - `I96` - Gangrene, not elsewhere classified

**Modifiers**:
- Two-character codes that alter procedure meaning
- Examples:
  - `LT` - Left side
  - `RT` - Right side
  - `59` - Distinct procedural service

### Adding Billing to a Visit

**When Creating a Visit**:
1. Scroll to "Billing Information" section
2. Click "Add CPT Code" - search or browse
3. Click "Add ICD-10 Code" - search or browse
4. Add modifiers if needed (optional)
5. Toggle "Time-Based Billing" if applicable
6. Save visit (billing saved automatically)

**When Editing a Visit**:
1. Navigate to visit detail page
2. Click "Edit Visit"
3. Update billing codes in the Billing Information section
4. Save changes

### Searching for Codes

**CPT Code Search**:
- Type procedure name: "debridement", "wound care"
- Or enter code directly: "97597"
- Filter by category for faster results

**ICD-10 Code Search**:
- Type condition: "pressure ulcer", "diabetes"
- Or enter code: "L89.154"
- Descriptions help you find the right code

**Tips**:
- Use specific descriptions for better search results
- Verify codes match the actual procedure/diagnosis
- Consult billing guidelines for complex cases

### Viewing Billing Reports

**Steps**:
1. Navigate to Billing Reports page from sidebar
2. Use filters to refine results:
   - **Date Range**: Start date and end date
   - **Facility**: Filter by facility
   - **Patient**: Search by name or MRN

3. View statistics:
   - Total Visits (billable)
   - CPT Codes count
   - ICD-10 Codes count

4. Review records in the table (desktop) or cards (mobile)

### Exporting Billing Data

**Steps**:
1. Apply desired filters on Billing Reports page
2. Click "Export to CSV" button
3. File downloads with all filtered records
4. Open in Excel, Google Sheets, or billing software

**CSV Columns Include**:
- Date, Patient Name, MRN, Facility
- Visit Type
- CPT Codes, ICD-10 Codes, Modifiers
- Time-Based flag
- Notes

---

## Photo Management

### Uploading Wound Photos

**During Assessment**:
1. Fill out wound assessment form
2. Scroll to "Wound Photo" section
3. Click "Choose File" or drag-and-drop
4. Select photo from your device
5. Photo uploads automatically on form submit

**From Visit Detail**:
1. Navigate to visit detail page
2. Find wound assessment
3. Click "Upload Photo" button
4. Select image file
5. Photo links to that specific assessment

**Best Practices**:
- Use good lighting
- Include a measurement reference (ruler) if possible
- Take from consistent angle for comparison
- Ensure wound is fully visible
- Keep file sizes reasonable (< 5MB)

### Viewing Photos

**Photo Gallery**:
1. Go to patient detail page or wound detail page
2. Scroll to "Photos" section
3. Click on any thumbnail to view full-size
4. Navigation arrows to view previous/next

**Photo Comparison Tool**:
1. Navigate to wound detail page
2. Click "Compare Photos"
3. Select two dates to compare side-by-side
4. View progression or regression over time

### Deleting Photos

**⚠️ Warning**: Photo deletion is permanent and cannot be undone.

**Steps**:
1. View photo in full-size mode
2. Click "Delete Photo" button
3. Confirm deletion
4. Photo is removed from assessment

---

## PDF Export & Reporting

### Visit Summary Report

**Purpose**: Comprehensive document of a single visit including all assessments, photos, and treatments.

**How to Generate**:
1. Navigate to visit detail page
2. Click "Export PDF" button (top right)
3. PDF generates automatically
4. Download or print

**Report Includes**:
- Patient demographics
- Visit information (date, type, provider)
- All wound assessments from that visit
- Measurements, tissue types, exudate details
- Treatment plans and clinical notes
- Wound photos (if attached)
- Billing codes (CPT, ICD-10)

**Use Cases**:
- Sharing with specialists or referring providers
- Patient records for transfers
- Insurance documentation
- Quality assurance audits

### Wound Progress Report

**Purpose**: Timeline of a specific wound's healing journey across multiple visits.

**How to Generate**:
1. Navigate to wound detail page
2. Click "Wound Progress Report" button
3. Select date range (optional - defaults to all assessments)
4. PDF generates

**Report Includes**:
- Wound identification (number, location, type)
- Chart of measurements over time (length, width, depth, area)
- Tissue type progression
- Exudate and odor trends
- Treatment history
- Photo comparison (first vs. most recent)
- Healing rate calculation

**Use Cases**:
- Demonstrating healing progress
- Identifying plateau or decline
- Treatment effectiveness evaluation
- Quality metrics reporting

### Tips for PDF Reports

- **Print-Friendly**: Reports are formatted for standard letter size (8.5" × 11")
- **Photos**: Automatically resized for optimal viewing
- **Color-Coded**: Charts use our teal/amber/red color scheme
- **Headers/Footers**: Include facility name, patient info, and page numbers
- **Compliance**: Structured for Medicare/Medicaid documentation requirements

---

## Keyboard Shortcuts

### Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next interactive element |
| `Shift + Tab` | Move to previous element |
| `Enter` | Activate buttons, links |
| `Space` | Toggle checkboxes, select dropdowns |
| `Esc` | Close dialogs, menus |
| `Arrow Keys` | Navigate dropdown options, calendar dates |

### Accessibility

| Feature | How to Use |
|---------|------------|
| **Skip to Content** | Press `Tab` immediately after page load - skip link appears, press `Enter` |
| **Form Navigation** | `Tab` through fields in logical order |
| **Error Navigation** | Focus automatically moves to first error on form submit |

### Calendar

| Shortcut | Action |
|----------|--------|
| `Arrow Keys` | Navigate calendar dates |
| `Enter` | Select highlighted date |
| `Esc` | Close calendar picker |

---

## Accessibility Features

### For Keyboard Users

- **No Mouse Required**: All functions accessible via keyboard
- **Visible Focus**: Blue outline on focused elements
- **Skip Links**: Press `Tab` on any page to reveal "Skip to main content"
- **Logical Tab Order**: Fields, buttons, links in natural reading order

### For Screen Reader Users

**Tested With**: NVDA, JAWS, VoiceOver

- **Semantic HTML**: Proper headings (h1, h2, h3) for document structure
- **ARIA Labels**: All buttons, links, and inputs have descriptive labels
- **Landmarks**: Navigation (`<nav>`), main content (`<main>`) properly marked
- **Form Labels**: Every input field has an associated label
- **Error Announcements**: Invalid fields announced with error descriptions
- **Status Updates**: Toast notifications are live regions (announced automatically)

**Example Screen Reader Output**:
- "Search patients by name or medical record number, edit text"
- "Add New Patient - Register a new patient, link"
- "View details for patient John Doe, MRN 12345, link"

### For Low Vision Users

- **High Contrast**: Teal/zinc color scheme with 6:1+ contrast ratios
- **Resizable Text**: Zoom up to 200% without horizontal scrolling
- **No Color-Only Information**: Status indicated by icons AND text
- **Focus Indicators**: 3px blue ring around focused elements

### For Users with Motor Impairments

- **Large Touch Targets**: Minimum 44×44px on mobile
- **No Precise Mouse Required**: Buttons have generous click areas
- **Forgiving Interactions**: Ample spacing between clickable elements
- **No Time Limits**: Forms don't timeout

---

## Troubleshooting

### Login Issues

**Problem**: Cannot log in  
**Solutions**:
1. Verify email and password are correct
2. Check if Caps Lock is on
3. Try "Forgot Password" to reset
4. Clear browser cache and cookies
5. Try a different browser
6. Contact administrator to verify account is active

**Problem**: Email verification not received  
**Solutions**:
1. Check spam/junk folder
2. Wait 5-10 minutes (emails may be delayed)
3. Click "Resend verification email" on login page
4. Verify email address was entered correctly
5. Contact support if issue persists

### Patient Management

**Problem**: Cannot create patient - "MRN already exists"  
**Solution**: Medical Record Numbers must be unique per facility. Check if patient already exists or use a different MRN.

**Problem**: Patient not appearing in search  
**Solutions**:
1. Clear search filters (click "Clear Filters")
2. Verify patient's facility matches selected filter
3. Try searching by MRN instead of name
4. Refresh the page (F5)

### Forms

**Problem**: Form won't submit  
**Solutions**:
1. Check for red error messages under fields
2. Scroll to top of form - error summary may be there
3. Ensure all required fields (marked with *) are filled
4. For date fields, use the date picker or MM/DD/YYYY format
5. For tissue percentages, ensure they total exactly 100%

**Problem**: Changes not saving  
**Solutions**:
1. Check for error toast in top-right corner
2. Verify internet connection is active
3. Try refreshing the page and re-entering data
4. Clear browser cache
5. Try a different browser

### Photos

**Problem**: Photo won't upload  
**Solutions**:
1. Check file size (must be < 5MB)
2. Verify file format (JPG, PNG, WEBP supported)
3. Check internet connection
4. Try a different photo
5. Refresh page and try again

**Problem**: Photo appears rotated incorrectly  
**Solution**: Some cameras embed rotation data. Use an image editor to rotate before upload, or upload from a computer instead of mobile.

### PDF Export

**Problem**: PDF won't generate  
**Solutions**:
1. Ensure visit has at least one assessment
2. Check browser's pop-up blocker settings
3. Try a different browser
4. Refresh page and try again
5. Check internet connection

**Problem**: Photos missing from PDF  
**Solutions**:
1. Verify photos are attached to assessments
2. Check that photos finished uploading before export
3. Try exporting again after a few minutes

### Performance

**Problem**: Page loading slowly  
**Solutions**:
1. Check internet connection speed
2. Close unnecessary browser tabs
3. Clear browser cache
4. Use a modern browser (Chrome, Firefox, Edge, Safari)
5. Dashboard charts load lazily - wait a few seconds

**Problem**: Dashboard shows "Database Connection Issue"  
**Solutions**:
1. Check internet connection
2. Refresh the page (F5)
3. Wait a few minutes and try again
4. Contact administrator if issue persists (may be server maintenance)

### Mobile Issues

**Problem**: Text too small on mobile  
**Solution**: Use browser zoom (pinch to zoom) - app is optimized for zoom up to 200%.

**Problem**: Can't see full table on mobile  
**Solution**: Tables convert to card layout on mobile. Ensure you're in portrait mode for best experience. Rotate to landscape for wider tables.

**Problem**: Sidebar stuck open on mobile  
**Solution**: Click the dark overlay or the X button to close. Refresh page if issue persists.

### Billing

**Problem**: Can't find a billing code  
**Solutions**:
1. Try broader search terms ("wound" instead of "chronic wound care")
2. Browse by category instead of searching
3. Ask a colleague for the correct code
4. Consult billing reference materials
5. Use "Other" category if unsure - can edit later

**Problem**: CSV export is empty  
**Solutions**:
1. Clear all filters and try again
2. Verify there are billing records in the selected date range
3. Check that patients have visits with billing codes attached
4. Refresh page and try export again

---

## Getting Help

### Contact Support
- **Email**: support@wound-ehr.com (example)
- **Phone**: 1-800-WOUND-EHR (example)
- **Hours**: Monday-Friday, 8 AM - 6 PM EST

### Training Resources
- **Video Tutorials**: Available in Help menu
- **Live Training Sessions**: Contact administrator
- **Quick Reference Guides**: Print-friendly PDFs in Help section

### Reporting Bugs
If you encounter a bug or error:
1. Note what you were doing when the error occurred
2. Take a screenshot if possible
3. Check browser console for error messages (F12 → Console tab)
4. Email support with details

---

## Appendix

### Wound Type Reference

| Type | Description | Common Locations |
|------|-------------|------------------|
| **Pressure Injury** | Tissue damage from prolonged pressure | Sacrum, heels, hips, elbows |
| **Diabetic** | Ulcers related to diabetes | Feet, toes, plantar surface |
| **Surgical** | Post-operative incisions | Varies by surgery |
| **Venous** | Poor venous circulation | Lower legs, ankles |
| **Arterial** | Inadequate arterial blood flow | Toes, feet, legs |
| **Traumatic** | Injury from accident or trauma | Any location |
| **Burn** | Thermal, chemical, or radiation | Varies |

### Exudate Types

| Type | Appearance | Significance |
|------|------------|--------------|
| **Serous** | Clear, watery | Normal healing |
| **Serosanguineous** | Pink, watery | Minor bleeding, often normal |
| **Sanguineous** | Bloody | Active bleeding, may need intervention |
| **Purulent** | Thick, opaque, yellow/green | Infection present |

### Tissue Types

| Type | Appearance | Action Required |
|------|------------|-----------------|
| **Necrotic (Black)** | Black, hard eschar | Debridement needed |
| **Slough (Yellow)** | Yellow, stringy | Debridement recommended |
| **Granulation (Red)** | Beefy red, bumpy | Healthy healing tissue |
| **Epithelial (Pink)** | Pink, smooth | New skin forming, protect |

---

**End of User Guide**

For additional help or feature requests, please contact your system administrator.
