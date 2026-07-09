import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------- AI analysis ----------------

const ANALYZE_INPUT = z.object({
  templateId: z.string().uuid(),
  pages: z.array(z.string().min(20)).min(1).max(8),        // data URLs (PNG)
  pageSizes: z.array(z.object({ width: z.number(), height: z.number() })).min(1),
});

const KNOWN_TOKENS = [
  "customer_name","company_name","customer_address","contact_person",
  "proposal_number","quotation_number","date","product_name","capacity",
  "subtotal","tax","grand_total","currency","payment_terms","delivery_time","signature_name",
];

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in AI response");
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Analyze a template PDF (given rasterized pages) with Gemini vision.
 * Returns detected fields + line-items region in PDF-point coordinates.
 */
export const analyzeTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ANALYZE_INPUT.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { pages, pageSizes, templateId } = data;

    const systemPrompt = `You are an expert quotation/proposal document analyzer.
You will be shown one or more pages of a business quotation template as images.
Detect two things and return STRICT JSON only:

1) fields[]: replaceable text fields (customer name, company, dates, prices, totals, addresses, contact person, terms values, etc). For EACH field, return:
   - page (1-based index of the page image you saw it on)
   - token (one of: ${KNOWN_TOKENS.join(", ")}, or "custom" if it doesn't match)
   - label (short human label describing the field)
   - x, y, w, h in NORMALIZED page coordinates (0..1), where (0,0) is the TOP-LEFT of the page and (1,1) is bottom-right. The box should tightly cover the CURRENT sample value (not the label next to it).
   - fontSize in points (approximate)
   - align ("left" | "center" | "right")
   - color (hex, e.g. "#000000")
   - confidence (0..1)
   - needs_review (true if confidence < 0.75 or the field is ambiguous)

2) line_items (nullable object): the main machine/product/quantity/price table.
   - page (1-based)
   - x, y, width, height (NORMALIZED 0..1) covering the DATA rows region ONLY (exclude the header row and totals row)
   - header_y (NORMALIZED 0..1) — y position where the header row sits, or null
   - row_height (NORMALIZED, e.g. 0.03 for a ~2% page height per row)
   - columns[]: [{ key, label, x, width, align, fontSize }] where key is one of "sr_no","machine","description","qty","unit_price","amount" (or a custom string), x and width are NORMALIZED, align is left|center|right.

Return ONLY JSON with keys "fields" and "line_items". No prose. No markdown. No trailing commas.
Limit to at most 20 fields per page. Skip decorative text, headers, footers, and static labels.`;

    const content: any[] = [
      { type: "text", text: `Template has ${pages.length} page(s). Analyze each and return one combined JSON.` },
    ];
    pages.forEach((p, idx) => {
      content.push({ type: "text", text: `--- Page ${idx + 1} ---` });
      content.push({ type: "image_url", image_url: { url: p } });
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("AI rate limit — please retry in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
      throw new Error(`AI error ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const raw: string = json.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try { parsed = extractJson(raw); }
    catch (e: any) { throw new Error("AI returned unparseable output: " + (e?.message ?? "")); }

    // Convert normalized coords -> PDF points.
    const denorm = (n: number, dim: number) => Math.max(0, Math.min(dim, Math.round(n * dim * 100) / 100));
    const fieldsIn: any[] = Array.isArray(parsed.fields) ? parsed.fields : [];
    const fields = fieldsIn.slice(0, 200).map((f, i) => {
      const p = Math.max(1, Math.min(pageSizes.length, Number(f.page) || 1));
      const sz = pageSizes[p - 1];
      return {
        id: `f${i}_${Math.random().toString(36).slice(2, 8)}`,
        page: p,
        token: KNOWN_TOKENS.includes(f.token) ? f.token : "custom",
        label: String(f.label ?? f.token ?? "Field").slice(0, 80),
        x: denorm(Number(f.x) || 0, sz.width),
        y: denorm(Number(f.y) || 0, sz.height),
        w: denorm(Number(f.w) || 0.15, sz.width),
        h: denorm(Number(f.h) || 0.02, sz.height),
        fontSize: Number(f.fontSize) || 10,
        align: ["left","center","right"].includes(f.align) ? f.align : "left",
        color: typeof f.color === "string" ? f.color : "#111111",
        whiteout: true,
        confidence: typeof f.confidence === "number" ? f.confidence : 0.6,
        needs_review: Boolean(f.needs_review) || (Number(f.confidence) || 0) < 0.75,
      };
    });

    let line_items: any = null;
    const li = parsed.line_items;
    if (li && typeof li === "object" && Array.isArray(li.columns)) {
      const p = Math.max(1, Math.min(pageSizes.length, Number(li.page) || 1));
      const sz = pageSizes[p - 1];
      line_items = {
        page: p,
        x: denorm(Number(li.x) || 0, sz.width),
        y: denorm(Number(li.y) || 0, sz.height),
        width: denorm(Number(li.width) || 1, sz.width),
        height: denorm(Number(li.height) || 0.3, sz.height),
        header_y: li.header_y != null ? denorm(Number(li.header_y), sz.height) : undefined,
        row_height: denorm(Number(li.row_height) || 0.025, sz.height),
        columns: li.columns.slice(0, 12).map((c: any) => ({
          key: String(c.key ?? "col").slice(0, 32),
          label: String(c.label ?? c.key ?? "Col").slice(0, 40),
          x: denorm(Number(c.x) || 0, sz.width),
          width: denorm(Number(c.width) || 0.1, sz.width),
          align: ["left","center","right"].includes(c.align) ? c.align : "left",
          fontSize: Number(c.fontSize) || 9,
        })),
        clear_below_header: true,
      };
    }

    const analysis = {
      pageSizes,
      fields,
      line_items,
      detected_at: new Date().toISOString(),
    };

    const { error } = await context.supabase
      .from("proposal_templates")
      .update({
        analysis: analysis as any,
        source_pdf_pages: pageSizes.length,
        status: "active",
      })
      .eq("id", templateId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return { analysis };
  });

// ---------------- Generate proposal PDF from template ----------------

const GENERATE_INPUT = z.object({
  proposalId: z.string().uuid(),
  templateId: z.string().uuid(),
});

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 0.06, g: 0.06, b: 0.06 };
  const v = parseInt(m[1], 16);
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}

function currencyPrefix(currency: string): string {
  // Avoid glyphs outside WinAnsi (e.g. ₹) which pdf-lib StandardFonts can't encode.
  const map: Record<string, string> = { INR: "Rs.", USD: "$", EUR: "EUR ", GBP: "GBP ", JPY: "JPY ", AUD: "A$", CAD: "C$" };
  return map[currency?.toUpperCase()] ?? `${currency} `;
}

function fmtMoney(n: number, currency: string): string {
  if (!isFinite(n)) return "";
  const rounded = Math.round(n).toLocaleString("en-IN");
  return `${currencyPrefix(currency)}${rounded}`;
}

// Replace characters that WinAnsi (pdf-lib StandardFonts) cannot encode.
function sanitizeWinAnsi(s: string): string {
  if (!s) return "";
  return s
    .replace(/\u20B9/g, "Rs.")   // ₹
    .replace(/\u20AC/g, "EUR ")  // €  (actually in WinAnsi, but safe)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    // Drop any remaining non-WinAnsi (outside basic latin + latin-1 supplement) chars
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}


function tokenValue(token: string, ctx: {
  proposal: any; customer: any;
}): string {
  const p = ctx.proposal ?? {};
  const c = ctx.customer ?? {};
  const commercials = p.commercials ?? {};
  const currency = p.currency ?? "INR";
  switch (token) {
    case "customer_name": return c.customer_name ?? c.company_name ?? "";
    case "company_name": return c.company_name ?? "";
    case "customer_address": return [c.city, c.country].filter(Boolean).join(", ");
    case "contact_person": return c.contact_person ?? "";
    case "proposal_number":
    case "quotation_number": return p.proposal_number ?? "";
    case "date": return new Date(p.created_at ?? Date.now()).toLocaleDateString();
    case "product_name": return p.title ?? p.product_type ?? "";
    case "capacity": return p.capacity ?? "";
    case "subtotal": return fmtMoney(commercials.subtotal ?? 0, currency);
    case "tax": return fmtMoney(commercials.tax ?? 0, currency);
    case "grand_total": return fmtMoney(commercials.grand_total ?? p.total_value ?? 0, currency);
    case "currency": return currency;
    case "payment_terms": return p.payment_terms ?? "50% advance, balance before dispatch";
    case "delivery_time": return p.delivery_time ?? "8-10 weeks from PO";
    case "signature_name": return p.sales_engineer ?? "";
    default: return "";
  }
}

export const generateProposalPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GENERATE_INPUT.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load template
    const { data: tmpl, error: te } = await supabase
      .from("proposal_templates").select("*").eq("id", data.templateId).single();
    if (te || !tmpl) throw new Error("Template not found");

    // Load proposal + customer
    const { data: prop, error: pe } = await supabase
      .from("proposals").select("*, customers(*)").eq("id", data.proposalId).single();
    if (pe || !prop) throw new Error("Proposal not found");

    // Load source PDF from storage (owner path)
    const srcPath = `${userId}/${tmpl.id}/source.pdf`;
    const dl = await supabase.storage.from("template-pdfs").download(srcPath);
    if (dl.error || !dl.data) throw new Error("Template PDF not found: " + (dl.error?.message ?? "missing"));
    const srcBytes = new Uint8Array(await dl.data.arrayBuffer());

    // Merge analysis + overrides
    const baseAnalysis = (tmpl as any).analysis ?? { fields: [], pageSizes: [] };
    const overrides = (tmpl as any).field_overrides ?? {};
    const analysis = {
      pageSizes: overrides.pageSizes ?? baseAnalysis.pageSizes ?? [],
      fields: overrides.fields ?? baseAnalysis.fields ?? [],
      line_items: overrides.line_items ?? baseAnalysis.line_items ?? null,
    };

    // pdf-lib
    const { PDFDocument, StandardFonts, rgb } = await import("@/lib/pdf-lib.server");
    const doc = await PDFDocument.load(srcBytes);
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();

    const drawText = (pageIdx: number, text: string, opts: {
      x: number; y: number; w: number; h: number; size: number; align: "left"|"center"|"right";
      color: string; whiteout: boolean; bold?: boolean;
    }) => {
      if (pageIdx < 0 || pageIdx >= pages.length) return;
      const page = pages[pageIdx];
      const ph = page.getHeight();
      const font = opts.bold ? helvBold : helv;
      // Whiteout the sample area (draw white rect). y in top-left space -> convert.
      if (opts.whiteout) {
        page.drawRectangle({
          x: opts.x - 1, y: ph - opts.y - opts.h - 1,
          width: opts.w + 2, height: opts.h + 2,
          color: rgb(1, 1, 1),
        });
      }
      const safe = sanitizeWinAnsi(text);
      if (!safe) return;
      const size = Math.max(6, Math.min(48, opts.size));
      const tw = font.widthOfTextAtSize(safe, size);
      let tx = opts.x;
      if (opts.align === "center") tx = opts.x + (opts.w - tw) / 2;
      else if (opts.align === "right") tx = opts.x + opts.w - tw;
      const ascent = font.heightAtSize(size, { descender: false });
      const ty = ph - opts.y - opts.h + Math.max(0, (opts.h - ascent) / 2);
      const c = hexToRgb(opts.color);
      page.drawText(safe, { x: tx, y: ty, size, font, color: rgb(c.r, c.g, c.b) });
    };

    // Stamp fields
    const ctx = { proposal: prop, customer: (prop as any).customers };
    for (const f of analysis.fields ?? []) {
      if (f.token === "custom") continue;
      const val = tokenValue(f.token, ctx);
      drawText(f.page - 1, val, {
        x: f.x, y: f.y, w: f.w, h: f.h,
        size: f.fontSize, align: f.align, color: f.color, whiteout: f.whiteout !== false,
      });
    }

    // Line items
    const li = analysis.line_items;
    if (li && Array.isArray(li.columns) && li.columns.length) {
      const machines: any[] = Array.isArray((prop as any).machines) ? (prop as any).machines : [];
      const currency = (prop as any).currency ?? "INR";
      const pageIdx = Math.max(0, li.page - 1);
      const startPage = pages[pageIdx];
      if (startPage) {
        // Clear the data-row region on the original page
        if (li.clear_below_header !== false) {
          startPage.drawRectangle({
            x: li.x - 1,
            y: startPage.getHeight() - li.y - li.height - 1,
            width: li.width + 2, height: li.height + 2,
            color: rgb(1, 1, 1),
          });
        }

        const rowH = Math.max(10, li.row_height);
        const rowsPerPage = Math.max(1, Math.floor(li.height / rowH));

        // Prepare rows
        const rows = machines.map((m, i) => {
          const qty = Number(m.quantity ?? 1);
          const unit = Number(m.unit_price ?? 0);
          return {
            sr_no: String(i + 1),
            machine: String(m.name ?? m.machine ?? ""),
            description: String(m.description ?? m.specifications ?? ""),
            qty: String(qty),
            unit_price: fmtMoney(unit, currency),
            amount: fmtMoney(qty * unit, currency),
          } as Record<string, string>;
        });

        const drawRowOn = (page: any, region: typeof li, r: Record<string, string>, rowY: number) => {
          const ph = page.getHeight();
          for (const col of region.columns) {
            const text = sanitizeWinAnsi(r[col.key] ?? "");
            if (!text) continue;
            const size = col.fontSize ?? 9;
            const font = helv;
            const tw = font.widthOfTextAtSize(text, size);
            let tx = col.x + 2;
            if (col.align === "center") tx = col.x + (col.width - tw) / 2;
            else if (col.align === "right") tx = col.x + col.width - tw - 2;
            const ty = ph - rowY - rowH + Math.max(0, (rowH - font.heightAtSize(size, { descender: false })) / 2);
            page.drawText(text, { x: tx, y: ty, size, font, color: rgb(0.06, 0.06, 0.06) });
          }
        };

        let rowIdx = 0;
        // First: fill original page
        let currentPage = startPage;
        let currentPageIdx = pageIdx;
        let currentRegion = li;
        while (rowIdx < rows.length) {
          const rowsThisPage = Math.min(rowsPerPage, rows.length - rowIdx);
          for (let k = 0; k < rowsThisPage; k++) {
            const rowY = currentRegion.y + k * rowH;
            drawRowOn(currentPage, currentRegion, rows[rowIdx + k], rowY);
          }
          rowIdx += rowsThisPage;

          if (rowIdx < rows.length) {
            // Append a copy of the original items page for continuation
            const [copied] = await doc.copyPages(doc, [pageIdx]);
            // Insert AFTER current page position
            doc.insertPage(currentPageIdx + 1, copied);
            currentPageIdx += 1;
            currentPage = doc.getPage(currentPageIdx);
            // Whiteout data region on the copy
            currentPage.drawRectangle({
              x: li.x - 1,
              y: currentPage.getHeight() - li.y - li.height - 1,
              width: li.width + 2, height: li.height + 2,
              color: rgb(1, 1, 1),
            });
            currentRegion = li;
          }
        }
      }
    }

    const outBytes = await doc.save();
    // Upload to proposal-pdfs bucket
    const outPath = `${userId}/${data.proposalId}/${Date.now()}.pdf`;
    const upload = await supabase.storage.from("proposal-pdfs").upload(outPath, outBytes, {
      upsert: true, contentType: "application/pdf",
    });
    if (upload.error) throw new Error("Upload failed: " + upload.error.message);

    // Save reference on proposal
    await supabase.from("proposals")
      .update({ generated_pdf_path: outPath, template_id: data.templateId } as any)
      .eq("id", data.proposalId);

    const signed = await supabase.storage.from("proposal-pdfs").createSignedUrl(outPath, 3600);
    return { path: outPath, url: signed.data?.signedUrl ?? null };
  });
