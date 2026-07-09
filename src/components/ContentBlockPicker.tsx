import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { BLOCK_CATEGORIES, fetchBlocks, type ContentBlock } from "@/lib/content";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productSlug?: string;
  onInsert: (block: ContentBlock, mode: "append" | "replace") => void;
  targetLabel?: string;
}

export function ContentBlockPicker({ open, onOpenChange, productSlug, onInsert, targetLabel }: Props) {
  const { data: blocks = [], isLoading } = useQuery({ queryKey: ["content-blocks"], queryFn: fetchBlocks, enabled: open });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");

  const filtered = useMemo(() => {
    return blocks.filter(b => {
      if (cat !== "all" && b.category !== cat) return false;
      if (productSlug && b.product_slug && b.product_slug !== productSlug) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return b.name.toLowerCase().includes(s) || b.body.toLowerCase().includes(s) || b.tags.some(t => t.toLowerCase().includes(s));
    });
  }, [blocks, q, cat, productSlug]);

  const selected = filtered.find(b => b.id === selectedId) || filtered[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Insert content block{targetLabel ? ` — ${targetLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="h-9" />
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {BLOCK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
              {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!isLoading && filtered.length === 0 && (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No blocks. <Link to="/settings/content" className="underline">Manage library</Link>
                </div>
              )}
              {filtered.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full text-left rounded-md border p-2.5 hover:bg-secondary/50 ${selected?.id === b.id ? "border-primary bg-secondary/40" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{b.name}</div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{BLOCK_CATEGORIES.find(c => c.value === b.category)?.label ?? b.category}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.body}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md border p-3 bg-secondary/20">
            {selected ? (
              <>
                <div className="text-xs text-muted-foreground mb-1">Preview</div>
                <div className="font-semibold text-sm mb-2">{selected.name}</div>
                <div className="text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">{selected.body}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10">Select a block to preview.</div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <div className="flex items-center gap-2 mr-auto text-xs">
            <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "append"} onChange={() => setMode("append")} /> Append</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace</label>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!selected} onClick={() => { if (selected) { onInsert(selected, mode); onOpenChange(false); } }}>Insert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
