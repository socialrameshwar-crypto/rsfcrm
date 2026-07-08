import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { PRODUCT_TYPES, STATUSES, TEMPLATES } from "@/lib/proposal-catalog";
import { generateProposalPdf, getProposalPdfBlobUrl } from "@/lib/pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, ChevronLeft, Trash2, Sparkles, Eye, Loader2, Pencil, Check, X, Plus, Printer, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const termsTemplateId = (data as any)?.terms_template_id as string | null | undefined;
  const { data: termsClauses = [] } = useQuery({
    queryKey: ["proposal-terms", termsTemplateId],
    enabled: !!termsTemplateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms_clauses")
        .select("title, body, position, enabled")
        .eq("template_id", termsTemplateId as string)
        .eq("enabled", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(c => ({ title: c.title, body: c.body }));
    },
  });

  const patch = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await (supabase.from("proposals").update as any)(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
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

  const pdfInput = {
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
    quotation_type: (((p as any).quotation_type as "domestic" | "export") ?? "domestic"),
    terms: termsClauses,
  };

  const downloadPdf = () => { generateProposalPdf(pdfInput); toast.success("Downloading PDF"); };
  const printPdf = () => {
    if (!previewUrl) return openPreview();
    const w = window.open(previewUrl, "_blank");
    if (w) setTimeout(() => w.print?.(), 600);
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const { url } = await getProposalPdfBlobUrl(pdfInput);
      setPreviewUrl(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveAiField = (key: keyof AiProposalContent, value: string | string[]) => {
    const next = { ...ai, [key]: value } as AiProposalContent;
    patch.mutate({ ai_content: next }, { onSuccess: () => toast.success("Saved") });
  };

  const saveMachines = (next: Machine[]) => {
    const subtotal = next.reduce((s, m) => s + (Number(m.unit_price) || 0) * (Number(m.qty) || 0), 0);
    const gst = commercials.gst_percent ? subtotal * (Number(commercials.gst_percent) / 100) : 0;
    const total = subtotal + gst + (Number(commercials.freight) || 0) + (Number(commercials.installation) || 0) - (Number(commercials.discount) || 0);
    patch.mutate({ machines: next as any, total_value: Math.max(0, total) }, { onSuccess: () => toast.success("Machines updated") });
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
          <Button variant="outline" onClick={openPreview}><Eye className="h-4 w-4 mr-1" /> Preview</Button>
          <Button onClick={() => setDownloadOpen(true)} className="gradient-primary"><Download className="h-4 w-4 mr-1" /> Download</Button>
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-5 py-3 border-b flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base">Proposal Preview · {p.proposal_number}</DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              <Button size="icon" variant="ghost" onClick={() => setPreviewZoom(z => Math.max(50, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-xs w-10 text-center tabular-nums">{previewZoom}%</span>
              <Button size="icon" variant="ghost" onClick={() => setPreviewZoom(z => Math.min(200, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={printPdf}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button size="sm" onClick={downloadPdf} className="gradient-primary">
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/40 overflow-auto">
            {previewLoading || !previewUrl ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Rendering branded proposal…
              </div>
            ) : (
              <div style={{ width: `${previewZoom}%`, height: "100%", margin: "0 auto", transition: "width 150ms" }}>
                <iframe src={previewUrl} title="Proposal preview" className="w-full h-full border-0 bg-white shadow" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Download modal */}
      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Download proposal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose how you'd like to export <span className="font-medium">{p.proposal_number}</span>.</p>
            <div className="grid gap-2">
              <Button className="justify-start gradient-primary" onClick={() => { downloadPdf(); setDownloadOpen(false); }}>
                <Download className="h-4 w-4 mr-2" /> Download branded PDF
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setDownloadOpen(false); openPreview(); }}>
                <Eye className="h-4 w-4 mr-2" /> Preview before download
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setDownloadOpen(false); printPdf(); }}>
                <Printer className="h-4 w-4 mr-2" /> Open print dialog
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  const subject = encodeURIComponent(`${p.proposal_number} · ${p.title}`);
                  const body = encodeURIComponent(`Dear ${cust.contact_person || cust.customer_name || "Sir/Madam"},\n\nPlease find attached our proposal ${p.proposal_number} for ${productLabel}.\n\nBest regards,\nRameshwar Steel Fab`);
                  window.location.href = `mailto:${cust.email || ""}?subject=${subject}&body=${body}`;
                  setDownloadOpen(false);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Draft email to customer
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDownloadOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-elegant">
          <div className="text-xs text-muted-foreground">Grand Total</div>
          <div className="text-3xl font-bold text-primary mt-1">{formatMoney(Number(p.total_value || 0), p.currency)}</div>
          <div className="text-xs text-muted-foreground mt-1">incl. taxes · {p.currency}</div>
        </Card>
        <Card className="p-5 shadow-elegant">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-2 flex items-center gap-2">
            <Select value={p.status} onValueChange={v => patch.mutate({ status: v }, { onSuccess: () => toast.success("Status updated") })}>
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

      <EditableMachineTable machines={machines} currency={p.currency} onSave={saveMachines} />

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Technical Proposal <span className="text-xs font-normal text-muted-foreground">— click any section to edit</span></h3>
        <div className="space-y-5 text-sm leading-relaxed">
          <EditableSection title="Executive Summary" value={ai.executive_summary} onSave={v => saveAiField("executive_summary", v)} />
          <EditableSection title="Company Introduction" value={ai.company_introduction} onSave={v => saveAiField("company_introduction", v)} />
          <EditableSection title="Project Overview" value={ai.project_overview} onSave={v => saveAiField("project_overview", v)} />
          <EditableSection title="Scope of Supply" value={ai.scope_of_supply} onSave={v => saveAiField("scope_of_supply", v)} />
          <EditableSection title="Manufacturing Process" value={ai.manufacturing_process} onSave={v => saveAiField("manufacturing_process", v)} />
          <EditableBulletsSection title="Advantages" items={ai.advantages} onSave={v => saveAiField("advantages", v)} />
          <EditableBulletsSection title="Safety Features" items={ai.safety_features} onSave={v => saveAiField("safety_features", v)} />
          <EditableSection title="Quality Assurance" value={ai.quality_assurance} onSave={v => saveAiField("quality_assurance", v)} />
          <EditableSection title="Installation & Commissioning" value={ai.installation} onSave={v => saveAiField("installation", v)} />
          <EditableSection title="Warranty" value={ai.warranty} onSave={v => saveAiField("warranty", v)} />
          <EditableSection title="After Sales Support" value={ai.after_sales} onSave={v => saveAiField("after_sales", v)} />
          <EditableSection title="Why Rameshwar Steel Fab" value={ai.value_proposition} onSave={v => saveAiField("value_proposition", v)} />
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

function EditableSection({ title, value, onSave }: { title: string; value?: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);
  if (!value && !editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-primary">{title}</div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-primary">{title}</div>
        {!editing ? (
          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setDraft(value || ""); setEditing(false); }}><X className="h-3 w-3" /></Button>
            <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}><Check className="h-3 w-3 mr-1" /> Save</Button>
          </div>
        )}
      </div>
      {editing ? (
        <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={Math.max(4, Math.min(14, draft.split("\n").length + 1))} />
      ) : (
        <p className="text-foreground/90 whitespace-pre-line">{value}</p>
      )}
    </div>
  );
}

