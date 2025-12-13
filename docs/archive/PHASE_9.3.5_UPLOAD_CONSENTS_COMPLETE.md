# Phase 9.3.5: Upload Scanned Paper Consents - Implementation Complete

**Date Completed**: November 23, 2025  
**Phase**: 9.3.5 - Upload Scanned Paper Consents  
**Status**: ✅ **COMPLETED & READY FOR TESTING**

---

## Executive Summary

Phase 9.3.5 successfully implemented the ability to upload scanned paper consent forms as an alternative to electronic signatures. This allows digitizing pre-existing paper consent forms that were signed before the electronic system was deployed.

---

## What Was Implemented

### 1. Database Schema Updates ✅

**Migration**: `00019_scanned_consents.sql` (already exists, needs to be run in Supabase)

**Changes**:
- Added 3 columns to `patient_consents` table:
  - `consent_document_url` (TEXT) - Supabase Storage URL
  - `consent_document_name` (TEXT) - Original filename
  - `consent_document_size` (INTEGER) - File size in bytes
- Updated `signatures` table constraint to include 'upload' method
- Added support for: 'draw', 'type', 'upload' signature methods

### 2. Supabase Storage Bucket ✅

**Bucket Name**: `patient-consents`
**Configuration**:
- Public: false (authenticated access only)
- File size limit: 10MB
- Allowed types: PDF, JPG, JPEG, PNG

**Action Required**: Create this bucket in Supabase Dashboard:
1. Go to Storage → Buckets
2. Click "New Bucket"
3. Name: `patient-consents`
4. Public: unchecked
5. Set file size limit to 10MB

### 3. Server Actions ✅

**File**: `app/actions/signatures.ts`

**New Functions**:
- `uploadScannedConsent(formData: FormData)` - Handles file upload and consent creation
- `getConsentDocumentUrl(patientId: string)` - Retrieves consent document info

**Features**:
- File validation (type and size)
- Automatic file upload to Supabase Storage
- Signature record creation with method='upload'
- Consent record creation with document metadata
- Automatic cleanup on errors

### 4. UI Components ✅

#### A. Scanned Consent Upload Component
**File**: `components/patients/scanned-consent-upload.tsx`

**Features**:
- Drag-and-drop file selection
- File type validation (PDF, JPG, PNG)
- File size validation (10MB max)
- Upload progress indicator
- Success/error feedback
- File preview with size display

#### B. Consent Dialog with Tabs
**File**: `components/patients/consent-dialog.tsx` (updated)

**Features**:
- Two-tab interface:
  - **Electronic Signature** - Original signature pad workflow
  - **Upload Scanned Form** - New file upload option
- Seamless switching between methods
- Consistent user experience

#### C. Consent Document Viewer
**File**: `components/patients/consent-document-viewer.tsx`

**Features**:
- Modal viewer for uploaded documents
- PDF iframe viewer
- Image viewer for JPG/PNG files
- Download button
- Open in new tab button
- Error handling for failed loads

#### D. Consent Status Card
**File**: `components/patients/consent-status-card.tsx`

**Features**:
- Green success badge when consent exists
- Display consent date
- "View Document" button for scanned consents
- Shows document filename
- Only displays when consent on file

### 5. Patient Detail Page Integration ✅

**File**: `app/dashboard/patients/[id]/page.tsx` (updated)

**Changes**:
- Imported `ConsentStatusCard` component
- Displays consent status card when consent exists
- Shows uploaded document viewer if available
- Maintains original ConsentDialog for new patients

---

## User Workflows

### Workflow 1: Upload Scanned Consent (New Patient with Paper Form)

1. User navigates to patient detail page
2. Consent dialog appears (blocking)
3. User clicks **"Upload Scanned Form"** tab
4. User clicks **"Select File"** button
5. User selects PDF/JPG/PNG file (max 10MB)
6. File displays with name and size
7. User clicks **"Upload Consent"**
8. Progress bar shows upload status
9. Success message displays
10. Page refreshes, consent dialog closes
11. Green "Consent on File" card appears
12. User can now create visits

### Workflow 2: View Uploaded Consent (Existing Patient)

1. User opens patient detail page
2. Green "Consent on File" card displays at top
3. Card shows consent date and document name
4. User clicks **"View Document"** button
5. Modal opens showing document:
   - PDF: Displays in iframe
   - Image: Displays as image
6. User can download or open in new tab
7. User clicks **"Close"** to exit viewer

---

## Technical Implementation Details

### File Upload Process

```typescript
1. Client validates file (type, size)
2. FormData created with file + metadata
3. uploadScannedConsent() called
4. Server validates file again
5. File uploaded to Supabase Storage: patient-consents/{patientId}/{timestamp}-consent.{ext}
6. Public URL generated
7. Signature record created (method='upload', signatureData=URL)
8. Consent record created with document metadata
9. Page revalidated
10. Success returned to client
```

### Database Records Created

