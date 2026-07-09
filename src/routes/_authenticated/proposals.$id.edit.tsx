import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Save, Undo2, Redo2, Monitor, Smartphone, FileText as A4Icon, Check,
} from "lucide-react";
import {
  defaultBlocks, makeBlock, BLOCK_LABEL, AI_SECTION_KEYS,
  type ProposalBlock, type BlockType,
} from "@/lib/blocks";
import type { AiProposalContent } from "@/lib/ai.functions";
import type { Machine, Utilities, Commercials } from "@/lib/proposal-catalog";
import { BlockPreview } from "@/components/BlockPreview";
import { PRODUCT_TYPES } from "@/lib/proposal-catalog";

export const Route = createFileRoute("/_authenticated/proposals/$id/edit")({
  component: BlockEditor,
});

const ADDABLE: BlockType[] = ["ai_section", "ai_bullets", "text", "image", "table", "spacer", "machines", "utilities", "commercials", "terms"];

function BlockEditor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proposals").select("*, customers(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const termsTemplateId = (data as any)?.terms_template_id as string | null | undefined;
  const { data: termsClauses = [] } = useQuery({
    queryKey: ["proposal-terms", termsTemplateId],
    enabled: !!termsTemplateId,
    queryFn: async () => {
      const { data, error } = await supabase.from("terms_clauses")
        .select("title, body, position, enabled")
        .eq("template_id", termsTemplateId as string).eq("enabled", true).order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(c => ({ title: c.title, body: c.body }));
    },
  });

  const [blocks, setBlocks] = useState<ProposalBlock[]>([]);
  const [ai, setAi] = useState<AiProposalContent>({} as AiProposalContent);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"a4" | "desktop" | "mobile">("a4");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const historyRef = useRef<ProposalBlock[][]>([]);
  const futureRef = useRef<ProposalBlock[][]>([]);
  const initialLoad = useRef(true);

  // Hydrate from DB once
  useEffect(() => {
    if (!data || !initialLoad.current) return;
    initialLoad.current = false;
    const dbBlocks = (data as any).blocks as ProposalBlock[] | null;
    setBlocks(dbBlocks && dbBlocks.length ? dbBlocks : defaultBlocks());
    setAi(((data.ai_content as any) ?? {}) as AiProposalContent);
  }, [data]);

  const commit = (next: ProposalBlock[]) => {
    historyRef.current.push(blocks);
    if (historyRef.current.length > 50) historyRef.current.shift();
    futureRef.current = [];
    setBlocks(next);
    setSaved(false);
  };
  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(blocks);
    setBlocks(prev);
    setSaved(false);
  };
  const redo = () => {
    const nxt = futureRef.current.pop();
    if (!nxt) return;
    historyRef.current.push(blocks);
    setBlocks(nxt);
    setSaved(false);
  };

  // Autosave
  const patch = useMutation({
    mutationFn: async (payload: { blocks: ProposalBlock[]; ai: AiProposalContent }) => {
      setSaving(true);
      const { error } = await (supabase.from("proposals").update as any)({
        blocks: payload.blocks as any,
        ai_content: payload.ai as any,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setSaving(false); setSaved(true); qc.invalidateQueries({ queryKey: ["proposal", id] }); },
    onError: (e: Error) => { setSaving(false); toast.error(e.message); },
  });

  useEffect(() => {
    if (saved || !blocks.length) return;
    const t = setTimeout(() => patch.mutate({ blocks, ai }), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, ai, saved]);

  const selected = blocks.find(b => b.id === selectedId);

  // Block ops
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...blocks];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    commit(next);
  };
  const remove = (idx: number) => commit(blocks.filter((_, i) => i !== idx));
  const duplicate = (idx: number) => {
    const b = blocks[idx];
    const copy: ProposalBlock = { ...b, id: `${b.id}_copy_${Date.now().toString(36)}` };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    commit(next);
  };
  const toggleVisible = (idx: number) => {
    const next = [...blocks];
    next[idx] = { ...next[idx], visible: !next[idx].visible };
    commit(next);
  };
  const update = (idx: number, patch: Partial<ProposalBlock>) => {
    const next = [...blocks];
    next[idx] = { ...next[idx], ...patch };
    commit(next);
  };
  const add = (type: BlockType) => {
    const insertAt = selected ? blocks.findIndex(b => b.id === selected.id) + 1 : blocks.length;
    const nb = makeBlock(type);
    const next = [...blocks];
    next.splice(insertAt, 0, nb);
    commit(next);
    setSelectedId(nb.id);
  };

  const updateAi = (key: keyof AiProposalContent, value: any) => {
    setAi(a => ({ ...a, [key]: value }));
    setSaved(false);
  };

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading editor…</div>;

  const p = data as any;
  const productLabel = PRODUCT_TYPES.find(x => x.value === p.product_type)?.label ?? p.product_type;

  return (
    <div className="fixed inset-0 lg:left-64 top-16 bg-muted/30 flex flex-col">
      {/* Toolbar */}
      <div className="h-12 border-b bg-background flex items-center gap-2 px-3">
        <Button variant="ghost" size="sm" asChild><Link to="/proposals/$id" params={{ id }}><ChevronLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <div className="text-sm font-semibold truncate">{p.title}</div>
        <div className="mx-2 h-6 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={undo} disabled={!historyRef.current.length}><Undo2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={redo} disabled={!futureRef.current.length}><Redo2 className="h-4 w-4" /></Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <Button variant={device === "a4" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setDevice("a4")}><A4Icon className="h-3.5 w-3.5 mr-1" />A4</Button>
          <Button variant={device === "desktop" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setDevice("desktop")}><Monitor className="h-3.5 w-3.5 mr-1" />Desktop</Button>
          <Button variant={device === "mobile" ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={() => setDevice("mobile")}><Smartphone className="h-3.5 w-3.5 mr-1" />Mobile</Button>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? <>Saving…</> : saved ? <><Check className="h-3.5 w-3.5 text-success" /> Saved</> : <>Unsaved</>}
          <Button size="sm" onClick={() => patch.mutate({ blocks, ai })} disabled={saved || saving} className="gradient-primary">
            <Save className="h-3.5 w-3.5 mr-1" /> Save now
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr_320px] min-h-0">
        {/* Left: outline */}
        <div className="border-r bg-background overflow-y-auto min-h-0">
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
                  <button className="p-0.5 hover:text-primary" onClick={e => { e.stopPropagation(); toggleVisible(i); }} title={b.visible ? "Hide" : "Show"}>
                    {b.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button className="p-0.5 hover:text-primary" onClick={e => { e.stopPropagation(); duplicate(i); }} title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                  <button className="p-0.5 hover:text-destructive" onClick={e => { e.stopPropagation(); remove(i); }} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: live preview */}
        <div className="overflow-y-auto min-h-0 py-6 px-3 bg-muted/50">
          <BlockPreview
            blocks={blocks}
            ai={ai}
            machines={(p.machines as Machine[]) || []}
            utilities={(p.utilities as any) || {}}
            commercials={(p.commercials as Commercials) || ({} as Commercials)}
            currency={p.currency}
            customer={p.customers || {}}
            productLabel={productLabel}
            proposalNumber={p.proposal_number}
            title={p.title}
            capacity={p.capacity}
            automation={p.automation}
            material={p.material}
            createdAt={p.created_at}
            terms={termsClauses}
            device={device}
          />
        </div>

        {/* Right: inspector */}
        <div className="border-l bg-background overflow-y-auto min-h-0 p-4">
          {!selected && <div className="text-sm text-muted-foreground text-center py-16">Select a block to edit its content.</div>}
          {selected && (
            <Inspector
              block={selected}
              onChange={patch => update(blocks.findIndex(b => b.id === selected.id), patch)}
              ai={ai}
              onAiChange={updateAi}
            />
          )}
        </div>
      </div>
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
          <Switch checked={block.visible} onCheckedChange={v => onChange({ visible: v })} />
          Visible
        </label>
      </div>

      {(t === "ai_section" || t === "ai_bullets") && (
        <>
          <div>
            <Label>Heading</Label>
            <Input value={block.heading || ""} onChange={e => onChange({ heading: e.target.value })} />
          </div>
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
              <Label>Content</Label>
              {t === "ai_bullets" ? (
                <Textarea rows={8} placeholder="One bullet per line" value={Array.isArray((ai as any)[block.aiKey]) ? ((ai as any)[block.aiKey] as string[]).join("\n") : String((ai as any)[block.aiKey] || "")}
                  onChange={e => onAiChange(block.aiKey!, e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
              ) : (
                <Textarea rows={10} value={String((ai as any)[block.aiKey] || "")}
                  onChange={e => onAiChange(block.aiKey!, e.target.value)} />
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Edits sync back to the AI Technical Proposal.</p>
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
              <thead>
                <tr>
                  {(block.tableHeaders || []).map((h, i) => (
                    <th key={i} className="border p-1"><Input className="h-7" value={h} onChange={e => {
                      const next = [...(block.tableHeaders || [])]; next[i] = e.target.value; onChange({ tableHeaders: next });
                    }} /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(block.tableRows || []).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td key={ci} className="border p-1"><Input className="h-7" value={c} onChange={e => {
                        const next = (block.tableRows || []).map(r => [...r]);
                        next[ri][ci] = e.target.value;
                        onChange({ tableRows: next });
                      }} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {t === "spacer" && (
        <div><Label>Height (px)</Label><Input type="number" value={block.height ?? 24} onChange={e => onChange({ height: Number(e.target.value) || 0 })} /></div>
      )}

      {(t === "machines" || t === "utilities" || t === "commercials" || t === "terms" || t === "cover") && (
        <>
          {t !== "cover" && <div><Label>Heading</Label><Input value={block.heading || ""} onChange={e => onChange({ heading: e.target.value })} /></div>}
          <div className="text-xs text-muted-foreground">
            This block renders live data from the proposal.
            {t === "machines" && " Edit machines from the proposal detail page."}
            {t === "utilities" && " Edit utilities in the wizard."}
            {t === "commercials" && " Edit commercials in the wizard."}
            {t === "terms" && " Managed via the Terms Library."}
          </div>
        </>
      )}
    </div>
  );
}
