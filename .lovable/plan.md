# AI Template Manager — Build Plan

## Architecture

**Rendering model:** Overlay on original PDF (chosen). AI detects field positions on the uploaded PDF; generation stamps customer data onto a copy. For the machine/line-item table, AI detects the table's bounding region and column layout; the generator whites out template sample rows and redraws real rows in the same style — adding continuation pages that reuse the template's last page (or a designated "items page") when rows overflow.

**Stack:** PDF rendering with `pdfjs-dist` (thumbnails + page images for AI), PDF stamping with `pdf-lib`. AI vision via Lovable AI Gateway (`google/gemini-3.5-flash`). Storage in existing `template-pdfs` bucket.

## Database

Extend existing `proposal_templates` table:
- `category text`
- `description text`
- `version int default 1`
- `is_default bool default false`
- `status text default 'active'` (active | archived)
- `thumbnail_path text` (storage path to first-page PNG)
- `page_count int`
- `analysis jsonb` — AI output: fields[], line_items_region, page dimensions, detected style tokens
- `field_overrides jsonb` — user corrections from review screen

Add `template_thumbnails` storage bucket (public).

## Sidebar module: Template Manager

Route tree:
- `/templates` — Library grid: thumbnail cards with name, category, version, default badge, status. Search / filter by category / sort by updated. Actions: Duplicate, Rename, Set Default, Archive, Delete.
- `/templates/new` — 3-step wizard:
  1. Upload PDF (drag/drop)
  2. AI analyzes (progress) — extracts pages as images, calls Gemini vision with schema prompt returning fields (token, label, page, x/y/w/h in PDF points, font size guess, alignment) + line-items region (page, x/y/w/h, columns with x-position and header label)
  3. Review screen — list of detected fields with confidence badges; user can rename tokens, toggle whiteout, adjust the line-items column mapping. No drag-drop editor — table-based review only.
- `/templates/:id` — Preview (rendered PDF), metadata, actions.

## Proposal generation flow

Update `/proposals/new`:
- Add "Choose Template" step showing template cards (thumbnail, name, page count, last updated). Default template preselected.
- On generate: call `generateProposalPdf` server fn → returns signed URL to generated PDF stored in `proposal-pdfs` bucket.
- Preview screen: embed generated PDF in iframe with zoom/page nav; Approve → attach to proposal record, Cancel → back to edit.

## Server functions (`src/lib/templates.functions.ts`)

- `analyzeTemplatePdf({ templateId })` — pulls PDF from storage, renders pages to PNG data URLs, sends to Gemini with strict JSON schema, saves `analysis` + generates/stores thumbnail.
- `saveTemplateReview({ templateId, fields, lineItemsRegion })` — persists user corrections.
- `generateProposalPdf({ proposalId, templateId })` — loads original PDF via pdf-lib, whites out detected field regions, draws field values (font from analysis, matching size/color/align), whites out sample table rows, draws real rows column-by-column, adds continuation pages when overflowing. Uploads to `proposal-pdfs` bucket, returns signed URL.
- `listTemplates`, `renameTemplate`, `setDefaultTemplate`, `duplicateTemplate`, `archiveTemplate`, `deleteTemplate`.

## Field token vocabulary

Fixed set the AI must map to: `customer_name`, `company_name`, `customer_address`, `contact_person`, `proposal_number`, `quotation_number`, `date`, `product_name`, `capacity`, `subtotal`, `tax`, `grand_total`, `currency`, `payment_terms`, `delivery_time`, `signature_name`. Unknown detections shown in review as "custom" and can be renamed or discarded.

## Line-item table handling

AI returns:
```text
line_items_region: {
  page: 2,
  x, y, width, height,          // PDF points
  header_y,                     // where headers live (kept as-is)
  row_height: 22,
  columns: [
    { key: "sr_no",    x, width, align: "center" },
    { key: "machine",  x, width, align: "left" },
    { key: "qty",      x, width, align: "right" },
    { key: "unit_price", x, width, align: "right" },
    { key: "amount",   x, width, align: "right" },
  ]
}
```

Generator computes `rows_per_page = floor(height / row_height)`. Whites out template sample rows below header. Fills real rows. If overflow, appends a copy of the last template page (or a chosen "items continuation page") and continues. Totals row rendered after last data row.

## Removed / not included

- No drag-drop editor
- No Word/.docx upload (PDF only, confirmed)
- No manual layout tools

## Files to create

- `src/routes/_authenticated/templates.index.tsx`
- `src/routes/_authenticated/templates.new.tsx`
- `src/routes/_authenticated/templates.$id.tsx`
- `src/lib/templates.functions.ts` (server fns)
- `src/lib/pdf-render.ts` (client-side pdfjs thumbnails)
- `src/lib/pdf-overlay.server.ts` (pdf-lib stamping)
- `src/lib/ai-template-detect.server.ts` (Gemini call + schema)
- `src/components/templates/TemplateCard.tsx`
- `src/components/templates/FieldReviewTable.tsx`
- `src/components/templates/TemplatePreview.tsx`
- Migration: extend `proposal_templates`, create `template-thumbnails` and `proposal-pdfs` buckets

## Files to edit

- `src/routes/_authenticated/route.tsx` — add sidebar link
- `src/routes/_authenticated/proposals.new.tsx` — add template picker + generate step
- `src/routes/_authenticated/proposals.$id.tsx` — show generated PDF, regenerate button

## Approach notes

- `pdfjs-dist` runs client-side for thumbnails (worker in `<ClientOnly>`), and inside server fn via Node build for rasterizing pages to send to Gemini.
- `pdf-lib` handles stamping; fonts embedded (Helvetica default; matching custom fonts is best-effort — AI reports family/size and we fall back to Helvetica/Times when the font isn't embedded).
- All AI calls server-side using `LOVABLE_API_KEY` (already provisioned).
- Visual fidelity: ~98% for fixed fields, ~92% for line-item tables because fonts aren't extracted from the PDF.

Approve to build, or tell me what to change.
