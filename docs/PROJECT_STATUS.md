# WoundNote — Project Status

> Living status doc. Updated as each phase ships. See `docs/PROJECT_PLAN.md`
> for the full plan and `docs/CURRENT_STATE.md` for the pre-work baseline
> audit.

## Phase legend

| State          | Meaning                                             |
| -------------- | --------------------------------------------------- |
| ⏳ planned     | Scoped, not started                                 |
| 🟡 in progress | Some files landed; phase not complete               |
| ✅ shipped     | All acceptance criteria met, typecheck + lint clean |
| 🔁 revisit     | Shipped but flagged for follow-up in a later phase  |

---

## Phase 1 — Operations vs Clinical surface split — ✅ shipped

### What changed

1. **`lib/surface.ts`** — new pure-logic module that derives a user's surface
   entitlements from their existing `(role, credentials)` pair. Exports
   `Surface` type, `getSurfaceEntitlements`, `getDefaultSurface`,
   `getActiveSurface` (cookie-backed), `canSwitchSurface`, and
   `SURFACE_LABELS` / `SURFACE_DESCRIPTIONS`.
2. **`app/actions/surface.ts`** — `setActiveSurface(surface)` server action.
   Validates entitlement before writing the `wn_surface` cookie, then
   `revalidatePath('/dashboard', 'layout')`.
3. **`lib/navigation.ts`** — single source of truth for nav config. Exposes
   `getMainNav(surface)`, `getAdminSectionNav(surface, role)`, and
   `getBottomNav(surface)`. Used by both desktop sidebar and mobile bottom
   bar.
4. **`components/layout/sidebar.tsx`** — now takes `surface` and renders the
   correct main nav. Surface badge ("Operations" / "Clinical") shown
   beneath the logo so the user always knows which side they're on. Admin
   section only renders on the Operations surface for users with an admin
   role.
5. **`components/layout/bottom-nav-bar.tsx`** — surface-aware mobile nav
   (Ops: Home / Calendar / Patients / Reports / More; Clinical: Home /
   Calendar / Patients / Wounds / More).
6. **`components/layout/role-switcher.tsx`** — new dropdown in the header.
   Only renders when the user is entitled to more than one surface.
7. **`components/layout/header.tsx`** — wires in the role switcher.
8. **`components/layout/dashboard-layout-client.tsx`** — passes `surface` and
   `entitlements` down to sidebar, header, bottom nav.
9. **`app/dashboard/layout.tsx`** — fetches credentials, derives
   entitlements, resolves active surface from cookie/default, passes both
   to the client shell.
10. **`proxy.ts`** — new `ADMIN_SURFACE_ROUTES` guard for
    `/dashboard/billing` and `/dashboard/reports`. A clinical-only user
    hitting these now redirects to `/dashboard?error=insufficient_permissions`.
    Existing `/dashboard/admin/**` guards untouched (they were already
    correct) and tightened with a catch-all so any non-admin role on
    `/dashboard/admin` is rejected.

### What did NOT change (intentional)

- **No DB migration was needed.** Surface entitlement is derived from
  existing columns. The planned `tenant_features` table is deferred to
  Phase 2 where it will actually be consumed (no point shipping unused
  schema).
- **`app/dashboard/incidents/`** — page kept on disk; only the sidebar nav
  item was removed (per Alana 4/27). Direct URL still works for users with
  an existing bookmark; we'll formally re-enable or sunset in Phase 5.
- **Dashboard widgets** (`app/dashboard/page.tsx`) — unchanged in Phase 1.
  The page renders for both surfaces today. Surface-specific widget
  selection is a Phase 3 polish item.

### Acceptance criteria — met

- [x] Tenant-admin (with both entitlements) sees the surface switcher and
      can toggle between Operations and Clinical without re-login.
- [x] A clinical-credential-only user (e.g. RN with no admin role) sees no
      Admin section in the sidebar, no Reports/Billing in main nav, and is
      blocked at the proxy layer from `/dashboard/billing` /
      `/dashboard/reports`.
- [x] An Admin-credential-only user sees no clinical chrome (Wounds
      removed from main nav).
- [x] The Incidents nav item is gone from the sidebar for everyone.
- [x] `npx tsc --noEmit` exits 0.
- [x] `npx eslint` on all changed/new files exits 0.
- [x] Cookie name `wn_surface`, 1-year max-age, sameSite=lax, secure in
      production.

### Validation evidence

```
$ npx tsc --noEmit
Exit: 0

$ npx eslint <Phase 1 files>
Exit: 0
```

### Known follow-ups (deliberately deferred)

- **`tenant_features` table** → Phase 2. Will live in
  `supabase/migrations/00043_tenant_features.sql` once we have a flag to
  store (likely the consent-required-for-billing toggle from R-024).
- **Dashboard widget split per surface** → Phase 3. The current dashboard
  shows operational counters (active wounds, visits this month, pending
  invites) which are useful to both audiences; surface-specific cards can
  follow once we have new clinical KPIs from the wound-detail revamp.
- **Bookmark migration helper** → if a clinical user's stale bookmark to
  `/dashboard/billing` lands on the error page, we may want a friendlier
  "this section was moved" splash. Currently the existing error toast on
  the dashboard handles it.
