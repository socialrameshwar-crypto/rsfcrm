import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtINR, fmtUSD, PRODUCT_CATEGORIES } from "@/lib/crm";
import { Plus, Package, Edit } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const products = useQuery({
    queryKey: ["crm_products"],
    queryFn: async () => (await (supabase as any).from("crm_products").select("*").order("name")).data ?? [],
  });
  const stats = useQuery({
    queryKey: ["crm_product_stats"],
    queryFn: async () => (await (supabase as any).from("crm_product_stats").select("*")).data ?? [],
  });
  const statMap = Object.fromEntries((stats.data ?? []).map((s: any) => [s.product_id, s.quotation_count]));

  const rows = (products.data ?? []).filter((p: any) =>
    (cat === "all" || p.category === cat) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search…" className="w-64" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p: any) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="h-40 bg-muted grid place-items-center">
              {p.image_url ? <img src={p.image_url} className="h-full w-full object-cover" /> : <Package className="h-16 w-16 opacity-30" />}
            </div>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
              </div>
              {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{p.production_status}</Badge>
                {p.hsn_code && <Badge variant="outline">HSN {p.hsn_code}</Badge>}
                <Badge variant="outline">Used in {statMap[p.id] || 0} quotes</Badge>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t">
                <span>Domestic: <b>{fmtINR(p.domestic_price_inr)}</b> +{p.gst_pct}%</span>
                <span>Export: <b>{fmtUSD(p.export_price_usd)}</b></span>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No products</CardContent></Card>}
      </div>

      <ProductDialog open={open} setOpen={setOpen} product={editing} />
    </div>
  );
}

function ProductDialog({ open, setOpen, product }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(product || {
    name: "", category: "Soap Making Machinery", description: "",
    domestic_price_inr: 0, gst_pct: 18, export_price_usd: 0,
    hsn_code: "", production_status: "Made to Order", image_url: "",
  });
  // reset on open
  useState(() => { setForm(product || form); });

  const save = useMutation({
    mutationFn: async () => {
      if (product?.id) {
        const { error } = await (supabase as any).from("crm_products").update(form).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await (supabase as any).from("crm_products").insert({ ...form, user_id: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_products"] }); toast.success("Saved"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Production Status</Label>
            <Select value={form.production_status} onValueChange={v => set("production_status", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="In Stock">In Stock</SelectItem><SelectItem value="Made to Order">Made to Order</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
          <div><Label>Domestic Price (INR)</Label><Input type="number" value={form.domestic_price_inr} onChange={e => set("domestic_price_inr", Number(e.target.value))} /></div>
          <div><Label>GST %</Label><Input type="number" value={form.gst_pct} onChange={e => set("gst_pct", Number(e.target.value))} /></div>
          <div><Label>Export Price (USD)</Label><Input type="number" value={form.export_price_usd} onChange={e => set("export_price_usd", Number(e.target.value))} /></div>
          <div><Label>HSN Code</Label><Input value={form.hsn_code || ""} onChange={e => set("hsn_code", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Image URL</Label><Input value={form.image_url || ""} onChange={e => set("image_url", e.target.value)} placeholder="https://…" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!form.name || save.isPending} onClick={() => save.mutate()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
