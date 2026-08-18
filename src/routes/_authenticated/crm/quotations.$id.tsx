import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, QUOTE_STATUSES } from "@/lib/crm";
import { generateQuotationPDF } from "@/lib/crm-pdf";
import { listTemplates } from "@/lib/templates";
import { generateProposalPdf } from "@/lib/templates.functions";
import { ArrowLeft, Download, ShoppingCart, Trash2, FileText, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/quotations/$id")({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateProposalPdf);

  const q = useQuery({
    queryKey: ["crm_quote", id],
    queryFn: async () => (await (supabase as any).from("crm_quotations").select("*, crm_companies(*)").eq("id", id).single()).data,
  });
  const items = useQuery({
    queryKey: ["crm_quote_items", id],
    queryFn: async () => (await (supabase as any).from("crm_quotation_items").select("*").eq("quotation_id", id)).data ?? [],
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates,
  });

  const [selTemplateId, setSelTemplateId] = useState<string>("");

  useEffect(() => {
    if (templates.data?.length && !selTemplateId) {
      const def = templates.data.find(t => t.is_default) || templates.data[0];
      setSelTemplateId(def.id);
    }
  }, [templates.data]);

  const runTemplateGen = async () => {
    if (!selTemplateId) return toast.error("Select a template first");
    try {
      toast.loading("Generating pixel-perfect PDF...");
      await generate({ data: { proposalId: id, templateId: selTemplateId } });
      toast.dismiss();
      toast.success("PDF Generated using Template");
      q.refetch();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message);
    }
  };

  const updateStatus = useMutation({
    mutationFn: async (status: string) => { const { error } = await (supabase as any).from("crm_quotations").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_quote", id] }); toast.success("Status updated"); },
  });
  const del = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("crm_quotations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/crm/quotations" }); },
  });
  const createOrder = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("crm_orders").insert({
        user_id: u.user?.id, quotation_id: id, order_value: q.data?.grand_total,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Order created"); navigate({ to: "/crm/orders" }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (q.isLoading) return <div>Loading…</div>;
  const Q = q.data;
  if (!Q) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/quotations" })}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-mono">{Q.quote_no}</h1>
          <div className="text-sm text-muted-foreground">{Q.crm_companies?.company_name || "—"} · {Q.quote_date}</div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={Q.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{QUOTE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>

          <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/30">
            <Select value={selTemplateId} onValueChange={setSelTemplateId}>
              <SelectTrigger className="w-48 h-8 text-xs border-none bg-transparent"><SelectValue placeholder="Select Template" /></SelectTrigger>
              <SelectContent>
                {templates.data?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1 gradient-primary" onClick={runTemplateGen} disabled={!selTemplateId}>
              <Sparkles className="h-3.5 w-3.5" /> Template Gen
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => generateQuotationPDF(Q, items.data ?? [], Q.crm_companies)}>
            <Download className="h-4 w-4 mr-1" />Standard PDF
          </Button>
          {Q.status === "Accepted" && (
            <Button size="sm" onClick={() => createOrder.mutate()}><ShoppingCart className="h-4 w-4 mr-1" />Convert to Order</Button>
          )}
          <Button variant="destructive" size="icon" onClick={() => confirm("Delete quotation?") && del.mutate()}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Product</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Unit</th><th className="text-right p-3">Amount</th></tr>
            </thead>
            <tbody>
              {(items.data ?? []).map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="p-3">{it.product_name}</td>
                  <td className="p-3 text-right">{it.qty}</td>
                  <td className="p-3 text-right">{fmtMoney(it.unit_price, Q.currency)}</td>
                  <td className="p-3 text-right font-semibold">{fmtMoney(it.line_total, Q.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1 text-sm max-w-sm ml-auto">
          <Row label="Subtotal" value={fmtMoney(Q.subtotal, Q.currency)} />
          {Q.tax_mode === "cgst_sgst" && <><Row label="CGST" value={fmtMoney(Q.cgst, Q.currency)} /><Row label="SGST" value={fmtMoney(Q.sgst, Q.currency)} /></>}
          {Q.tax_mode === "igst" && <Row label="IGST" value={fmtMoney(Q.igst, Q.currency)} />}
          {Q.tax_mode === "export" && <Row label="Tax" value="Export — No GST" />}
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>Grand Total</span><span className="text-primary">{fmtMoney(Q.grand_total, Q.currency)}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Terms & Details</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><b>Payment Terms:</b> {Q.payment_terms}</div>
          <div><b>Validity:</b> {Q.validity_days} days from {Q.quote_date}</div>
          <div><b>Currency:</b> {Q.currency}</div>
        </CardContent>
      </Card>
    </div>
  );
}
function Row({ label, value }: any) { return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>; }
