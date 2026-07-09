import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRIES, LEAD_SOURCES, LEAD_STAGES } from "@/lib/crm";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/leads/new")({
  component: NewLead,
});

function NewLead() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = (Route as any).useRouteContext?.() ?? { user: null };

  const products = useQuery({
    queryKey: ["crm_products_list"],
    queryFn: async () => (await (supabase as any).from("crm_products").select("id,name")).data ?? [],
  });

  const [form, setForm] = useState<any>({
    company_name: "", contact_person: "", phone: "", email: "",
    country: "India", source: "Website", product_id: null, stage: "New", notes: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const payload = { ...form, user_id: u.user?.id, assigned_to: u.user?.id };
      const { data, error } = await (supabase as any).from("crm_leads").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success("Lead created");
      navigate({ to: "/crm/leads/$id", params: { id: d.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">New Lead</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Lead details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={e => set("company_name", e.target.value)} /></div>
          <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label>Country</Label>
            <Select value={form.country} onValueChange={v => set("country", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Source</Label>
            <Select value={form.source} onValueChange={v => set("source", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_SOURCES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Product Interested In</Label>
            <Select value={form.product_id || "none"} onValueChange={v => set("product_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent><SelectItem value="none">— None —</SelectItem>{(products.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Stage</Label>
            <Select value={form.stage} onValueChange={v => set("stage", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STAGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </CardContent>
      </Card>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate({ to: "/crm/leads" })}>Cancel</Button>
        <Button disabled={!form.company_name || create.isPending} onClick={() => create.mutate()}>Create Lead</Button>
      </div>
    </div>
  );
}
