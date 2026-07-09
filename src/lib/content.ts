import { supabase } from "@/integrations/supabase/client";
import type { AiProposalContent } from "./ai.functions";

export const BLOCK_CATEGORIES = [
  { value: "company", label: "Company profile" },
  { value: "warranty", label: "Warranty" },
  { value: "payment", label: "Payment terms" },
  { value: "delivery", label: "Delivery terms" },
  { value: "export", label: "Export terms" },
  { value: "safety", label: "Safety" },
  { value: "quality", label: "Quality" },
  { value: "installation", label: "Installation" },
  { value: "product", label: "Product description" },
  { value: "custom", label: "Custom" },
] as const;
export type BlockCategory = typeof BLOCK_CATEGORIES[number]["value"];

export interface ContentBlock {
  id: string;
  user_id: string;
  name: string;
  category: BlockCategory | string;
  body: string;
  tags: string[];
  product_slug: string | null;
  sort_order: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export const TEMPLATE_SCOPES = [
  { value: "domestic", label: "Domestic (India)" },
  { value: "export", label: "Export" },
  { value: "tender", label: "Tender" },
  { value: "custom", label: "Custom" },
] as const;
export type TemplateScope = typeof TEMPLATE_SCOPES[number]["value"];

// Section keys — align with AiProposalContent
export const AI_SECTIONS: { key: keyof AiProposalContent; label: string }[] = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "company_introduction", label: "Company Introduction" },
  { key: "project_overview", label: "Project Overview" },
  { key: "scope_of_supply", label: "Scope of Supply" },
  { key: "manufacturing_process", label: "Manufacturing Process" },
  { key: "quality_assurance", label: "Quality Assurance" },
  { key: "installation", label: "Installation & Commissioning" },
  { key: "warranty", label: "Warranty" },
  { key: "after_sales", label: "After Sales Support" },
  { key: "value_proposition", label: "Why us" },
];

export interface ProposalTemplate {
  id: string;
  user_id: string;
  name: string;
  scope: TemplateScope | string;
  description: string | null;
  sections: Partial<Record<keyof AiProposalContent, string | string[]>>;
  is_default: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchBlocks(): Promise<ContentBlock[]> {
  const { data, error } = await (supabase as any)
    .from("content_blocks")
    .select("*")
    .eq("archived", false)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentBlock[];
}

export async function fetchProposalTemplates(): Promise<ProposalTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("proposal_templates")
    .select("*")
    .eq("archived", false)
    .order("scope", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProposalTemplate[];
}