function EditableBulletsSection({ title, items, onSave }: { title: string; items?: string[]; onSave: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((items ?? []).join("\n"));
  useEffect(() => { setDraft((items ?? []).join("\n")); }, [items]);
  const list = items ?? [];
  if (!list.length && !editing) {
    return (
      <div className="flex items-center justify-between">
        <div className="font-semibold text-primary">{title}</div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
      </div>
    );
  }
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-primary">{title}</div>
        {!editing ? (
          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setDraft(list.join("\n")); setEditing(false); }}><X className="h-3 w-3" /></Button>
            <Button size="sm" onClick={() => { onSave(draft.split("\n").map(s => s.trim()).filter(Boolean)); setEditing(false); }}><Check className="h-3 w-3 mr-1" /> Save</Button>
          </div>
        )}
      </div>
      {editing ? (
        <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={Math.max(4, draft.split("\n").length + 1)} placeholder="One bullet per line" />
      ) : (
        <ul className="list-disc pl-5 space-y-1">{list.map((i, k) => <li key={k}>{i}</li>)}</ul>
      )}
    </div>
  );
}

function EditableMachineTable({ machines, currency, onSave }: { machines: Machine[]; currency: string; onSave: (m: Machine[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Machine[]>(machines);
  const initialRef = useRef(machines);
  useEffect(() => { setRows(machines); initialRef.current = machines; }, [machines]);

  const update = (i: number, patch: Partial<Machine>) => {
    setRows(r => r.map((row, k) => k === i ? { ...row, ...patch } : row));
  };
  const addRow = () => setRows(r => [...r, { name: "New machine", qty: 1, capacity: "", motor: "", material: "SS 304", unit_price: 0 } as Machine]);
  const removeRow = (i: number) => setRows(r => r.filter((_, k) => k !== i));

  const subtotal = useMemo(() => rows.reduce((s, m) => s + (Number(m.unit_price) || 0) * (Number(m.qty) || 0), 0), [rows]);

  return (
    <Card className="p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Machine List</h3>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3 w-3 mr-1" /> Add row</Button>
            <Button size="sm" variant="ghost" onClick={() => { setRows(initialRef.current); setEditing(false); }}><X className="h-3 w-3 mr-1" /> Cancel</Button>
            <Button size="sm" onClick={() => { onSave(rows); setEditing(false); }}><Check className="h-3 w-3 mr-1" /> Save</Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-2">#</th><th>Machine</th><th>Qty</th><th>Capacity</th><th>Motor</th><th>MOC</th><th className="text-right">Unit price</th><th className="text-right">Amount</th>
              {editing && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i} className="border-b last:border-0 align-top">
                <td className="py-2 pr-2">{i + 1}</td>
                <td>{editing ? <Input value={m.name} onChange={e => update(i, { name: e.target.value })} className="h-8" /> : m.name}</td>
                <td>{editing ? <Input type="number" min={0} value={m.qty} onChange={e => update(i, { qty: Number(e.target.value) })} className="h-8 w-20" /> : m.qty}</td>
                <td>{editing ? <Input value={m.capacity} onChange={e => update(i, { capacity: e.target.value })} className="h-8" /> : m.capacity}</td>
                <td>{editing ? <Input value={m.motor} onChange={e => update(i, { motor: e.target.value })} className="h-8" /> : m.motor}</td>
                <td>{editing ? <Input value={m.material} onChange={e => update(i, { material: e.target.value })} className="h-8" /> : m.material}</td>
                <td className="text-right">{editing ? <Input type="number" min={0} value={m.unit_price} onChange={e => update(i, { unit_price: Number(e.target.value) })} className="h-8 w-28 text-right" /> : formatMoney(m.unit_price, currency)}</td>
                <td className="text-right font-medium">{formatMoney((Number(m.unit_price) || 0) * (Number(m.qty) || 0), currency)}</td>
                {editing && <td><Button size="icon" variant="ghost" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button></td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td colSpan={7} className="pt-2 text-right text-xs text-muted-foreground">Subtotal</td>
              <td className="pt-2 text-right font-semibold">{formatMoney(subtotal, currency)}</td>
              {editing && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
