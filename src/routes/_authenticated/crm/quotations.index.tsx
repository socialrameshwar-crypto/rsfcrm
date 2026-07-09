import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, QUOTE_STATUSES } from "@/lib/crm";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm/quotations/")({
  component: QuotesList,
});

const statusColor: Record<string, string> = {
  Draft: "bg-slate-200 text-slate-800",
  Sent: "bg-blue-100 text-blue-800",
  Accepted: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
  Expired: "bg-amber-100 text-amber-800",
};

function QuotesList() {
  const q = useQuery({
    queryKey: ["crm_quotations"],
    queryFn: async () => (await (supabase as any).from("crm_quotations").select("*, crm_companies(company_name)").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">{(q.data ?? []).length} quotations</p>
        </div>
        <Button asChild><Link to="/crm/quotations/new"><Plus className="h-4 w-4 mr-1" />New Quotation</Link></Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Quote #</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Date</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((row: any) => (
                <tr key={row.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Link to="/crm/quotations/$id" params={{ id: row.id }} className="font-mono font-medium hover:text-primary">{row.quote_no}</Link></td>
                  <td className="p-3">{row.crm_companies?.company_name || "—"}</td>
                  <td className="p-3">{row.quote_date}</td>
                  <td className="p-3 text-right font-semibold">{fmtMoney(row.grand_total, row.currency)}</td>
                  <td className="p-3"><Badge className={statusColor[row.status]} variant="secondary">{row.status}</Badge></td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No quotations yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
