import { supabase } from "@/integrations/supabase/client";

export const COUNTRIES = [
  "India", "Nigeria", "Kenya", "Egypt", "South Africa", "Ghana", "Ethiopia",
  "Sri Lanka", "Bangladesh", "Indonesia", "Vietnam", "Philippines", "UAE", "Saudi Arabia", "Other",
];
export const EXPORT_COUNTRIES = COUNTRIES.filter(c => c !== "India");
export const LEAD_SOURCES = ["IndiaMart", "TradeIndia", "WhatsApp", "Website", "Referral", "Direct Call", "Other"];
export const LEAD_STAGES = ["New", "Contacted", "Quotation Sent", "Negotiation", "Won", "Lost"] as const;
export const ORDER_STATUSES = ["Pending", "In Production", "Quality Check", "Dispatched", "Delivered"] as const;
export const QUOTE_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"] as const;
export const PRODUCT_CATEGORIES = ["Soap Making Machinery", "Detergent Plant Machinery", "Steel Fabrication"];
export const INDIAN_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Gujarat","Haryana","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal","Other",
];

export function fmtINR(n: number | null | undefined) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}
export function fmtUSD(n: number | null | undefined) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
export function fmtMoney(n: number | null | undefined, currency = "INR") {
  return currency === "USD" ? fmtUSD(n) : fmtINR(n);
}

export function region(country: string): "India" | "Africa" | "Middle East" | "SE Asia" | "Other" {
  if (country === "India") return "India";
  if (["Nigeria","Kenya","Egypt","South Africa","Ghana","Ethiopia"].includes(country)) return "Africa";
  if (["UAE","Saudi Arabia"].includes(country)) return "Middle East";
  if (["Sri Lanka","Bangladesh","Indonesia","Vietnam","Philippines"].includes(country)) return "SE Asia";
  return "Other";
}

export function whatsappLink(phone: string) {
  const clean = (phone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${clean}`;
}

export const stageColor: Record<string, string> = {
  New: "bg-slate-200 text-slate-800",
  Contacted: "bg-blue-100 text-blue-800",
  "Quotation Sent": "bg-amber-100 text-amber-800",
  Negotiation: "bg-purple-100 text-purple-800",
  Won: "bg-emerald-100 text-emerald-800",
  Lost: "bg-red-100 text-red-800",
};

export async function getCurrentRole(): Promise<"admin" | "sales" | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", u.user.id);
  if (!data || data.length === 0) return null;
  return data.some((r: any) => r.role === "admin") ? "admin" : "sales";
}
