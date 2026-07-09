import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronUp, ChevronDown, Copy, Trash2, Eye, EyeOff, Plus,
  Save, Check, Archive, ArchiveRestore, Monitor, Smartphone, FileText as A4Icon, FileText,
} from "lucide-react";
import { BlockPreview } from "@/components/BlockPreview";
import { PdfOverlayEditor } from "@/components/PdfOverlayEditor";
import {
  makeBlock, BLOCK_LABEL, AI_SECTION_KEYS,
  type ProposalBlock, type BlockType,
} from "@/lib/blocks";
import type { AiProposalContent } from "@/lib/ai.functions";
import type { Machine, Commercials } from "@/lib/proposal-catalog";
import {
  getTemplate, updateTemplate, duplicateTemplate, deleteTemplate, TEMPLATE_CATEGORIES,
} from "@/lib/templates";
import type { OverlayField } from "@/lib/pdf-overlay";

export const Route = createFileRoute("/_authenticated/templates/$id")({
  component: TemplateEditor,
});

const ADDABLE: BlockType[] = ["cover", "ai_section", "ai_bullets", "text", "image", "table", "spacer", "machines", "utilities", "commercials", "terms"];

function TemplateEditor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate(id),
  });

  const [blocks, setBlocks] = useState<ProposalBlock[]>([]);
  const [ai, setAi] = useState<Partial<AiProposalContent>>({});
  const [overlays, setOverlays] = useState<OverlayField[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tagsRaw, setTagsRaw] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"a4" | "desktop" | "mobile">("a4");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const initialLoad = useRef(true);

  useEffect(() => {
    if (!data || !initialLoad.current) return;
    initialLoad.current = false;
    setBlocks((data.blocks && data.blocks.length ? data.blocks : []) as ProposalBlock[]);
    setAi((data.ai_content || {}) as Partial<AiProposalContent>);
    setOverlays((data.overlays || []) as OverlayField[]);
    setName(data.name);
    setDescription(data.description || "");
    setCategory(data.category || "general");
    setTagsRaw((data.tags || []).join(", "));
  }, [data]);

  const dirty = () => setSaved(false);

  const patch = useMutation({
    mutationFn: async () => {
      setSaving(true);
      await updateTemplate(id, {
        name: name.trim() || "Untitled Template",
        description: description || null,
        category,
        tags: tagsRaw.split(",").map(s => s.trim()).filter(Boolean),
        blocks,
        ai_content: ai,
        overlays,
      } as any);
    },
    onSuccess: () => { setSaving(false); setSaved(true); qc.invalidateQueries({ queryKey: ["template", id] }); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: (e: Error) => { setSaving(false); toast.error(e.message); },
  });

  // Autosave
  useEffect(() => {
    if (saved || initialLoad.current) return;
    const t = setTimeout(() => patch.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, ai, overlays, name, description, category, tagsRaw, saved]);

  // Block ops
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...blocks]; const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    setBlocks(next); dirty();
  };
  const remove = (idx: number) => { setBlocks(blocks.filter((_, i) => i !== idx)); dirty(); };
  const duplicate = (idx: number) => {
    const b = blocks[idx];
    const copy: ProposalBlock = { ...b, id: `${b.id}_copy_${Date.now().toString(36)}` };
    const next = [...blocks]; next.splice(idx + 1, 0, copy); setBlocks(next); dirty();
  };
  const toggleVisible = (idx: number) => {
    const next = [...blocks]; next[idx] = { ...next[idx], visible: !next[idx].visible }; setBlocks(next); dirty();
  };
  const update = (idx: number, p: Partial<ProposalBlock>) => {
    const next = [...blocks]; next[idx] = { ...next[idx], ...p }; setBlocks(next); dirty();
  };
  const add = (type: BlockType) => {
    const insertAt = selectedId ? blocks.findIndex(b => b.id === selectedId) + 1 : blocks.length;
    const nb = makeBlock(type);
    const next = [...blocks]; next.splice(insertAt, 0, nb); setBlocks(next); setSelectedId(nb.id); dirty();
  };
  const updateAi = (key: keyof AiProposalContent, value: any) => { setAi(a => ({ ...a, [key]: value })); dirty(); };

  const dup = useMutation({
    mutationFn: () => duplicateTemplate(id),
    onSuccess: (t) => { toast.success("Duplicated"); qc.invalidateQueries({ queryKey: ["templates"] }); navigate({ to: "/templates/$id", params: { id: t.id } }); },
    onError: (e: Error) => toast.error(e.message),
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

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading template…</div>;

  const selected = blocks.find(b => b.id === selectedId);
  const isPdfMode = data.mode === "pdf_overlay" && data.source_pdf_url;

  return (
    <div className="fixed inset-0 lg:left-64 top-16 bg-muted/30 flex flex-col">
      {/* Toolbar */}
      <div className="h-12 border-b bg-background flex items-center gap-2 px-3">
        <Button variant="ghost" size="sm" asChild><Link to="/templates"><ChevronLeft className="h-4 w-4 mr-1" />Library</Link></Button>
        <div className="text-sm font-semibold truncate">{name || "Untitled"}</div>
        <div className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
          {isPdfMode ? "Pixel-perfect PDF" : "Block layout"}
        </div>
        {!isPdfMode && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <Button variant={device === "a4" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setDevice("a4")}><A4Icon className="h-3.5 w-3.5 mr-1" />A4</Button>
              <Button variant={device === "desktop" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setDevice("desktop")}><Monitor className="h-3.5 w-3.5 mr-1" />Desktop</Button>
              <Button variant={device === "mobile" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setDevice("mobile")}><Smartphone className="h-3.5 w-3.5 mr-1" />Mobile</Button>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? <>Saving…</> : saved ? <><Check className="h-3.5 w-3.5 text-success" /> Saved</> : <>Unsaved</>}
          <Button size="sm" variant="outline" onClick={() => dup.mutate()}><Copy className="h-3.5 w-3.5 mr-1" /> Duplicate</Button>
          <Button size="sm" variant="outline" onClick={() => archive.mutate()}>
            {data.archived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore</> : <><Archive className="h-3.5 w-3.5 mr-1" /> Archive</>}
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm(`Delete "${name}"?`)) del.mutate(); }}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <Button size="sm" onClick={() => patch.mutate()} disabled={saved || saving} className="gradient-primary">
            <Save className="h-3.5 w-3.5 mr-1" /> Save now
          </Button>
        </div>
      </div>

      {/* Body */}
      {isPdfMode ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-0">
          <div className="border-r bg-background overflow-y-auto min-h-0 p-3 space-y-2">
            <div>
              <Label className="text-[10px] uppercase">Name</Label>
              <Input value={name} onChange={e => { setName(e.target.value); dirty(); }} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Category</Label>
              <Select value={category} onValueChange={v => { setCategory(v); dirty(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase">Tags</Label>
              <Input value={tagsRaw} onChange={e => { setTagsRaw(e.target.value); dirty(); }} placeholder="comma, separated" />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Description</Label>
              <Textarea rows={3} value={description} onChange={e => { setDescription(e.target.value); dirty(); }} />
            </div>
            <div className="pt-3 mt-3 border-t space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 font-medium text-foreground"><FileText className="h-3.5 w-3.5" /> Source PDF</div>
              <div>{data.source_pdf_pages ?? "?"} pages</div>
              <p className="text-[11px] leading-snug pt-1">
                The uploaded PDF is used as the visual layer. Place fields on it
                for values that should change per proposal (customer name, price,
                date, etc.). Everything else stays exactly as designed.
              </p>
            </div>
          </div>
          <div className="p-3 overflow-hidden min-h-0">
            <PdfOverlayEditor
              storagePath={data.source_pdf_url!}
              totalPages={data.source_pdf_pages ?? 1}
              overlays={overlays}
              onChange={next => { setOverlays(next); dirty(); }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr_320px] min-h-0">
          {/* Left */}
          <div className="border-r bg-background overflow-y-auto min-h-0">
            <div className="p-3 border-b space-y-2">
              <div>
                <Label className="text-[10px] uppercase">Name</Label>
                <Input value={name} onChange={e => { setName(e.target.value); dirty(); }} />
              </div>
              <div>
                <Label className="text-[10px] uppercase">Category</Label>
                <Select value={category} onValueChange={v => { setCategory(v); dirty(); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase">Tags</Label>
                <Input value={tagsRaw} onChange={e => { setTagsRaw(e.target.value); dirty(); }} placeholder="comma, separated" />
              </div>
              <div>
                <Label className="text-[10px] uppercase">Description</Label>
                <Textarea rows={2} value={description} onChange={e => { setDescription(e.target.value); dirty(); }} />
              </div>
            </div>
            <div className="p-3 border-b">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Add block</div>
              <div className="grid grid-cols-2 gap-1">
                {ADDABLE.map(t => (
                  <Button key={t} variant="outline" size="sm" className="justify-start h-8 text-xs" onClick={() => add(t)}>
                    <Plus className="h-3 w-3 mr-1" />{BLOCK_LABEL[t]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="p-2 space-y-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground px-1 py-1">Outline ({blocks.length})</div>
              {blocks.length === 0 && <div className="text-xs text-muted-foreground px-1">No blocks. Add one above.</div>}
              {blocks.map((b, i) => (
                <div
                  key={b.id}
                  className={`group flex items-center gap-1 rounded-md border p-1.5 hover:bg-secondary/50 cursor-pointer ${selectedId === b.id ? "border-primary bg-secondary/40" : ""} ${!b.visible ? "opacity-50" : ""}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <div className="flex flex-col">
                    <button className="hover:text-primary" onClick={e => { e.stopPropagation(); move(i, -1); }}><ChevronUp className="h-3 w-3" /></button>
                    <button className="hover:text-primary" onClick={e => { e.stopPropagation(); move(i, 1); }}><ChevronDown className="h-3 w-3" /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{b.heading || BLOCK_LABEL[b.type]}</div>
                    <div className="text-[10px] text-muted-foreground">{BLOCK_LABEL[b.type]}</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center">
                    <button className="p-0.5 hover:text-primary" onClick={e => { e.stopPropagation(); toggleVisible(i); }}>
                      {b.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button className="p-0.5 hover:text-primary" onClick={e => { e.stopPropagation(); duplicate(i); }}><Copy className="h-3.5 w-3.5" /></button>
                    <button className="p-0.5 hover:text-destructive" onClick={e => { e.stopPropagation(); remove(i); }}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center preview */}
          <div className="overflow-y-auto min-h-0 py-6 px-3 bg-muted/50">
            <BlockPreview
              blocks={blocks}
              ai={ai as AiProposalContent}
              machines={[] as Machine[]}
              utilities={{}}
              commercials={{} as Commercials}
              currency="INR"
              customer={{ company_name: "Sample Customer Pvt Ltd", country: "India" }}
              productLabel="Sample Product"
              proposalNumber="TEMPLATE-PREVIEW"
              title={name || "Template preview"}
              capacity="—"
              automation="—"
              material="—"
              createdAt={data.created_at}
              terms={[]}
              device={device}
            />
          </div>

          {/* Right inspector */}
          <div className="border-l bg-background overflow-y-auto min-h-0 p-4">
            {!selected && <div className="text-sm text-muted-foreground text-center py-16">Select a block to edit its content.</div>}
            {selected && (
              <Inspector
                block={selected}
                onChange={p => update(blocks.findIndex(b => b.id === selected.id), p)}
                ai={ai as AiProposalContent}
                onAiChange={updateAi}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Inspector({ block, onChange, ai, onAiChange }: {
  block: ProposalBlock;
  onChange: (p: Partial<ProposalBlock>) => void;
  ai: AiProposalContent;
  onAiChange: (key: keyof AiProposalContent, value: any) => void;
}) {
  const t = block.type;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{BLOCK_LABEL[t]}</div>
        <label className="flex items-center gap-1.5 text-xs">
          <Switch checked={block.visible} onCheckedChange={v => onChange({ visible: v })} />Visible
        </label>
      </div>

      {(t === "ai_section" || t === "ai_bullets") && (
        <>
          <div><Label>Heading</Label><Input value={block.heading || ""} onChange={e => onChange({ heading: e.target.value })} /></div>
          <div>
            <Label>AI content field</Label>
            <Select value={block.aiKey || "executive_summary"} onValueChange={v => onChange({ aiKey: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_SECTION_KEYS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}{s.bullets ? " (bullets)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {block.aiKey && (
            <div>
              <Label>Default content (used when a new proposal starts from this template)</Label>
              {t === "ai_bullets" ? (
                <Textarea rows={8} placeholder="One bullet per line"
                  value={Array.isArray((ai as any)[block.aiKey]) ? ((ai as any)[block.aiKey] as string[]).join("\n") : String((ai as any)[block.aiKey] || "")}
                  onChange={e => onAiChange(block.aiKey!, e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
              ) : (
                <Textarea rows={10} value={String((ai as any)[block.aiKey] || "")}
                  onChange={e => onAiChange(block.aiKey!, e.target.value)} />
              )}
            </div>
          )}
        </>
      )}

      {t === "text" && (
        <>
          <div><Label>Heading</Label><Input value={block.heading || ""} onChange={e => onChange({ heading: e.target.value })} /></div>
          <div><Label>Body</Label><Textarea rows={10} value={block.body || ""} onChange={e => onChange({ body: e.target.value })} /></div>
        </>
      )}

      {t === "image" && (
        <>
          <div><Label>Image URL</Label><Input value={block.imageUrl || ""} onChange={e => onChange({ imageUrl: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Caption</Label><Input value={block.caption || ""} onChange={e => onChange({ caption: e.target.value })} /></div>
        </>
      )}

      {t === "table" && (
        <>
          <div><Label>Heading</Label><Input value={block.heading || ""} onChange={e => onChange({ heading: e.target.value })} /></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Rows</Label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => onChange({ tableHeaders: [...(block.tableHeaders || []), `Col ${(block.tableHeaders?.length || 0) + 1}`], tableRows: (block.tableRows || []).map(r => [...r, ""]) })}>+ Col</Button>
                <Button size="sm" variant="outline" onClick={() => onChange({ tableRows: [...(block.tableRows || []), new Array(block.tableHeaders?.length || 2).fill("")] })}>+ Row</Button>
              </div>
            </div>
            <table className="w-full text-xs border">
              <thead><tr>
                {(block.tableHeaders || []).map((h, i) => (
                  <th key={i} className="border p-1"><Input className="h-7" value={h} onChange={e => {
                    const next = [...(block.tableHeaders || [])]; next[i] = e.target.value; onChange({ tableHeaders: next });
                  }} /></th>
                ))}
              </tr></thead>
              <tbody>
                {(block.tableRows || []).map((row, ri) => (
                  <tr key={ri}>{row.map((c, ci) => (
                    <td key={ci} className="border p-1"><Input className="h-7" value={c} onChange={e => {
                      const next = (block.tableRows || []).map(r => [...r]);
                      next[ri][ci] = e.target.value;
                      onChange({ tableRows: next });
                    }} /></td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {t === "spacer" && (
        <div><Label>Height (px)</Label><Input type="number" value={block.height ?? 24} onChange={e => onChange({ height: Number(e.target.value) || 0 })} /></div>
      )}

      {(t === "cover" || t === "machines" || t === "utilities" || t === "commercials" || t === "terms") && (
        <div className="text-xs text-muted-foreground">
          This block renders from live proposal data when the template is applied. Nothing to configure here.
        </div>
      )}
    </div>
  );
}
