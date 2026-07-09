import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProposalBlock, BlockType } from "./blocks";
import { newBlockId } from "./blocks";
import type { AiProposalContent } from "./ai.functions";

const Input = z.object({
  text: z.string().optional().nullable(),
  file: z
    .object({
      name: z.string(),
      mimeType: z.string(),
      dataBase64: z.string(), // raw base64 (no data: prefix)
    })
    .optional()
    .nullable(),
});

const AI_KEYS = new Set([
  "executive_summary",
  "company_introduction",
  "project_overview",
  "scope_of_supply",
  "manufacturing_process",
  "advantages",
  "safety_features",
  "quality_assurance",
  "installation",
  "warranty",
  "after_sales",
  "value_proposition",
]);

const BLOCK_TYPES = new Set<BlockType>([
  "cover", "ai_section", "ai_bullets", "machines", "utilities",
  "commercials", "terms", "text", "image", "table", "spacer",
]);

export type ImportResult = {
  blocks: ProposalBlock[];
  ai: Partial<AiProposalContent>;
  notes: string;
};

function coerceBlocks(raw: any): ProposalBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposalBlock[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const type = r.type as BlockType;
    if (!BLOCK_TYPES.has(type)) continue;
    const b: ProposalBlock = {
      id: newBlockId(),
      type,
      visible: true,
      heading: typeof r.heading === "string" ? r.heading : undefined,
    };
    if (type === "text" && typeof r.body === "string") b.body = r.body;
    if ((type === "ai_section" || type === "ai_bullets") && typeof r.aiKey === "string" && AI_KEYS.has(r.aiKey)) {
      b.aiKey = r.aiKey as keyof AiProposalContent;
    }
    if (type === "table") {
      if (Array.isArray(r.tableHeaders)) b.tableHeaders = r.tableHeaders.map(String);
      if (Array.isArray(r.tableRows)) b.tableRows = r.tableRows.map((row: any) => Array.isArray(row) ? row.map(String) : []);
    }
    if (type === "spacer") b.height = Number(r.height) || 24;
    if (type === "image" && typeof r.caption === "string") b.caption = r.caption;
    out.push(b);
  }
  return out;
}

function coerceAi(raw: any): Partial<AiProposalContent> {
  if (!raw || typeof raw !== "object") return {};
  const out: any = {};
  for (const k of AI_KEYS) {
    if (raw[k] == null) continue;
    if (k === "advantages" || k === "safety_features") {
      if (Array.isArray(raw[k])) out[k] = raw[k].map(String);
    } else if (typeof raw[k] === "string") {
      out[k] = raw[k];
    }
  }
  return out;
}

export const importTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<ImportResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { blocks: [], ai: {}, notes: "AI service unavailable — LOVABLE_API_KEY missing." };
    }
    if (!data.text && !data.file) {
      return { blocks: [], ai: {}, notes: "No content provided." };
    }

    const systemPrompt = `You convert an existing proposal/quotation document into a structured block layout for the Rameshwar Steel Fab proposal editor.

Return ONLY a JSON object of this shape (no prose, no markdown):
{
  "blocks": [
    { "type": "<BlockType>", "heading"?: string, "body"?: string, "aiKey"?: string,
      "tableHeaders"?: string[], "tableRows"?: string[][], "caption"?: string, "height"?: number }
  ],
  "ai": {
    "executive_summary"?: string, "company_introduction"?: string, "project_overview"?: string,
    "scope_of_supply"?: string, "manufacturing_process"?: string,
    "advantages"?: string[], "safety_features"?: string[],
    "quality_assurance"?: string, "installation"?: string, "warranty"?: string,
    "after_sales"?: string, "value_proposition"?: string
  },
  "notes": string
}

BlockType is one of: "cover" | "ai_section" | "ai_bullets" | "machines" | "utilities" | "commercials" | "terms" | "text" | "image" | "table" | "spacer".

Rules:
- Start with a "cover" block.
- Map narrative sections that fit standard proposal topics to "ai_section" (or "ai_bullets" for bullet lists) and set "aiKey" to the matching key from the ai object above. Also populate the corresponding field in "ai" with the extracted content.
- For any narrative content that doesn't fit a standard key, emit a "text" block with heading + body.
- Extract tabular data into "table" blocks with tableHeaders + tableRows.
- Use "machines" for the machine/equipment list section, "utilities" for utility requirements, "commercials" for price/commercial tables, "terms" for terms & conditions — these render from proposal data, so include them as anchors without body.
- Do not invent data. If a section isn't in the source, omit it.
- Keep language professional, in English.
- "notes" should briefly summarise what was extracted / skipped.`;

    const userContent: any[] = [];
    if (data.text && data.text.trim()) {
      userContent.push({ type: "text", text: `Source document text:\n\n${data.text.slice(0, 60000)}` });
    }
    if (data.file) {
      const mime = data.file.mimeType || "application/octet-stream";
      if (mime.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${data.file.dataBase64}` },
        });
      } else {
        userContent.push({
          type: "file",
          file: {
            filename: data.file.name || "source",
            file_data: `data:${mime};base64,${data.file.dataBase64}`,
          },
        });
      }
      userContent.push({ type: "text", text: "Convert the attached document into the block structure defined in the system prompt." });
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("template-import gateway error", res.status, errText);
        if (res.status === 429) return { blocks: [], ai: {}, notes: "Rate limit exceeded. Try again shortly." };
        if (res.status === 402) return { blocks: [], ai: {}, notes: "AI credits exhausted. Add credits and retry." };
        return { blocks: [], ai: {}, notes: `AI conversion failed (${res.status}).` };
      }
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
      return {
        blocks: coerceBlocks(parsed.blocks),
        ai: coerceAi(parsed.ai),
        notes: typeof parsed.notes === "string" ? parsed.notes : "Imported.",
      };
    } catch (e: any) {
      console.error("template-import failed", e);
      return { blocks: [], ai: {}, notes: `Import failed: ${e?.message || "unknown error"}` };
    }
  });
