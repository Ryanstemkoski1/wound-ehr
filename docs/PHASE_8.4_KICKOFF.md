# Phase 8.4 - Enhanced Calendar with Modal Interaction

> **Status**: 🚀 Ready to Start  
> **Date**: November 11, 2025  
> **Dependencies**: Phase 8.3 ✅ Complete

---

## Objective

Build a Google Calendar-style appointment system with modal-based event creation/editing and drag-select functionality.

---

## Current State

### What Exists:
- ✅ Basic calendar view (`components/calendar/calendar-view.tsx`)
- ✅ Calendar filters (facility, wound type, status)
- ✅ Visit data fetching and display
- ✅ Color-coded events by status
- ✅ Month/week/day views
- ❌ **404 Error**: Clicking events tries to navigate to non-existent page

### What's Broken:
```
Error: Visit clicked → navigates to /dashboard/calendar/[visitId] → 404 Not Found
```

**Root Cause**: Event click handler uses `router.push()` but no detail page exists.

---

## Requirements (from SYSTEM_DESIGN.md)

### 1. **Modal-Based Event Interaction** 🎯
- **Click Event** → Open modal (not navigate)
- **Modal Content**:
  - Patient name and info
  - Visit date/time
  - Assigned wounds
  - Visit status
  - Notes
  - Quick actions: Edit, Delete, Mark Complete
- **Close Modal**: ESC key, backdrop click, X button

### 2. **Drag-Select Appointment Creation** 🎯
- **Desktop**: Click + drag on calendar grid
  - Shows blue highlight over time range
  - On release → Opens "New Appointment" modal
  - Pre-fills selected date/time
- **Mobile**: Long-press to select time
  - Tap start time → Calendar highlights
  - Tap end time → Opens modal

### 3. **Quick Patient Search** 🎯
- **Modal includes**: Searchable patient dropdown
  - Type to search by name or MRN
  - Shows recent patients first
  - Clicking patient loads their wounds
- **Wound Selection**: Multi-select checkboxes
  - Only show wounds belonging to selected patient
  - Disabled if no patient selected

### 4. **Event Status Colors** ✅ (Already Working)
- Scheduled: Blue
- In Progress: Amber
- Completed: Green
- Cancelled: Red
- No-Show: Gray

### 5. **Calendar Navigation** ✅ (Already Working)
- Month/Week/Day views
- Today button
- Prev/Next navigation
- Date picker

---

## Technical Plan

### Phase 8.4.1: Fix Event Click (Modal Instead of Navigation)

**Tasks:**
1. Create `EventDetailsModal` component
2. Update `calendar-view.tsx` to use modal instead of router.push
3. Add modal state management (open/close)
4. Display visit details in modal
5. Add Edit/Delete actions

**Files to Modify:**
- `components/calendar/calendar-view.tsx` - Replace router.push with modal open
- `components/calendar/event-details-modal.tsx` - NEW

**Acceptance Criteria:**
- ✅ Clicking event opens modal
- ✅ Modal shows visit details
- ✅ ESC key closes modal
- ✅ Backdrop click closes modal
- ✅ No more 404 errors

---

### Phase 8.4.2: Drag-Select Appointment Creation

**Tasks:**
1. Add mouse event handlers to calendar grid
2. Implement drag selection logic (start/end time)
3. Show visual feedback during drag
4. Open "New Visit" modal with pre-filled time
5. Mobile: Long-press support

**Files to Modify:**
- `components/calendar/calendar-view.tsx` - Add drag handlers
- `components/calendar/new-visit-dialog.tsx` - Already exists, enhance with patient search

**Acceptance Criteria:**
- ✅ Can drag across time slots
- ✅ Blue highlight shows selected range
- ✅ Release opens modal
- ✅ Modal has pre-filled date/time
- ✅ Can cancel selection with ESC

---

### Phase 8.4.3: Patient Search & Wound Selection

**Tasks:**
1. Add patient search to new-visit-dialog
2. Implement debounced search (300ms)
3. Show recent patients by default
4. Load patient's wounds on selection
5. Multi-select wounds with checkboxes

**Files to Modify:**
- `components/calendar/new-visit-dialog.tsx` - Add search and wound selection
- `app/actions/patients.ts` - Add searchPatients() function

**New Components:**
- `components/calendar/patient-search.tsx` - Searchable patient dropdown
- `components/calendar/wound-selector.tsx` - Multi-select wound checkboxes

**Acceptance Criteria:**
- ✅ Type patient name → sees filtered results
- ✅ Select patient → wounds load
- ✅ Can select multiple wounds
- ✅ Validation: Can't submit without patient
- ✅ Shows recent patients by default

---

## Database Schema (No Changes Needed)

