import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, Trash2, Save, Star, Archive, ArchiveRestore, Loader2, FileType, ChevronRight,
} from "lucide-react";
import {
  getTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, TEMPLATE_CATEGORIES,
} from "@/lib/templates";
import {
  fetchTemplatePdfBytes, renderPdfPage, getTemplatePdfUrl,
} from "@/lib/pdf-overlay";

export const Route = createFileRoute("/_authenticated/templates/$id")({
  component: TemplateViewer,
});

function TemplateViewer() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate(id),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setDescription(data.description || "");
    setCategory(data.category || "general");
    setDirty(false);
  }, [data]);

  // PDF preview
  const [page, setPage] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [renderBusy, setRenderBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!data?.source_pdf_url) { setBytes(null); return; }
    (async () => {
      try {
        const b = await fetchTemplatePdfBytes(data.source_pdf_url!);
        if (alive) setBytes(b);
      } catch (e: any) { toast.error(e?.message || "Failed to load PDF"); }
    })();
    return () => { alive = false; };
  }, [data?.source_pdf_url]);

  useEffect(() => {
    if (!bytes) return;
    let alive = true;
    setRenderBusy(true);
    (async () => {
      try {
        const copy = new Uint8Array(bytes.length); copy.set(bytes);
        const r = await renderPdfPage(copy, page, 1.4);
        if (alive) setPageImage(r.dataUrl);
      } catch (e: any) { if (alive) toast.error(e?.message || "Failed to render page"); }
      finally { if (alive) setRenderBusy(false); }
    })();
    return () => { alive = false; };
  }, [bytes, page]);

  const save = useMutation({
    mutationFn: async () => {
      setSaving(true);
      await updateTemplate(id, {
        name: name.trim() || "Untitled Template",
        description: description || null,
        category,
      } as any);
    },
    onSuccess: () => {
      setSaving(false); setDirty(false); toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["template", id] });
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: Error) => { setSaving(false); toast.error(e.message); },
  });

  const del = useMutation({
    mutationFn: () => deleteTemplate(id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["templates"] }); navigate({ to: "/templates" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const archive = useMutation({
    mutationFn: () => updateTemplate(id, { archived: !data?.archived } as any),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["template", id] }); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const makeDefault = useMutation({
    mutationFn: () => setDefaultTemplate(id),
    onSuccess: () => { toast.success("Default template updated"); qc.invalidateQueries({ queryKey: ["template", id] }); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading template…</div>;

  const isPdf = data.mode === "pdf_overlay" && !!data.source_pdf_url;
  const totalPages = data.source_pdf_pages ?? 1;

  const openOriginal = async () => {
    if (!data.source_pdf_url) return;
    try {
      const url = await getTemplatePdfUrl(data.source_pdf_url);
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e?.message || "Failed to open PDF"); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/templates"><ChevronLeft className="h-4 w-4 mr-1" /> Library</Link>
        </Button>
        <h1 className="text-lg font-bold truncate flex-1">{name || "Untitled"}</h1>
        {data.is_default && (
          <Badge className="bg-primary text-primary-foreground"><Star className="h-3 w-3 mr-1 fill-current" /> Default</Badge>
        )}
        {data.archived && <Badge variant="secondary">Archived</Badge>}
        <div className="flex items-center gap-2">
          {!data.is_default && (
            <Button size="sm" variant="outline" onClick={() => makeDefault.mutate()}>
              <Star className="h-3.5 w-3.5 mr-1" /> Set as default
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => archive.mutate()}>
            {data.archived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore</> : <><Archive className="h-3.5 w-3.5 mr-1" /> Archive</>}
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm(`Delete "${name}"?`)) del.mutate(); }}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <Button size="sm" className="gradient-primary" onClick={() => save.mutate()} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        {/* Details */}
        <Card className="p-4 space-y-3 h-fit">
          <div className="text-xs uppercase font-semibold text-muted-foreground">Template details</div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setDirty(true); }} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={v => { setCategory(v); setDirty(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={e => { setDescription(e.target.value); setDirty(true); }} />
          </div>

          <div className="pt-3 border-t space-y-2">
            <div className="text-xs uppercase font-semibold text-muted-foreground">Auto-detected dynamic fields</div>
            {data.overlays && data.overlays.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(data.overlays.map(o => o.label))).map(l => (
                  <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No dynamic labels were detected automatically. New proposals will render this PDF as-is.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground pt-2">
              Only these fields change per proposal. Everything else — design, fonts, colors, layout, images, header, footer — stays identical to the original.
            </p>
          </div>

          {isPdf && (
            <div className="pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
              <FileType className="h-4 w-4" /> {totalPages} pages · <button onClick={openOriginal} className="text-primary hover:underline">open original</button>
            </div>
          )}
        </Card>

        {/* Preview */}
        <div className="min-h-0">
          {isPdf ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm tabular-nums">Page {page} / {totalPages}</div>
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="text-xs text-muted-foreground ml-2">Read-only preview of the master template</div>
              </div>
              <div className="rounded-md border bg-muted/40 p-4 flex justify-center min-h-[400px]">
                {renderBusy || !pageImage ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-16">
                    <Loader2 className="h-4 w-4 animate-spin" /> Rendering page…
                  </div>
                ) : (
                  <img src={pageImage} alt={`Page ${page}`} className="max-w-full h-auto shadow-md bg-white" />
                )}
              </div>
            </div>
          ) : (
            <Card className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                This template was not imported as a PDF and has no visual preview. Import a PDF version to get pixel-perfect output.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
