import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Copy, Archive, ArchiveRestore, Eye, EyeOff, ChevronUp, ChevronDown, Sparkles, Package,
} from "lucide-react";
import { fetchCategories, fetchMachines, emptyMachine, seedDefaultCategories, type ProductCategory, type DbMachine } from "@/lib/products";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings/products")({
  component: ProductManagement,
});

function ProductManagement() {
  const qc = useQueryClient();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [catDialog, setCatDialog] = useState<Partial<ProductCategory> | null>(null);
  const [machineDialog, setMachineDialog] = useState<Partial<DbMachine> | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["product-categories"],
    queryFn: fetchCategories,
  });

  const activeCat = selectedCat ?? categories[0]?.id ?? null;

  const { data: machines = [] } = useQuery({
    queryKey: ["machines", activeCat],
    queryFn: () => (activeCat ? fetchMachines(activeCat) : Promise.resolve([])),
    enabled: !!activeCat,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["product-categories"] });
    qc.invalidateQueries({ queryKey: ["machines"] });
  };

  const seed = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      return seedDefaultCategories(u.user.id);
    },
    onSuccess: () => { toast.success("Default categories added"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCategory = useMutation({
    mutationFn: async (c: Partial<ProductCategory>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (c.id) {
        const { error } = await (supabase as any).from("product_categories").update({
          name: c.name, slug: c.slug, sort_order: c.sort_order, hidden: c.hidden,
        }).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("product_categories").insert({
          user_id: u.user.id,
          name: c.name,
          slug: c.slug || null,
          sort_order: categories.length,
          hidden: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { setCatDialog(null); invalidate(); toast.success("Category saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Category deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleHidden = useMutation({
    mutationFn: async (c: ProductCategory) => {
      const { error } = await (supabase as any).from("product_categories").update({ hidden: !c.hidden }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderCategory = useMutation({
    mutationFn: async ({ c, dir }: { c: ProductCategory; dir: -1 | 1 }) => {
      const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex(x => x.id === c.id);
      const swap = sorted[idx + dir];
      if (!swap) return;
      await (supabase as any).from("product_categories").update({ sort_order: swap.sort_order }).eq("id", c.id);
      await (supabase as any).from("product_categories").update({ sort_order: c.sort_order }).eq("id", swap.id);
    },
    onSuccess: invalidate,
  });

  const saveMachine = useMutation({
    mutationFn: async (m: Partial<DbMachine>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload: any = {
        category_id: m.category_id ?? activeCat,
        name: m.name, code: m.code, image_url: m.image_url,
        capacity: m.capacity, material: m.material, motor: m.motor,
        power_kw: m.power_kw, dimensions: m.dimensions, weight: m.weight,
        description: m.description,
        features: m.features ?? [],
        applications: m.applications ?? [],
        std_accessories: m.std_accessories ?? [],
        optional_accessories: m.optional_accessories ?? [],
        warranty: m.warranty,
        base_price: m.base_price ?? 0,
        dealer_price: m.dealer_price ?? 0,
        customer_price: m.customer_price ?? 0,
        export_price: m.export_price ?? 0,
        discount_pct: m.discount_pct ?? 0,
        currency: m.currency ?? "INR",
        tax_pct: m.tax_pct ?? 18,
        freight_pct: m.freight_pct ?? 3,
        packing_pct: m.packing_pct ?? 1.5,
        install_pct: m.install_pct ?? 5,
        commissioning_pct: m.commissioning_pct ?? 3,
        archived: m.archived ?? false,
        sort_order: m.sort_order ?? machines.length,
      };
      if (m.id) {
        const { error } = await (supabase as any).from("machines").update(payload).eq("id", m.id);
        if (error) throw error;
      } else {
        payload.user_id = u.user.id;
        const { error } = await (supabase as any).from("machines").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { setMachineDialog(null); invalidate(); toast.success("Machine saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMachine = useMutation({
    mutationFn: async (m: DbMachine) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { id, created_at, updated_at, ...rest } = m;
      const { error } = await (supabase as any).from("machines").insert({ ...rest, name: rest.name + " (Copy)" });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Duplicated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMachine = useMutation({
    mutationFn: async (m: DbMachine) => {
      const { error } = await (supabase as any).from("machines").update({ archived: !m.archived }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMachine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("machines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Machine deleted"); },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Management</h1>
          <p className="text-sm text-muted-foreground">Manage every category, machine, specification and price used across proposals.</p>
        </div>
        <div className="flex gap-2">
          {!catsLoading && categories.length === 0 && (
            <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
              <Sparkles className="h-4 w-4 mr-1" /> Seed default categories
            </Button>
          )}
          <Button onClick={() => setCatDialog({ name: "" })}>
            <Plus className="h-4 w-4 mr-1" /> New category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Categories */}
        <Card className="p-3 shadow-elegant h-fit">
          <div className="px-2 pb-2 text-xs uppercase text-muted-foreground font-medium">Categories</div>
          {catsLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {!catsLoading && categories.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No categories yet. Seed the defaults or create your first one.</div>
          )}
          <div className="space-y-1">
            {[...categories].sort((a, b) => a.sort_order - b.sort_order).map((c, i) => {
              const active = c.id === activeCat;
              return (
                <div key={c.id} className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${active ? "bg-secondary" : "hover:bg-secondary/50"}`}>
                  <button onClick={() => setSelectedCat(c.id)} className="flex-1 text-left text-sm truncate flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 opacity-60" />
                    <span className={c.hidden ? "line-through opacity-60" : ""}>{c.name}</span>
                  </button>
                  <button title="Move up" disabled={i === 0} onClick={() => reorderCategory.mutate({ c, dir: -1 })} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded"><ChevronUp className="h-3 w-3" /></button>
                  <button title="Move down" disabled={i === categories.length - 1} onClick={() => reorderCategory.mutate({ c, dir: 1 })} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded"><ChevronDown className="h-3 w-3" /></button>
                  <button title={c.hidden ? "Show" : "Hide"} onClick={() => toggleHidden.mutate(c)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded">
                    {c.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button title="Edit" onClick={() => setCatDialog(c)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded"><Pencil className="h-3 w-3" /></button>
                  <button title="Delete" onClick={() => { if (confirm(`Delete "${c.name}"? Machines will be unlinked.`)) deleteCategory.mutate(c.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Machines */}
        <Card className="p-4 shadow-elegant">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">
                {categories.find(c => c.id === activeCat)?.name || "Machines"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {machines.length} machine{machines.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button size="sm" disabled={!activeCat} onClick={() => {
              // ensure userId is filled at save time
              setMachineDialog({ ...emptyMachine("", activeCat), category_id: activeCat });
            }}>
              <Plus className="h-4 w-4 mr-1" /> Add machine
            </Button>
          </div>

          {!activeCat && <div className="text-sm text-muted-foreground p-8 text-center">Select a category on the left.</div>}
          {activeCat && machines.length === 0 && (
            <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md">
              No machines in this category yet. Click <b>Add machine</b> to create one.
            </div>
          )}

          {machines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-2">Machine</th>
                    <th className="py-2 pr-2">Code</th>
                    <th className="py-2 pr-2">Capacity</th>
                    <th className="py-2 pr-2">Motor</th>
                    <th className="py-2 pr-2">MOC</th>
                    <th className="py-2 pr-2 text-right">Customer price</th>
                    <th className="py-2 pr-2 w-40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map(m => (
                    <tr key={m.id} className={`border-b last:border-0 ${m.archived ? "opacity-50" : ""}`}>
                      <td className="py-2 pr-2 font-medium">{m.name}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{m.code || "—"}</td>
                      <td className="py-2 pr-2">{m.capacity || "—"}</td>
                      <td className="py-2 pr-2">{m.motor || "—"}</td>
                      <td className="py-2 pr-2">{m.material || "—"}</td>
                      <td className="py-2 pr-2 text-right">{formatMoney(m.customer_price || m.base_price, m.currency)}</td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => setMachineDialog(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicateMachine.mutate(m)}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" title={m.archived ? "Unarchive" : "Archive"} onClick={() => archiveMachine.mutate(m)}>
                            {m.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" title="Delete" className="text-destructive" onClick={() => { if (confirm(`Delete ${m.name}?`)) deleteMachine.mutate(m.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Category dialog */}
      <Dialog open={!!catDialog} onOpenChange={o => !o && setCatDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{catDialog?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          {catDialog && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={catDialog.name || ""} onChange={e => setCatDialog({ ...catDialog, name: e.target.value })} /></div>
              <div><Label>Slug (optional)</Label><Input value={catDialog.slug || ""} onChange={e => setCatDialog({ ...catDialog, slug: e.target.value })} placeholder="toilet-soap" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(null)}>Cancel</Button>
            <Button disabled={!catDialog?.name} onClick={() => catDialog && saveCategory.mutate(catDialog)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machine dialog */}
      <MachineDialog value={machineDialog} onChange={setMachineDialog} onSave={m => saveMachine.mutate(m)} saving={saveMachine.isPending} />
    </div>
  );
}

function MachineDialog({
  value, onChange, onSave, saving,
}: {
  value: Partial<DbMachine> | null;
  onChange: (v: Partial<DbMachine> | null) => void;
  onSave: (m: Partial<DbMachine>) => void;
  saving: boolean;
}) {
  const m = value;
  const set = (patch: Partial<DbMachine>) => onChange({ ...(m || {}), ...patch });
  const listField = (key: keyof DbMachine, label: string) => (
    <div>
      <Label>{label} <span className="text-xs text-muted-foreground">(one per line)</span></Label>
      <Textarea
        value={((m?.[key] as string[]) || []).join("\n")}
        onChange={e => set({ [key]: e.target.value.split("\n").filter(Boolean) } as any)}
        rows={3}
      />
    </div>
  );

  return (
    <Dialog open={!!m} onOpenChange={o => !o && onChange(null)}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{m?.id ? "Edit machine" : "New machine"}</DialogTitle></DialogHeader>
        {m && (
          <div className="space-y-5">
            <section>
              <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Identity</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={m.name || ""} onChange={e => set({ name: e.target.value })} /></div>
                <div><Label>Machine code</Label><Input value={m.code || ""} onChange={e => set({ code: e.target.value })} placeholder="RSF-TSP-500" /></div>
                <div className="md:col-span-2"><Label>Image URL</Label><Input value={m.image_url || ""} onChange={e => set({ image_url: e.target.value })} placeholder="https://…" /></div>
              </div>
            </section>

            <section>
              <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Technical specifications</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label>Capacity</Label><Input value={m.capacity || ""} onChange={e => set({ capacity: e.target.value })} placeholder="500 kg/hr" /></div>
                <div><Label>Material (MOC)</Label><Input value={m.material || ""} onChange={e => set({ material: e.target.value })} placeholder="SS304" /></div>
                <div><Label>Motor</Label><Input value={m.motor || ""} onChange={e => set({ motor: e.target.value })} placeholder="15 HP" /></div>
                <div><Label>Power (kW)</Label><Input type="number" value={m.power_kw ?? ""} onChange={e => set({ power_kw: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>Dimensions</Label><Input value={m.dimensions || ""} onChange={e => set({ dimensions: e.target.value })} placeholder="L×W×H mm" /></div>
                <div><Label>Weight</Label><Input value={m.weight || ""} onChange={e => set({ weight: e.target.value })} placeholder="1200 kg" /></div>
              </div>
              <div className="mt-3">
                <Label>Description</Label>
                <Textarea rows={3} value={m.description || ""} onChange={e => set({ description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {listField("features", "Features")}
                {listField("applications", "Applications")}
                {listField("std_accessories", "Standard accessories")}
                <div>
                  <Label>Optional accessories <span className="text-xs text-muted-foreground">(one per line: <code>Name | Price</code>)</span></Label>
                  <Textarea
                    rows={3}
                    value={(m.optional_accessories || []).map(a => `${a.name} | ${a.price}`).join("\n")}
                    onChange={e => set({
                      optional_accessories: e.target.value.split("\n").filter(Boolean).map(l => {
                        const [name, price] = l.split("|").map(s => s.trim());
                        return { name: name || "", price: Number(price) || 0 };
                      }),
                    })}
                  />
                </div>
              </div>
              <div className="mt-3"><Label>Warranty</Label><Input value={m.warranty || ""} onChange={e => set({ warranty: e.target.value })} placeholder="12 months from commissioning" /></div>
            </section>

            <section>
              <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Pricing & charges</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Currency</Label><Input value={m.currency || "INR"} onChange={e => set({ currency: e.target.value.toUpperCase() })} /></div>
                <div><Label>Base price</Label><Input type="number" value={m.base_price ?? 0} onChange={e => set({ base_price: Number(e.target.value) })} /></div>
                <div><Label>Dealer price</Label><Input type="number" value={m.dealer_price ?? 0} onChange={e => set({ dealer_price: Number(e.target.value) })} /></div>
                <div><Label>Customer price</Label><Input type="number" value={m.customer_price ?? 0} onChange={e => set({ customer_price: Number(e.target.value) })} /></div>
                <div><Label>Export price</Label><Input type="number" value={m.export_price ?? 0} onChange={e => set({ export_price: Number(e.target.value) })} /></div>
                <div><Label>Discount %</Label><Input type="number" value={m.discount_pct ?? 0} onChange={e => set({ discount_pct: Number(e.target.value) })} /></div>
                <div><Label>Tax %</Label><Input type="number" value={m.tax_pct ?? 0} onChange={e => set({ tax_pct: Number(e.target.value) })} /></div>
                <div><Label>Freight %</Label><Input type="number" value={m.freight_pct ?? 0} onChange={e => set({ freight_pct: Number(e.target.value) })} /></div>
                <div><Label>Packing %</Label><Input type="number" value={m.packing_pct ?? 0} onChange={e => set({ packing_pct: Number(e.target.value) })} /></div>
                <div><Label>Installation %</Label><Input type="number" value={m.install_pct ?? 0} onChange={e => set({ install_pct: Number(e.target.value) })} /></div>
                <div><Label>Commissioning %</Label><Input type="number" value={m.commissioning_pct ?? 0} onChange={e => set({ commissioning_pct: Number(e.target.value) })} /></div>
              </div>
            </section>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>Cancel</Button>
          <Button disabled={!m?.name || saving} onClick={() => m && onSave(m)}>{saving ? "Saving…" : "Save machine"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
