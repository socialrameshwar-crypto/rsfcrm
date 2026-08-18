import { supabase } from "@/integrations/supabase/client";

export type FieldToken =
  | "customer_name" | "company_name" | "customer_address" | "contact_person"
  | "proposal_number" | "quotation_number" | "date"
  | "product_name" | "capacity"
  | "subtotal" | "tax" | "grand_total" | "currency"
  | "payment_terms" | "delivery_time" | "signature_name"
  | "signature_phone" | "signature_email" | "subject" | "intro_note"
  | "custom";

export interface DetectedField {
  id: string;
  page: number;              // 1-based
  token: FieldToken;
  label: string;
  // PDF-point coordinates (origin top-left of the page; we convert to bottom-left at draw time)
  x: number; y: number; w: number; h: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: string;             // hex
  whiteout: boolean;
  confidence: number;
  needs_review: boolean;
}

export interface LineItemsColumn {
  key: "sr_no" | "machine" | "description" | "qty" | "unit_price" | "amount" | string;
  label: string;
  x: number;
  width: number;
  align: "left" | "center" | "right";
  fontSize?: number;
}

export interface LineItemsRegion {
  page: number;
  x: number; y: number; width: number; height: number;
  header_y?: number;
  row_height: number;
  columns: LineItemsColumn[];
  clear_below_header?: boolean;
}

export interface TemplateAnalysis {
  pageSizes: Array<{ width: number; height: number }>;
  fields: DetectedField[];
  line_items?: LineItemsRegion | null;
  detected_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  version: number;
  status: "draft" | "active" | "archived";
  is_default: boolean;
  source_pdf_url: string | null;
  source_pdf_pages: number | null;
  thumbnail_url: string | null;
  analysis: TemplateAnalysis;
  field_overrides: Partial<TemplateAnalysis>;
  updated_at: string;
  created_at: string;
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("*")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function getTemplate(id: string): Promise<TemplateRow> {
  const { data, error } = await supabase.from("proposal_templates").select("*").eq("id", id).single();
  if (error) throw error;
  return data as any;
}

export async function createTemplateStub(name: string, category: string): Promise<TemplateRow> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("proposal_templates")
    .insert({
      user_id: u.user.id,
      name,
      category,
      status: "draft",
      mode: "pdf_overlay",
      scope: "domestic",
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as any;
}

export async function uploadTemplatePdf(templateId: string, file: File): Promise<{ path: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const path = `${u.user.id}/${templateId}/source.pdf`;
  const { error } = await supabase.storage.from("template-pdfs").upload(path, file, {
    upsert: true, contentType: "application/pdf",
  });
  if (error) throw error;
  return { path };
}

export async function uploadThumbnail(templateId: string, dataUrl: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const path = `${u.user.id}/${templateId}/thumb.jpg`;
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage.from("template-thumbnails").upload(path, blob, {
    upsert: true, contentType: "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export async function signThumbnail(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("template-thumbnails").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function signTemplatePdf(templateId: string): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const path = `${u.user.id}/${templateId}/source.pdf`;
  const { data, error } = await supabase.storage.from("template-pdfs").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function updateTemplate(id: string, patch: Partial<TemplateRow>): Promise<void> {
  const { error } = await supabase.from("proposal_templates").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function setDefaultTemplate(id: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  await supabase.from("proposal_templates").update({ is_default: false } as any).eq("user_id", u.user.id);
  const { error } = await supabase.from("proposal_templates").update({ is_default: true } as any).eq("id", id);
  if (error) throw error;
}

export async function duplicateTemplate(id: string): Promise<string> {
  const src = await getTemplate(id);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase.from("proposal_templates").insert({
    user_id: u.user.id,
    name: `${src.name} (Copy)`,
    category: src.category,
    description: src.description,
    is_default: false,
    status: src.status,
    mode: "pdf_overlay", scope: "domestic",
    source_pdf_url: src.source_pdf_url,
    source_pdf_pages: src.source_pdf_pages,
    thumbnail_url: src.thumbnail_url,
    analysis: src.analysis as any,
    field_overrides: src.field_overrides as any,
    version: 1,
  } as any).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function archiveTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("proposal_templates")
    .update({ status: "archived", archived: true } as any).eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("proposal_templates").delete().eq("id", id);
  if (error) throw error;
}

/** Merge base analysis with user overrides. */
export function mergedAnalysis(t: Pick<TemplateRow, "analysis" | "field_overrides">): TemplateAnalysis {
  const a = t.analysis ?? { pageSizes: [], fields: [], detected_at: "" };
  const o = t.field_overrides ?? {};
  return {
    pageSizes: (o as any).pageSizes ?? a.pageSizes ?? [],
    fields: ((o as any).fields ?? a.fields ?? []) as DetectedField[],
    line_items: ((o as any).line_items ?? a.line_items) ?? null,
    detected_at: a.detected_at ?? "",
  };
}

export const FIELD_TOKENS: { value: FieldToken; label: string }[] = [
  { value: "customer_name", label: "Customer Name" },
  { value: "company_name", label: "Company Name" },
  { value: "customer_address", label: "Customer Address" },
  { value: "contact_person", label: "Contact Person" },
  { value: "proposal_number", label: "Proposal/Quote Number" },
  { value: "date", label: "Date" },
  { value: "product_name", label: "Product/Machine Name" },
  { value: "capacity", label: "Capacity" },
  { value: "subtotal", label: "Subtotal" },
  { value: "tax", label: "Tax" },
  { value: "grand_total", label: "Grand Total" },
  { value: "currency", label: "Currency" },
  { value: "payment_terms", label: "Payment Terms" },
  { value: "delivery_time", label: "Delivery Time" },
  { value: "signature_name", label: "Signature Name" },
  { value: "signature_phone", label: "Signature Phone" },
  { value: "signature_email", label: "Signature Email" },
  { value: "subject", label: "Subject" },
  { value: "intro_note", label: "Intro/Cover Note" },
  { value: "custom", label: "Custom / Ignore" },
];