**signatures table**:
```typescript
{
  signature_type: 'consent',
  patient_id: patientId,
  signer_name: patientName,
  signer_role: 'Patient',
  signature_data: documentUrl, // Storage URL
  signature_method: 'upload',
  created_by: userId
}
```

**patient_consents table**:
```typescript
{
  patient_id: patientId,
  consent_type: 'initial_treatment',
  consent_text: 'Scanned paper consent form uploaded',
  patient_signature_id: signatureId,
  consent_document_url: documentUrl,
  consent_document_name: fileName,
  consent_document_size: fileSize,
  created_by: userId
}
```

---

## Files Created/Modified

### New Files (5)
1. `components/patients/scanned-consent-upload.tsx` - File upload component
2. `components/patients/consent-document-viewer.tsx` - Document viewer modal
3. `components/patients/consent-status-card.tsx` - Consent status display
4. `components/ui/progress.tsx` - Progress bar component (for upload)
5. `docs/PHASE_9.3.5_UPLOAD_CONSENTS_COMPLETE.md` - This documentation

### Modified Files (3)
1. `app/actions/signatures.ts` - Added upload actions (~150 lines)
2. `components/patients/consent-dialog.tsx` - Added tabs (~50 lines)
3. `app/dashboard/patients/[id]/page.tsx` - Added consent status card (~10 lines)

### Dependencies Added (1)
- `@radix-ui/react-progress` - Progress bar component

**Total Lines Added**: ~700 lines of production code

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Run migration 00019 in Supabase SQL Editor
- [ ] Create `patient-consents` storage bucket in Supabase
- [ ] Configure bucket policies (authenticated read/write)
- [ ] Verify .env.local has correct Supabase credentials

### Test Case 1: Upload PDF Consent
- [ ] Navigate to patient without consent
- [ ] Consent dialog appears
- [ ] Click "Upload Scanned Form" tab
- [ ] Select a PDF file (< 10MB)
- [ ] Verify file preview shows correct name and size
- [ ] Click "Upload Consent"
- [ ] Verify upload progress bar
- [ ] Verify success message
- [ ] Verify page refreshes and dialog closes
- [ ] Verify green "Consent on File" card appears
- [ ] Click "View Document" button
- [ ] Verify PDF displays in iframe
- [ ] Test download button
- [ ] Test open in new tab button

### Test Case 2: Upload Image Consent (JPG)
- [ ] Repeat Test Case 1 with JPG file
- [ ] Verify image displays correctly in viewer

### Test Case 3: File Validation
- [ ] Try uploading file > 10MB (should show error)
- [ ] Try uploading .txt file (should show error)
- [ ] Try uploading .docx file (should show error)
- [ ] Verify error messages are clear

### Test Case 4: Electronic Signature Still Works
- [ ] Navigate to patient without consent
- [ ] Stay on "Electronic Signature" tab
- [ ] Complete normal signature workflow
- [ ] Verify consent saved correctly
- [ ] Verify no document URL in database

### Test Case 5: Existing Consents
- [ ] Patient with electronic signature: No document shown
- [ ] Patient with uploaded document: "View Document" button shown
- [ ] Verify consent date displays correctly

---

## Known Limitations

1. **Storage Bucket Required**: Must be created manually in Supabase Dashboard
2. **Migration Required**: 00019 must be run in Supabase SQL Editor
3. **No Editing**: Once uploaded, consent cannot be edited (must delete patient and re-create)
4. **No Multiple Files**: Only one consent document per patient
5. **No Signature Extraction**: Uploaded documents are stored as-is, no signature extraction

---

## Future Enhancements

- [ ] Allow multiple consent versions (track history)
- [ ] Add consent revocation workflow
- [ ] Add consent renewal/update workflow
- [ ] Extract signature from PDF (OCR)
- [ ] Support additional file types (HEIC, TIFF)
- [ ] Bulk upload for multiple patients
- [ ] Consent expiration dates and reminders

---

## Rollback Instructions

If issues arise:

1. Remove consent status card from patient page
2. Remove upload tab from consent dialog
3. Revert signatures.ts to remove upload actions
4. Delete storage bucket (if created)
5. Rollback migration 00019 (if run)

---

## Next Steps

1. **Manual Setup Required**:
   - Run migration 00019 in Supabase SQL Editor
   - Create `patient-consents` storage bucket
   - Configure RLS policies for bucket

2. **Testing**:
   - Complete testing checklist above
   - Test with real PDF/image files
   - Verify in production-like environment

3. **Documentation**:
   - Update user guide with upload instructions
   - Create training video for staff
   - Update SYSTEM_DESIGN.md to mark 9.3.5 complete

4. **Next Phase**:
   - Move to Phase 9.3.6: Visit Addendums
   - Estimated effort: 2-3 days

---

**Status**: ✅ DEVELOPMENT COMPLETE - READY FOR MANUAL SETUP AND TESTING  
**Build Status**: ✅ Passing (all 26 routes compiled successfully)  
**TypeScript Errors**: ✅ None (0 errors)  
**Lines Added**: ~700 lines
