import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { OverlayField } from "./pdf-overlay";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

/**
 * Known label patterns → token mapping.
 * The scanner finds any text item whose visible text matches a pattern,
 * then places an overlay box immediately to the right of that label,
 * covering (whiteout) any pre-existing value in that slot.
 */
const LABEL_PATTERNS: { patterns: RegExp[]; token: string; label: string; fontSize?: number }[] = [
  { patterns: [/^customer\s*name\s*[:\-]?/i, /^client\s*name\s*[:\-]?/i, /^customer\s*[:\-]/i, /^client\s*[:\-]/i, /^m\/?s\.?\s*[:\-]?/i, /^bill\s*to\s*[:\-]?/i], token: "customer_name", label: "Customer name" },
  { patterns: [/^company\s*(name)?\s*[:\-]?/i, /^organi[sz]ation\s*[:\-]?/i], token: "company_name", label: "Company name" },
  { patterns: [/^contact\s*(person|name)?\s*[:\-]?/i, /^attn\.?\s*[:\-]?/i, /^attention\s*[:\-]?/i, /^kind\s*attn\.?\s*[:\-]?/i], token: "contact_person", label: "Contact person" },
  { patterns: [/^email\s*(id)?\s*[:\-]?/i, /^e-?mail\s*[:\-]?/i], token: "email", label: "Email" },
  { patterns: [/^mobile\s*(no\.?|number)?\s*[:\-]?/i, /^phone\s*(no\.?|number)?\s*[:\-]?/i, /^tel\.?\s*[:\-]?/i, /^cell\s*[:\-]?/i], token: "mobile", label: "Mobile" },
  { patterns: [/^address\s*[:\-]?/i, /^location\s*[:\-]?/i, /^site\s*address\s*[:\-]?/i], token: "address", label: "Address" },
  { patterns: [/^country\s*[:\-]?/i], token: "country", label: "Country" },
  { patterns: [/^(quotation|proposal|quote|ref(erence)?)\s*(no|number|#)\.?\s*[:\-]?/i, /^ref\.?\s*[:\-]?/i, /^q\.?\s*no\.?\s*[:\-]?/i], token: "proposal_number", label: "Proposal number" },
  { patterns: [/^date\s*[:\-]?/i, /^dated\s*[:\-]?/i], token: "date", label: "Date" },
  { patterns: [/^valid(ity)?\s*(up ?to|till|until)?\s*[:\-]?/i, /^valid\s*for\s*[:\-]?/i], token: "valid_until", label: "Valid until" },
  { patterns: [/^product\s*(name|type)?\s*[:\-]?/i, /^item\s*[:\-]?/i, /^plant\s*[:\-]?/i], token: "product", label: "Product" },
  { patterns: [/^capacity\s*[:\-]?/i, /^output\s*[:\-]?/i, /^production\s*[:\-]?/i], token: "capacity", label: "Capacity" },
  { patterns: [/^automation\s*[:\-]?/i, /^type\s*[:\-]?/i], token: "automation", label: "Automation" },
  { patterns: [/^material\s*(of\s*construction)?\s*[:\-]?/i, /^moc\s*[:\-]?/i], token: "material", label: "Material" },
  { patterns: [/^currency\s*[:\-]?/i], token: "currency", label: "Currency" },
  { patterns: [/^sub\s*total\s*[:\-]?/i, /^subtotal\s*[:\-]?/i], token: "subtotal", label: "Subtotal", fontSize: 11 },
  { patterns: [/^(gst|tax|vat)\s*(\(\s*\d+\s*%?\s*\))?\s*[:\-]?/i, /^tax\s*amount\s*[:\-]?/i], token: "tax", label: "Tax", fontSize: 11 },
  { patterns: [/^(grand|net)?\s*total\s*(amount)?\s*[:\-]?/i, /^total\s*[:\-]?/i, /^amount\s*[:\-]?/i], token: "grand_total", label: "Grand total", fontSize: 12 },
  { patterns: [/^prepared\s*by\s*[:\-]?/i, /^sales\s*(engineer|executive|person)?\s*[:\-]?/i, /^issued\s*by\s*[:\-]?/i], token: "sales_engineer", label: "Sales engineer" },
];

interface TextItem {
  str: string;
  x: number;      // PDF-points, bottom-left origin
  y: number;
  w: number;
  h: number;
  fontSize: number;
}

async function extractPageItems(page: pdfjsLib.PDFPageProxy): Promise<{ items: TextItem[]; widthPt: number; heightPt: number }> {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items: TextItem[] = [];
  for (const it of content.items as any[]) {
    if (!it.str || typeof it.str !== "string") continue;
    const tr = it.transform as number[]; // [a,b,c,d,e,f]
    const fontSize = Math.hypot(tr[0], tr[1]) || Math.abs(tr[3]) || 10;
    const x = tr[4];
    const y = tr[5];
    const w = it.width || fontSize * it.str.length * 0.5;
    const h = it.height || fontSize;
    items.push({ str: it.str, x, y, w, h, fontSize });
  }
  return { items, widthPt: viewport.width, heightPt: viewport.height };
}

/**
 * Best-effort automatic detection: scans every page for label-like text
 * and produces one overlay per unique token. First match wins.
 */
export async function autoDetectOverlays(pdfBytes: Uint8Array): Promise<OverlayField[]> {
  // Clone bytes because pdfjs transfers the buffer.
  const copy = new Uint8Array(pdfBytes.length);
  copy.set(pdfBytes);
  const doc = await pdfjsLib.getDocument({ data: copy }).promise;
  const out: OverlayField[] = [];
  const taken = new Set<string>();

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const { items, widthPt, heightPt } = await extractPageItems(page);

      for (const spec of LABEL_PATTERNS) {
        if (taken.has(spec.token)) continue;
        const hit = items.find(it => {
          const t = it.str.trim();
          if (!t) return false;
          return spec.patterns.some(rx => rx.test(t));
        });
        if (!hit) continue;

        // Overlay sits immediately right of the label, along the same baseline.
        // Convert pdfjs bottom-left origin → editor top-left origin used by overlays.
        const labelRight = hit.x + hit.w;
        const gap = Math.max(2, hit.fontSize * 0.3);
        const boxX = labelRight + gap;
        const boxW = Math.min(widthPt - boxX - 20, Math.max(140, spec.token === "grand_total" ? 160 : 260));
        if (boxW < 40) continue;
        const boxH = Math.max(hit.h * 1.4, hit.fontSize * 1.4);
        // y in editor coords = page height - baselineY - ascent
        const boxY = heightPt - hit.y - hit.fontSize;

        out.push({
          id: crypto.randomUUID(),
          page: p,
          token: spec.token,
          label: spec.label,
          x: Math.max(0, boxX),
          y: Math.max(0, boxY),
          width: boxW,
          height: boxH,
          fontSize: spec.fontSize ?? Math.round(hit.fontSize),
          align: spec.token === "grand_total" || spec.token === "subtotal" || spec.token === "tax" ? "right" : "left",
          color: "#111111",
          whiteout: true,
        });
        taken.add(spec.token);
      }
    }
  } finally {
    try { await (doc as any).destroy?.(); } catch { /* noop */ }
  }
  return out;
}
