import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, FileText } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { PRODUCT_TYPES, STATUSES } from "@/lib/proposal-catalog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proposals/")({
  component: ProposalsList,
});

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-info/15 text-info",
  negotiation: "bg-warning/15 text-warning",
  won: "bg-success/15 text-success",
  lost: "bg-destructive/15 text-destructive",
};

function ProposalsList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [product, setProduct] = useState<string>("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["proposals-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, customers(company_name, customer_name, country)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("proposals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["proposals-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtered = useMemo(() => rows.filter((p: any) => {
    if (status !== "all" && p.status !== status) return false;
    if (product !== "all" && p.product_type !== product) return false;
    if (q) {
      const s = q.toLowerCase();
      const cust = p.customers?.company_name || p.customers?.customer_name || "";
      if (![p.proposal_number, p.title, cust, p.sales_engineer].some((v: string) => v?.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [rows, q, status, product]);

  const productLabel = (v: string) => PRODUCT_TYPES.find(p => p.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          <p className="text-sm text-muted-foreground">All quotations and technical proposals.</p>
        </div>
        <Button asChild className="gradient-primary">
          <Link to="/proposals/new"><PlusCircle className="h-4 w-4 mr-1" /> New Proposal</Link>
        </Button>
      </div>

      <Card className="p-4 shadow-elegant">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search proposals…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Product" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-3">Proposal</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Capacity</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Follow-up</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-3">
                    <Link to="/proposals/$id" params={{ id: p.id }} className="flex items-center gap-2 group">
                      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center"><FileText className="h-4 w-4" /></div>
                      <div>
                        <div className="font-medium group-hover:text-primary">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{p.proposal_number}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <div>{p.customers?.company_name || p.customers?.customer_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.customers?.country}</div>
                  </td>
                  <td className="py-3 pr-3">{productLabel(p.product_type)}</td>
                  <td className="py-3 pr-3">{p.capacity}</td>
                  <td className="py-3 pr-3 font-medium">{formatMoney(Number(p.total_value || 0), p.currency)}</td>
                  <td className="py-3 pr-3">{p.follow_up_date || "-"}</td>
                  <td className="py-3 pr-3">
                    <Select value={p.status} onValueChange={v => updateStatus.mutate({ id: p.id, status: v })}>
                      <SelectTrigger className="h-8 w-32 border-0 p-0 shadow-none">
                        <Badge className={`capitalize ${STATUS_STYLES[p.status] ?? ""}`}>{p.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No proposals yet. <Link to="/proposals/new" className="text-primary hover:underline">Create your first</Link>.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
