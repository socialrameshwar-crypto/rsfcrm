import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUSES, fmtMoney } from "@/lib/crm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crm/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["crm_orders"],
    queryFn: async () => (await (supabase as any).from("crm_orders").select("*, crm_quotations(quote_no,currency,crm_companies(company_name))").order("created_at", { ascending: false })).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: any) => { const { error } = await (supabase as any).from("crm_orders").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_orders"] }); toast.success("Saved"); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Orders</h1>
      <div className="grid gap-4">
        {(orders.data ?? []).map((o: any) => {
          const stepIdx = ORDER_STATUSES.indexOf(o.production_status);
          return (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base font-mono">{o.order_no}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {o.crm_quotations?.crm_companies?.company_name || "—"} · from {o.crm_quotations?.quote_no || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Order value</div>
                  <div className="font-bold text-lg">{fmtMoney(o.order_value, o.crm_quotations?.currency || "INR")}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-1 flex-wrap">
                  {ORDER_STATUSES.map((s, i) => (
                    <div key={s} className={cn("flex-1 min-w-[80px] py-2 px-3 rounded text-xs text-center font-medium",
                      i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{s}</div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div><Label className="text-xs">Status</Label>
                    <Select value={o.production_status} onValueChange={v => update.mutate({ id: o.id, patch: { production_status: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Expected Dispatch</Label><Input type="date" defaultValue={o.expected_dispatch || ""} onBlur={e => e.target.value !== o.expected_dispatch && update.mutate({ id: o.id, patch: { expected_dispatch: e.target.value || null } })} /></div>
                  <div><Label className="text-xs">Actual Dispatch</Label><Input type="date" defaultValue={o.actual_dispatch || ""} onBlur={e => e.target.value !== o.actual_dispatch && update.mutate({ id: o.id, patch: { actual_dispatch: e.target.value || null } })} /></div>
                  <div><Label className="text-xs">Order Date</Label><div className="text-sm py-2">{o.order_date}</div></div>
                  <div className="sm:col-span-2 lg:col-span-4"><Label className="text-xs">Transport / Tracking</Label>
                    <Textarea rows={2} defaultValue={o.transport_details || ""} onBlur={e => e.target.value !== o.transport_details && update.mutate({ id: o.id, patch: { transport_details: e.target.value } })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(orders.data ?? []).length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No orders yet. Accept a quotation and convert it to an order.</CardContent></Card>}
      </div>
    </div>
  );
}
