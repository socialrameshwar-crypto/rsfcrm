import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Eye, Loader2, Download,
} from "lucide-react";
import {
  fetchTemplatePdfBytes, getTemplatePdfUrl, renderPdfPage,
  stampPdfOverlay, pdfBytesToBlobUrl, OVERLAY_TOKENS,
  type OverlayField,
} from "@/lib/pdf-overlay";

interface Props {
  storagePath: string;
  totalPages: number;
  overlays: OverlayField[];
  onChange: (next: OverlayField[]) => void;
}

/** Editor: click-drag on the page canvas to place a field. */
export function PdfOverlayEditor({ storagePath, totalPages, overlays, onChange }: Props) {
  const [page, setPage] = useState(1);
  const [rendered, setRendered] = useState<Awaited<ReturnType<typeof renderPdfPage>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // Load bytes once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const b = await fetchTemplatePdfBytes(storagePath);
        if (alive) setBytes(b);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load template PDF");
      }
    })();
    return () => { alive = false; };
  }, [storagePath]);

  // Render current page
  useEffect(() => {
    if (!bytes) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const copy = new Uint8Array(bytes.length); copy.set(bytes);
        const r = await renderPdfPage(copy, page, 1.6);
        if (alive) setRendered(r);
      } catch (e: any) {
        if (alive) toast.error(e?.message || "Failed to render page");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [bytes, page]);

  const pageOverlays = useMemo(() => overlays.filter(o => o.page === page), [overlays, page]);
  const selected = overlays.find(o => o.id === selectedId) || null;
  const pxPerPt = rendered ? rendered.widthPx / rendered.widthPt : 1;

  const updateField = (id: string, patch: Partial<OverlayField>) => {
    onChange(overlays.map(o => (o.id === id ? { ...o, ...patch } : o)));
  };
  const removeField = (id: string) => {
    onChange(overlays.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const addField = () => {
    if (!rendered) return;
    const nf: OverlayField = {
      id: crypto.randomUUID(),
      page,
      token: "customer_name",
      label: "Customer name",
      x: rendered.widthPt * 0.1,
      y: rendered.heightPt * 0.1,
      width: rendered.widthPt * 0.4,
      height: 24,
      fontSize: 11,
      align: "left",
      color: "#111111",
      whiteout: true,
    };
    onChange([...overlays, nf]);
    setSelectedId(nf.id);
  };

  // Drag/resize state
  const [drag, setDrag] = useState<{
    id: string; mode: "move" | "resize";
    startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - drag.startX) / pxPerPt;
      const dy = (e.clientY - drag.startY) / pxPerPt;
      if (drag.mode === "move") {
        updateField(drag.id, {
          x: Math.max(0, drag.origX + dx),
          y: Math.max(0, drag.origY + dy),
        });
      } else {
        updateField(drag.id, {
          width: Math.max(20, drag.origW + dx),
          height: Math.max(12, drag.origH + dy),
        });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, pxPerPt]);

  const startDrag = (e: React.MouseEvent, f: OverlayField, mode: "move" | "resize") => {
    e.stopPropagation();
    setSelectedId(f.id);
    setDrag({
      id: f.id, mode,
      startX: e.clientX, startY: e.clientY,
      origX: f.x, origY: f.y, origW: f.width, origH: f.height,
    });
  };

  const previewWithSamples = async () => {
    if (!bytes) return;
    try {
      const values: Record<string, string> = {};
      for (const o of overlays) values[o.token] = o.defaultValue || `[${o.label}]`;
      const copy = new Uint8Array(bytes.length); copy.set(bytes);
      const out = await stampPdfOverlay(copy, overlays, values);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = pdfBytesToBlobUrl(out);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Preview failed");
    }
  };

  const downloadSample = async () => {
    await previewWithSamples();
    if (previewUrl) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = "template-preview.pdf";
      a.click();
    }
  };

  const openSource = async () => {
    try {
      const url = await getTemplatePdfUrl(storagePath);
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e?.message || "Failed to open PDF"); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 h-full min-h-0">
      {/* Canvas */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm tabular-nums">Page {page} / {totalPages}</div>
          <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-6 w-px bg-border" />
          <Button size="sm" onClick={addField}><Plus className="h-4 w-4 mr-1" /> Add field</Button>
          <Button size="sm" variant="outline" onClick={previewWithSamples}><Eye className="h-4 w-4 mr-1" /> Preview</Button>
          <Button size="sm" variant="outline" onClick={downloadSample}><Download className="h-4 w-4 mr-1" /> Sample PDF</Button>
          <Button size="sm" variant="ghost" onClick={openSource}>Original</Button>
        </div>
        <div ref={canvasWrapRef} className="flex-1 overflow-auto rounded-md border bg-muted/40 p-4 min-h-0">
          {loading || !rendered ? (
            <div className="h-96 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendering page…
            </div>
          ) : (
            <div className="relative mx-auto bg-white shadow" style={{ width: rendered.widthPx, height: rendered.heightPx }}>
              <img src={rendered.dataUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full select-none pointer-events-none" />
              {pageOverlays.map(f => (
                <div
                  key={f.id}
                  onMouseDown={e => startDrag(e, f, "move")}
                  onClick={e => { e.stopPropagation(); setSelectedId(f.id); }}
                  className={`absolute border-2 cursor-move ${selectedId === f.id ? "border-primary bg-primary/10" : "border-primary/60 bg-primary/5"}`}
                  style={{
                    left: f.x * pxPerPt,
                    top: f.y * pxPerPt,
                    width: f.width * pxPerPt,
                    height: f.height * pxPerPt,
                  }}
                  title={f.label}
                >
                  <div className="text-[10px] leading-none px-1 py-0.5 bg-primary text-primary-foreground inline-block">
                    {`{{${f.token}}}`}
                  </div>
                  <div
                    className="absolute right-0 bottom-0 w-3 h-3 bg-primary cursor-nwse-resize"
                    onMouseDown={e => startDrag(e, f, "resize")}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inspector */}
      <div className="border rounded-md bg-background p-3 space-y-3 overflow-y-auto min-h-0">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Fields on this page ({pageOverlays.length})</div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {pageOverlays.length === 0 && <div className="text-xs text-muted-foreground">Click "Add field" then drag to position.</div>}
          {pageOverlays.map(f => (
            <button key={f.id} onClick={() => setSelectedId(f.id)}
              className={`w-full text-left rounded border px-2 py-1 text-xs flex items-center justify-between ${selectedId === f.id ? "border-primary bg-secondary/40" : "hover:bg-secondary/40"}`}>
              <span className="truncate"><span className="font-mono text-[10px] text-muted-foreground">{`{{${f.token}}}`}</span> {f.label}</span>
              <Trash2 className="h-3 w-3 text-destructive" onClick={e => { e.stopPropagation(); removeField(f.id); }} />
            </button>
          ))}
        </div>

        {!selected ? (
          <div className="text-xs text-muted-foreground pt-2 border-t">Select a field to edit its properties.</div>
        ) : (
          <div className="space-y-2 pt-3 border-t">
            <div>
              <Label className="text-[10px] uppercase">Token</Label>
              <Select value={OVERLAY_TOKENS.some(t => t.token === selected.token) ? selected.token : "__custom"}
                onValueChange={v => {
                  if (v === "__custom") return;
                  const t = OVERLAY_TOKENS.find(t => t.token === v)!;
                  updateField(selected.id, { token: t.token, label: t.label });
                }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OVERLAY_TOKENS.map(t => <SelectItem key={t.token} value={t.token}>{t.label} <span className="text-muted-foreground font-mono ml-1">{`{{${t.token}}}`}</span></SelectItem>)}
                  <SelectItem value="__custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              <Input className="mt-1 font-mono" value={selected.token} onChange={e => updateField(selected.id, { token: e.target.value.replace(/[^a-z0-9_]/gi, "_") })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Label</Label>
              <Input value={selected.label} onChange={e => updateField(selected.id, { label: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Default value</Label>
              <Input value={selected.defaultValue || ""} onChange={e => updateField(selected.id, { defaultValue: e.target.value })} placeholder="Used when a proposal has no value" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px] uppercase">Font size</Label>
                <Input type="number" value={selected.fontSize} onChange={e => updateField(selected.id, { fontSize: Number(e.target.value) || 11 })} /></div>
              <div><Label className="text-[10px] uppercase">Color</Label>
                <Input type="color" value={selected.color || "#111111"} onChange={e => updateField(selected.id, { color: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase">Align</Label>
                <Select value={selected.align || "left"} onValueChange={v => updateField(selected.id, { align: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col justify-end gap-1">
                <Label className="text-[10px] uppercase">Bold</Label>
                <Switch checked={!!selected.bold} onCheckedChange={v => updateField(selected.id, { bold: v })} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Switch checked={!!selected.whiteout} onCheckedChange={v => updateField(selected.id, { whiteout: v })} />
              White out area first <span className="text-muted-foreground">(covers original text)</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <div><Label className="text-[10px] uppercase">X</Label><Input type="number" value={Math.round(selected.x)} onChange={e => updateField(selected.id, { x: Number(e.target.value) })} /></div>
              <div><Label className="text-[10px] uppercase">Y</Label><Input type="number" value={Math.round(selected.y)} onChange={e => updateField(selected.id, { y: Number(e.target.value) })} /></div>
              <div><Label className="text-[10px] uppercase">W</Label><Input type="number" value={Math.round(selected.width)} onChange={e => updateField(selected.id, { width: Number(e.target.value) })} /></div>
              <div><Label className="text-[10px] uppercase">H</Label><Input type="number" value={Math.round(selected.height)} onChange={e => updateField(selected.id, { height: Number(e.target.value) })} /></div>
            </div>
            <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => removeField(selected.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove field
            </Button>
          </div>
        )}
      </div>

      {/* Preview iframe */}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-background rounded-lg w-[90vw] h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="text-sm font-semibold">Template preview (sample data)</div>
              <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            </div>
            <iframe src={previewUrl} className="flex-1 border-0" title="preview" />
          </div>
        </div>
      )}
    </div>
  );
}
