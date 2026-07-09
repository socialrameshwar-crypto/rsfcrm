import { supabase } from "@/integrations/supabase/client";
import type { ProposalBlock } from "./blocks";
import type { AiProposalContent } from "./ai.functions";
import { defaultBlocks } from "./blocks";
import type { OverlayField } from "./pdf-overlay";

export const TEMPLATE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "domestic", label: "Domestic (India)" },
  { value: "export", label: "Export" },
  { value: "tender", label: "Tender" },
  { value: "custom", label: "Custom" },
] as const;

export type TemplateMode = "blocks" | "pdf_overlay";

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  scope: string;
  tags: string[];
  mode: TemplateMode;
  blocks: ProposalBlock[];
  ai_content: Partial<AiProposalContent>;
  sections: any;
  thumbnail_url: string | null;
  source_pdf_url: string | null;   // storage path
  source_pdf_pages: number | null;
  overlays: OverlayField[];
  is_default: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchTemplates(includeArchived = false): Promise<Template[]> {
  let q = (supabase as any).from("proposal_templates").select("*").order("updated_at", { ascending: false });
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Template[];
}

export async function getTemplate(id: string): Promise<Template> {
  const { data, error } = await (supabase as any).from("proposal_templates").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Template;
}

export async function createTemplate(input: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  mode?: TemplateMode;
  blocks?: ProposalBlock[];
  ai_content?: Partial<AiProposalContent>;
  source_pdf_url?: string;
  source_pdf_pages?: number;
  overlays?: OverlayField[];
}): Promise<Template> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const mode: TemplateMode = input.mode ?? "blocks";
  const payload: any = {
    user_id: userData.user.id,
    name: input.name,
    description: input.description ?? null,
    category: input.category ?? "general",
    scope: input.category ?? "general",
    tags: input.tags ?? [],
    mode,
    blocks: (mode === "blocks" ? (input.blocks ?? defaultBlocks()) : []) as any,
    ai_content: (input.ai_content ?? {}) as any,
    sections: {} as any,
    source_pdf_url: input.source_pdf_url ?? null,
    source_pdf_pages: input.source_pdf_pages ?? null,
    overlays: (input.overlays ?? []) as any,
  };
  const { data, error } = await (supabase as any).from("proposal_templates").insert(payload).select("*").single();
  if (error) throw error;
  return data as Template;
}

export async function updateTemplate(id: string, patch: Partial<Template>): Promise<void> {
  const p: any = {};
  for (const k of [
    "name", "description", "category", "tags", "blocks", "ai_content",
    "thumbnail_url", "archived", "scope", "mode", "is_default",
    "source_pdf_url", "source_pdf_pages", "overlays",
  ] as const) {
    if ((patch as any)[k] !== undefined) p[k] = (patch as any)[k];
  }
  if (p.category !== undefined && patch.scope === undefined) p.scope = p.category;
  const { error } = await (supabase as any).from("proposal_templates").update(p).eq("id", id);
  if (error) throw error;
}

/** Mark one template as the default and unset any other default (per user). */
export async function setDefaultTemplate(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { error: clearErr } = await (supabase as any)
    .from("proposal_templates")
    .update({ is_default: false })
    .eq("user_id", userData.user.id)
    .eq("is_default", true);
  if (clearErr) throw clearErr;
  const { error } = await (supabase as any)
    .from("proposal_templates")
    .update({ is_default: true })
    .eq("id", id);
  if (error) throw error;
}

export async function duplicateTemplate(id: string): Promise<Template> {
  const src = await getTemplate(id);
  return createTemplate({
    name: `${src.name} (copy)`,
    description: src.description ?? undefined,
    category: src.category,
    tags: src.tags,
    mode: src.mode,
    blocks: src.blocks,
    ai_content: src.ai_content,
    source_pdf_url: src.source_pdf_url ?? undefined,
    source_pdf_pages: src.source_pdf_pages ?? undefined,
    overlays: src.overlays ?? [],
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await (supabase as any).from("proposal_templates").delete().eq("id", id);
  if (error) throw error;
}
