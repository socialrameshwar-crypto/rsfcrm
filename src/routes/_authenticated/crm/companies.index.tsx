import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COUNTRIES, INDIAN_STATES } from "@/lib/crm";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/companies/")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const companies = useQuery({
    queryKey: ["crm_companies"],
    queryFn: async () => (await (supabase as any).from("crm_companies").select("*").order("company_name")).data ?? [],
  });

  const rows = (companies.data ?? []).filter((c: any) => !q || c.company_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Companies</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New Company</Button>
      </div>
      <Input placeholder="Search…" className="max-w-sm" value={q} onChange={e => setQ(e.target.value)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c: any) => (
          <Link key={c.id} to="/crm/companies/$id" params={{ id: c.id }}>
            <Card className="hover:border-primary transition h-full">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold">{c.company_name}</div>
                      <div className="text-xs text-muted-foreground">{c.country}{c.state ? `, ${c.state}` : ""}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{c.type}</Badge>
                </div>
                {c.gstin && <div className="text-xs">GSTIN: {c.gstin}</div>}
                <div className="text-xs text-muted-foreground">{(c.contacts || []).length} contact(s)</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No companies</CardContent></Card>}
      </div>

      <CompanyDialog open={open} setOpen={setOpen} />
    </div>
  );
}

function CompanyDialog({ open, setOpen }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({
    company_name: "", type: "Domestic", country: "India", state: "Maharashtra", address: "", gstin: "",
    contacts: [{ name: "", designation: "", phone: "", email: "" }],
  });
  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("crm_companies").insert({ ...form, user_id: u.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm_companies"] }); toast.success("Created"); setOpen(false); setForm({ ...form, company_name: "", gstin: "", address: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addContact = () => set("contacts", [...form.contacts, { name: "", designation: "", phone: "", email: "" }]);
  const setContact = (i: number, k: string, v: string) => set("contacts", form.contacts.map((c: any, idx: number) => idx === i ? { ...c, [k]: v } : c));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Company</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Company Name</Label><Input value={form.company_name} onChange={e => set("company_name", e.target.value)} /></div>
          <div><Label>Type</Label>
            <Select value={form.type} onValueChange={v => set("type", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Domestic">Domestic</SelectItem><SelectItem value="Export">Export</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Country</Label>
            <Select value={form.country} onValueChange={v => set("country", v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.country === "India" && (
            <div><Label>State</Label>
              <Select value={form.state} onValueChange={v => set("state", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {form.type === "Domestic" && <div><Label>GSTIN</Label><Input value={form.gstin} onChange={e => set("gstin", e.target.value)} /></div>}
          <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Contacts</Label>
              <Button size="sm" variant="outline" onClick={addContact}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="space-y-2 mt-2">
              {form.contacts.map((c: any, i: number) => (
                <div key={i} className="grid grid-cols-2 gap-2 border rounded p-2">
                  <Input placeholder="Name" value={c.name} onChange={e => setContact(i, "name", e.target.value)} />
                  <Input placeholder="Designation" value={c.designation} onChange={e => setContact(i, "designation", e.target.value)} />
                  <Input placeholder="Phone" value={c.phone} onChange={e => setContact(i, "phone", e.target.value)} />
                  <Input placeholder="Email" value={c.email} onChange={e => setContact(i, "email", e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!form.company_name || save.isPending} onClick={() => save.mutate()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
