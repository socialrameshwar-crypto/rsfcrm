// Product / capacity / machine catalog used by the wizard and AI generator.

export type ProductType =
  | "toilet-soap"
  | "laundry-soap"
  | "detergent-powder"
  | "detergent-cake"
  | "liquid-detergent"
  | "labsa"
  | "pilot"
  | "custom";

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "toilet-soap", label: "Toilet Soap Plant" },
  { value: "laundry-soap", label: "Laundry Soap Plant" },
  { value: "detergent-powder", label: "Detergent Powder Plant" },
  { value: "detergent-cake", label: "Detergent Cake Plant" },
  { value: "liquid-detergent", label: "Liquid Detergent Plant" },
  { value: "labsa", label: "LABSA Plant" },
  { value: "pilot", label: "Pilot Plant" },
  { value: "custom", label: "Custom Project" },
];

export const CAPACITIES = [
  "100 Kg/hr",
  "250 Kg/hr",
  "500 Kg/hr",
  "1000 Kg/hr",
  "2000 Kg/hr",
  "3000 Kg/hr",
  "Custom",
];

export const AUTOMATIONS = ["Manual", "Semi Automatic", "Fully Automatic"];
export const MATERIALS = ["Mild Steel", "SS304", "SS316"];
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];
export const TEMPLATES = [
  { value: "corporate-blue", label: "Corporate Blue" },
  { value: "premium-black", label: "Premium Black" },
  { value: "industrial-grey", label: "Industrial Grey" },
  { value: "modern-white", label: "Modern White" },
  { value: "export-edition", label: "Export Edition" },
];
export const STATUSES = ["draft", "sent", "negotiation", "won", "lost"] as const;
export type ProposalStatus = (typeof STATUSES)[number];

export interface Machine {
  name: string;
  qty: number;
  capacity: string;
  motor: string;
  material: string;
  unit_price: number;
}

