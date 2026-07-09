import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COUNTRIES, LEAD_SOURCES, LEAD_STAGES, stageColor } from "@/lib/crm";
import { LayoutGrid, List, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/leads/")({
  component: LeadsPage,
});

function LeadsPage() {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [fSource, setFSource] = useState("all");
  const [fCountry, setFCountry] = useState("all");
  const [fStage, setFStage] = useState("all");
  const [q, setQ] = useState("");

  const leads = useQuery({
    queryKey: ["crm_leads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_leads").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const rows = (leads.data ?? []).filter((l: any) =>
    (fSource === "all" || l.source === fSource) &&
    (fCountry === "all" || l.country === fCountry) &&
    (fStage === "all" || l.stage === fStage) &&
    (!q || l.company_name?.toLowerCase().includes(q.toLowerCase()) || l.contact_person?.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{rows.length} shown</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={view === "table" ? "default" : "ghost"} size="sm" onClick={() => setView("table")}><List className="h-4 w-4" /></Button>
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setView("kanban")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <Button asChild><Link to="/crm/leads/new"><Plus className="h-4 w-4 mr-1" />New Lead</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2">
          <Input placeholder="Search company/contact…" className="w-64" value={q} onChange={e => setQ(e.target.value)} />
          <Select value={fSource} onValueChange={setFSource}><SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All sources</SelectItem>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fCountry} onValueChange={setFCountry}><SelectTrigger className="w-40"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All countries</SelectItem>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fStage} onValueChange={setFStage}><SelectTrigger className="w-40"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All stages</SelectItem>{LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {view === "table" ? <TableView rows={rows} /> : <KanbanView rows={rows} />}
    </div>
  );
}

function TableView({ rows }: { rows: any[] }) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Country</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Stage</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="p-3"><Link to="/crm/leads/$id" params={{ id: l.id }} className="font-medium hover:text-primary">{l.company_name}</Link></td>
                <td className="p-3">{l.contact_person || "—"}<div className="text-xs text-muted-foreground">{l.phone}</div></td>
                <td className="p-3">{l.country}</td>
                <td className="p-3">{l.source}</td>
                <td className="p-3"><Badge className={stageColor[l.stage] || ""} variant="secondary">{l.stage}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No leads found</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function KanbanView({ rows }: { rows: any[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const move = useMutation({
    mutationFn: async ({ id, stage }: any) => {
      const { error } = await (supabase as any).from("crm_leads").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_leads"] }); toast.success("Stage updated"); },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {LEAD_STAGES.map(stage => {
        const cards = rows.filter(r => r.stage === stage);
        return (
          <div key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) move.mutate({ id, stage });
            }}
            className="bg-muted/40 rounded-lg p-2 min-h-[400px]">
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="text-xs font-semibold uppercase tracking-wider">{stage}</div>
              <Badge variant="secondary">{cards.length}</Badge>
            </div>
            <div className="space-y-2">
              {cards.map(c => (
                <div key={c.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  onClick={() => navigate({ to: "/crm/leads/$id", params: { id: c.id } })}
                  className="bg-card rounded-md border p-3 cursor-move hover:shadow-md transition">
                  <div className="font-medium text-sm">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.contact_person} · {c.country}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{c.source}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
