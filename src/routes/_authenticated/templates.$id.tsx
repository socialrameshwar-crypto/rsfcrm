import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft, Trash2, Star, Copy, Archive, Save, FileText, AlertTriangle, CheckCircle2, LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTemplate, signTemplatePdf, updateTemplate, setDefaultTemplate,
  duplicateTemplate, archiveTemplate, deleteTemplate, mergedAnalysis,
  FIELD_TOKENS, type DetectedField, type LineItemsRegion,
} from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/templates/$id")({
  head: () => ({ meta: [{ title: "Template Details" }] }),
  component: TemplateDetail,
});

function TemplateDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: t, refetch, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate(id),
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => { signTemplatePdf(id).then(setPdfUrl); }, [id]);

  const analysis = useMemo(() => t ? mergedAnalysis(t) : null, [t]);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [lineItems, setLineItems] = useState<LineItemsRegion | null>(null);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (analysis) { setFields(analysis.fields); setLineItems(analysis.line_items ?? null); }
    if (t) { setName(t.name); setDescription(t.description ?? ""); setCategory(t.category ?? ""); }
    setDirty(false);
  }, [analysis, t]);

  if (isLoading || !t || !analysis) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const patchField = (fid: string, patch: Partial<DetectedField>) => {
    setFields(cur => cur.map(f => f.id === fid ? { ...f, ...patch } : f));
    setDirty(true);
  };
  const removeField = (fid: string) => { setFields(cur => cur.filter(f => f.id !== fid)); setDirty(true); };

  const save = async () => {
    await updateTemplate(id, {
      name, description: description || null, category: category || "Quotation",
      field_overrides: { fields, line_items: lineItems, pageSizes: analysis.pageSizes } as any,
    } as any);
    setDirty(false);
    toast.success("Template saved");
    qc.invalidateQueries({ queryKey: ["templates"] });
    qc.invalidateQueries({ queryKey: ["template", id] });
    refetch();
  };

  const needsReviewCount = fields.filter(f => f.needs_review).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/templates"><ChevronLeft className="h-4 w-4" /> Templates</Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await setDefaultTemplate(id); toast.success("Set as default"); refetch(); }}>
            <Star className="h-4 w-4 mr-1" /> Default
          </Button>
          <Button variant="outline" size="sm" onClick={async () => { const n = await duplicateTemplate(id); toast.success("Duplicated"); nav({ to: "/templates/$id", params: { id: n } }); }}>
            <Copy className="h-4 w-4 mr-1" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={async () => { await archiveTemplate(id); toast.success("Archived"); nav({ to: "/templates" }); }}>
            <Archive className="h-4 w-4 mr-1" /> Archive
          </Button>
          <Button variant="outline" size="sm" className="text-destructive"
            onClick={async () => { if (confirm("Delete permanently?")) { await deleteTemplate(id); nav({ to: "/templates" }); } }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Preview */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Original PDF</div>
            <div className="text-xs text-muted-foreground">{t.source_pdf_pages ?? 0} pages</div>
          </div>
          {pdfUrl ? (
            <iframe src={pdfUrl} title="Template PDF" className="w-full h-[70vh] bg-muted" />
          ) : (
            <div className="p-8 text-center text-muted-foreground"><LayoutTemplate className="h-8 w-8 mx-auto mb-2" /> No PDF uploaded</div>
          )}
        </Card>

        {/* Details + Fields */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => { setName(e.target.value); setDirty(true); }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={category} onChange={e => { setCategory(e.target.value); setDirty(true); }} />
              </div>
              <div className="flex items-end">
                {t.is_default && <Badge className="bg-primary">Default template</Badge>}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={e => { setDescription(e.target.value); setDirty(true); }} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Detected fields ({fields.length})</div>
                <div className="text-xs text-muted-foreground">Confirm the mapping. AI-detected values will be replaced with real proposal data on generation.</div>
              </div>
              {needsReviewCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {needsReviewCount} to review
                </Badge>
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {fields.length === 0 && (
                <div className="text-sm text-muted-foreground p-4 border rounded">No fields detected. The template will render exactly as uploaded with no substitutions.</div>
              )}
              {fields.map(f => (
                <div key={f.id} className={`border rounded-lg p-3 space-y-2 ${f.needs_review ? "border-amber-300 bg-amber-50/40" : ""}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Page {f.page}</Badge>
                    <div className="text-sm font-medium flex-1 truncate">{f.label}</div>
                    {f.needs_review ? (
                      <Badge variant="outline" className="text-amber-600 text-xs">Review</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {Math.round((f.confidence ?? 0.9) * 100)}%
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => removeField(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Token</Label>
                      <Select value={f.token} onValueChange={(v: any) => patchField(f.id, { token: v, needs_review: false })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TOKENS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Font size</Label>
                      <Input className="h-8" type="number" value={f.fontSize}
                        onChange={e => patchField(f.id, { fontSize: Number(e.target.value) || 10 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Align</Label>
                      <Select value={f.align} onValueChange={(v: any) => patchField(f.id, { align: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={f.whiteout} onCheckedChange={v => patchField(f.id, { whiteout: v })} />
                    Cover template value with white before drawing new value
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {lineItems && (
            <Card className="p-5 space-y-2">
              <div className="font-semibold">Line-items table</div>
              <div className="text-xs text-muted-foreground">
                Detected on page {lineItems.page} with {lineItems.columns.length} columns. Machine rows will be redrawn here at generation time. Add continuation pages automatically if they don't fit.
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {lineItems.columns.map((c, i) => (
                  <div key={i} className="text-xs border rounded p-2">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-muted-foreground">key: {c.key} · {c.align}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
