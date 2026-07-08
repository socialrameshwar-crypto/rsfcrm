import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, Search, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  component: Customers,
});

function Customers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", company_name: "", contact_person: "", email: "", mobile: "",
    country: "", city: "", industry: "", website: "", gst_vat: "", notes: "",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const { error } = await supabase.from("customers").insert({ ...form, user_id: user.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer added");
      setOpen(false);
      setForm({ customer_name: "", company_name: "", contact_person: "", email: "", mobile: "", country: "", city: "", industry: "", website: "", gst_vat: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const filtered = customers.filter(c => {
    const s = q.toLowerCase();
    return !s || [c.customer_name, c.company_name, c.email, c.country, c.city, c.industry]
      .some(v => v?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer database.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary"><PlusCircle className="h-4 w-4 mr-1" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["customer_name", "Customer name *", true],
                ["company_name", "Company name"],
                ["contact_person", "Contact person"],
                ["email", "Email"],
                ["mobile", "Mobile"],
                ["country", "Country"],
                ["city", "City"],
                ["industry", "Industry"],
                ["website", "Website"],
                ["gst_vat", "GST / VAT"],
              ].map(([k, label, req]) => (
                <div key={k as string}>
                  <Label>{label as string}</Label>
                  <Input required={!!req} value={(form as any)[k as string]} onChange={e => setForm({ ...form, [k as string]: e.target.value })} />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!form.customer_name || create.isPending} className="gradient-primary">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 shadow-elegant">
        <div className="relative max-w-md mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Industry</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center"><Building2 className="h-4 w-4" /></div>
                      <div>
                        <div className="font-medium">{c.company_name || c.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{c.customer_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">{c.contact_person || "-"}<div className="text-xs text-muted-foreground">{c.mobile}</div></td>
                  <td className="py-3 pr-3">{[c.city, c.country].filter(Boolean).join(", ") || "-"}</td>
                  <td className="py-3 pr-3">{c.industry || "-"}</td>
                  <td className="py-3 pr-3">{c.email || "-"}</td>
                  <td className="py-3">
                    <Button size="icon" variant="ghost" onClick={() => confirm("Delete customer?") && del.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
