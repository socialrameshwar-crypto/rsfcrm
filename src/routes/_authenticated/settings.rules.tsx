import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Save, Sparkles, Calculator } from "lucide-react";
import {
  fetchRules, fetchFormulas, seedDefaultFormulas, evalFormula, buildFormulaContext,
  type MachineSelectionRule, type UtilityFormula, type RuleItem,
} from "@/lib/rules";
import { PRODUCT_TYPES, CAPACITIES, AUTOMATIONS, MATERIALS } from "@/lib/proposal-catalog";

export const Route = createFileRoute("/_authenticated/settings/rules")({
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auto-Select & Utility Formulas</h1>
        <p className="text-sm text-muted-foreground">
          Teach the wizard which machines to load per product configuration, and edit the utility calculation formulas.
        </p>
      </div>
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><Sparkles className="h-4 w-4 mr-1" />Auto-select rules</TabsTrigger>
          <TabsTrigger value="formulas"><Calculator className="h-4 w-4 mr-1" />Utility formulas</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-6"><RulesTab /></TabsContent>
        <TabsContent value="formulas" className="mt-6"><FormulasTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Rules tab ----------------

function RulesTab() {
  const qc = useQueryClient();
  const { data: rules = [], isLoading } = useQuery({ queryKey: ["rules"], queryFn: () => fetchRules() });

  const [editing, setEditing] = useState<Partial<MachineSelectionRule> | null>(null);

  const save = useMutation({
    mutationFn: async (r: Partial<MachineSelectionRule>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload: any = {
        user_id: u.user.id,
        name: r.name || "Untitled rule",
        product_slug: r.product_slug,
        capacity: r.capacity || null,
        automation: r.automation || null,
        material: r.material || null,
        priority: r.priority ?? 0,
        items: r.items || [],
        notes: r.notes || null,
      };
      if (r.id) {
        const { error } = await (supabase as any).from("machine_selection_rules").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("machine_selection_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rules"] }); setEditing(null); toast.success("Rule saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("machine_selection_rules").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rules"] }); toast.success("Rule removed"); },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm">Rules ({rules.length})</div>
          <Button size="sm" onClick={() => setEditing({ product_slug: "toilet-soap", items: [], priority: 0 })}>
            <Plus className="h-4 w-4 mr-1" /> New rule
          </Button>
        </div>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && rules.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No rules yet. Create one to enable "Auto-select" in the wizard.
          </div>
        )}
        <div className="space-y-2">
          {rules.map(r => (
            <button
              key={r.id}
              onClick={() => setEditing(r)}
              className={`w-full text-left rounded-md border p-3 hover:bg-secondary/50 ${editing?.id === r.id ? "border-primary bg-secondary/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">P{r.priority}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {PRODUCT_TYPES.find(p => p.value === r.product_slug)?.label ?? r.product_slug}
                {r.capacity ? ` · ${r.capacity}` : ""}
                {r.automation ? ` · ${r.automation}` : ""}
                {r.material ? ` · ${r.material}` : ""}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{(r.items || []).length} machine(s)</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        {!editing && <div className="text-sm text-muted-foreground text-center py-16">Select or create a rule to edit.</div>}
        {editing && (
          <RuleEditor
            rule={editing}
            onChange={setEditing}
            onSave={() => save.mutate(editing)}
            onDelete={editing.id ? () => del.mutate(editing.id!) : undefined}
            saving={save.isPending}
          />
        )}
      </Card>
    </div>
  );
}

function RuleEditor({ rule, onChange, onSave, onDelete, saving }: {
  rule: Partial<MachineSelectionRule>;
  onChange: (r: Partial<MachineSelectionRule>) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const items = rule.items || [];
  const setItems = (next: RuleItem[]) => onChange({ ...rule, items: next });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{rule.id ? "Edit rule" : "New rule"}</div>
        <div className="flex gap-2">
          {onDelete && <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
          <Button size="sm" onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-1" />Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Rule name</Label>
          <Input value={rule.name || ""} onChange={e => onChange({ ...rule, name: e.target.value })} placeholder="e.g. Toilet soap 500 KgH SS304" />
        </div>
        <div>
          <Label>Priority</Label>
          <Input type="number" value={rule.priority ?? 0} onChange={e => onChange({ ...rule, priority: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Product</Label>
          <Select value={rule.product_slug || ""} onValueChange={v => onChange({ ...rule, product_slug: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Capacity (optional)</Label>
          <Select value={rule.capacity || "any"} onValueChange={v => onChange({ ...rule, capacity: v === "any" ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {CAPACITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Automation (optional)</Label>
          <Select value={rule.automation || "any"} onValueChange={v => onChange({ ...rule, automation: v === "any" ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {AUTOMATIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Material (optional)</Label>
          <Select value={rule.material || "any"} onValueChange={v => onChange({ ...rule, material: v === "any" ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Machines in this rule</Label>
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { name: "", qty: 1 }])}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-secondary/40">
              <tr><th className="p-2 text-left">Name</th><th className="p-2 w-16">Qty</th><th className="p-2 w-28">Capacity</th><th className="p-2 w-24">Motor</th><th className="p-2 w-24">MOC</th><th className="p-2 w-28 text-right">Unit price</th><th className="w-8"></th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1"><Input value={it.name} onChange={e => { const n = [...items]; n[i] = { ...it, name: e.target.value }; setItems(n); }} /></td>
                  <td className="p-1"><Input type="number" value={it.qty} onChange={e => { const n = [...items]; n[i] = { ...it, qty: Number(e.target.value) || 1 }; setItems(n); }} /></td>
                  <td className="p-1"><Input value={it.capacity || ""} onChange={e => { const n = [...items]; n[i] = { ...it, capacity: e.target.value }; setItems(n); }} /></td>
                  <td className="p-1"><Input value={it.motor || ""} onChange={e => { const n = [...items]; n[i] = { ...it, motor: e.target.value }; setItems(n); }} /></td>
                  <td className="p-1"><Input value={it.material || ""} onChange={e => { const n = [...items]; n[i] = { ...it, material: e.target.value }; setItems(n); }} /></td>
                  <td className="p-1"><Input type="number" className="text-right" value={it.unit_price || 0} onChange={e => { const n = [...items]; n[i] = { ...it, unit_price: Number(e.target.value) || 0 }; setItems(n); }} /></td>
                  <td className="p-1"><Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-6 text-sm">No machines yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={rule.notes || ""} onChange={e => onChange({ ...rule, notes: e.target.value })} rows={2} placeholder="Internal notes about when to use this rule…" />
      </div>
    </div>
  );
}

// ---------------- Formulas tab ----------------

function FormulasTab() {
  const qc = useQueryClient();
  const { data: formulas = [], isLoading } = useQuery({ queryKey: ["formulas"], queryFn: fetchFormulas });

  const seed = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      await seedDefaultFormulas(u.user.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formulas"] }); toast.success("Default formulas loaded"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsert = useMutation({
    mutationFn: async (f: Partial<UtilityFormula>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload: any = {
        user_id: u.user.id,
        product_slug: f.product_slug || null,
        key: f.key,
        label: f.label,
        unit: f.unit || null,
        expression: f.expression,
        sort_order: f.sort_order ?? 0,
      };
      if (f.id) {
        const { error } = await (supabase as any).from("utility_formulas").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("utility_formulas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formulas"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("utility_formulas").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formulas"] }); },
  });

  const [drafts, setDrafts] = useState<Record<string, Partial<UtilityFormula>>>({});
  const draftOf = (f: UtilityFormula) => ({ ...f, ...(drafts[f.id] || {}) });
  const setDraft = (id: string, patch: Partial<UtilityFormula>) => setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));

  // Live preview context
  const previewCtx = buildFormulaContext("toilet-soap", "500 Kg/hr", "Semi Automatic", [
    { qty: 1, motor: "7.5" }, { qty: 1, motor: "15" }, { qty: 1, motor: "20" },
  ]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold">Utility formulas ({formulas.length})</div>
          <div className="text-xs text-muted-foreground">
            Variables: <code>capKg, connectedKw, runningKw, totalHp, autMul, product, machineCount, qtySum</code> · Functions: <code>round, ceil, floor, max, min, sqrt, abs</code>
          </div>
        </div>
        <div className="flex gap-2">
          {formulas.length === 0 && <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>Load default formulas</Button>}
          <Button size="sm" variant="outline" onClick={() => upsert.mutate({ key: "new_metric", label: "New metric", unit: "", expression: "0", sort_order: formulas.length + 1 })}>
            <Plus className="h-4 w-4 mr-1" /> Add formula
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground bg-secondary/40">
            <tr>
              <th className="p-2 text-left">Label</th>
              <th className="p-2 text-left w-32">Key</th>
              <th className="p-2 text-left w-24">Unit</th>
              <th className="p-2 text-left">Expression</th>
              <th className="p-2 text-right w-28">Preview</th>
              <th className="p-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {formulas.map(f => {
              const d = draftOf(f);
              const preview = evalFormula(d.expression || "", previewCtx);
              const dirty = !!drafts[f.id];
              return (
                <tr key={f.id} className="border-t">
                  <td className="p-1"><Input value={d.label || ""} onChange={e => setDraft(f.id, { label: e.target.value })} /></td>
                  <td className="p-1"><Input value={d.key || ""} onChange={e => setDraft(f.id, { key: e.target.value })} /></td>
                  <td className="p-1"><Input value={d.unit || ""} onChange={e => setDraft(f.id, { unit: e.target.value })} /></td>
                  <td className="p-1"><Input className="font-mono text-xs" value={d.expression || ""} onChange={e => setDraft(f.id, { expression: e.target.value })} /></td>
                  <td className="p-1 text-right font-mono text-xs">{String(preview)} {d.unit}</td>
                  <td className="p-1">
                    <div className="flex gap-1 justify-end">
                      {dirty && <Button size="sm" onClick={() => { upsert.mutate({ ...f, ...drafts[f.id] }); setDrafts(x => { const n = { ...x }; delete n[f.id]; return n; }); }}><Save className="h-3.5 w-3.5" /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {formulas.length === 0 && !isLoading && (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No formulas yet. Click "Load default formulas" to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Preview evaluated against sample plant: toilet-soap · 500 Kg/hr · Semi Automatic · 3 sample machines.
      </div>
    </Card>
  );
}
