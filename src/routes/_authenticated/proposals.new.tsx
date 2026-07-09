import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  PRODUCT_TYPES, CAPACITIES, AUTOMATIONS, MATERIALS, CURRENCIES, TEMPLATES,
  buildMachineList, calcCommercials, generateProposalNumber,
  type ProductType, type Machine,
} from "@/lib/proposal-catalog";
import { formatMoney } from "@/lib/format";
import { generateAiProposal } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Check, Users, Cog, Zap, DollarSign, ChevronLeft, ChevronRight, PlusCircle, AlertCircle } from "lucide-react";
import { ensureDefaultTemplates, fetchTemplates, inferModeFromCountry, type QuotationType } from "@/lib/terms";
import { fetchCategories, fetchMachines } from "@/lib/products";
import { fetchRules, fetchFormulas, pickBestRule, ruleToMachines, buildFormulaContext, evalFormula } from "@/lib/rules";
import { Link } from "@tanstack/react-router";


export const Route = createFileRoute("/_authenticated/proposals/new")({
  component: NewProposalWizard,
});

const STEPS = [
  { id: 1, label: "Customer", icon: Users },
  { id: 2, label: "Project", icon: Cog },
  { id: 3, label: "Machines", icon: Sparkles },
  { id: 4, label: "Utilities", icon: Zap },
  { id: 5, label: "Commercials", icon: DollarSign },
];

function NewProposalWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const genAi = useServerFn(generateAiProposal);
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);

  // Step 1
  const [customerId, setCustomerId] = useState<string>("");
  const [newCustomer, setNewCustomer] = useState({
    customer_name: "", company_name: "", contact_person: "", email: "", mobile: "",
    country: "", city: "", industry: "",
  });
  const [salesEngineer, setSalesEngineer] = useState("");
  const [followUp, setFollowUp] = useState("");

  // Step 2
  const [product, setProduct] = useState<ProductType>("toilet-soap");
  const [capacity, setCapacity] = useState("500 Kg/hr");
  const [automation, setAutomation] = useState("Semi Automatic");
  const [material, setMaterial] = useState<string>("SS304");
  const [currency, setCurrency] = useState("INR");
  const [template, setTemplate] = useState("corporate-blue");

  const [title, setTitle] = useState("");

  // Step 3 - machines editable
  const defaultMachines = useMemo(
    () => buildMachineList(product, capacity, automation, material),
    [product, capacity, automation, material],
  );
  const [machines, setMachines] = useState<Machine[]>([]);
  const currentMachines = machines.length ? machines : defaultMachines;

  // Step 4 - utility formulas + editable overrides
  const { data: dbFormulas = [] } = useQuery({ queryKey: ["formulas"], queryFn: fetchFormulas });
  const { data: dbRules = [] } = useQuery({ queryKey: ["rules"], queryFn: () => fetchRules() });
  const [utilityOverrides, setUtilityOverrides] = useState<Record<string, number | string>>({});

  const computedUtilities = useMemo(() => {
    const ctx = buildFormulaContext(product, capacity, automation, currentMachines);
    const scoped = dbFormulas.filter(f => !f.product_slug || f.product_slug === product);
    // Prefer product-specific over global (keep last-defined by key)
    const byKey = new Map<string, typeof scoped[number]>();
    for (const f of scoped) {
      const prev = byKey.get(f.key);
      if (!prev || (!prev.product_slug && f.product_slug)) byKey.set(f.key, f);
    }
    return Array.from(byKey.values())
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(f => ({ key: f.key, label: f.label, unit: f.unit || "", value: evalFormula(f.expression, ctx) }));
  }, [dbFormulas, product, capacity, automation, currentMachines]);

  const utilities = useMemo(() => {
    const obj: Record<string, number | string> = {};
    for (const u of computedUtilities) obj[u.key] = utilityOverrides[u.key] ?? u.value;
    return obj;
  }, [computedUtilities, utilityOverrides]);

  // Step 5
  const [taxRate, setTaxRate] = useState(18);
  const commercials = useMemo(() => calcCommercials(currentMachines, taxRate), [currentMachines, taxRate]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedCust = customers.find(c => c.id === customerId);
  const custCountry = selectedCust?.country || newCustomer.country;

  // Terms library
  const { data: templates = [] } = useQuery({
    queryKey: ["terms-templates"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await ensureDefaultTemplates(u.user.id);
      return fetchTemplates();
    },
  });
  const { data: libraryCategories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: fetchCategories,
  });





  const [quotationType, setQuotationType] = useState<QuotationType>("domestic");
  const [modeAutoSet, setModeAutoSet] = useState(false);
  const [termsTemplateId, setTermsTemplateId] = useState<string>("");

  // Auto-infer mode from country once
  useEffect(() => {
    if (custCountry && !modeAutoSet) {
      setQuotationType(inferModeFromCountry(custCountry));
      setModeAutoSet(true);
    }
  }, [custCountry, modeAutoSet]);

  // Auto-pick default template for chosen mode
  useEffect(() => {
    if (!templates.length) return;
    const scoped = templates.filter(t => t.scope === quotationType);
    if (!scoped.length) return;
    if (!termsTemplateId || !scoped.find(t => t.id === termsTemplateId)) {
      const def = scoped.find(t => t.is_default) ?? scoped[0];
      setTermsTemplateId(def.id);
    }
  }, [templates, quotationType, termsTemplateId]);

  const productLabel = PRODUCT_TYPES.find(p => p.value === product)?.label ?? "Plant";

  const ensureCustomer = async (): Promise<string | null> => {
    if (customerId) return customerId;
    if (!newCustomer.customer_name && !newCustomer.company_name) return null;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("customers").insert({
      ...newCustomer,
      customer_name: newCustomer.customer_name || newCustomer.company_name,
      user_id: userData.user.id,
    }).select("*").single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["customers"] });
    setCustomerId(data.id);
    return data.id;
  };

  // Validation gate for "Generate"
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    const hasCustomer = customerId || newCustomer.company_name || newCustomer.customer_name;
    if (!hasCustomer) errs.push("Customer / company");
    if (!product) errs.push("Product type");
    if (!capacity) errs.push("Capacity");
    if (!currentMachines.length) errs.push("At least one machine");
    if (currentMachines.some(m => !m.unit_price || m.unit_price <= 0)) errs.push("Unit price for every machine");
    if (!termsTemplateId) errs.push("Terms & conditions template");
    return errs;
  }, [customerId, newCustomer, product, capacity, currentMachines, termsTemplateId]);

  const create = useMutation({
    mutationFn: async () => {
      if (validationErrors.length) throw new Error("Please complete: " + validationErrors.join(", "));
      setGenerating(true);
      const cust_id = await ensureCustomer();
      const cust = customers.find(c => c.id === cust_id) ?? { ...newCustomer };
      const ai = await genAi({
        data: {
          customer: {
            company_name: cust.company_name,
            contact_person: cust.contact_person,
            country: cust.country,
            industry: cust.industry,
          },
          product_type: product,
          product_label: productLabel,
          capacity, automation, material,
        },
      });
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const proposalNumber = generateProposalNumber();
      const { data, error } = await supabase.from("proposals").insert({
        user_id: userData.user.id,
        customer_id: cust_id,
        proposal_number: proposalNumber,
        title: title || `${productLabel} — ${capacity}`,
        product_type: product,
        capacity, automation, material,
        currency,
        status: "draft",
        sales_engineer: salesEngineer || null,
        follow_up_date: followUp || null,
        total_value: commercials.grand_total,
        machines: currentMachines as any,
        utilities: utilities as any,
        commercials: commercials as any,
        ai_content: ai as any,
        template,
        quotation_type: quotationType,
        terms_template_id: termsTemplateId || null,
      } as any).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGenerating(false);
      toast.success("Proposal generated");
      qc.invalidateQueries({ queryKey: ["proposals-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/proposals/$id", params: { id: data.id } });
    },
    onError: (e: Error) => {
      setGenerating(false);
      toast.error(e.message);
    },
  });

  const next = () => setStep(s => Math.min(5, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Proposal</h1>
        <p className="text-sm text-muted-foreground">Complete each step — the AI will generate the technical proposal at the end.</p>
      </div>

      {/* Stepper */}
      <Card className="p-5 shadow-elegant">
        <div className="flex items-center gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 min-w-0">
                <button onClick={() => setStep(s.id)} className="flex items-center gap-2 min-w-0">
                  <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${active ? "gradient-primary text-primary-foreground" : done ? "bg-success text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-[10px] uppercase text-muted-foreground">Step {s.id}</div>
                    <div className={`text-sm font-medium ${active ? "text-primary" : ""}`}>{s.label}</div>
                  </div>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-2" />}
              </div>
            );
          })}
        </div>
        <Progress className="mt-4 h-1" value={(step / STEPS.length) * 100} />
      </Card>

      {step === 1 && (
        <Card className="p-6 shadow-elegant space-y-6">
          <div>
            <h2 className="font-semibold text-lg">Customer information</h2>
            <p className="text-sm text-muted-foreground">Select an existing customer or add a new one.</p>
          </div>

          {customers.length > 0 && (
            <div>
              <Label>Existing customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Choose from your CRM…" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || c.customer_name} {c.country ? `— ${c.country}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">Or fill in a new customer below.</p>
            </div>
          )}

          {!customerId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["customer_name", "Customer name"],
                ["company_name", "Company name"],
                ["contact_person", "Contact person"],
                ["email", "Email"],
                ["mobile", "Mobile"],
                ["country", "Country"],
                ["city", "City"],
                ["industry", "Industry"],
              ].map(([k, label]) => (
                <div key={k}>
                  <Label>{label}</Label>
                  <Input value={(newCustomer as any)[k]} onChange={e => setNewCustomer({ ...newCustomer, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
            <div><Label>Sales engineer</Label><Input value={salesEngineer} onChange={e => setSalesEngineer(e.target.value)} placeholder="Assigned to…" /></div>
            <div><Label>Follow-up date</Label><Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} /></div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 shadow-elegant space-y-6">
          <div>
            <h2 className="font-semibold text-lg">Project information</h2>
            <p className="text-sm text-muted-foreground">Configure the plant scope.</p>
          </div>




          <div className="pt-4 border-t">
            <Label>Proposal title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${productLabel} — ${capacity}`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Product type</Label>
              <Select value={product} onValueChange={v => { setProduct(v as ProductType); setMachines([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacity</Label>
              <Select value={capacity} onValueChange={v => { setCapacity(v); setMachines([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAPACITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Automation</Label>
              <Select value={automation} onValueChange={v => { setAutomation(v); setMachines([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUTOMATIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Select value={material} onValueChange={v => { setMaterial(v); setMachines([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>PDF template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 shadow-elegant space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="font-semibold text-lg">AI Machine Configurator</h2>
              <p className="text-sm text-muted-foreground">Auto-generated based on {productLabel} · {capacity} · {automation} · {material}.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="default"
                className="gradient-primary"
                onClick={() => {
                  const rule = pickBestRule(dbRules, { product, capacity, automation, material });
                  if (!rule) {
                    toast.info("No matching rule. Add one in Auto-Select & Formulas.");
                    return;
                  }
                  setMachines(ruleToMachines(rule, material));
                  toast.success(`Auto-selected via rule: ${rule.name}`);
                }}
              >
                <Sparkles className="h-4 w-4 mr-1" /> Auto-select
              </Button>
              <Select onValueChange={(cid) => {
                const cat = libraryCategories.find(c => c.id === cid);
                if (!cat) return;
                fetchMachines(cid).then(rows => {
                  if (!rows.length) { toast.info(`No machines in "${cat.name}" yet — add some in Products.`); return; }
                  const mapped: Machine[] = rows.filter(r => !r.archived).map(r => ({
                    name: r.name,
                    qty: 1,
                    capacity: r.capacity || "",
                    motor: r.motor || "",
                    material: r.material || material,
                    unit_price: Number(r.customer_price || r.base_price || 0),
                  }));
                  setMachines([...(currentMachines || []), ...mapped]);
                  toast.success(`Added ${mapped.length} machine${mapped.length === 1 ? "" : "s"} from "${cat.name}"`);
                }).catch(e => toast.error(e.message));
              }}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Load from product library…" /></SelectTrigger>
                <SelectContent>
                  {libraryCategories.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No categories yet — create some in Products.</div>}
                  {libraryCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setMachines([...currentMachines, { name: "", qty: 1, capacity: "", motor: "", material, unit_price: 0 }])}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add machine
              </Button>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-3">
            {currentMachines.map((m, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>#{i + 1}</span>
                  <span className="font-semibold text-foreground">{formatMoney(m.qty * m.unit_price, currency)}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Machine</label>
                  <Input value={m.name} onChange={e => updateMachine(i, "name", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <Input type="number" value={m.qty} onChange={e => updateMachine(i, "qty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Capacity</label>
                    <Input value={m.capacity} onChange={e => updateMachine(i, "capacity", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Motor</label>
                    <Input value={m.motor} onChange={e => updateMachine(i, "motor", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">MOC</label>
                    <Input value={m.material} onChange={e => updateMachine(i, "material", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Unit price</label>
                  <Input type="number" value={m.unit_price} onChange={e => updateMachine(i, "unit_price", Number(e.target.value))} className="text-right" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t font-semibold text-sm">
              <span>Machines total</span>
              <span>{formatMoney(commercials.machines_total, currency)}</span>
            </div>
          </div>

          {/* Tablet/Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Machine</th>
                  <th className="py-2 pr-2 w-16">Qty</th>
                  <th className="py-2 pr-2 w-32">Capacity</th>
                  <th className="py-2 pr-2 w-24">Motor</th>
                  <th className="py-2 pr-2 w-28">MOC</th>
                  <th className="py-2 pr-2 w-36 text-right">Unit price</th>
                  <th className="py-2 pr-2 w-36 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {currentMachines.map((m, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-2">{i + 1}</td>
                    <td className="py-2 pr-2"><Input value={m.name} onChange={e => updateMachine(i, "name", e.target.value)} /></td>
                    <td className="py-2 pr-2"><Input type="number" value={m.qty} onChange={e => updateMachine(i, "qty", Number(e.target.value))} /></td>
                    <td className="py-2 pr-2"><Input value={m.capacity} onChange={e => updateMachine(i, "capacity", e.target.value)} /></td>
                    <td className="py-2 pr-2"><Input value={m.motor} onChange={e => updateMachine(i, "motor", e.target.value)} /></td>
                    <td className="py-2 pr-2"><Input value={m.material} onChange={e => updateMachine(i, "material", e.target.value)} /></td>
                    <td className="py-2 pr-2"><Input type="number" value={m.unit_price} onChange={e => updateMachine(i, "unit_price", Number(e.target.value))} className="text-right" /></td>
                    <td className="py-2 pr-2 text-right font-medium">{formatMoney(m.qty * m.unit_price, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={7} className="py-3 text-right">Machines total</td>
                  <td className="py-3 pr-2 text-right">{formatMoney(commercials.machines_total, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 shadow-elegant">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="font-semibold text-lg">Utility Calculator</h2>
              <p className="text-sm text-muted-foreground">
                Computed from your formulas. Values are editable — overrides are saved with this proposal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(utilityOverrides).length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setUtilityOverrides({})}>Reset overrides</Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/rules">Edit formulas</Link>
              </Button>
            </div>
          </div>
          {computedUtilities.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">
              No utility formulas yet. Open <Link to="/settings/rules" className="underline">Auto-Select & Formulas</Link> and click "Load default formulas".
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {computedUtilities.map(u => {
              const val = utilityOverrides[u.key] ?? u.value;
              const overridden = u.key in utilityOverrides;
              return (
                <div key={u.key} className={`rounded-lg border p-3 ${overridden ? "bg-primary/5 border-primary/40" : "bg-secondary/30"}`}>
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{u.label}</span>
                    {overridden && <button onClick={() => setUtilityOverrides(o => { const n = { ...o }; delete n[u.key]; return n; })} className="text-[10px] text-primary hover:underline">reset</button>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={String(val)}
                      onChange={e => {
                        const v = e.target.value;
                        const num = Number(v);
                        setUtilityOverrides(o => ({ ...o, [u.key]: isFinite(num) && v.trim() !== "" ? num : v }));
                      }}
                      className="text-lg font-semibold h-9 px-2"
                    />
                    {u.unit && <span className="text-xs text-muted-foreground shrink-0">{u.unit}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}


      {step === 5 && (
        <Card className="p-6 shadow-elegant space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-lg">Commercial Quotation</h2>
              <p className="text-sm text-muted-foreground">All figures in {currency}.</p>
            </div>
            <div>
              <Label className="text-xs">Tax rate %</Label>
              <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)} className="w-24" />
            </div>
          </div>

          {/* Quotation type + Terms library */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-secondary/30">
            <div>
              <Label>Quotation type</Label>
              <Select value={quotationType} onValueChange={v => { setQuotationType(v as QuotationType); setModeAutoSet(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic">Domestic (India — GST / HSN)</SelectItem>
                  <SelectItem value="export">Export (Incoterms / FOB)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {custCountry ? `Suggested from customer country: ${custCountry}` : "Set customer country to auto-suggest"}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Terms & conditions template</Label>
                <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-[11px]">
                  <Link to="/settings/terms">Manage library</Link>
                </Button>
              </div>
              <Select value={termsTemplateId} onValueChange={setTermsTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select a template…" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.scope === quotationType).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.is_default ? " · default" : ""}
                    </SelectItem>
                  ))}
                  {templates.filter(t => t.scope === quotationType).length === 0 && (
                    <div className="text-xs text-muted-foreground px-3 py-2">No templates for this scope. Create one in Terms Library.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {[
                    ["Machines total", commercials.machines_total],
                    ["Freight (3%)", commercials.freight],
                    ["Packing (1.5%)", commercials.packing],
                    ["Installation (5%)", commercials.installation],
                    ["Commissioning (3%)", commercials.commissioning],
                    [`Tax (${commercials.tax_rate}%)`, commercials.tax],
                  ].map(([k, v]) => (
                    <tr key={k as string}>
                      <td className="p-3 text-muted-foreground">{k}</td>
                      <td className="p-3 text-right font-medium">{formatMoney(v as number, currency)}</td>
                    </tr>
                  ))}
                  <tr className="bg-primary text-primary-foreground">
                    <td className="p-3 font-bold">GRAND TOTAL</td>
                    <td className="p-3 text-right font-bold text-lg">{formatMoney(commercials.grand_total, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-accent/10 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold">AI Technical Proposal</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click <b>Generate proposal</b> to have the AI writing engine draft the
                    executive summary, technical description, scope, safety, warranty and value
                    proposition — plus produce a downloadable branded PDF.
                  </p>
                </div>
              </div>
              {validationErrors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Complete before generating:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationErrors.map(e => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
              <Button
                onClick={() => create.mutate()}
                disabled={generating || create.isPending || validationErrors.length > 0}
                className="mt-1 gradient-primary w-full"
                size="lg"
              >
                {generating ? "Generating with AI…" : "✨ Generate Proposal"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 5 && (
          <Button onClick={next} className="gradient-primary">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );

  function updateMachine(idx: number, key: keyof Machine, val: any) {
    const base = machines.length ? [...machines] : [...defaultMachines];
    (base[idx] as any)[key] = val;
    setMachines(base);
  }
}