- **`users.role`** is read in `app/dashboard/incidents/new/page.tsx`
  (line 27) but role lives on `user_roles`, not `users` — pre-existing
  bug, not Phase 1's surface to fix. Captured for Phase 5 cleanup pass.

---

## Phase 2 — Scheduling, intake, consent foundations — 🟡 in progress

### What changed (foundation — shipped)

1. **`supabase/migrations/00037_facility_type.sql`** — adds
   `facilities.facility_type` (snf / alf / home_health / outpatient /
   hospital / other), defaults to `snf` for legacy rows. Indexed.
2. **`supabase/migrations/00038_service_locations.sql`** — new
   `service_locations` table (per-facility named locations). Adds
   `visits.service_location_id` FK (legacy `visits.location` TEXT
   preserved for backward compat). RLS: read = any user assigned to the
   facility; write = facility/tenant admins only.
3. **`supabase/migrations/00039_visit_no_show_reason.sql`** — adds
   `visits.no_show_reason`, `no_show_at`, `no_show_recorded_by`. Partial
   index on `status='no-show'` for office triage queries.
4. **`supabase/migrations/00040_visit_scheduled_window.sql`** — adds
   `visits.scheduled_start_at`, `scheduled_end_at`, `duration_minutes` so
   the calendar can distinguish _planned_ from _performed_ time. Backfills
   legacy rows from `visit_date` (+30 min default). Two indexes for
   calendar lookups + a `scheduled_end_at > scheduled_start_at` CHECK.
5. **`supabase/migrations/00041_home_health_agencies.sql`** — new tenant-
   scoped `home_health_agencies` table + `patients.home_health_agency_id`
   FK. RLS: read = tenant member; write = admin.
6. **`supabase/migrations/00042_consent_status_view.sql`** — new
   `patient_consent_status` view returning `missing | incomplete | on_file`
   per patient + days-since-consent. `security_invoker = on` so RLS is
   enforced via the underlying tables.
7. **`supabase/migrations/00043_tenant_features.sql`** — `tenant_features`
   flag table. Read = any tenant member, write = tenant_admin only.
8. **`lib/features.ts`** — `isTenantFeatureEnabled(flag)` /
   `getTenantFeature(flag)` helpers backed by the new table.
9. **`app/actions/consent-status.ts`** — `getPatientConsentStatus()`
   reads the new view. Cast at the boundary because
   `lib/database.types.ts` doesn't yet include the view (regen on deploy
   — see "Required deploy step" below).
10. **`components/consents/consent-banner.tsx`** — server component,
    persistent non-blocking consent banner per the 4/27 meeting decision
    (R-019). Renders amber for incomplete / red for missing / nothing for
    on-file. Drop into any patient-scoped page.

### Required deploy step

After applying migrations 00037-00043 to staging, run:

```
supabase gen types typescript --local > lib/database.types.ts
```

