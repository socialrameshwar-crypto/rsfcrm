import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Save, Trash2, Blocks, LayoutTemplate, Star, Eye, EyeOff, X } from "lucide-react";
import {
  BLOCK_CATEGORIES, TEMPLATE_SCOPES, AI_SECTIONS, fetchBlocks, fetchProposalTemplates,
  type ContentBlock, type ProposalTemplate,
} from "@/lib/content";
import { PRODUCT_TYPES } from "@/lib/proposal-catalog";

export const Route = createFileRoute("/_authenticated/settings/content")({
  component: ContentPage,
});

function ContentPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
        <p className="text-sm text-muted-foreground">
          Manage reusable content blocks (warranty, payment, delivery, company profile…) and full proposal templates.
        </p>
      </div>
      <Tabs defaultValue="blocks">
        <TabsList>
          <TabsTrigger value="blocks"><Blocks className="h-4 w-4 mr-1" />Content blocks</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="h-4 w-4 mr-1" />Proposal templates</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks" className="mt-6"><BlocksTab /></TabsContent>
        <TabsContent value="templates" className="mt-6"><TemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Blocks ----------------

function BlocksTab() {
  const qc = useQueryClient();
  const { data: blocks = [], isLoading } = useQuery({ queryKey: ["content-blocks"], queryFn: fetchBlocks });
  const [editing, setEditing] = useState<Partial<ContentBlock> | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    return blocks.filter(b => {
      if (category !== "all" && b.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.body.toLowerCase().includes(q) || b.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [blocks, category, search]);

  const save = useMutation({
    mutationFn: async (b: Partial<ContentBlock>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload: any = {
        user_id: u.user.id,
        name: b.name || "Untitled block",
        category: b.category || "custom",
        body: b.body || "",
        tags: b.tags || [],
        product_slug: b.product_slug || null,
        sort_order: b.sort_order ?? 0,
      };
      if (b.id) {
        const { error } = await (supabase as any).from("content_blocks").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("content_blocks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["content-blocks"] }); toast.success("Saved"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_blocks").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["content-blocks"] }); toast.success("Removed"); setEditing(null); },
  });

  const seed = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const rows = DEFAULT_BLOCKS.map(b => ({ ...b, user_id: u.user.id }));
      const { error } = await (supabase as any).from("content_blocks").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["content-blocks"] }); toast.success("Starter blocks added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-semibold text-sm">Blocks ({filtered.length})</div>
          <div className="flex gap-2">
            {blocks.length === 0 && <Button size="sm" variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>Load starter blocks</Button>}
            <Button size="sm" onClick={() => setEditing({ category: "custom", tags: [], body: "" })}>
              <Plus className="h-4 w-4 mr-1" /> New block
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {BLOCK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">No blocks match.</div>
        )}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filtered.map(b => (
            <button
              key={b.id}
              onClick={() => setEditing(b)}
              className={`w-full text-left rounded-md border p-3 hover:bg-secondary/50 ${editing?.id === b.id ? "border-primary bg-secondary/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm truncate">{b.name}</div>
                <Badge variant="outline" className="text-[10px] shrink-0">{BLOCK_CATEGORIES.find(c => c.value === b.category)?.label ?? b.category}</Badge>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.body}</div>
              {b.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {b.tags.slice(0, 4).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">{t}</span>)}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        {!editing && <div className="text-sm text-muted-foreground text-center py-16">Select or create a block to edit.</div>}
        {editing && (
          <BlockEditor
            block={editing}
            onChange={setEditing}
            onSave={() => save.mutate(editing)}
            onDelete={editing.id ? () => del.mutate(editing.id!) : undefined}
            saving={save.isPending}
          />
        )}
      </Card>
    </div>
  );
}

function BlockEditor({ block, onChange, onSave, onDelete, saving }: {
  block: Partial<ContentBlock>;
  onChange: (b: Partial<ContentBlock>) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const tags = block.tags || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{block.id ? "Edit block" : "New block"}</div>
        <div className="flex gap-2">
          {onDelete && <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
          <Button size="sm" onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-1" />Save</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Name</Label>
          <Input value={block.name || ""} onChange={e => onChange({ ...block, name: e.target.value })} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={block.category || "custom"} onValueChange={v => onChange({ ...block, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BLOCK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Product (optional)</Label>
          <Select value={block.product_slug || "any"} onValueChange={v => onChange({ ...block, product_slug: v === "any" ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any product</SelectItem>
              {PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={block.sort_order ?? 0} onChange={e => onChange({ ...block, sort_order: Number(e.target.value) || 0 })} />
        </div>
      </div>
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 items-center">
          <Input
            value={tagDraft}
            onChange={e => setTagDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && tagDraft.trim()) {
                e.preventDefault();
                onChange({ ...block, tags: [...tags, tagDraft.trim()] });
                setTagDraft("");
              }
            }}
            placeholder="Type and press Enter…"
          />
        </div>
        <div className="flex gap-1 flex-wrap mt-2">
          {tags.map((t, i) => (
            <button key={i} onClick={() => onChange({ ...block, tags: tags.filter((_, j) => j !== i) })} className="text-xs px-2 py-0.5 rounded bg-secondary hover:bg-destructive/20">
              {t} ×
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Body</Label>
        <Textarea rows={10} value={block.body || ""} onChange={e => onChange({ ...block, body: e.target.value })} placeholder="The content that will be inserted into a proposal section." />
      </div>
    </div>
  );
}

// ---------------- Templates ----------------

function TemplatesTab() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["proposal-templates"],
    queryFn: fetchProposalTemplates,
  });
  const [editing, setEditing] = useState<Partial<ProposalTemplate> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openNew = () => {
    setEditing({
      name: "",
      scope: "domestic",
      description: "",
      sections: {},
      is_default: false,
    });
    setSheetOpen(true);
  };

  const openExisting = (t: ProposalTemplate) => {
    setEditing(t);
    setSheetOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (t: Partial<ProposalTemplate>) => {
      const { data: u, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!u.user) throw new Error("Not signed in");
      const payload: any = {
        user_id: u.user.id,
        name: (t.name || "").trim() || "Untitled template",
        scope: t.scope || "domestic",
        description: t.description || null,
        sections: t.sections || {},
        is_default: !!t.is_default,
      };
      if (t.id) {
        const { data, error } = await (supabase as any)
          .from("proposal_templates")
          .update(payload)
          .eq("id", t.id)
          .select()
          .single();
        if (error) throw error;
        return data as ProposalTemplate;
      } else {
        const { data, error } = await (supabase as any)
          .from("proposal_templates")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data as ProposalTemplate;
      }
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["proposal-templates"] });
      // Keep the sheet open with the saved row (so auto-save keeps updating same id)
      setEditing((prev) => (prev ? { ...prev, ...saved } : saved));
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("proposal_templates")
        .update({ archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast.success("Template removed");
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-semibold text-sm">Proposal templates ({templates.length})</div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New template
          </Button>
        </div>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="text-sm text-destructive">Failed to load templates: {(error as Error).message}</div>
        )}
        {!isLoading && !error && templates.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
            No templates yet. Click <span className="font-medium">New template</span> to create one.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => openExisting(t)}
              className="text-left rounded-md border p-3 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{t.name}</div>
                {t.is_default && <Star className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {TEMPLATE_SCOPES.find((s) => s.value === t.scope)?.label ?? t.scope}
                {" · "}
                {Object.keys(t.sections || {}).length} section(s)
              </div>
              {t.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle>{editing?.id ? "Edit template" : "New template"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <TemplateEditor
              tpl={editing}
              onChange={setEditing}
              onSave={() => saveMut.mutate(editing)}
              onDelete={editing.id ? () => delMut.mutate(editing.id!) : undefined}
              saving={saveMut.isPending}
              onClose={() => {
                setSheetOpen(false);
                setEditing(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TemplateEditor({
  tpl,
  onChange,
  onSave,
  onDelete,
  saving,
  onClose,
}: {
  tpl: Partial<ProposalTemplate>;
  onChange: (t: Partial<ProposalTemplate>) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
  onClose: () => void;
}) {
  const sections = tpl.sections || {};
  const setSection = (key: string, value: string) =>
    onChange({ ...tpl, sections: { ...sections, [key]: value } });

  const [preview, setPreview] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const firstRun = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save debounce (only for existing templates — avoid creating dupes)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!autoSave) return;
    if (!tpl.id) return; // don't auto-create; user hits "Save draft" first
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave();
      setLastSavedAt(new Date());
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl.name, tpl.scope, tpl.description, JSON.stringify(tpl.sections), tpl.is_default, autoSave]);

  const handleManualSave = () => {
    onSave();
    setLastSavedAt(new Date());
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 p-4 border-b flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? (
            <span>Saving…</span>
          ) : lastSavedAt ? (
            <span>Saved {lastSavedAt.toLocaleTimeString()}</span>
          ) : tpl.id ? (
            <span>All changes saved</span>
          ) : (
            <span>Draft — not saved yet</span>
          )}
          <label className="flex items-center gap-1 ml-2">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
            />
            Auto-save
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
            {preview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {preview ? "Hide preview" : "Live preview"}
          </Button>
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={handleManualSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {tpl.id ? "Save" : "Save draft"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={preview ? "grid grid-cols-1 lg:grid-cols-2 gap-0" : ""}>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Name</Label>
              <Input
                value={tpl.name || ""}
                onChange={(e) => onChange({ ...tpl, name: e.target.value })}
                placeholder="e.g. Domestic Soap Plant Proposal"
              />
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={tpl.scope || "domestic"} onValueChange={(v) => onChange({ ...tpl, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Description</Label>
              <Input
                value={tpl.description || ""}
                onChange={(e) => onChange({ ...tpl, description: e.target.value })}
                placeholder="When to use this template"
              />
            </div>
            <label className="md:col-span-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!tpl.is_default}
                onChange={(e) => onChange({ ...tpl, is_default: e.target.checked })}
              />
              Set as default for this scope
            </label>
          </div>

          <div className="space-y-3">
            {AI_SECTIONS.map((s) => (
              <div key={s.key}>
                <Label>{s.label}</Label>
                <Textarea
                  rows={4}
                  value={(sections[s.key] as string) || ""}
                  onChange={(e) => setSection(s.key, e.target.value)}
                  placeholder={`Default content for ${s.label} — leave blank to keep AI-generated text.`}
                />
              </div>
            ))}
          </div>
        </div>

        {preview && (
          <div className="p-4 border-l bg-secondary/20 overflow-y-auto max-h-[70vh]">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Live preview</div>
            <div className="space-y-4">
              <div>
                <div className="text-lg font-bold">{tpl.name || "Untitled template"}</div>
                <div className="text-xs text-muted-foreground">
                  {TEMPLATE_SCOPES.find((s) => s.value === tpl.scope)?.label ?? tpl.scope}
                </div>
                {tpl.description && (
                  <div className="text-sm text-muted-foreground mt-1">{tpl.description}</div>
                )}
              </div>
              {AI_SECTIONS.map((s) => {
                const val = (sections[s.key] as string) || "";
                if (!val.trim()) return null;
                return (
                  <div key={s.key}>
                    <div className="font-semibold text-sm mb-1">{s.label}</div>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground">{val}</div>
                  </div>
                );
              })}
              {AI_SECTIONS.every((s) => !((sections[s.key] as string) || "").trim()) && (
                <div className="text-sm text-muted-foreground italic">
                  No content yet. Sections you fill in will appear here.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Starter blocks ----------------

const DEFAULT_BLOCKS: Omit<ContentBlock, "id" | "user_id" | "created_at" | "updated_at" | "archived">[] = [
  {
    name: "Company profile — Rameshwar Steel Fab",
    category: "company",
    body: "Rameshwar Steel Fab is a leading Indian manufacturer of soap, detergent and industrial machinery with over two decades of engineering experience. We deliver complete turnkey plants — engineered, fabricated and commissioned in-house — to customers across India, the Middle East, Africa and South-East Asia.",
    tags: ["about", "profile", "company"],
    product_slug: null,
    sort_order: 1,
  },
  {
    name: "Standard warranty — 12 months",
    category: "warranty",
    body: "All equipment supplied carries a comprehensive warranty of twelve (12) months from the date of successful commissioning, covering manufacturing defects and workmanship. Consumables, wear parts and damage due to misuse, unauthorized modification or improper utilities are excluded.",
    tags: ["warranty", "12-month"],
    product_slug: null,
    sort_order: 1,
  },
  {
    name: "Payment terms — Domestic (30/60/10)",
    category: "payment",
    body: "30% advance along with confirmed purchase order.\n60% against pro-forma invoice, prior to dispatch.\n10% within 30 days of successful commissioning at site.\nAll payments through RTGS/NEFT in INR. GST as applicable.",
    tags: ["payment", "domestic", "india"],
    product_slug: null,
    sort_order: 1,
  },
  {
    name: "Payment terms — Export (LC 100%)",
    category: "payment",
    body: "100% Irrevocable Letter of Credit at sight from a first-class international bank, in favor of Rameshwar Steel Fab, confirmed and payable in INR/USD, permitting partial shipments and transhipment.",
    tags: ["payment", "export", "lc"],
    product_slug: null,
    sort_order: 2,
  },
  {
    name: "Delivery — Ex-works India",
    category: "delivery",
    body: "Delivery: 10–12 weeks from receipt of technically & commercially clear purchase order and advance payment. Basis: Ex-works our factory, Ahmedabad, India.",
    tags: ["delivery", "domestic"],
    product_slug: null,
    sort_order: 1,
  },
  {
    name: "Delivery — FOB Nhava Sheva",
    category: "delivery",
    body: "Delivery: 12–14 weeks from LC establishment. Basis: FOB Nhava Sheva Port, India. Sea-worthy export packing included. Ocean freight & marine insurance to buyer's account.",
    tags: ["delivery", "export", "fob"],
    product_slug: null,
    sort_order: 2,
  },
  {
    name: "Safety features — standard",
    category: "safety",
    body: "All rotating machinery is provided with fixed guards, emergency stops, overload protection and lock-out / tag-out points. Electrical panels comply with IP54 protection and are equipped with MCBs, ELCB, phase-reversal and thermal overload relays as per IS/IEC standards.",
    tags: ["safety", "standard"],
    product_slug: null,
    sort_order: 1,
  },
  {
    name: "Quality — QA/QC statement",
    category: "quality",
    body: "Every plant is manufactured under a documented QA/QC plan, with raw-material test certificates, in-process inspection and pre-dispatch trial runs at our works. Material of construction certificates and dimensional inspection reports are shared with the customer prior to dispatch.",
    tags: ["quality", "qa", "qc"],
    product_slug: null,
    sort_order: 1,
  },
  {
    name: "Installation & commissioning",
    category: "installation",
    body: "Erection, installation and commissioning at customer's site by our qualified engineers. Customer to provide civil foundations, utilities (power, water, steam, air), raw materials for trials and unskilled manpower. Duration approx. 2–3 weeks depending on plant size.",
    tags: ["installation", "commissioning"],
    product_slug: null,
    sort_order: 1,
  },
];
