# Enterprise Proposal Platform — Phased Plan

This is a very large scope (~12 major modules, each a multi-week feature on its own). Shipping it all in one turn would produce shallow, broken code. I'll break it into phases you can approve one at a time. Each phase leaves the app fully working.

## Reality check on 2 items

- **AI Template Converter** (upload any PDF/Word/PPT/image and recreate a pixel-perfect editable clone): this is a research-grade problem. Realistic version = AI extracts text, tables, colors, logos and maps them into one of *our* templates. A true pixel-perfect Canva-style clone of arbitrary uploads is not achievable reliably. I'll build the realistic version.
- **Drag-and-drop editor like Canva/InDesign**: full free-canvas editor is a 2–3 month project by itself. Realistic version = block-based editor (reorder / show-hide / edit each proposal section, cover page, header/footer, colors, logo, watermark). I'll build that.

If you want the literal Canva-clone, say so and we'll scope that separately.

## Phase 1 — Product & Machine Master (foundation)
Everything else depends on this. Without it, pricing/auto-select/utilities have nothing to read from.

- New tables: `product_categories`, `machines`, `machine_accessories`, `machine_pricing`
- Admin UI at `/settings/products`:
  - Categories: add/edit/delete/hide/reorder
  - Machines: add/edit/delete/duplicate/archive, image upload, full spec fields (code, capacity, MOC, motor, power, dims, weight, description, features, applications, std/optional accessories, warranty, install charges)
  - Pricing per machine: base / dealer / customer / export / discount% / currency / tax / freight / packing / install / commissioning
- Migrate existing hardcoded `BASE_MACHINES` catalog into the DB as seed data so nothing breaks.
- Proposal wizard reads machines from DB instead of `proposal-catalog.ts`.

## Phase 2 — Auto-Select Engine + Editable Utility Formulas
- `machine_selection_rules` table: (product, capacity, automation) → machine ids + qty + accessories.
- Wizard "Auto-select" button applies rules → user reviews/edits before saving.
- `utility_formulas` table with named variables (capKg, autMul, totalHP…) and JS-safe expression per field, product-scoped overrides. Admin UI at `/settings/utilities` to add/edit/delete fields and formulas with live test panel.

## Phase 3 — Template Library + Smart Content Blocks
- `proposal_templates` (cover design, color scheme, fonts, header/footer, pricing format, scope: domestic/export/tender/etc.)
- `content_blocks` (company profile, warranty text, payment terms, delivery terms, export terms, per-product descriptions) — reusable, inserted by tag.
- Terms system already exists — extend it into this unified content library.

## Phase 4 — Block-based Proposal Editor + Live Preview
- Editor at `/proposals/:id/edit` with left panel of section blocks (Cover, Company Intro, Scope, Machine List, Utilities, Commercials, Terms, Custom text/image/table).
- Per block: show/hide, reorder (drag), edit inline, duplicate, delete. Undo/redo. Auto-save every 3s. Version history table.
- Live preview: A4 / Print / Mobile / Desktop toggle. Same renderer as PDF so preview == export.

## Phase 5 — AI Template Converter (realistic version)
- Upload PDF/DOCX/PPT/image.
- Server: extract text via `document--parse_document`, extract dominant colors + logo via image analysis, extract tables.
- Gemini maps extracted content → our template schema (cover title, sections, table columns, color scheme).
- User lands in the Phase-4 editor with a pre-filled proposal that visually approximates the upload. Editable from there.
- Honest limitation surfaced in UI: "approximate recreation, review before sending."

## Phase 6 — AI Document Intelligence + Extended Export
- Pre-export AI pass: spelling, grammar, missing fields, duplicate paragraphs, table alignment warnings.
- Export: PDF (exists), DOCX (via `docx` skill), XLSX (machine list + commercials), PPTX (cover + summary), HTML, PNG.

## Recommendation
Start with **Phase 1 only** this turn — it's the foundation and already a substantial migration + admin UI. Approve and I'll build it. Then we tackle Phase 2, etc.

Reply **"Phase 1"** to proceed, or tell me which phase to prioritize / drop.