(or the project's existing types-generation script) so that
`facilities.facility_type`, `visits.service_location_id`,
`visits.scheduled_start_at`, `patients.home_health_agency_id`, the
`service_locations` / `home_health_agencies` / `tenant_features` tables,
and the `patient_consent_status` view become first-class in the type
system. Until that runs, server actions touching these columns must use
the boundary cast pattern shown in `consent-status.ts`.

### What did NOT ship (deferred to Phase 2.5 + Phase 3)

- **NewVisitDialog** (unified visit creation modal with clinician,
  service location, scheduled window, no-show reason) — substantive UI
  work; lands in Phase 2.5 once the type regen is in.
- **Service Location admin UI** at `/dashboard/admin/facilities/[id]/locations`
  — Phase 2.5.
- **Home Health Agencies admin UI** at `/dashboard/admin/agencies` —
  Phase 2.5.
- **Patient form home_health_agency_id field** — Phase 2.5.
- **Visit server-action updates** to write `service_location_id` /
  scheduled window / no_show_reason — Phase 2.5 (needs regenerated types
  - the dialog).
- **Banner placement** in `app/dashboard/patients/[id]/*` pages — Phase
  2.5; component is ready, just needs to be slotted in once visual
  spacing is reviewed with the client.
- **Billing-blocks-on-missing-consent gate** — Phase 4, gated by the
  `require_consent_for_billing` flag.

### Acceptance criteria for the foundation

- [x] All migrations are additive — no `DROP`, no `ALTER COLUMN ... TYPE`,
      no destructive defaults. Safe to apply to production.
- [x] Every new table has RLS enabled with explicit policies.
- [x] Every new index is partial / scoped where appropriate.
- [x] `npx tsc --noEmit` exits 0.
- [x] `npx eslint` on changed files exits 0.

### Validation evidence

```
$ npx tsc --noEmit
Exit: 0

$ npx eslint <Phase 2 files>
Exit: 0
```

---

## Phase 2.5 — Scheduling/intake admin UI — 🟡 in progress

### What changed

1. **`app/actions/service-locations.ts`** — list / create / update /
   set-active server actions for `service_locations`. Admin-write
   enforcement via `requireAdmin()` + `requireFacilityAccess()`. Boundary
   casts (`as never`) used until `lib/database.types.ts` is regenerated.
2. **`app/actions/home-health-agencies.ts`** — list / create / update /
   set-active for `home_health_agencies`. Tenant-scoped via
   `getUserRole().tenant_id`.
3. **`app/dashboard/admin/agencies/page.tsx`** + **`components/admin/home-health-agencies-client.tsx`** —
   full admin CRUD UI for HHAs at `/dashboard/admin/agencies`. Active /
   inactive split, edit-in-dialog, soft deactivate (no destructive
   delete).
4. **`app/dashboard/admin/facilities/[id]/locations/page.tsx`** +
   **`components/admin/service-locations-client.tsx`** — per-facility
   service-location admin UI. Sort order, active toggle, edit dialog.
5. **`lib/navigation.ts`** — adds the **Agencies** item to the Admin
   section nav (no `tenantOnly` flag → both tenant_admin and
   facility_admin see it).
6. **`proxy.ts`** — adds `/dashboard/admin/agencies` to `SHARED_ADMIN_ROUTES`
   so facility admins can access (tenant admins already pass).

### Still deferred to Phase 3+

- **NewVisitDialog enhancement** (clinician picker, service-location
  dropdown, scheduled-window inputs, no-show reason) — needs regenerated
  `lib/database.types.ts` to avoid widespread boundary casts on the most
  type-touched component in the calendar.
- **Patient form `home_health_agency_id` field** — same reason; patient
  form is large, would prefer typed inserts.
- **Visit server-action wiring** (`createVisitFromCalendar` /
  `updateVisit` to write `service_location_id`, `scheduled_*`,
  `no_show_reason`) — same reason.
- **Banner placement** on `/dashboard/patients/[id]/*` — the existing
  `components/patients/consent-banner.tsx` (binary missing-only) is still
  in place. The new `components/consents/consent-banner.tsx` (3-state
  view-backed) is ready to swap in when we revisit the patient header in
  Phase 3.

### Acceptance criteria

- [x] Tenant admin can create/edit/deactivate HHAs at
      `/dashboard/admin/agencies`.
- [x] Facility admin can do the same (HHAs are tenant-scoped, accessible
      to either admin tier).
- [x] Tenant admin can manage service locations per facility at
      `/dashboard/admin/facilities/[id]/locations`.
- [x] Clinical-only user is redirected away from both pages by `proxy.ts`.
- [x] All write paths reject non-admin callers (defense in depth on top
      of RLS).
- [x] `npx tsc --noEmit` exits 0.
- [x] `npx eslint` on changed files exits 0.

### Validation evidence

```
$ npx tsc --noEmit
Exit: 0

$ npx eslint <Phase 2.5 files>
Exit: 0
```

---

## Phase 2.5 leftovers (post types regen) — ✅ shipped 2026-05-02

After `npx supabase db push` + types regen, the deferred items above
landed cleanly with no boundary casts.

1. **Boundary casts removed** — `app/actions/consent-status.ts`,
   `app/actions/service-locations.ts`, `app/actions/home-health-agencies.ts`
   now use the regenerated typed client directly. `fromTable()` helper +
   `void fromTable;` discard removed.
2. **`facility_type`** — `app/actions/facilities.ts` exports
   `FACILITY_TYPES` enum and parses/writes `facility_type` on create +
   update. `components/facilities/facility-form.tsx` adds a native
   `<select name="facility_type">` in the basic-info grid.
3. **Patient → HHA** — `app/actions/patients.ts` schema preprocesses
   `homeHealthAgencyId` (treats `"none"` / `""` as null), writes
   `home_health_agency_id` on create + update.
   `components/patients/patient-form.tsx` adds a shadcn `<Select>` with a
   `NONE_VALUE = "__none__"` sentinel + "None" item; only renders when
   the tenant has at least one active HHA. Both
   `app/dashboard/patients/new/page.tsx` and
   `app/dashboard/patients/[id]/edit/page.tsx` fetch
   `listHomeHealthAgencies()` and pass `homeHealthAgencies={...}` and
   `patient.homeHealthAgencyId` through.
4. **`createVisitFromCalendar` extended** — schema adds
   `serviceLocationId`, `clinicianId`, `durationMinutes`. The insert now
   computes `scheduled_end_at = scheduled_start_at + duration*60000` and
   writes `service_location_id`, `clinician_id`, `scheduled_start_at`,
   `scheduled_end_at`, `duration_minutes` alongside the legacy columns
   so the calendar renders with the new shape immediately.
5. **NewVisitDialog rewritten** — `components/calendar/new-visit-dialog.tsx`
   loads patients + service locations + clinicians in parallel via
   `Promise.all` whenever the facility changes; resets stale selections;
   provides a 3-col Date/Time/Duration row, a 2-col VisitType /
   ServiceLocation row, and a Clinician select with an "Unassigned"
   option labeled `name (credentials)`. `NONE_VALUE` sentinels are
   converted to `null` before reaching the action. (Gotcha:
   `z.coerce.number()` breaks the `useForm` resolver type — use
   `z.number()` and a custom `onChange` that coerces the string to a
   number.)
6. **No-show flow** — `app/actions/visits.ts` adds
   `setVisitNoShow(visitId, reason)` writing `status='no_show'` +
   `no_show_reason` + `no_show_at` + `no_show_recorded_by`. UI control
   added to `components/visits/visit-actions.tsx` as a dropdown item +
   reason-textarea dialog (3–500 chars).
7. **Consent banner swapped** — `app/dashboard/patients/[id]/page.tsx`
   now imports `ConsentBanner` from `@/components/consents/consent-banner`
   (server component, view-backed, 3-state). The banner self-gates on
   `status === 'on_file'`, so the `!hasConsent && …` wrapper was removed.
   The legacy `components/patients/consent-banner.tsx` is still on disk
   (non-imported) and can be deleted in a later cleanup pass.

```
$ npx tsc --noEmit
Exit: 0

$ npx eslint <Phase 2.5 leftovers>
Exit: 0
```

---

## Phase 3 — Clinical UX revamp — 🟡 in progress

Phase 3 is delivered behind tenant feature flag **`clinical_ux_v2`**
(added to `lib/features.ts`). Off by default, fail-closed. Each slice is
opt-in per tenant so existing pilots see no behavior change until they
flip the flag.

### Slice 1 — visit-screen scaffolding ✅ shipped 2026-05-02

1. **`lib/features.ts`** — adds `"clinical_ux_v2"` to `TenantFeatureFlag`
   union with a brief usage comment.
2. **`components/visits/visit-topbar-pill.tsx`** — server component,
   WoundNote-style patient context strip (name · MRN · DOB · facility ·
   DOS · provider). Pure presentation. (R-060)
3. **`components/wounds/wound-rail.tsx`** — server component. Fetches
   `getWounds(patientId)` and `getVisits(patientId)` in parallel.
   Renders a left rail with color-dot status indicators (active = red,
   improving = amber, stable = blue, healed = emerald) and a Recent
   Visits list (8 most recent) where the current visit gets an
   `aria-current="page"` ring. Resizable behavior is deferred to a
   follow-up slice; v1 is a fixed-width column. (R-062)
4. **`components/visits/signed-bar.tsx`** — locked-state banner. Renders
   nothing for non-signed/non-submitted visits, so the caller can drop
   it in unconditionally. Embeds the existing
   `AddAddendumDialog` (which already self-gates on signed status), so
   the addendum entry point now lives prominently in the lock bar
   instead of buried below the assessments. (R-064 partial — full
   attestation modal refinement comes in slice 4.)
5. **`app/dashboard/patients/[id]/visits/[visitId]/page.tsx`** — wires
   all three behind the flag. When on, the page uses a
   `lg:grid-cols-[16rem_minmax(0,1fr)]` 2-col layout with the rail in
   the left column and the existing 3-col content grid in the right.
   When off, the page renders identically to before. The flag is
   fetched once via `isTenantFeatureEnabled("clinical_ux_v2")`.

### Slice 2 — Collapsible assessment cards ✅ shipped 2026-05-02

1. **`components/ui/collapsible-card.tsx`** — pure-React primitive (no
   extra package). Wraps shadcn `<Card>` with a click-to-toggle header
   (real `<button>` + `aria-expanded`/`aria-controls`, keyboard
   activatable). `defaultOpen` defaults to `true` so visual parity with
   the legacy form is preserved on first paint. Accepts `title`,
   `description`, `headerBadge`, and `id` (the latter for future
   anchor-style navigation from the wound rail).
2. **`components/assessments/assessment-form.tsx`** — all eight section
   `<Card>` blocks (Select Wound, Wound Classification, Measurements,
   Tissue Composition, Wound Characteristics, Signs of Infection,
   Location Confirmation, Assessment Notes) swapped to `CollapsibleCard`.
   The Treatment Order Builder section was already its own component, so
   it's unaffected. Stale Card / CardHeader / CardTitle imports removed.
   Behavior unchanged for clinicians who never click a chevron — this
   is non-flag-gated because the visual + interaction delta is small
   and additive (sections start expanded).

### Slice 3 — New Encounter typeahead modal ✅ shipped 2026-05-02

1. **`app/actions/patients.ts`** — added `searchPatientsForEncounter`
   (≥2-char query, returns up to 10 lightweight `EncounterPatientHit`
   rows: name + MRN + DOB + facility). Sanitized PostgREST filters and
   RLS-scoped reads inherit existing tenant guardrails.
2. **`components/visits/new-encounter-modal.tsx`** — single-screen
   intake: debounced (200 ms) patient typeahead → click locks in
   patient + facility (read-only pill, "Change" to reset) → DOS date
   input (defaults today, capped +30 d) → "Start encounter" calls
   `createVisitFromCalendar` (visit_type=routine, 30 min, 09:00 local)
   and `router.push`'es into the new visit screen.
3. **Header wiring** — `app/dashboard/layout.tsx` now reads
   `isTenantFeatureEnabled("clinical_ux_v2")` and threads
   `clinicalUxV2` through `DashboardLayoutClient` → `Header`. Header
   renders `<NewEncounterModal />` next to the global search dialog
   only when the flag is on AND `surface === "clinical"`. Ops-surface
   users keep their existing calendar-based intake.

### Slice 4 — Attestation modal + locked overlay ✅ shipped 2026-05-02

1. **`components/visits/sign-visit-dialog.tsx`** — added an explicit
   attestation checkbox (amber callout) above the signature pad. The
   pad is hidden until the clinician ticks "I attest…", and the
   checkbox state is reset every time the dialog closes via a wrapped
   `handleOpenChange` (no `useEffect` cascading-render warning). The
   pre-existing certification text inside `<SignaturePad>` is kept for
   redundancy on signed PDFs.
2. **`components/visits/locked-overlay.tsx`** — wraps any block and,
   when `locked={true}`, applies `pointer-events-none opacity-60` to
   children plus a sticky "Locked — addendums only" pill. `isolate`
   container so the pill stays anchored. `aria-disabled` is set for
   assistive tech.
3. **Visit page wiring** — wrapped the inner `lg:grid-cols-3` content
   in `<LockedOverlay locked={clinicalUxV2 && (signed || submitted)}>`.
   Edit / Add Assessment buttons in the header were already hidden for
   signed/submitted; the overlay closes the loop on the body.
   Addendums remain reachable via the existing Signed bar above.

### Slice 5 — E/M sub-sections ✅ shipped 2026-05-02

1. **Migration `00044_visit_em_documentation.sql`** — adds nullable
   `visits.em_documentation jsonb`. Free-form keys
   (`vitals` / `cc_hpi` / `ros` / `pe`); we deliberately did **not**
   add per-section columns so future copy-edits don't require new
   migrations. RLS inherited; no backfill needed (NULL = unused).
2. **`lib/database.types.ts`** — manually patched Row/Insert/Update on
   `visits` to include `em_documentation: Json | null`. Will be
   regenerated next time we run `supabase gen types`.
3. **`app/actions/visits.ts`** — `updateVisitEmDocumentation(visitId,
em)` validates with zod (per-section length caps), strips empty
   strings, and stores NULL when everything is blank. Refuses to write
   to signed/submitted visits ("use an addendum instead"). `getVisit`
   now returns `emDocumentation` so the page can hydrate the form.
4. **`components/visits/em-sub-sections.tsx`** — outer
   `CollapsibleCard` wrapping four inner CollapsibleCards (Vitals,
   CC/HPI, ROS, PE). Each card shows a "Filled" badge when its
   textarea has content and auto-opens if pre-populated. Single
   "Save E/M" button — no autosave (existing autosave runs against the
   draft Edit page; doubling it would cause silent overwrites).
   `readOnly` prop disables inputs + hides the save button when the
   parent says the visit is locked.
5. **Visit page wiring** — when `clinical_ux_v2` is on, renders
   `<EmSubSections>` inside the LockedOverlay above the existing
   3-column grid. Locked state propagates so a signed visit shows
   filled sections without controls.

### Slice 6 — Treatment Order Builder polish ✅ shipped 2026-05-02

1. **`components/assessments/dressing-picker.tsx`** — new searchable
   Popover + Command (cmdk) primitive that drops in for the existing
   grouped `<Select>`. Preserves category headings, supports an
   optional "None" entry (`allowNone`), and exposes the same
   value/onChange/options/disabled API. Matches trigger width via
   `w-[--radix-popover-trigger-width]` so the popover lines up with
   the field.
2. **`components/assessments/treatment-order-builder.tsx`** — primary
   and secondary Topical treatment selectors swapped to
   `<DressingPicker>`. Removed the now-dead `groupedTopicals` memo
   (lint warning fix). Other selectors (Application Method, Coverage,
   Frequency, NPWT pressure/schedule) keep `<Select>` since each has a
   short fixed list.
3. **Scope decisions** — additional category tabs (Eschar/Surgical,
   Custom, Graft Tx) and category-specific data shapes were
   intentionally deferred. Today's polish lifts the most painful
   interaction (scrolling through dozens of dressings) without forcing
   a wider data-model change. New tabs can be added incrementally by
   extending `TreatmentTab` and `TreatmentOrderData` in
   `lib/treatment-options.ts` without touching the picker primitive.

## Phase 3 closeout

All six slices behind the `clinical_ux_v2` tenant flag (Slice 2 is
non-flag-gated, see note above). Tenants stay on the legacy chrome
until a row is inserted into `tenant_features (tenant_id, flag,
enabled) VALUES (…, 'clinical_ux_v2', true)`. Phase 4 (visit-level
billing) and Phase 5 (batch print, copy-forward, two PDF formats,
incidents MVP) follow.

```
$ npx tsc --noEmit
Exit: 0

$ npx eslint <Phase 3 slice 1 files>
Exit: 0
```

---

## Phase 4 — Visit-level billing — ✅ complete

Phase 4 adds claim-status lifecycle tracking, an inline billing panel on
the visit detail page, and a status-filtered ops billing dashboard.

### What shipped

#### Migration `supabase/migrations/00045_billing_status.sql`

- Creates `billing_status` Postgres enum: `draft | ready | submitted | paid | denied`
- Adds `billing_status NOT NULL DEFAULT 'draft'`, `submitted_at TIMESTAMPTZ`,
  `claim_number TEXT`, `units JSONB` to `billings`
- Adds `idx_billings_status` and `idx_billings_submitted_at` indexes

#### `lib/database.types.ts`

- Manually patched `billings` Row/Insert/Update to include the four new columns
- `billing_status` typed as `'draft' | 'ready' | 'submitted' | 'paid' | 'denied'`

#### `app/actions/billing.ts`

- Exported `BillingStatus` type alias
- `setBillingStatus(billingId, status, claimNumber?)` — updates status + optional
  claim number; revalidates visit + billing dashboard paths
- `submitBillingRecord(billingId)` — transitions `draft/ready → submitted`,
  stamps `submitted_at`; blocks if already submitted/paid/denied or no CPT codes
- `getBillingForVisit` enhanced: returns `billingStatus`, `submittedAt`,
  `claimNumber`, `units`, `cptCodes`, `icd10Codes`, `modifiers` typed arrays
- `getAllBilling` enhanced: camelCase map includes `billingStatus`,
  `submittedAt`, `claimNumber`

#### `components/billing/billing-status-actions.tsx` (new — client component)

- Color-coded status badge (draft=zinc, ready=blue, submitted=amber, paid=emerald, denied=red)
- Action buttons by status:
  - `draft` → Mark Ready
  - `ready` → Submit Claim | Back to Draft
  - `submitted` → claim # input + Mark Paid | Mark Denied
  - `denied` → Reopen for Resubmit
  - `paid` → closed message
- Pending spinner; `sonner` toast feedback

#### `components/billing/visit-billing-panel.tsx` (new — server component)

- Composes `BillingStatusActions` + `BillingFormServerWrapper`
- Shows CPT/ICD-10/modifier badge summaries (always visible)
- Renders edit form when status is `draft` or `ready`
- Locks when `locked` prop is true or status is `submitted/paid/denied`
- Handles null billing (no record yet) with empty-state form

#### `app/dashboard/patients/[id]/visits/[visitId]/page.tsx`

- Old read-only billing `<Card>` block removed
- Replaced with `<VisitBillingPanel visitId patientId billing locked={signed||submitted} />`
- `DollarSign` icon import removed (no longer used directly in page)

#### `components/billing/billing-reports-client.tsx`

- Added `BillingStatus` type + `STATUS_LABELS` / `STATUS_BADGE_CLASS` maps
- `BillingRecord` type extended with `billingStatus?`, `submittedAt?`, `claimNumber?`
- Added `selectedStatus` filter state + filter logic
- Filter grid expanded from 4 → 5 columns to include Status select
- Desktop table: new "Status" column with color-coded badge
- Clear Filters resets status filter to "all"

```
$ npx tsc --noEmit
Exit: 0

$ npx eslint <Phase 4 touched files>
Exit: 0 (0 warnings, 0 errors)
```

## Phase 5 — Batch print, copy-forward, PDFs, incidents — ✅ COMPLETE

### R-081 Incidents Module

- `lib/navigation.ts` — `AlertTriangle` imported; Incidents nav item added to both `ADMIN_MAIN_NAV` and `CLINICAL_MAIN_NAV`
- `app/dashboard/incidents/page.tsx` — new list page (server component); fetches `getIncidentReports()` + `getUserFacilities()` in parallel; empty state + incident cards with date, location, facility, signed/unsigned badge
- `app/dashboard/incidents/[reportId]/page.tsx` — new detail page; two-column grid (Incident Details, Employee Info, optional Patient Info); Description + Immediate Actions cards; signed/unsigned badge in header
- `app/dashboard/incidents/new/page.tsx` — breadcrumbs and back-link corrected from `/dashboard` → `/dashboard/incidents`

### R-067 Copy Forward

- `app/actions/visits.ts` — added `getCopyForwardData(sourceVisitId)` and `copyForwardToVisit(sourceVisitId, targetVisitId)` server actions; skips wounds already assessed on target; does NOT copy signatures/billing; revalidates visit path on success
- `components/visits/copy-forward-dialog.tsx` — Dialog with source-visit picker (date + assessment count); confirmation details; sonner feedback; only renders when eligible prior visits exist
- `app/dashboard/patients/[id]/visits/[visitId]/page.tsx` — Copy Forward button added adjacent to Edit Visit button; only shown when visit is draft/in-progress; `priorVisits` fetched via `getVisitsForQuickAssessment(patientId)` in parallel

### R-042 Batch Print from Visit Log

- `components/visits/visit-log-client.tsx` — client component wrapping `VisitCard` grid; shows batch-print toolbar for signed/submitted/completed visits; Select All / Deselect All; "Print Selected (N)" triggers sequential PDF downloads using existing `getVisitDataForPDF` + `VisitSummaryPDF`; 400ms delay between downloads to prevent browser pop-up blocking
- `app/dashboard/patients/[id]/page.tsx` — Visits tab now uses `VisitLogClient` instead of a bare VisitCard grid; restricted visit set computed via `canViewVisitDetails()` and passed as `Set<string>`

### R-068 Two PDF Formats

- `app/actions/pdf.ts` — added `getVisitDataForFullPDF(visitId)` which reuses `getVisitDataForPDF` base then fetches extended assessment columns (tissue percentages, periwound, infection signs, etc.) and full treatment detail; enriched assessments merged back onto base data
- `components/pdf/visit-full-note-pdf.tsx` — new `@react-pdf/renderer` document: patient + encounter details, full wound assessment cards with tissue composition bar (granulation/slough/epithelial %), infection signs badges, treatment plan, assessment notes; billing/coding section, addendums, provider/patient signatures; page-numbered footer
- `components/pdf/visit-pdf-download-button.tsx` — extended with `format?: "summary" | "full"` prop; summary route uses cache; full-note route skips cache (always fresh); button label updates per format
- `app/dashboard/patients/[id]/visits/[visitId]/page.tsx` — Summary PDF button always visible; Full Note PDF button shown only when `visit.status === "signed" || "submitted"`

### Validation

- `npx tsc --noEmit` → exit 0
- `npx eslint <all touched files>` → 0 errors, 0 warnings

## Phase 6 — Branding + Chat spike — ✅ COMPLETE

### What changed

#### R-070 — Brand rename (Wound EHR → WoundNote)

- `app/layout.tsx` — metadata title updated to `"WoundNote — Wound Care EHR"`
- `app/login/page.tsx` — alt text + "Sign in to WoundNote"
- `app/signup/page.tsx` — all `alt="Wound EHR"` + signup text
- `app/auth/confirm-email/page.tsx`, `forgot-password`, `resend`, `reset-password` — alt texts
- `components/layout/sidebar.tsx` — logo alt, heading, footer version string
- `components/layout/footer.tsx` — "WoundNote · by The Wound Well Co."
- `lib/email.ts` — invite email subject, HTML body, text body, copyright lines
- `app/dashboard/admin/signatures/page.tsx` — page title metadata

#### R-071 — WoundNote palette + Inter/Nunito typography

- `app/layout.tsx` — switched from `Geist`/`Geist_Mono` to `Inter` (UI) + `Nunito` (display); both exposed as CSS variables `--font-inter` / `--font-nunito`
- `app/globals.css` — `@theme inline` now maps `--font-sans → var(--font-inter)`, `--font-display → var(--font-nunito)`. Full palette update:
  - `--primary` → WoundNote mint `oklch(0.72 0.14 174)` (was teal `oklch(0.52 0.16 195)`)
  - `--background` → cream surface `oklch(0.97 0.012 157)` (was blue-grey)
  - `--foreground` → `#1f2d2a` gText `oklch(0.24 0.025 164)`
  - `--sidebar` → deep forest `oklch(0.21 0.048 168)` (was white)
  - `--sidebar-foreground` → near-white `oklch(0.95 0.008 164)`
  - Dark mode: sidebar uses even deeper forest `oklch(0.14 0.042 168)`

#### R-072 — Sidebar redesign

- `components/layout/sidebar.tsx` — full rewrite:
  - Width reduced from `w-64` (256px) → `w-[200px]`
  - Dark forest background via `bg-sidebar` CSS var
  - Pill active states: `rounded-full bg-white/15 text-sidebar-primary font-semibold`
  - Admin active: `rounded-full bg-purple-500/20 text-purple-300 font-semibold`
  - Surface badge (Operations / Clinical) styled as inline pill on dark bg
  - **Today section** (clinical surface only): "Unsigned" link with live badge count + "Supplies" link
  - Footer: "WoundNote v1.0"
- `app/actions/visits.ts` — added `getTodayUnsignedCount()`: counts today's `clinician_id = user.id` visits where status not in `('signed','submitted')`
- `app/dashboard/layout.tsx` — fetches `todayUnsignedCount` from `getTodayUnsignedCount()` on clinical surface; passes as prop
- `components/layout/dashboard-layout-client.tsx` — new `todayUnsignedCount` prop threaded through to `<Sidebar>`

#### R-080 — Google Chat feasibility spike

- `docs/GOOGLE_CHAT_SPIKE.md` — full feasibility analysis:
  - Option A (REST API): rejected — too much infra, BAA gap
  - Option B (iframe embed): ✅ recommended — ready-to-ship component included in the doc, `NEXT_PUBLIC_GOOGLE_CHAT_SPACE_URL` env var, PHI banner
  - Option C (Meet links): tagged for Phase 7 / telehealth track
  - HIPAA table: Chat explicitly excluded from Google Workspace BAA
  - Decision: wire Option B in Phase 7 if team confirms internal pilot

### Validation

- `npx tsc --noEmit` → exit 0
- `npx eslint` on all Phase 6 files → 0 errors, 0 new warnings (2 pre-existing `no-img-element` in login/page.tsx)

---

## Phase 7 — Surface-aware Dashboard + Settings — ✅ COMPLETE

### R-007 — Surface-specific Dashboard Widgets

**`app/dashboard/page.tsx`** — UPDATED:

- Imports `getActiveSurface` + `getUserCredentials` from `lib/rbac`/`lib/surface`
- Imports `getClinicalDashboardStats` + `getAdminDashboardStats` from `app/actions/visits`
- Resolves `activeSurface` at top of component via `getActiveSurface(role, credentials)`
- Admin surface stat cards: Total Patients, Visits Today (all), Unsigned Today (all), Office Inbox count
- Clinical surface stat cards: My Visits Today, Unsigned Today (own), Corrections Pending, Active Wounds
- Recent Visits section: admin = all clinicians' last 5; clinical = own last 5 with `Badge` status indicator
- Quick Actions section: admin = Inbox + Billing + Patients + Reports; clinical = Schedule + New Patient + Wounds + Billing
- Removed `visitsThisMonth` / `pendingVisits` display (superseded by surface-specific stats); queries retained but results elided in destructuring

**`app/actions/visits.ts`** — ADDED:

- `getClinicalDashboardStats()` — own visits today, unsigned today, visits this week, last 5 own visits with patient name
- `getAdminDashboardStats(facilityIds)` — visits today all, unsigned today all, pending inbox count (sent_to_office), billing ready count

### Settings — Timezone + Default Facility

**`app/actions/preferences.ts`** — UPDATED:

- `PDFPreferences` type extended with `timezone?: string` and `default_facility_id?: string`
- `getUserPreferences()` now also selects `preferences` JSONB column and merges `timezone` + `default_facility_id` from it
- `savePDFPreferences()` writes `timezone` + `default_facility_id` into the JSONB `preferences` column on upsert
- No database migration required — uses existing `preferences JSONB` column on `user_preferences` table

**`app/dashboard/settings/page.tsx`** — UPDATED:

- Fetches user's facilities via `user_facilities!inner(facilities(id, name))` in parallel with preferences
- Passes `facilities` array to `<SettingsClient>`
- Updated page description to reflect broader scope

**`components/settings/settings-client.tsx`** — UPDATED:

- Accepts new `facilities?: { id: string; name: string }[]` prop
- Adds `IANA_TIMEZONES` constant with 13 common timezone entries
- New **General** card (before PDF cards): Timezone select + Default Facility select
- `hasChanges` extended to track timezone + default_facility_id diffs
- Imports: `Globe`, `Building2` added from lucide-react

### Bug Fixes

**`app/dashboard/reports/page.tsx`** — FIXED:

- Previous query used `first_name`, `last_name`, `role` columns on `users` table — these don't exist
- Fixed to query `name`, `credentials`, `email` and display `c.name || c.email || "Unknown"`

### Validation

- `npx tsc --noEmit` → exit 0
- `npx eslint` on all Phase 7 files → exit 0, 0 errors, 0 warnings

---

## Phase 8 — NFR-4 Audit Coverage Sweep — ✅ COMPLETE

### Goal

Every PHI read/write server action added in Phases 2–7 must call `auditPhiAccess()` (fire-and-forget, never blocks the operation). NFR-4 requirement.

### Files Modified

**`app/actions/visits.ts`** — 5 new audit calls added:

- `createVisit` → `action: "create"`, `recordType: "visit_record"`
- `updateVisit` → `action: "update"`, `recordType: "visit_record"`
- `deleteVisit` → `action: "delete"`, `recordType: "visit_record"`
- `setVisitNoShow` → `action: "update"`, `recordType: "visit_no_show"`
- `updateVisitEmDocumentation` → `action: "update"`, `recordType: "visit_em_documentation"`
- `copyForwardToVisit` → `action: "create"`, `recordType: "visit_copy_forward"`, includes `reason` with source visit ID

**`app/actions/approval-workflow.ts`** — new import + 4 audit calls:

- `sendNoteToOffice` → `action: "update"`, `recordType: "visit_sent_to_office"`
- `requestCorrection` → `action: "update"`, `recordType: "visit_correction_request"`, includes correction `reason`
- `approveNote` → `action: "update"`, `recordType: "visit_approved"`
- `voidNote` → `action: "delete"`, `recordType: "visit_voided"`, includes void `reason`

**`app/actions/billing.ts`** — new import + 4 audit calls:

- `createBilling` → `action: "create"`, `recordType: "billing_record"`
- `updateBilling` → `action: "update"`, `recordType: "billing_record"`
- `setBillingStatus` → `action: "update"`, `recordType: "billing_status_change"`, includes status in `reason`
- `submitBillingRecord` → `action: "update"`, `recordType: "billing_submission"`

**`app/actions/assessments.ts`** — new import + 3 audit calls:

- `createAssessment` → `action: "create"`, `recordType: "wound_assessment"`
- `updateAssessment` → `action: "update"`, `recordType: "wound_assessment"`
- `deleteAssessment` → `action: "delete"`, `recordType: "wound_assessment"`

### Pre-existing coverage (not changed)

- `visits.ts` `getVisit` — already had `action: "read"`
- `wounds.ts` `getWound` — already had `action: "read"`
- `patients.ts` `getPatient` — already had `action: "read"`
- `photos.ts` upload — already had `action: "create"`
- `signatures.ts` signNote/createAddendum — already had `action: "sign"`
- `auth.ts` signIn — already had `action: "read"` (login)
- `api/upload-audio/route.ts` — already had `action: "create"`

### Validation

- `npx tsc --noEmit` → exit 0
- `npx eslint app/actions/visits.ts app/actions/approval-workflow.ts app/actions/billing.ts app/actions/assessments.ts` → exit 0, 0 errors, 0 warnings
