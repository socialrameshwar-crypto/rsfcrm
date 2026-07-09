import type { AiProposalContent } from "./ai.functions";

export type BlockType =
  | "cover"
  | "ai_section"
  | "ai_bullets"
  | "machines"
  | "utilities"
  | "commercials"
  | "terms"
  | "text"
  | "image"
  | "table"
  | "spacer";

export interface ProposalBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  // ai_section / ai_bullets: aiKey references a field in AiProposalContent
  aiKey?: keyof AiProposalContent;
  // text/image/table props
  heading?: string;
  body?: string;
  imageUrl?: string;
  caption?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  height?: number; // spacer
}

export const BLOCK_LABEL: Record<BlockType, string> = {
  cover: "Cover Page",
  ai_section: "Text Section",
  ai_bullets: "Bulleted Section",
  machines: "Machine List",
  utilities: "Utility Requirements",
  commercials: "Commercial Table",
  terms: "Terms & Conditions",
  text: "Custom Text",
  image: "Custom Image",
  table: "Custom Table",
  spacer: "Spacer",
};

export const AI_SECTION_KEYS: { key: keyof AiProposalContent; label: string; bullets?: boolean }[] = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "company_introduction", label: "Company Introduction" },
  { key: "project_overview", label: "Project Overview" },
  { key: "scope_of_supply", label: "Scope of Supply" },
  { key: "manufacturing_process", label: "Manufacturing Process" },
  { key: "advantages", label: "Advantages", bullets: true },
  { key: "safety_features", label: "Safety Features", bullets: true },
  { key: "quality_assurance", label: "Quality Assurance" },
  { key: "installation", label: "Installation & Commissioning" },
  { key: "warranty", label: "Warranty" },
  { key: "after_sales", label: "After Sales Support" },
  { key: "value_proposition", label: "Why Us" },
];

let counter = 0;
export function newBlockId(): string {
  counter += 1;
  return `blk_${Date.now().toString(36)}_${counter}`;
}

export function defaultBlocks(): ProposalBlock[] {
  const out: ProposalBlock[] = [{ id: newBlockId(), type: "cover", visible: true }];
  for (const s of AI_SECTION_KEYS) {
    out.push({
      id: newBlockId(),
      type: s.bullets ? "ai_bullets" : "ai_section",
      visible: true,
      aiKey: s.key,
      heading: s.label,
    });
  }
  out.push({ id: newBlockId(), type: "machines", visible: true, heading: "Machine List" });
  out.push({ id: newBlockId(), type: "utilities", visible: true, heading: "Utility Requirements" });
  out.push({ id: newBlockId(), type: "commercials", visible: true, heading: "Commercial Quotation" });
  out.push({ id: newBlockId(), type: "terms", visible: true, heading: "Terms & Conditions" });
  return out;
}

export function makeBlock(type: BlockType): ProposalBlock {
  const base: ProposalBlock = { id: newBlockId(), type, visible: true };
  if (type === "text") return { ...base, heading: "New Section", body: "" };
  if (type === "image") return { ...base, imageUrl: "", caption: "" };
  if (type === "table") return { ...base, heading: "New Table", tableHeaders: ["Column A", "Column B"], tableRows: [["", ""]] };
  if (type === "spacer") return { ...base, height: 24 };
  if (type === "ai_section" || type === "ai_bullets") return { ...base, aiKey: "executive_summary", heading: "Section" };
  return base;
}
