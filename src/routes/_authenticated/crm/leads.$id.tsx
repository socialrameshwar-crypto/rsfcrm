import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STAGES, stageColor, whatsappLink } from "@/lib/crm";
import { MessageCircle, Trash2, FileText, ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/leads/$id")({
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const lead = useQuery({
    queryKey: ["crm_lead", id],
    queryFn: async () => (await (supabase as any).from("crm_leads").select("*").eq("id", id).single()).data,
  });
  const followups = useQuery({
    queryKey: ["crm_lead_fu", id],
    queryFn: async () => (await (supabase as any).from("crm_followups").select("*").eq("lead_id", id).order("due_date")).data ?? [],
  });

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await (supabase as any).from("crm_leads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_lead", id] }); qc.invalidateQueries({ queryKey: ["crm_leads"] }); toast.success("Saved"); },
  });
  const del = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("crm_leads").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Lead deleted"); navigate({ to: "/crm/leads" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [fuDesc, setFuDesc] = useState("");
  const [fuDate, setFuDate] = useState(new Date().toISOString().slice(0, 10));
  const addFu = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("crm_followups").insert({
        lead_id: id, description: fuDesc, due_date: fuDate, user_id: u.user?.id, assigned_to: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { setFuDesc(""); qc.invalidateQueries({ queryKey: ["crm_lead_fu", id] }); toast.success("Follow-up added"); },
  });
  const toggleFu = useMutation({
    mutationFn: async ({ id: fid, status }: any) => { const { error } = await (supabase as any).from("crm_followups").update({ status }).eq("id", fid); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_lead_fu", id] }),
  });

  if (lead.isLoading) return <div>Loading…</div>;
  const l = lead.data;
  if (!l) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/leads" })}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{l.company_name}</h1>
          <div className="text-sm text-muted-foreground mt-1">{l.contact_person} · {l.country} · via {l.source}</div>
          <Badge className={`${stageColor[l.stage]} mt-2`} variant="secondary">{l.stage}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {l.phone && (
            <Button asChild variant="outline" size="sm">
              <a href={whatsappLink(l.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</a>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/crm/quotations/new" search={{ lead_id: id } as any}><FileText className="h-4 w-4 mr-1" />Create Quote</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => confirm("Delete lead?") && del.mutate()}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone" value={l.phone} />
            <Field label="Email" value={l.email} />
            <Field label="Created" value={new Date(l.created_at).toLocaleString()} />
            <div>
              <Label>Stage</Label>
              <Select value={l.stage} onValueChange={v => update.mutate({ stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea defaultValue={l.notes || ""} rows={3} onBlur={e => e.target.value !== l.notes && update.mutate({ notes: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Follow-ups</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input placeholder="Description" value={fuDesc} onChange={e => setFuDesc(e.target.value)} />
              <div className="flex gap-2">
                <Input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} />
                <Button size="sm" disabled={!fuDesc} onClick={() => addFu.mutate()}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              {(followups.data ?? []).map((f: any) => {
                const today = new Date().toISOString().slice(0, 10);
                const overdue = f.status === "Pending" && f.due_date < today;
                return (
                  <div key={f.id} className="border rounded-md p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={f.status === "Completed" ? "line-through opacity-60" : ""}>{f.description}</div>
                        <div className={`text-xs ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                          Due {f.due_date} {overdue && "(overdue)"}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toggleFu.mutate({ id: f.id, status: f.status === "Pending" ? "Completed" : "Pending" })}>
                        {f.status === "Pending" ? "✓" : "↺"}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(followups.data ?? []).length === 0 && <div className="text-xs text-muted-foreground text-center py-2">No follow-ups yet</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function Field({ label, value }: any) { return <div><Label>{label}</Label><div className="text-sm py-2">{value || "—"}</div></div>; }
