import { supabase } from "@/integrations/supabase/client";

export type QuotationType = "domestic" | "export";

export interface TermsClause {
  id: string;
  template_id: string;
  title: string;
  body: string;
  position: number;
  enabled: boolean;
}
export interface TermsTemplate {
  id: string;
  name: string;
  scope: QuotationType;
  is_default: boolean;
  sort_order: number;
  clauses?: TermsClause[];
}

// Seed defaults inline (mirrors what the SQL used to insert)
const DOMESTIC_CLAUSES: Array<Omit<TermsClause, "id" | "template_id">> = [
  { title: "Freight", body: "Extra at actuals — to buyer's account.", position: 0, enabled: true },
  { title: "GST / HSN", body: "GST @ 18% extra as applicable. HSN Code: 84798910.", position: 1, enabled: true },
  { title: "Payment", body: "50% advance with commercial order; 50% against Proforma Invoice before dispatch, after FAT.", position: 2, enabled: true },
  { title: "Delivery", body: "14 working days from receipt of advance with commercial order.", position: 3, enabled: true },
  { title: "Warranty", body: "24 months from date of Invoice against manufacturing defects.", position: 4, enabled: true },
  { title: "Installation", body: "Erection & commissioning supervision by our engineers; boarding, lodging and to-and-fro travel in buyer's scope.", position: 5, enabled: true },
  { title: "Validity", body: "Offer valid for 30 days from the date of quotation.", position: 6, enabled: true },
  { title: "Jurisdiction", body: "All disputes subject to Ahmedabad jurisdiction only.", position: 7, enabled: true },
];
const EXPORT_CLAUSES: Array<Omit<TermsClause, "id" | "template_id">> = [
  { title: "Incoterms", body: "FOB Mundra Port, India (Incoterms 2020). CIF / CFR available on request.", position: 0, enabled: true },
  { title: "Export Packing", body: "Sea-worthy export packing in wooden crates with fumigation certificate (ISPM-15).", position: 1, enabled: true },
  { title: "Payment", body: "30% advance with order; 70% against copy of shipping documents via bank / TT.", position: 2, enabled: true },
  { title: "Delivery", body: "6-8 weeks from receipt of advance and technical clearance.", position: 3, enabled: true },
  { title: "Shipping Documents", body: "Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin (Chamber of Commerce), Fumigation Certificate.", position: 4, enabled: true },
  { title: "Warranty", body: "18 months from date of Bill of Lading against manufacturing defects.", position: 5, enabled: true },
  { title: "Installation", body: "Buyer to arrange VISA, boarding/lodging and to-and-fro travel of RSF supervision engineer(s). Man-day rates on request.", position: 6, enabled: true },
  { title: "Taxes & Duties", body: "All import duties, VAT and local taxes in destination country to buyer's account.", position: 7, enabled: true },
  { title: "Validity", body: "Offer valid for 30 days from the date of quotation.", position: 8, enabled: true },
];

export async function ensureDefaultTemplates(userId: string): Promise<void> {
  const { data: existing } = await supabase.from("terms_templates").select("id").eq("user_id", userId).limit(1);
  if (existing && existing.length > 0) return;

  const seed = async (name: string, scope: QuotationType, sort_order: number, clauses: typeof DOMESTIC_CLAUSES) => {
    const { data: tpl, error } = await supabase.from("terms_templates").insert({
      user_id: userId, name, scope, is_default: true, sort_order,
    }).select("id").single();
    if (error) throw error;
    if (!tpl) return;
    const rows = clauses.map(c => ({ ...c, user_id: userId, template_id: tpl.id }));
    await supabase.from("terms_clauses").insert(rows);
  };
  await seed("India Domestic (Standard)", "domestic", 0, DOMESTIC_CLAUSES);
  await seed("Export (UAE / GCC)", "export", 1, EXPORT_CLAUSES);
}

export async function fetchTemplates(): Promise<TermsTemplate[]> {
  const { data: tpls, error } = await supabase
    .from("terms_templates")
    .select("*")
    .order("scope", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const templates = (tpls ?? []) as unknown as TermsTemplate[];
  if (!templates.length) return [];
  const { data: clauses } = await supabase
    .from("terms_clauses")
    .select("*")
    .in("template_id", templates.map(t => t.id))
    .order("position", { ascending: true });
  const byTpl = new Map<string, TermsClause[]>();
  for (const c of (clauses ?? []) as unknown as TermsClause[]) {
    const arr = byTpl.get(c.template_id) ?? [];
    arr.push(c);
    byTpl.set(c.template_id, arr);
  }
  return templates.map(t => ({ ...t, clauses: byTpl.get(t.id) ?? [] }));
}

export function inferModeFromCountry(country?: string | null): QuotationType {
  if (!country) return "domestic";
  return /india/i.test(country) ? "domestic" : "export";
}
