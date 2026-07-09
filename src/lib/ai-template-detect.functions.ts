import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PageInput = z.object({
  page: z.number().int().min(1),
  widthPt: z.number().positive(),
  heightPt: z.number().positive(),
  /** data URL, e.g. "data:image/png;base64,..." — client-rendered PDF page image */
  image: z.string().min(20),
});

const Input = z.object({
  pages: z.array(PageInput).min(1).max(6),
});

/** Same shape as OverlayField in @/lib/pdf-overlay. Coordinates are PDF points, top-left origin. */
export interface AiDetectedField {
  page: number;
  token: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: string;
  whiteout: boolean;
  confidence: number; // 0..1
  needs_review: boolean;
}

const KNOWN_TOKENS = [
  "customer_name", "company_name", "contact_person", "email", "mobile", "address", "country",
  "proposal_number", "date", "valid_until",
  "product", "capacity", "automation", "material",
  "currency", "subtotal", "tax", "grand_total",
  "sales_engineer",
  "custom_1", "custom_2", "custom_3",
];

const SYSTEM = `You are a document-layout analyzer that finds DYNAMIC FIELDS in a quotation/proposal template page image.
DYNAMIC FIELDS are values that change per customer/proposal — customer name, company, address, dates, quotation numbers, product name, capacity, prices, totals, salesperson, etc.
DO NOT return static labels ("Customer Name:", "Total:"), headers, footers, company boilerplate, logos, or table column titles.
DO NOT return values inside long paragraphs (T&C, descriptions).
For each detected field return a bounding box in NORMALIZED coordinates (0..1) relative to the page image, where (0,0) is top-left and (1,1) is bottom-right.
The box must cover ONLY the value area (the empty slot or the existing sample value), not the label itself.

Respond ONLY with a JSON object of this exact shape (no prose, no markdown):
{
  "fields": [
    {
      "page": 1,
      "token": "<one of: ${KNOWN_TOKENS.join(", ")}, or a lowercase_snake_case token if truly custom>",
      "label": "<human-readable label>",
      "bbox": { "x": 0.12, "y": 0.08, "w": 0.35, "h": 0.03 },
      "font_size_pt": 11,
      "align": "left" | "center" | "right",
      "confidence": 0.0-1.0,
      "needs_review": true|false
    }
  ]
}
Rules:
- Only include fields you are reasonably confident about. Set needs_review=true for anything below 0.75 confidence.
- Prefer the standardized token list above whenever possible.
- Font size should be a plausible integer in points (8-16).
- Align "right" for money/totals, otherwise "left".
- Never return more than ~15 fields per page. Skip obvious static content.`;

export const detectTemplateFields = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ fields: AiDetectedField[]; warning?: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { fields: [], warning: "AI unavailable (missing key). Using rule-based detection only." };

    const results: AiDetectedField[] = [];
    const warnings: string[] = [];

    for (const p of data.pages) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages: [
              { role: "system", content: SYSTEM },
              {
                role: "user",
                content: [
                  { type: "text", text: `Page ${p.page}. Analyze the image and return the JSON as specified.` },
                  { type: "image_url", image_url: { url: p.image } },
                ],
              },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          console.error("gemini detect error", res.status, t.slice(0, 500));
          warnings.push(`Page ${p.page}: AI error ${res.status}`);
          continue;
        }
        const json = await res.json();
        const raw = json?.choices?.[0]?.message?.content ?? "{}";
        let parsed: any;
        try { parsed = JSON.parse(raw); } catch { parsed = {}; }
        const arr = Array.isArray(parsed?.fields) ? parsed.fields : [];
        for (const f of arr) {
          const bx = Number(f?.bbox?.x); const by = Number(f?.bbox?.y);
          const bw = Number(f?.bbox?.w); const bh = Number(f?.bbox?.h);
          if (![bx, by, bw, bh].every(n => Number.isFinite(n))) continue;
          if (bw <= 0 || bh <= 0 || bw > 1 || bh > 1) continue;
          const token = String(f?.token || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40) || "field";
          const label = String(f?.label || token).slice(0, 60);
          const align: "left" | "center" | "right" =
            f?.align === "right" ? "right" : f?.align === "center" ? "center" : "left";
          const confidence = Math.max(0, Math.min(1, Number(f?.confidence ?? 0.7)));
          const needs_review = !!f?.needs_review || confidence < 0.75;
          const fs = Math.max(7, Math.min(18, Math.round(Number(f?.font_size_pt ?? 11))));

          // normalized → PDF points, top-left origin (matches OverlayField)
          const x = bx * p.widthPt;
          const y = by * p.heightPt;
          const width = bw * p.widthPt;
          const height = bh * p.heightPt;

          results.push({
            page: p.page,
            token,
            label,
            x, y, width, height,
            fontSize: fs,
            align,
            color: "#111111",
            whiteout: true,
            confidence,
            needs_review,
          });
        }
      } catch (e: any) {
        console.error("gemini detect exception", e);
        warnings.push(`Page ${p.page}: ${e?.message || "failed"}`);
      }
    }

    return { fields: results, warning: warnings.join(" · ") || undefined };
  });