// Base machine templates per product line.
const BASE_MACHINES: Record<ProductType, Omit<Machine, "unit_price">[]> = {
  "toilet-soap": [
    { name: "Soap Mixer", qty: 1, capacity: "500 L", motor: "7.5 HP", material: "SS304" },
    { name: "Triple Roll Mill", qty: 1, capacity: "500 kg/hr", motor: "15 HP", material: "SS304" },
    { name: "Duplex Plodder", qty: 1, capacity: "500 kg/hr", motor: "20 HP", material: "SS304" },
    { name: "Vacuum Plodder", qty: 1, capacity: "500 kg/hr", motor: "25 HP", material: "SS316" },
    { name: "Soap Cutter", qty: 1, capacity: "60 strokes/min", motor: "3 HP", material: "SS304" },
    { name: "Stamping Machine", qty: 2, capacity: "80 stamps/min", motor: "3 HP", material: "SS304" },
    { name: "Cooling Conveyor", qty: 1, capacity: "10 m", motor: "1 HP", material: "SS304" },
    { name: "Control Panel", qty: 1, capacity: "IP54", motor: "-", material: "MS Powder Coated" },
  ],
  "laundry-soap": [
    { name: "Soap Kettle", qty: 1, capacity: "2000 L", motor: "10 HP", material: "SS304" },
    { name: "Cooling Frame", qty: 4, capacity: "200 kg", motor: "-", material: "MS" },
    { name: "Bar Cutter", qty: 1, capacity: "1000 kg/hr", motor: "5 HP", material: "SS304" },
    { name: "Stamping Press", qty: 1, capacity: "40 strokes/min", motor: "5 HP", material: "SS304" },
    { name: "Control Panel", qty: 1, capacity: "IP54", motor: "-", material: "MS" },
  ],
  "detergent-powder": [
    { name: "Neutralizer Reactor", qty: 1, capacity: "1000 L", motor: "10 HP", material: "SS316" },
    { name: "Slurry Mixer", qty: 1, capacity: "2000 L", motor: "15 HP", material: "SS316" },
    { name: "Spray Dryer Tower", qty: 1, capacity: "500 kg/hr", motor: "40 HP", material: "SS304" },
    { name: "Air Blower", qty: 1, capacity: "10000 m3/hr", motor: "30 HP", material: "MS" },
    { name: "Cyclone Separator", qty: 1, capacity: "500 kg/hr", motor: "-", material: "SS304" },
    { name: "Cooling Conveyor", qty: 1, capacity: "12 m", motor: "2 HP", material: "SS304" },
    { name: "Packing Machine", qty: 2, capacity: "40 pouches/min", motor: "3 HP", material: "SS304" },
    { name: "Control Panel", qty: 1, capacity: "IP54", motor: "-", material: "MS" },
  ],
  "detergent-cake": [
    { name: "Ribbon Blender", qty: 1, capacity: "1000 L", motor: "15 HP", material: "SS304" },
    { name: "Sigma Mixer", qty: 1, capacity: "500 kg/batch", motor: "20 HP", material: "SS304" },
    { name: "Duplex Plodder", qty: 1, capacity: "500 kg/hr", motor: "20 HP", material: "SS304" },
    { name: "Cake Cutter", qty: 1, capacity: "60 strokes/min", motor: "3 HP", material: "SS304" },
    { name: "Stamping Machine", qty: 1, capacity: "60 stamps/min", motor: "3 HP", material: "SS304" },
    { name: "Control Panel", qty: 1, capacity: "IP54", motor: "-", material: "MS" },
  ],
  "liquid-detergent": [
    { name: "Mixing Tank", qty: 2, capacity: "2000 L", motor: "7.5 HP", material: "SS316" },
    { name: "Homogenizer", qty: 1, capacity: "1000 L/hr", motor: "15 HP", material: "SS316" },
    { name: "Storage Tank", qty: 2, capacity: "5000 L", motor: "-", material: "SS304" },
    { name: "Filling Machine", qty: 1, capacity: "40 bottles/min", motor: "3 HP", material: "SS304" },
    { name: "Capping Machine", qty: 1, capacity: "40 caps/min", motor: "1 HP", material: "SS304" },
    { name: "Labelling Machine", qty: 1, capacity: "40 bottles/min", motor: "1 HP", material: "SS304" },
    { name: "Control Panel", qty: 1, capacity: "IP54", motor: "-", material: "MS" },
  ],
  labsa: [
    { name: "SO3 Generator", qty: 1, capacity: "500 kg/hr", motor: "25 HP", material: "SS316" },
    { name: "Falling Film Reactor", qty: 1, capacity: "500 kg/hr", motor: "-", material: "SS316L" },
    { name: "Aging Vessel", qty: 1, capacity: "3000 L", motor: "5 HP", material: "SS316" },
    { name: "Hydrolyser", qty: 1, capacity: "500 kg/hr", motor: "-", material: "SS316L" },
    { name: "Neutralizer", qty: 1, capacity: "500 kg/hr", motor: "10 HP", material: "SS316" },
    { name: "Storage Tank", qty: 2, capacity: "5000 L", motor: "-", material: "SS316" },
    { name: "Control Panel + PLC", qty: 1, capacity: "IP65", motor: "-", material: "MS" },
  ],
  pilot: [
    { name: "Pilot Reactor", qty: 1, capacity: "50 L", motor: "3 HP", material: "SS316" },
    { name: "Pilot Mixer", qty: 1, capacity: "100 L", motor: "2 HP", material: "SS316" },
    { name: "Control Panel", qty: 1, capacity: "IP54", motor: "-", material: "MS" },
  ],
  custom: [
    { name: "To be defined based on customer requirement", qty: 1, capacity: "-", motor: "-", material: "-" },
  ],
};

