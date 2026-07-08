import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { PRODUCT_TYPES, STATUSES, TEMPLATES } from "@/lib/proposal-catalog";
import { generateProposalPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { Download, ChevronLeft, Trash2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { AiProposalContent } from "@/lib/ai.functions";
import type { Machine, Utilities, Commercials } from "@/lib/proposal-catalog";

export const Route = createFileRoute("/_authenticated/proposals/$id")({
  component: ProposalDetail,
});

function ProposalDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, customers(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const patch = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("proposals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      qc.invalidateQueries({ queryKey: ["proposals-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      navigate({ to: "/proposals" });
    },
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const p = data;
  const machines = (p.machines as unknown as Machine[]) ?? [];
  const utilities = (p.utilities as unknown as Utilities) ?? ({} as Utilities);
  const commercials = (p.commercials as unknown as Commercials) ?? ({} as Commercials);
  const ai = (p.ai_content as unknown as AiProposalContent) ?? ({} as AiProposalContent);
  const cust = (p as any).customers ?? {};
  const productLabel = PRODUCT_TYPES.find(x => x.value === p.product_type)?.label ?? p.product_type;

  const downloadPdf = () => {
    generateProposalPdf({
      proposal_number: p.proposal_number,
      title: p.title,
      date: new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      customer: cust,
      product_label: productLabel,
      capacity: p.capacity,
      automation: p.automation,
      material: p.material,
      currency: p.currency,
      machines,
      utilities,
      commercials,
      ai,
      template: p.template,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link to="/proposals"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.title}</h1>
            <p className="text-xs text-muted-foreground">{p.proposal_number} · Created {new Date(p.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => confirm("Delete this proposal?") && del.mutate()}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete
          </Button>
          <Button onClick={downloadPdf} className="gradient-primary"><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-elegant">
          <div className="text-xs text-muted-foreground">Grand Total</div>
          <div className="text-3xl font-bold text-primary mt-1">{formatMoney(Number(p.total_value || 0), p.currency)}</div>
          <div className="text-xs text-muted-foreground mt-1">incl. taxes · {p.currency}</div>
        </Card>
        <Card className="p-5 shadow-elegant">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-2 flex items-center gap-2">
            <Select value={p.status} onValueChange={v => patch.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Sales engineer: {p.sales_engineer || "-"}</div>
        </Card>
        <Card className="p-5 shadow-elegant space-y-2">
          <div className="text-xs text-muted-foreground">Follow-up</div>
          <Input type="date" defaultValue={p.follow_up_date ?? ""} onBlur={e => e.target.value !== (p.follow_up_date ?? "") && patch.mutate({ follow_up_date: e.target.value || null })} />
          <div className="text-xs text-muted-foreground">Template
            <Select value={p.template} onValueChange={v => patch.mutate({ template: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TEMPLATES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-elegant lg:col-span-1">
          <h3 className="font-semibold mb-2">Customer</h3>
          <div className="text-sm space-y-1">
            <div className="font-medium">{cust.company_name || cust.customer_name}</div>
            <div className="text-muted-foreground">{cust.contact_person}</div>
            <div>{cust.email}</div>
            <div>{cust.mobile}</div>
            <div className="text-muted-foreground">{[cust.city, cust.country].filter(Boolean).join(", ")}</div>
            <div className="pt-2 mt-2 border-t"><Badge variant="secondary">{cust.industry || "—"}</Badge></div>
          </div>
        </Card>

        <Card className="p-5 shadow-elegant lg:col-span-2">
          <h3 className="font-semibold mb-3">Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Info k="Product" v={productLabel} />
            <Info k="Capacity" v={p.capacity} />
            <Info k="Automation" v={p.automation} />
            <Info k="Material" v={p.material} />
            <Info k="Currency" v={p.currency} />
            <Info k="Machines" v={String(machines.length)} />
            <Info k="Connected load" v={`${utilities.connected_load_kw ?? "-"} kW`} />
            <Info k="Production / day" v={`${utilities.production_per_day_kg ?? "-"} kg`} />
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-3">Machine List</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b">
              <tr><th className="py-2 pr-2">#</th><th>Machine</th><th>Qty</th><th>Capacity</th><th>Motor</th><th>MOC</th><th className="text-right">Unit price</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {machines.map((m, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-2">{i + 1}</td>
                  <td>{m.name}</td>
                  <td>{m.qty}</td>
                  <td>{m.capacity}</td>
                  <td>{m.motor}</td>
                  <td>{m.material}</td>
                  <td className="text-right">{formatMoney(m.unit_price, p.currency)}</td>
                  <td className="text-right font-medium">{formatMoney(m.unit_price * m.qty, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Technical Proposal</h3>
        <div className="space-y-5 text-sm leading-relaxed">
          <Section title="Executive Summary" body={ai.executive_summary} />
          <Section title="Company Introduction" body={ai.company_introduction} />
          <Section title="Project Overview" body={ai.project_overview} />
          <Section title="Scope of Supply" body={ai.scope_of_supply} />
          <Section title="Manufacturing Process" body={ai.manufacturing_process} />
          <SectionBullets title="Advantages" items={ai.advantages} />
          <SectionBullets title="Safety Features" items={ai.safety_features} />
          <Section title="Quality Assurance" body={ai.quality_assurance} />
          <Section title="Installation & Commissioning" body={ai.installation} />
          <Section title="Warranty" body={ai.warranty} />
          <Section title="After Sales Support" body={ai.after_sales} />
          <Section title="Why Rameshwar Steel Fab" body={ai.value_proposition} />
        </div>
      </Card>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-2">CRM Notes</h3>
        <Textarea
          rows={4}
          defaultValue={(cust.notes as string) || ""}
          onChange={e => setNotesDraft(e.target.value)}
          placeholder="Add follow-up notes, customer preferences, negotiation status…"
        />
        <div className="mt-2 text-right">
          <Button
            size="sm"
            variant="outline"
            disabled={notesDraft === null}
            onClick={async () => {
              if (cust.id && notesDraft !== null) {
                const { error } = await supabase.from("customers").update({ notes: notesDraft }).eq("id", cust.id);
                if (error) return toast.error(error.message);
                toast.success("Notes saved");
              }
            }}
          >Save notes</Button>
        </div>
      </Card>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border p-3 bg-secondary/30">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-medium mt-0.5">{v}</div>
    </div>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <div className="font-semibold text-primary mb-1">{title}</div>
      <p className="text-foreground/90 whitespace-pre-line">{body}</p>
    </div>
  );
}

function SectionBullets({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="font-semibold text-primary mb-1">{title}</div>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}
