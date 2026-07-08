# Production-Hardening Plan — RSF AI Proposal Generator

The scope you listed spans ~16 areas and easily 2-3 weeks of work if done all at once. To keep quality high (and avoid a mega-turn that breaks the app), I'll ship it in **4 phases**, each independently reviewable in the preview. You can approve the whole plan, or reorder / trim phases.

Before phase 1 I'll also fix a small hydration warning on `/auth` that showed up in the runtime logs.

---

## Phase 1 — PDF Fidelity & Branding (fixes #1, #2, #8, #9, #10, #11)

**Goal:** the generated PDF looks pixel-clean and matches the RSF brochure on every page, every input.

- Replace `/rsf-logo.png` fetch with a bundled high-res asset via Lovable Assets; compute width from natural aspect ratio so it never stretches. Render on every page (header hook).
- Rewrite text layout with a shared "flow engine": paragraph, bullet list, table, and section header helpers all use one cursor + page-break check → no clipped lines, no split headings, no overlapping footer.
- Add auto page-break to `autoTable` (`pageBreak: 'avoid'` for header rows, `rowPageBreak: 'avoid'`) and reserve header/footer heights.
- Standard `Inter` (headings) + `Source Sans` (body) embedded once as base64 (jsPDF supports TTF via `addFileToVFS`); currency symbol `₹` renders correctly (current default helvetica can't).
- Machine-image column: optional `image_url` on each machine; scaled + aspect-locked in the specs table.
- Cover image selection on the proposal (product hero pulled from a small built-in library or uploaded).

## Phase 2 — Domestic vs Export Modes + T&C Builder (fixes #3, #4, #12)

**Goal:** every proposal picks a mode and pulls the right terms.

- New `quotation_type` column on `proposals`: `domestic | export`. Wizard step 5 asks; default from customer country.
- New tables (with GRANT + RLS):
  - `terms_templates` (id, user_id, name, scope, applies_to, is_default, sort_order)
  - `terms_clauses` (id, template_id, title, body, position, enabled)
- Seed two system templates: **India Domestic** (GST, HSN, freight, warranty, payment 50/50, delivery) and **UAE Export** (FOB/CIF/EXW, Incoterms, export packing, docs, shipping, country conditions).
- `/settings/terms` route: CRUD templates and clauses, drag-to-reorder (dnd-kit), enable/disable toggle, "Set as default for {mode}" pin.
- PDF picks the chosen template's clauses; domestic renders HSN + GST rows, export renders Incoterms + shipping table.
- Validation gate before "Generate": missing customer / company / product / capacity / price / terms / logo → toast with the exact list.

## Phase 3 — Editable Proposal + Live Preview + Download Modal (fixes #5, #6, #7)

**Goal:** review-then-download, with true WYSIWYG edits.

- Rich-text editor (Tiptap) mounted section-by-section on the detail page: exec summary, scope, process, advantages, safety, QA, install, warranty, after-sales, value prop.
- Editable machine table (add/remove/reorder rows, edit unit price, qty).
- Editable header/footer text + cover title, sub-title, image slot.
- Auto-save (debounced 800 ms) with a "Saved · 2s ago" indicator; undo/redo comes from Tiptap history.
- Upgrade the existing preview dialog into a full-screen viewer with: zoom in/out, page thumbnails sidebar, page navigator, "mobile / desktop" width toggle, print button.
- Download flow: click Download → preview modal → choose Download PDF · Save Draft · Edit Again · Print · Share via Email (mailto with PDF attachment link once we host it).
- DOCX export deferred to phase 4 unless you want it in phase 3.

## Phase 4 — UX Polish, Perf, QA (fixes #13, #14, #15, #16)

- Loading skeletons + optimistic updates on list/detail; sonner success/error toasts everywhere.
- React Query staleTime tuning; suspense boundaries so navigation feels instant.
- Responsive audit on 375 / 768 / 1440 breakpoints; sidebar collapses on mobile.
- Playwright smoke test that: creates customer → runs wizard → opens preview → downloads PDF → verifies file signature.
- Final QA pass against your 16-point checklist with screenshots for each item.
- DOCX export (docx-js) if not shipped in phase 3.

---

## Technical notes (for reference)

- Fonts: use `jspdf-font` TTFs base64-embedded once in `src/lib/pdf-fonts.ts`. Only Inter + Source Sans; `helvetica` fallback stays for safety.
- Logo: bundled via `lovable-assets create`; imported as URL, converted to data-URL once and cached in a module singleton to avoid the current per-render `fetch`.
- New tables get standard `authenticated` GRANTs + `auth.uid()`-scoped RLS.
- Tiptap editor is the only meaningful dep add for phase 3 (~50 KB gz). No other new libraries.
- Hydration warning on `/auth`: root `Suspense` fallback vs the auth page render — fix by moving the `<Outlet />` under `<Suspense fallback={null}>` in `__root.tsx` or making the auth page render a stable initial tree.

---

## What I need from you

1. **Approve the phasing** (or say "do phase 1 + 2 only", "skip DOCX", etc.).
2. **Mode default:** pick domestic based on `customer.country === 'India'`, or always ask? (default: infer + let user override).
3. **Editor scope for phase 3:** OK with Tiptap per-section (my recommendation), or do you want a single monolithic editor?
4. **Email share in phase 3:** use a mailto link with the PDF as attachment via a temporary Supabase Storage upload — OK, or defer?

Once you confirm, I'll start with **Phase 1** in the next turn.