// Rough capacity multipliers → base unit price per machine.
const CAPACITY_MULTIPLIER: Record<string, number> = {
  "100 Kg/hr": 0.5,
  "250 Kg/hr": 0.75,
  "500 Kg/hr": 1,
  "1000 Kg/hr": 1.6,
  "2000 Kg/hr": 2.4,
  "3000 Kg/hr": 3.2,
  Custom: 1.5,
};

const AUTOMATION_MULT: Record<string, number> = {
  Manual: 0.85,
  "Semi Automatic": 1,
  "Fully Automatic": 1.4,
};

const MATERIAL_MULT: Record<string, number> = {
  "Mild Steel": 0.8,
  SS304: 1,
  SS316: 1.35,
};

const BASE_UNIT_PRICE_INR = 450_000; // rough base machine price

export function buildMachineList(
  product: ProductType,
  capacity: string,
  automation: string,
  material: string,
): Machine[] {
  const bases = BASE_MACHINES[product] ?? BASE_MACHINES.custom;
  const capMul = CAPACITY_MULTIPLIER[capacity] ?? 1;
  const autMul = AUTOMATION_MULT[automation] ?? 1;
  const matMul = MATERIAL_MULT[material] ?? 1;
  return bases.map((b, i) => ({
    ...b,
    material: material === "Mild Steel" && b.material.startsWith("SS") ? b.material : b.material,
    unit_price: Math.round(BASE_UNIT_PRICE_INR * capMul * autMul * matMul * (1 + i * 0.05)),
  }));
}

export interface Utilities {
  connected_load_kw: number;
  running_load_kw: number;
  power_kwh_day: number;
  water_kld: number;
  steam_kg_hr: number;
  air_cfm: number;
  manpower: number;
  floor_space_sqm: number;
  production_per_shift_kg: number;
  production_per_day_kg: number;
}

export function calcUtilities(
  product: ProductType,
  capacity: string,
  automation: string,
  machines: Machine[],
): Utilities {
  const totalMotorHp = machines.reduce((s, m) => {
    const n = parseFloat(m.motor);
    return s + (isFinite(n) ? n * m.qty : 0);
  }, 0);
  const connected_kw = Math.round(totalMotorHp * 0.746 * 1.25);
  const running_kw = Math.round(connected_kw * 0.7);
  const capKg = parseFloat(capacity) || 500;
  const autMul = AUTOMATION_MULT[automation] ?? 1;

  return {
    connected_load_kw: connected_kw,
    running_load_kw: running_kw,
    power_kwh_day: running_kw * 20,
    water_kld: Math.max(2, Math.round((capKg / 500) * 5)),
    steam_kg_hr: product === "labsa" || product.includes("soap") ? Math.round(capKg * 0.4) : 0,
    air_cfm: Math.round(capKg * 0.2 * autMul),
    manpower: Math.max(4, Math.round(6 + capKg / 250)),
    floor_space_sqm: Math.round(150 + capKg * 0.4),
    production_per_shift_kg: capKg * 8,
    production_per_day_kg: capKg * 20,
  };
}

export interface Commercials {
  machines_total: number;
  freight: number;
  packing: number;
  installation: number;
  commissioning: number;
  tax_rate: number;
  tax: number;
  grand_total: number;
}

export function calcCommercials(machines: Machine[], taxRate = 18): Commercials {
  const machines_total = machines.reduce((s, m) => s + m.qty * m.unit_price, 0);
  const freight = Math.round(machines_total * 0.03);
  const packing = Math.round(machines_total * 0.015);
  const installation = Math.round(machines_total * 0.05);
  const commissioning = Math.round(machines_total * 0.03);
  const subtotal = machines_total + freight + packing + installation + commissioning;
  const tax = Math.round((subtotal * taxRate) / 100);
  return {
    machines_total,
    freight,
    packing,
    installation,
    commissioning,
    tax_rate: taxRate,
    tax,
    grand_total: subtotal + tax,
  };
}

export function generateProposalNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RSF/${yy}${mm}/${rand}`;
}
