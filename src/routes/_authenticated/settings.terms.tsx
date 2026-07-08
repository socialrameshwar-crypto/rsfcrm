import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ensureDefaultTemplates, fetchTemplates, type TermsClause, type TermsTemplate } from "@/lib/terms";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, FileText, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/terms")({
  component: TermsSettings,
});

function TermsSettings() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["terms-templates"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) await ensureDefaultTemplates(user.user.id);
      return fetchTemplates();
    },
  });

  useEffect(() => {
    if (!activeId && templates.length) setActiveId(templates[0].id);
  }, [templates, activeId]);

  const active = templates.find(t => t.id === activeId) ?? null;

  const createTpl = useMutation({
    mutationFn: async (scope: "domestic" | "export") => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("terms_templates").insert({
        user_id: u.user.id,
        name: `New ${scope} template`,
        scope,
        sort_order: templates.length,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setActiveId(id);
      qc.invalidateQueries({ queryKey: ["terms-templates"] });
      toast.success("Template created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchTpl = useMutation({
    mutationFn: async (patch: Partial<TermsTemplate> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("terms_templates").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms-templates"] }),
  });

  const delTpl = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("terms_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["terms-templates"] });
      toast.success("Template deleted");
    },
  });

  const setDefault = useMutation({
    mutationFn: async (tpl: TermsTemplate) => {
      // Clear other defaults in same scope
      await supabase.from("terms_templates").update({ is_default: false }).eq("scope", tpl.scope);
      const { error } = await supabase.from("terms_templates").update({ is_default: true }).eq("id", tpl.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms-templates"] });
      toast.success("Default updated");
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground">Manage reusable clause libraries for domestic and export quotations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => createTpl.mutate("domestic")}><Plus className="h-4 w-4 mr-1" /> Domestic template</Button>
          <Button variant="outline" onClick={() => createTpl.mutate("export")}><Plus className="h-4 w-4 mr-1" /> Export template</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading templates…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="p-3 shadow-elegant lg:col-span-1 h-fit">
            <div className="space-y-1">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left rounded-md p-3 text-sm transition ${activeId === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate font-medium">{t.name}</span>
                    {t.is_default && <Star className="h-3.5 w-3.5 fill-current" />}
                  </div>
                  <div className="text-[10px] uppercase opacity-70 mt-0.5">{t.scope}</div>
                </button>
              ))}
              {templates.length === 0 && <div className="text-sm text-muted-foreground p-3">No templates yet.</div>}
            </div>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            {active ? (
              <TemplateEditor
                key={active.id}
                template={active}
                onPatch={patch => patchTpl.mutate({ id: active.id, ...patch })}
                onDelete={() => confirm("Delete this template?") && delTpl.mutate(active.id)}
                onSetDefault={() => setDefault.mutate(active)}
              />
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground shadow-elegant">Select a template on the left.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  template, onPatch, onDelete, onSetDefault,
}: {
  template: TermsTemplate;
  onPatch: (p: Partial<TermsTemplate>) => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(template.name);
  const [scope, setScope] = useState(template.scope);
  const clauses = (template.clauses ?? []).slice().sort((a, b) => a.position - b.position);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const patchClause = useMutation({
    mutationFn: async (p: Partial<TermsClause> & { id: string }) => {
      const { id, ...rest } = p;
      const { error } = await supabase.from("terms_clauses").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms-templates"] }),
  });

  const addClause = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("terms_clauses").insert({
        user_id: u.user.id,
        template_id: template.id,
        title: "New clause",
        body: "",
        position: clauses.length,
        enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms-templates"] }),
  });

  const delClause = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("terms_clauses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms-templates"] }),
  });

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = clauses.findIndex(c => c.id === e.active.id);
    const newIdx = clauses.findIndex(c => c.id === e.over!.id);
    const reordered = arrayMove(clauses, oldIdx, newIdx);
    // Optimistic-ish: update positions in DB
    await Promise.all(reordered.map((c, i) =>
      supabase.from("terms_clauses").update({ position: i }).eq("id", c.id)
    ));
    qc.invalidateQueries({ queryKey: ["terms-templates"] });
  };

  return (
    <>
      <Card className="p-5 shadow-elegant space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div>
            <Label>Template name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => name !== template.name && onPatch({ name })}
            />
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={scope} onValueChange={v => { setScope(v as any); onPatch({ scope: v as any }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="domestic">Domestic</SelectItem>
                <SelectItem value="export">Export</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant={template.is_default ? "secondary" : "outline"} onClick={onSetDefault} disabled={template.is_default}>
              <Star className={`h-4 w-4 mr-1 ${template.is_default ? "fill-current" : ""}`} />
              {template.is_default ? "Default" : "Set default"}
            </Button>
            <Button variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{scope}</Badge>
          {template.is_default && <Badge className="bg-primary">Default for {scope}</Badge>}
          <span>· {clauses.length} clauses</span>
        </div>
      </Card>

      <Card className="p-5 shadow-elegant space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Clauses</h3>
          <Button size="sm" onClick={() => addClause.mutate()}><Plus className="h-4 w-4 mr-1" /> Add clause</Button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={clauses.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {clauses.map(c => (
                <ClauseRow
                  key={c.id}
                  clause={c}
                  onPatch={p => patchClause.mutate({ id: c.id, ...p })}
                  onDelete={() => delClause.mutate(c.id)}
                />
              ))}
              {clauses.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No clauses yet — add one to get started.</div>}
            </div>
          </SortableContext>
        </DndContext>
      </Card>
    </>
  );
}

function ClauseRow({ clause, onPatch, onDelete }: {
  clause: TermsClause;
  onPatch: (p: Partial<TermsClause>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clause.id });
  const [title, setTitle] = useState(clause.title);
  const [body, setBody] = useState(clause.body);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card p-3 flex gap-3 items-start">
      <button {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex gap-2 items-center">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title !== clause.title && onPatch({ title })}
            className="font-medium"
            placeholder="Clause title"
          />
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={clause.enabled} onCheckedChange={v => onPatch({ enabled: v })} />
            <span className="text-xs text-muted-foreground">{clause.enabled ? "On" : "Off"}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onBlur={() => body !== clause.body && onPatch({ body })}
          rows={2}
          placeholder="Clause body"
        />
      </div>
    </div>
  );
}
