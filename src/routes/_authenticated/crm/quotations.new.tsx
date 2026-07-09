import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/crm";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({ lead_id: z.string().optional() });
export const Route = createFileRoute("/_authenticated/crm/quotations/new")({
  validateSearch: search,
  component: NewQuote,
});

type Item = {
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  capacity: string;
  motor: string;
  moc: string;
};

function NewQuote() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { lead_id } = Route.useSearch();

  const companies = useQuery({
    queryKey: ["crm_companies"],
    queryFn: async () => (await (supabase as any).from("crm_companies").select("*").order("company_name")).data ?? [],
  });
  const products = useQuery({
    queryKey: ["crm_products"],
    queryFn: async () => (await (supabase as any).from("crm_products").select("*").order("name")).data ?? [],
  });
  const leads = useQuery({
    queryKey: ["crm_leads_lite"],
    queryFn: async () => (await (supabase as any).from("crm_leads").select("id,company_name,company_id,country")).data ?? [],
  });

  const [companyId, setCompanyId] = useState<string | "none">("none");
  const [leadId, setLeadId] = useState<string | "none">(lead_id || "none");
  const [items, setItems] = useState<Item[]>([]);
  const [payment, setPayment] = useState("50% advance, 50% before dispatch");
  const [validity, setValidity] = useState(30);
  const [gstMode, setGstMode] = useState<"cgst_sgst" | "igst" | "export">("igst");

  // Sales Engineer + Subject + Intro
  const [subject, setSubject] = useState("");
  const [introNote, setIntroNote] = useState("");
  const [seName, setSeName] = useState("");
  const [sePhone, setSePhone] = useState("");
  const [seEmail, setSeEmail] = useState("");

  // Prefill sales engineer with current user
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        if (!seName) setSeName((u.user.user_metadata as any)?.full_name || u.user.email?.split("@")[0] || "");
        if (!seEmail) setSeEmail(u.user.email || "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (leadId !== "none" && leads.data) {
      const l = leads.data.find((x: any) => x.id === leadId);
      if (l?.company_id) setCompanyId(l.company_id);
      if (l?.country && l.country !== "India") setGstMode("export");
    }
  }, [leadId, leads.data]);

  const currency = gstMode === "export" ? "USD" : "INR";

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
    let cgst = 0, sgst = 0, igst = 0;
    if (gstMode === "cgst_sgst") { cgst = subtotal * 0.09; sgst = subtotal * 0.09; }
    else if (gstMode === "igst") igst = subtotal * 0.18;
    const grand = subtotal + cgst + sgst + igst;
    return { subtotal, cgst, sgst, igst, grand };
  }, [items, gstMode]);

  const addItem = () => setItems(s => [...s, { product_id: null, product_name: "", qty: 1, unit_price: 0, capacity: "", motor: "", moc: "" }]);
  const setItem = (i: number, patch: Partial<Item>) => setItems(s => s.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const rmItem = (i: number) => setItems(s => s.filter((_, idx) => idx !== i));
  const pickProduct = (i: number, productId: string) => {
    const p = (products.data ?? []).find((x: any) => x.id === productId);
    if (!p) return;
    setItem(i, {
      product_id: productId,
      product_name: p.name,
      unit_price: currency === "USD" ? Number(p.export_price_usd) : Number(p.domestic_price_inr),
    });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error("Add at least one item");
      const { data: u } = await supabase.auth.getUser();
      const { data: quote, error } = await (supabase as any).from("crm_quotations").insert({
        user_id: u.user?.id,
        lead_id: leadId === "none" ? null : leadId,
        company_id: companyId === "none" ? null : companyId,
        payment_terms: payment, validity_days: validity, currency,
        subtotal: totals.subtotal, tax_mode: gstMode,
        cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
        grand_total: totals.grand, status: "Draft",
        subject: subject || null,
        intro_note: introNote || null,
        sales_engineer_name: seName || null,
        sales_engineer_phone: sePhone || null,
        sales_engineer_email: seEmail || null,
      }).select().single();
      if (error) throw error;
      const rows = items.map(it => ({
        quotation_id: quote.id, product_id: it.product_id, product_name: it.product_name,
        qty: it.qty, unit_price: it.unit_price, line_total: it.qty * it.unit_price,
        capacity: it.capacity || null, motor: it.motor || null, moc: it.moc || null,
      }));
      const { error: ie } = await (supabase as any).from("crm_quotation_items").insert(rows);
      if (ie) throw ie;
      return quote;
    },
    onSuccess: (q) => { qc.invalidateQueries({ queryKey: ["crm_quotations"] }); toast.success(`Created ${q.quote_no}`); navigate({ to: "/crm/quotations/$id", params: { id: q.id } }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">New Quotation</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>Linked Lead</Label>
            <Select value={leadId} onValueChange={(v) => setLeadId(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">— None —</SelectItem>{(leads.data ?? []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.company_name} ({l.country})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Customer Company</Label>
            <Select value={companyId} onValueChange={(v) => setCompanyId(v as any)}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent><SelectItem value="none">— None —</SelectItem>{(companies.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Subject (shown on PDF)</Label>
            <Input placeholder="e.g. Offer for Toilet Soap Plant — 500 Kg/hr | Semi Automatic | SS304" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div><Label>Tax Mode</Label>
            <Select value={gstMode} onValueChange={(v) => setGstMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cgst_sgst">CGST + SGST (Intra-state)</SelectItem>
                <SelectItem value="igst">IGST (Inter-state)</SelectItem>
                <SelectItem value="export">Export — No GST (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Validity (days)</Label><Input type="number" value={validity} onChange={e => setValidity(Number(e.target.value))} /></div>
          <div className="sm:col-span-2"><Label>Payment Terms</Label><Textarea rows={2} value={payment} onChange={e => setPayment(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Intro / Cover Note (shown after "Dear Sir")</Label>
            <Textarea rows={3} placeholder="Leave blank for a professional default." value={introNote} onChange={e => setIntroNote(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sales Engineer (signature on PDF)</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div><Label>Name</Label><Input value={seName} onChange={e => setSeName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={sePhone} onChange={e => setSePhone(e.target.value)} placeholder="+91 …" /></div>
          <div><Label>Email</Label><Input value={seEmail} onChange={e => setSeEmail(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="grid gap-2 md:grid-cols-[2fr_80px_120px_120px_40px] items-end">
                <div>
                  <Label className="text-xs">Product</Label>
                  <Select value={it.product_id || "custom"} onValueChange={(v) => v === "custom" ? setItem(i, { product_id: null }) : pickProduct(i, v)}>
                    <SelectTrigger><SelectValue placeholder="Pick or custom" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">— Custom line —</SelectItem>
                      {(products.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="mt-1" placeholder="Description / name" value={it.product_name} onChange={e => setItem(i, { product_name: e.target.value })} />
                </div>
                <div><Label className="text-xs">Qty</Label><Input type="number" value={it.qty} onChange={e => setItem(i, { qty: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Unit price</Label><Input type="number" value={it.unit_price} onChange={e => setItem(i, { unit_price: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Amount</Label><div className="text-sm font-semibold py-2">{fmtMoney(it.qty * it.unit_price, currency)}</div></div>
                <Button size="icon" variant="ghost" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div><Label className="text-xs">Capacity</Label><Input placeholder="e.g. 500 kg/hr" value={it.capacity} onChange={e => setItem(i, { capacity: e.target.value })} /></div>
                <div><Label className="text-xs">Motor</Label><Input placeholder="e.g. 15 HP" value={it.motor} onChange={e => setItem(i, { motor: e.target.value })} /></div>
                <div><Label className="text-xs">MOC</Label><Input placeholder="e.g. SS304" value={it.moc} onChange={e => setItem(i, { moc: e.target.value })} /></div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">Add items to build the quote</div>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1 text-sm max-w-sm ml-auto">
          <Row label="Subtotal" value={fmtMoney(totals.subtotal, currency)} />
          {gstMode === "cgst_sgst" && <><Row label="CGST 9%" value={fmtMoney(totals.cgst, currency)} /><Row label="SGST 9%" value={fmtMoney(totals.sgst, currency)} /></>}
          {gstMode === "igst" && <Row label="IGST 18%" value={fmtMoney(totals.igst, currency)} />}
          {gstMode === "export" && <Row label="Tax" value="Export — No GST" />}
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>Grand Total</span><span className="text-primary">{fmtMoney(totals.grand, currency)}</span></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/crm/quotations" })}>Cancel</Button>
        <Button disabled={items.length === 0 || create.isPending} onClick={() => create.mutate()}>Save Quotation</Button>
      </div>
    </div>
  );
}
function Row({ label, value }: any) { return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>; }