Existing `visits` table already supports:
```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  facility_id UUID REFERENCES facilities(id),
  visit_date DATE NOT NULL,
  visit_time TIME,
  visit_type TEXT,
  chief_complaint TEXT,
  status TEXT, -- scheduled, in_progress, completed, cancelled, no_show
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Wound associations** via `assessments` table (links visit → wound).

---

## UI/UX Mockup

### Event Details Modal:
```
╔══════════════════════════════════════╗
║  Visit Details               [X]     ║
╠══════════════════════════════════════╣
║  Patient: John Doe (#MRN-123)       ║
║  Date: Nov 11, 2025 at 10:00 AM     ║
║  Status: [Scheduled ▼]              ║
║  Wounds: • Left Heel • Right Toe    ║
║  Notes: Follow-up for wound care    ║
║                                      ║
║  [Edit] [Delete] [Mark Complete]    ║
╚══════════════════════════════════════╝
```

### Drag-Select Feedback:
```
Calendar Grid (Week View):
┌────┬────────────────────────────┐
│ 9  │                            │
├────┼────────────────────────────┤
│10  │ ░░░░░░░░░░░░░░░░░░░░       │ ← Blue highlight
├────┼────────────────────────────┤
│11  │ ░░░░░░░░░░░░░░░░░░░░       │   during drag
├────┼────────────────────────────┤
│12  │                            │
└────┴────────────────────────────┘
```

### New Visit Modal (with Search):
```
╔══════════════════════════════════════╗
║  New Appointment             [X]     ║
╠══════════════════════════════════════╣
║  Date: Nov 11, 2025                  ║
║  Time: 10:00 AM - 11:00 AM           ║
║                                      ║
║  Search Patient:                     ║
║  ┌────────────────────────┐          ║
║  │ John Doe          ✓    │          ║
║  │ Jane Smith             │          ║
║  └────────────────────────┘          ║
║                                      ║
║  Select Wounds:                      ║
║  ☑ Left Heel (Stage 2)               ║
║  ☐ Right Toe (Stage 1)               ║
║                                      ║
║  Notes: _________________________    ║
║                                      ║
║  [Cancel] [Create Appointment]       ║
╚══════════════════════════════════════╝
```

---

## Component Architecture

```
app/dashboard/calendar/page.tsx
  └─ components/calendar/calendar-view.tsx (SERVER)
      ├─ Calendar Grid (FullCalendar or custom)
      ├─ EventDetailsModal (client component)
      │   ├─ Visit info display
      │   ├─ Status dropdown
      │   ├─ Edit/Delete buttons
      │   └─ Modal controls
      └─ NewVisitDialog (client component) [ENHANCED]
          ├─ Date/Time inputs
          ├─ PatientSearch (client component) [NEW]
          │   ├─ Debounced search input
          │   └─ Dropdown results
          ├─ WoundSelector (client component) [NEW]
          │   └─ Checkbox list
          └─ Notes textarea
```

---

## Dependencies

### Existing:
- ✅ `react-big-calendar` or FullCalendar (check current implementation)
- ✅ Radix UI Dialog (for modals)
- ✅ Lucide React (icons)

### New (if needed):
- `use-debounce` - For search input debouncing
- OR use built-in setTimeout/clearTimeout

---

## Server Actions Needed

### Existing:
- ✅ `getVisits()` - Fetch visits for date range
- ✅ `createVisit()` - Create new visit
- ✅ `updateVisit()` - Update visit details
- ✅ `deleteVisit()` - Delete visit

### New:
- `searchPatients(query: string)` - Search patients by name/MRN
- `getPatientWounds(patientId: string)` - Get all wounds for patient

**Location**: `app/actions/patients.ts` or `app/actions/calendar.ts`

---

## Testing Checklist

### Event Details Modal:
- [ ] Click event → Modal opens (no navigation)
- [ ] Modal shows correct visit details
- [ ] ESC key closes modal
- [ ] Backdrop click closes modal
- [ ] X button closes modal
- [ ] Edit button works
- [ ] Delete button works
- [ ] Status dropdown updates visit

### Drag-Select:
- [ ] Can drag across time slots
- [ ] Blue highlight appears during drag
- [ ] Release opens modal
- [ ] Modal has pre-filled date/time
- [ ] ESC cancels drag selection
- [ ] Works in week view
- [ ] Works in day view
- [ ] Mobile: Long-press works

### Patient Search:
- [ ] Type name → Results filter
- [ ] Type MRN → Results filter
- [ ] Select patient → Wounds load
- [ ] Recent patients show by default
- [ ] Debounce works (no API spam)
- [ ] Clear search resets results

### Wound Selection:
- [ ] Checkboxes appear after patient selected
- [ ] Can select multiple wounds
- [ ] Can deselect wounds
- [ ] Validation: Can't submit without patient
- [ ] Validation: Can't submit without at least one wound

### Integration:
- [ ] Created visit appears on calendar immediately
- [ ] Updated visit reflects changes
- [ ] Deleted visit disappears
- [ ] Calendar filters still work
- [ ] Color coding correct

---

## Performance Considerations

- **Search Debounce**: 300ms to avoid API spam
- **Recent Patients Cache**: Store last 20 in localStorage
- **Optimistic UI**: Show modal before API confirms
- **Cancel Pending Requests**: AbortController for searches

---

## Accessibility

- [ ] Modal has proper ARIA labels
- [ ] Focus trap in modal (can't tab outside)
- [ ] ESC key closes modal
- [ ] Keyboard navigation works in search results
- [ ] Checkboxes keyboard accessible
- [ ] Screen reader announces modal open/close

---

## Mobile Considerations

- **Drag-Select**: Replace with long-press
- **Search Dropdown**: Full-screen on mobile
- **Modal Size**: Responsive (full-screen on small screens)
- **Touch Targets**: Minimum 44x44px

---

## Success Criteria

Phase 8.4 is complete when:
1. ✅ No more 404 errors on event click
2. ✅ Event details modal opens and works
3. ✅ Drag-select creates appointments
4. ✅ Patient search with debouncing works
5. ✅ Wound selection multi-select works
6. ✅ All CRUD operations work via modals
7. ✅ Mobile experience is smooth
8. ✅ No console errors
9. ✅ All tests pass

---

## Timeline Estimate

- **8.4.1 (Event Modal)**: 2-3 hours
- **8.4.2 (Drag-Select)**: 3-4 hours
- **8.4.3 (Patient Search)**: 2-3 hours
- **Testing & Polish**: 1-2 hours

**Total**: 8-12 hours development time

---

## Next Steps

1. Start with Phase 8.4.1 (fix 404 error)
2. Create EventDetailsModal component
3. Test modal functionality
4. Move to drag-select
5. Add patient search
6. Final integration testing

---

**Ready to begin?** Let's start with Phase 8.4.1! 🚀
