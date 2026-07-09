import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, Search, Sparkles, FileText, Copy, Trash2, Archive, ArchiveRestore, Pencil, MoreVertical, Loader2, Upload,
} from "lucide-react";
import {
  fetchTemplates, createTemplate, deleteTemplate, duplicateTemplate, updateTemplate,
  TEMPLATE_CATEGORIES, type Template,
} from "@/lib/templates";
import { defaultBlocks } from "@/lib/blocks";
import { importTemplate } from "@/lib/template-import.functions";

export const Route = createFileRoute("/_authenticated/templates/")({
  component: TemplateManager,
});

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function TemplateManager() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const runImport = useServerFn(importTemplate);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"updated" | "name" | "created">("updated");
  const [showArchived, setShowArchived] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", showArchived],
    queryFn: () => fetchTemplates(showArchived),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = templates.filter(t => showArchived ? true : !t.archived);
    if (category !== "all") out = out.filter(t => t.category === category);
    if (q) out = out.filter(t => (t.name + " " + (t.description || "") + " " + t.tags.join(" ")).toLowerCase().includes(q));
    out = [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return out;
  }, [templates, query, category, sort, showArchived]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["templates"] });

  const dup = useMutation({
    mutationFn: (id: string) => duplicateTemplate(id),
    onSuccess: () => { toast.success("Template duplicated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Manager</h1>
          <p className="text-sm text-muted-foreground">Reusable proposal layouts — build from scratch or import an existing document with AI.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Import with AI
          </Button>
          <Button className="gradient-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_auto] gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search templates, tags…" className="pl-9" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="created">Recently created</SelectItem>
              <SelectItem value="name">Name (A→Z)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(v => !v)}>
            <Archive className="h-4 w-4 mr-1" /> {showArchived ? "Hide archived" : "Show archived"}
          </Button>
        </div>
      </Card>

      {/* Library */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">No templates yet</div>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create a new template or import an existing proposal to get started.</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}><Sparkles className="h-4 w-4 mr-1" /> Import</Button>
            <Button className="gradient-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className={`overflow-hidden group hover:shadow-elegant transition ${t.archived ? "opacity-60" : ""}`}>
              <Link to="/templates/$id" params={{ id: t.id }} className="block">
                <div className="aspect-[4/3] bg-gradient-to-br from-secondary via-secondary/60 to-background border-b flex items-center justify-center relative">
                  {t.thumbnail_url ? (
                    <img src={t.thumbnail_url} alt={t.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center px-4">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground/70" />
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                        {(t.blocks?.length ?? 0)} blocks
                      </div>
                    </div>
                  )}
                  {t.archived && <Badge variant="secondary" className="absolute top-2 left-2">Archived</Badge>}
                </div>
              </Link>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to="/templates/$id" params={{ id: t.id }} className="font-semibold text-sm hover:text-primary truncate block">{t.name}</Link>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {TEMPLATE_CATEGORIES.find(c => c.value === t.category)?.label ?? t.category} · Updated {new Date(t.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate({ to: "/templates/$id", params: { id: t.id } })}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => dup.mutate(t.id)}><Copy className="h-3.5 w-3.5 mr-2" />Duplicate</DropdownMenuItem>
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
                {t.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>)}
                    {t.tags.length > 3 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{t.tags.length - 3}</Badge>}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(t) => { setCreateOpen(false); invalidate(); navigate({ to: "/templates/$id", params: { id: t.id } }); }}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        runImport={runImport}
        onCreated={(t) => { setImportOpen(false); invalidate(); navigate({ to: "/templates/$id", params: { id: t.id } }); }}
      />
    </div>
  );
}

/* ------- Create dialog ------- */
function CreateDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: (t: Template) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [tagsRaw, setTagsRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setName(""); setDescription(""); setCategory("general"); setTagsRaw(""); };

  const submit = async () => {
    if (!name.trim()) { toast.error("Give the template a name"); return; }
    setBusy(true);
    try {
      const t = await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tags: tagsRaw.split(",").map(s => s.trim()).filter(Boolean),
        blocks: defaultBlocks(),
      });
      toast.success("Template created");
      reset();
      onCreated(t);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create template");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Domestic Standard Proposal" /></div>
          <div><Label>Description</Label><Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What this template is used for…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tags (comma separated)</Label><Input value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} placeholder="soap, 500kg, semi" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button className="gradient-primary" onClick={submit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</> : <><Plus className="h-4 w-4 mr-1" /> Create</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------- Import dialog ------- */
function ImportDialog({ open, onOpenChange, runImport, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  runImport: (arg: any) => Promise<any>;
  onCreated: (t: Template) => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [busy, setBusy] = useState(false);

  const reset = () => { setText(""); setFile(null); setName(""); setCategory("general"); setBusy(false); };

  const readFileBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

  const submit = async () => {
    if (!name.trim()) { toast.error("Give the template a name"); return; }
    if (!text.trim() && !file) { toast.error("Paste some text or upload a file"); return; }
    if (file && file.size > MAX_FILE_BYTES) { toast.error("File must be under 10 MB"); return; }
    setBusy(true);
    try {
      const payload: any = { text: text || undefined };
      if (file) {
        const dataBase64 = await readFileBase64(file);
        payload.file = { name: file.name, mimeType: file.type || "application/octet-stream", dataBase64 };
      }
      const res = await runImport({ data: payload });
      if (!res.blocks?.length) {
        toast.error(res.notes || "AI could not extract a layout from that file.");
        setBusy(false); return;
      }
      const t = await createTemplate({
        name: name.trim(),
        category,
        blocks: res.blocks,
        ai_content: res.ai,
        description: res.notes,
      });
      toast.success(`Imported ${res.blocks.length} blocks`);
      reset();
      onCreated(t);
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Import template with AI</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Template name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Imported from PDF" /></div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Paste text (from Word / PDF / email)</Label>
            <Textarea rows={6} placeholder="Paste the source proposal text here…" value={text} onChange={e => setText(e.target.value)} />
          </div>
          <div>
            <Label>Or upload PDF / DOCX / image / PPTX</Label>
            <Input type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/webp"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} · {(file.size/1024).toFixed(0)} KB</p>}
            <p className="text-[11px] text-muted-foreground mt-1">AI extracts a block-based layout (text, sections, tables, machines, terms). Complex visual formatting is approximated, not pixel-perfect.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button className="gradient-primary" onClick={submit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Converting…</> : <><Upload className="h-4 w-4 mr-1" /> Import & Create</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
