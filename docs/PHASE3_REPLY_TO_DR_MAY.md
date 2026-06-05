# Draft reply to Dr. May (5/22 follow-up)

*For Ryan to send before Friday. Plain text below — copy/paste, no formatting needed.*

---

**Subject:** RE: Clinical workflow references — quick confirmations + two questions before Friday

Hi Dr. May,

Thanks for sending these over — the references are exactly what I needed, and the procedure / study / treatment-order flows give me a clear picture of where each piece lands in the assessment screen.

A few quick confirmations:

1. **ICD-10 codes — no subscription needed.** WoundNote already ships with a built-in CPT and ICD-10 database (the same dataset the billing module uses today), so wiring up a typeahead that matches on either the code or the diagnosis name is a straightforward addition. We do not need to subscribe to an external service.

2. **Copy-forward / download / print / sign in the header** — copy-forward is already implemented; the other three exist as buttons scattered across the visit screen. Consolidating them into the header bar you described is a clean cleanup pass.

3. **Procedure Documentation and Treatment Order Builder inside the Wound Assessment tab, Study Order Form under a Studies tab** — got it, and that maps cleanly onto how the data is stored today.

4. **PDF leave-behind format** — I'll hold on building until your sample lands so I match the layout you want on the first pass.

Two questions before Friday so we can move fast:

A. For a visit where the patient has multiple wounds and different note types apply (e.g., a Standard assessment on three wounds and an Arobella procedure on one), should each wound get its own page in the output PDF, or do you want a single combined note for the visit?

B. For G-Tube and Skin Sweep — these aren't tied to a specific wound the way Advanced Wound Care is. When a clinician opens a visit and picks one of those note types, should it show up at the visit level (above the wound list), or attached to a placeholder entry in the wound rail? Either works; I just want to follow how you and the team naturally think about it.

I'll have a working version of the new layout for us to review on the Friday call.

Best,
Ryan
