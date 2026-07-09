import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreVertical, Star, Copy, Archive, Trash2, Pencil, Search, LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTemplates, signThumbnail, setDefaultTemplate, duplicateTemplate, archiveTemplate,
  deleteTemplate, updateTemplate, type TemplateRow,
} from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/templates/")({
  head: () => ({ meta: [{ title: "Template Manager" }] }),
  component: TemplatesIndex,
});

function TemplatesIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"updated" | "name">("updated");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates,
  });

  const categories = useMemo(
    () => Array.from(new Set(templates.map(t => t.category).filter(Boolean))),
    [templates],
  );

  const filtered = useMemo(() => {
    let out = templates;
    if (q) {
      const s = q.toLowerCase();
      out = out.filter(t => t.name.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s));
    }
    if (cat !== "all") out = out.filter(t => t.category === cat);
    out = [...out].sort((a, b) => sort === "name"
      ? a.name.localeCompare(b.name)
      : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return out;
  }, [templates, q, cat, sort]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["templates"] });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" /> Template Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a company quotation once. AI learns the design and reuses it for every future proposal.
          </p>
        </div>
        <Button asChild>
          <Link to="/templates/new"><Plus className="h-4 w-4 mr-2" /> Import Template</Link>
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as any)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="name">Name (A→Z)</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <LayoutTemplate className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="text-lg font-semibold">No templates yet</div>
          <p className="text-sm text-muted-foreground mb-4">
            Import your company's quotation PDF and the AI will do the rest.
          </p>
          <Button asChild><Link to="/templates/new"><Plus className="h-4 w-4 mr-2" /> Import Template</Link></Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => (
            <TemplateCard key={t.id} t={t} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ t, onChanged }: { t: TemplateRow; onChanged: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(t.name);

  useEffect(() => { signThumbnail(t.thumbnail_url).then(setThumb); }, [t.thumbnail_url]);

  const doAction = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); toast.success(ok); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition">
      <Link to="/templates/$id" params={{ id: t.id }} className="block">
        <div className="aspect-[3/4] bg-muted grid place-items-center overflow-hidden">
          {thumb ? (
            <img src={thumb} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
      </Link>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          {renaming ? (
            <Input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              onBlur={async () => {
                setRenaming(false);
                if (name.trim() && name !== t.name) await doAction(() => updateTemplate(t.id, { name: name.trim() }), "Renamed");
              }}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setName(t.name); setRenaming(false); }}}
              className="h-8"
            />
          ) : (
            <div className="font-semibold truncate flex-1" title={t.name}>{t.name}</div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}><Pencil className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doAction(() => setDefaultTemplate(t.id), "Set as default")}>
                <Star className="h-4 w-4 mr-2" /> Set as default
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doAction(() => duplicateTemplate(t.id), "Duplicated")}>
                <Copy className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => doAction(() => archiveTemplate(t.id), "Archived")}>
                <Archive className="h-4 w-4 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { if (confirm(`Delete "${t.name}" permanently?`)) doAction(() => deleteTemplate(t.id), "Deleted"); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {t.is_default && <Badge className="bg-primary">Default</Badge>}
          <Badge variant="outline">v{t.version ?? 1}</Badge>
          {t.category && <Badge variant="secondary">{t.category}</Badge>}
          <Badge variant={t.status === "active" ? "default" : "outline"} className="capitalize">{t.status}</Badge>
          {t.source_pdf_pages && <span className="text-xs text-muted-foreground ml-1">{t.source_pdf_pages} pages</span>}
        </div>
        {t.description && <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
        <div className="text-[11px] text-muted-foreground">
          Updated {new Date(t.updated_at).toLocaleDateString()}
        </div>
      </div>
    </Card>
  );
}
