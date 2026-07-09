import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search, FileText, Trash2, Archive, ArchiveRestore, Pencil, MoreVertical, Loader2, Upload, FileType, Star, CheckCircle2,
} from "lucide-react";
import {
  fetchTemplates, createTemplate, deleteTemplate, updateTemplate, setDefaultTemplate,
  TEMPLATE_CATEGORIES, type Template,
} from "@/lib/templates";
import { uploadTemplatePdf, fetchTemplatePdfBytes } from "@/lib/pdf-overlay";
import { autoDetectOverlays } from "@/lib/pdf-autodetect";

export const Route = createFileRoute("/_authenticated/templates/")({
  component: TemplateManager,
});

function TemplateManager() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", showArchived],
    queryFn: () => fetchTemplates(showArchived),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = [...templates];
    if (q) out = out.filter(t => (t.name + " " + (t.description || "")).toLowerCase().includes(q));
    out.sort((a, b) => {
      // default first, then most recently updated
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return out;
  }, [templates, query]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["templates"] });

  const del = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => { toast.success("Template deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const arch = useMutation({
    mutationFn: (t: Template) => updateTemplate(t.id, { archived: !t.archived }),
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setDefault = useMutation({
    mutationFn: (id: string) => setDefaultTemplate(id),
    onSuccess: () => { toast.success("Default template updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Manager</h1>
          <p className="text-sm text-muted-foreground">
            Import an existing proposal (PDF) — the AI keeps its exact design, then fills in customer data automatically for every new proposal.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(v => !v)}>
            <Archive className="h-4 w-4 mr-1" /> {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <Button className="gradient-primary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import Template
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search templates…" className="pl-9" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <FileType className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">No templates yet</div>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Import your first proposal template. Upload the PDF you use today and AI will convert it into a reusable master template.
          </p>
          <div className="flex justify-center">
            <Button className="gradient-primary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className={`overflow-hidden group hover:shadow-elegant transition ${t.archived ? "opacity-60" : ""}`}>
              <Link to="/templates/$id" params={{ id: t.id }} className="block">
                <div className="aspect-[4/3] bg-gradient-to-br from-secondary via-secondary/60 to-background border-b flex items-center justify-center relative">
                  <div className="text-center px-4">
                    {t.mode === "pdf_overlay"
                      ? <FileType className="h-10 w-10 mx-auto text-primary/70" />
                      : <FileText className="h-10 w-10 mx-auto text-muted-foreground/70" />}
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                      {t.mode === "pdf_overlay"
                        ? `${t.source_pdf_pages ?? 0} pages · ${(t.overlays?.length ?? 0)} auto-fields`
                        : `${(t.blocks?.length ?? 0)} blocks`}
                    </div>
                  </div>
                  {t.is_default && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px]">
                      <Star className="h-3 w-3 mr-1 fill-current" /> Default
                    </Badge>
                  )}
                  {!t.is_default && t.mode === "pdf_overlay" && (
                    <Badge className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px]">Pixel-perfect</Badge>
                  )}
                  {t.archived && <Badge variant="secondary" className="absolute top-2 left-2">Archived</Badge>}
                </div>
              </Link>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to="/templates/$id" params={{ id: t.id }} className="font-semibold text-sm hover:text-primary truncate block">{t.name}</Link>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Updated {new Date(t.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setRenameTarget(t)}><Pencil className="h-3.5 w-3.5 mr-2" />Rename</DropdownMenuItem>
                      {!t.is_default && (
                        <DropdownMenuItem onClick={() => setDefault.mutate(t.id)}>
                          <Star className="h-3.5 w-3.5 mr-2" />Set as default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => arch.mutate(t)}>
                        {t.archived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-2" />Restore</> : <><Archive className="h-3.5 w-3.5 mr-2" />Archive</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm(`Delete "${t.name}"?`)) del.mutate(t.id); }}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onCreated={(t) => { setImportOpen(false); invalidate(); navigate({ to: "/templates/$id", params: { id: t.id } }); }}
      />
      <RenameDialog
        template={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSaved={() => { setRenameTarget(null); invalidate(); }}
      />
    </div>
  );
}

/* ------- Rename dialog ------- */
function RenameDialog({ template, onClose, onSaved }: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [busy, setBusy] = useState(false);

  // reset when target changes
  useMemo(() => {
    setName(template?.name || "");
    setDescription(template?.description || "");
  }, [template]);

  if (!template) return null;

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    try {
      await updateTemplate(template.id, { name: name.trim(), description: description.trim() || null } as any);
      toast.success("Template updated");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!template} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Rename template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
          <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional notes about when to use this template" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="gradient-primary">
            {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…</> : <>Save</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------- Import dialog ------- */
function ImportDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: (t: Template) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [makeDefault, setMakeDefault] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const reset = () => { setName(""); setCategory("general"); setFile(null); setBusy(false); setStatus(""); setMakeDefault(false); };

  const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

  const submit = async () => {
    if (!name.trim()) { toast.error("Give the template a name"); return; }
    if (!file) { toast.error("Choose a file to import"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("File must be under 25 MB"); return; }

    if (!isPdf(file)) {
      toast.error(
        "Only PDF templates preserve exact design. Please convert your Word/PowerPoint/image to PDF (File → Save as PDF) and upload the PDF.",
        { duration: 6000 },
      );
      return;
    }

    setBusy(true);
    try {
      setStatus("Uploading PDF…");
      const uploaded = await uploadTemplatePdf(file);
      setStatus("Analyzing layout & detecting fields…");
      let overlays: any[] = [];
      try {
        const bytes = await fetchTemplatePdfBytes(uploaded.storagePath);
        overlays = await autoDetectOverlays(bytes);
      } catch (e) {
        console.warn("auto-detect failed", e);
      }
      setStatus("Saving template…");
      const t = await createTemplate({
        name: name.trim(),
        category,
        mode: "pdf_overlay",
        source_pdf_url: uploaded.storagePath,
        source_pdf_pages: uploaded.pages,
        overlays,
        description: `Imported from ${file.name} · ${uploaded.pages} pages · ${overlays.length} fields auto-detected.`,
      });
      if (makeDefault) {
        await setDefaultTemplate(t.id);
      }
      toast.success(
        overlays.length > 0
          ? `Template imported — ${overlays.length} dynamic fields detected automatically.`
          : `Template imported — no dynamic labels detected. New proposals will render the PDF unchanged.`,
      );
      reset();
      onCreated(t);
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally { setBusy(false); setStatus(""); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (busy) return; onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import Template
          </DialogTitle>
          <DialogDescription>
            Upload your existing proposal PDF. The AI keeps the exact design, layout, fonts, colors, tables, images, header and footer — and automatically finds fields like customer name, date, price, and total to fill in per proposal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Template name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Quotation" /></div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Source file *</Label>
            <Input type="file" accept="application/pdf,.pdf,.doc,.docx,image/*,.ppt,.pptx"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024).toFixed(0)} KB {!isPdf(file) && <span className="text-destructive"> — please convert to PDF first</span>}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              PDF gives pixel-perfect results. For Word/PowerPoint/images: use <em>Save as PDF</em> in your source app, then upload that PDF.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm border rounded-md p-2 cursor-pointer hover:bg-secondary/40">
            <input type="checkbox" checked={makeDefault} onChange={e => setMakeDefault(e.target.checked)} />
            <Star className="h-4 w-4 text-primary" />
            Set as default template for new proposals
          </label>
          {status && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-md p-2 bg-secondary/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button className="gradient-primary" onClick={submit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Importing…</> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Import</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
