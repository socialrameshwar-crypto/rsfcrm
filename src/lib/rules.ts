import { supabase } from "@/integrations/supabase/client";
import type { Machine } from "./proposal-catalog";

export interface RuleItem {
  name: string;
  qty: number;
  capacity?: string;
  motor?: string;
  material?: string;
  unit_price?: number;
}

export interface MachineSelectionRule {
  id: string;
  user_id: string;
  name: string;
  product_slug: string;
  capacity: string | null;
  automation: string | null;
  material: string | null;
  priority: number;
  items: RuleItem[];
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UtilityFormula {
  id: string;
  user_id: string;
  product_slug: string | null;
  key: string;
  label: string;
  unit: string | null;
  expression: string;
  sort_order: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchRules(productSlug?: string): Promise<MachineSelectionRule[]> {
  let q = (supabase as any).from("machine_selection_rules").select("*").eq("archived", false).order("priority", { ascending: false });
  if (productSlug) q = q.eq("product_slug", productSlug);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MachineSelectionRule[];
}

export async function fetchFormulas(): Promise<UtilityFormula[]> {
  const { data, error } = await (supabase as any)
    .from("utility_formulas")
    .select("*")
    .eq("archived", false)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UtilityFormula[];
}

// Score how well a rule matches the selected config. Higher = better.
export function scoreRule(rule: MachineSelectionRule, opts: {
  product: string; capacity: string; automation: string; material: string;
}): number {
  if (rule.product_slug !== opts.product) return -1;
  let score = rule.priority * 10;
  if (rule.capacity) score += rule.capacity === opts.capacity ? 5 : -3;
  if (rule.automation) score += rule.automation === opts.automation ? 3 : -1;
  if (rule.material) score += rule.material === opts.material ? 2 : -1;
  return score;
}

export function pickBestRule(rules: MachineSelectionRule[], opts: {
  product: string; capacity: string; automation: string; material: string;
}): MachineSelectionRule | null {
  const scored = rules.map(r => ({ r, s: scoreRule(r, opts) })).filter(x => x.s >= 0);
  if (!scored.length) return null;
  scored.sort((a, b) => b.s - a.s);
  return scored[0].r;
}

export function ruleToMachines(rule: MachineSelectionRule, fallbackMaterial: string): Machine[] {
  return (rule.items || []).map(it => ({
    name: it.name,
    qty: Number(it.qty) || 1,
    capacity: it.capacity || "",
    motor: it.motor || "",
    material: it.material || fallbackMaterial,
    unit_price: Number(it.unit_price) || 0,
  }));
}

// Safe formula evaluator.
// Variables available: capKg, connectedKw, runningKw, totalHp, autMul, product, machineCount, qtySum
// Allowed functions: round, ceil, floor, max, min, sqrt, abs
export interface FormulaContext {
  capKg: number;
  connectedKw: number;
  runningKw: number;
  totalHp: number;
  autMul: number;
  product: string;
  machineCount: number;
  qtySum: number;
}

const ALLOWED = /^[\s0-9+\-*/().,<>=!?:%|&a-zA-Z_"']+$/;

export function evalFormula(expr: string, ctx: FormulaContext): number | string {
  if (!expr) return 0;
  if (!ALLOWED.test(expr)) return 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(
      "capKg", "connectedKw", "runningKw", "totalHp", "autMul", "product", "machineCount", "qtySum",
      "round", "ceil", "floor", "max", "min", "sqrt", "abs",
      `"use strict"; return (${expr});`,
    );
    const out = fn(
      ctx.capKg, ctx.connectedKw, ctx.runningKw, ctx.totalHp, ctx.autMul,
      ctx.product, ctx.machineCount, ctx.qtySum,
      Math.round, Math.ceil, Math.floor, Math.max, Math.min, Math.sqrt, Math.abs,
    );
    if (typeof out === "number" && isFinite(out)) return out;
    if (typeof out === "string") return out;
    return 0;
  } catch {
    return 0;
  }
}

export function buildFormulaContext(product: string, capacity: string, automation: string, machines: { qty: number; motor: string }[]): FormulaContext {
  const totalHp = machines.reduce((s, m) => {
    const n = parseFloat(m.motor || "");
    return s + (isFinite(n) ? n * (m.qty || 1) : 0);
  }, 0);
  const connectedKw = Math.round(totalHp * 0.746 * 1.25);
  const runningKw = Math.round(connectedKw * 0.7);
  const autMul = automation === "Fully Automatic" ? 1.4 : automation === "Manual" ? 0.85 : 1;
  return {
    capKg: parseFloat(capacity) || 500,
    connectedKw,
    runningKw,
    totalHp,
    autMul,
    product,
    machineCount: machines.length,
    qtySum: machines.reduce((s, m) => s + (m.qty || 0), 0),
  };
}

// Default formulas seed (matches the previous hardcoded calcUtilities).
export const DEFAULT_FORMULAS: Omit<UtilityFormula, "id" | "user_id" | "created_at" | "updated_at" | "archived">[] = [
  { product_slug: null, key: "connected_load_kw", label: "Connected load", unit: "kW", expression: "connectedKw", sort_order: 1 },
  { product_slug: null, key: "running_load_kw", label: "Running load", unit: "kW", expression: "runningKw", sort_order: 2 },
  { product_slug: null, key: "power_kwh_day", label: "Power / day", unit: "kWh", expression: "runningKw * 20", sort_order: 3 },
  { product_slug: null, key: "water_kld", label: "Water", unit: "KL/day", expression: "max(2, round((capKg / 500) * 5))", sort_order: 4 },
  { product_slug: null, key: "steam_kg_hr", label: "Steam", unit: "kg/hr", expression: "round(capKg * 0.4)", sort_order: 5 },
  { product_slug: null, key: "air_cfm", label: "Air", unit: "CFM", expression: "round(capKg * 0.2 * autMul)", sort_order: 6 },
  { product_slug: null, key: "manpower", label: "Manpower", unit: "/ shift", expression: "max(4, round(6 + capKg / 250))", sort_order: 7 },
  { product_slug: null, key: "floor_space_sqm", label: "Floor space", unit: "sqm", expression: "round(150 + capKg * 0.4)", sort_order: 8 },
  { product_slug: null, key: "production_per_shift_kg", label: "Production / shift", unit: "kg", expression: "capKg * 8", sort_order: 9 },
  { product_slug: null, key: "production_per_day_kg", label: "Production / day", unit: "kg", expression: "capKg * 20", sort_order: 10 },
];

export async function seedDefaultFormulas(userId: string) {
  const existing = await fetchFormulas();
  if (existing.length) return existing;
  const rows = DEFAULT_FORMULAS.map(f => ({ ...f, user_id: userId }));
  const { data, error } = await (supabase as any).from("utility_formulas").insert(rows).select("*");
  if (error) throw error;
  return data as UtilityFormula[];
}
