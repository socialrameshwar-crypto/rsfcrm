import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { fmtINR } from "@/lib/crm";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/tours/")({
  component: ToursPage,
});

function ToursPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const tours = useQuery({
    queryKey: ["crm_tours"],
    queryFn: async () => (await (supabase as any).from("crm_tours").select("*").order("start_date", { ascending: false })).data ?? [],
  });
  const companies = useQuery({
    queryKey: ["crm_companies"],
    queryFn: async () => (await (supabase as any).from("crm_companies").select("id,company_name")).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("crm_tours").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_tours"] }); toast.success("Deleted"); },
  });

  const companyMap = Object.fromEntries((companies.data ?? []).map((c: any) => [c.id, c.company_name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Tour Planner</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Plan Tour</Button>
      </div>
      <div className="space-y-3">
        {(tours.data ?? []).map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.cities}</div>
                    <div className="text-xs text-muted-foreground">{t.start_date} → {t.end_date} · by {t.sales_user_name || "—"}</div>
                    <div className="text-xs mt-1">Visits: {(t.company_ids || []).map((id: string) => companyMap[id] || "?").join(", ") || "None"}</div>
                    {t.notes && <div className="text-sm mt-2 text-muted-foreground">{t.notes}</div>}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-muted-foreground">Expense</div>
                  <div className="font-semibold">{fmtINR(t.expense)}</div>
                  <Button size="icon" variant="ghost" onClick={() => confirm("Delete tour?") && del.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(tours.data ?? []).length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No tours planned</CardContent></Card>}
      </div>
      <TourDialog open={open} setOpen={setOpen} companies={companies.data ?? []} />
    </div>
  );
}

function TourDialog({ open, setOpen, companies }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    cities: "", company_ids: [] as string[], notes: "", expense: 0,
  });
  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("crm_tours").insert({
        ...form, user_id: u.user?.id, sales_user_id: u.user?.id, sales_user_name: u.user?.email?.split("@")[0] || "Me",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_tours"] }); toast.success("Tour planned"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCompany = (id: string) => {
    set("company_ids", form.company_ids.includes(id) ? form.company_ids.filter((x: string) => x !== id) : [...form.company_ids, id]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Plan Tour</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
          <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Cities / Region</Label><Input value={form.cities} onChange={e => set("cities", e.target.value)} placeholder="Mumbai, Pune" /></div>
          <div className="sm:col-span-2"><Label>Companies to Visit</Label>
            <div className="border rounded max-h-40 overflow-y-auto p-2 space-y-1">
              {companies.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.company_ids.includes(c.id)} onChange={() => toggleCompany(c.id)} />
                  {c.company_name}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2"><Label>Notes / Outcome</Label><Textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div><Label>Expense (₹)</Label><Input type="number" value={form.expense} onChange={e => set("expense", Number(e.target.value))} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!form.cities || save.isPending} onClick={() => save.mutate()}>Save Tour</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
