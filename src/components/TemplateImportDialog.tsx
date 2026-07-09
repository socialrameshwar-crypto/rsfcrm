import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { importTemplate, type ImportResult } from "@/lib/template-import.functions";
import type { ProposalBlock } from "@/lib/blocks";
import type { AiProposalContent } from "@/lib/ai.functions";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function TemplateImportDialog({
  open, onOpenChange, onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (blocks: ProposalBlock[], ai: Partial<AiProposalContent>, mode: "replace" | "append") => void;
}) {
  const runImport = useServerFn(importTemplate);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<"replace" | "append">("append");

  const reset = () => { setText(""); setFile(null); setResult(null); setBusy(false); };

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

  const analyse = async () => {
    if (!text.trim() && !file) {
      toast.error("Paste some text or upload a file first.");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error("File is too large. Please upload a file under 10 MB.");
      return;
    }
    setBusy(true); setResult(null);
    try {
      const payload: any = { text: text || undefined };
      if (file) {
        const dataBase64 = await readFileBase64(file);
        payload.file = { name: file.name, mimeType: file.type || "application/octet-stream", dataBase64 };
      }
      const res = await runImport({ data: payload });
      setResult(res);
      if (!res.blocks.length && !Object.keys(res.ai).length) {
        toast.error(res.notes || "Nothing was extracted.");
      } else {
        toast.success(`Extracted ${res.blocks.length} blocks.`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result || !result.blocks.length) return;
    onApply(result.blocks, result.ai, mode);
    onOpenChange(false);
    reset();
    toast.success("Template applied.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Template Converter</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">Paste text</TabsTrigger>
            <TabsTrigger value="file">Upload file</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="space-y-2">
            <Label>Existing proposal / quotation text</Label>
            <Textarea rows={10} placeholder="Paste the full text of an existing proposal, quotation, spec sheet or company profile…" value={text} onChange={e => setText(e.target.value)} />
            <p className="text-xs text-muted-foreground">Best for text copied from PDFs, Word docs or emails. Up to ~60 000 characters.</p>
          </TabsContent>
          <TabsContent value="file" className="space-y-2">
            <Label>Upload PDF or image</Label>
            <Input type="file" accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="text-xs text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(0)} KB · {file.type || "unknown"}</p>}
            <p className="text-xs text-muted-foreground">PDF or image up to 10 MB. Text-based PDFs give the best results.</p>
          </TabsContent>
        </Tabs>

        {result && (
          <div className="rounded-md border p-3 bg-secondary/30 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Result</div>
            <p className="text-xs text-muted-foreground">{result.notes}</p>
            <div className="text-xs">
              <div><b>{result.blocks.length}</b> blocks extracted{Object.keys(result.ai).length ? `, ${Object.keys(result.ai).length} AI fields populated` : ""}.</div>
              {result.blocks.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-y-auto list-disc pl-5">
                  {result.blocks.slice(0, 20).map((b, i) => (
                    <li key={i}><span className="text-muted-foreground">[{b.type}]</span> {b.heading || b.body?.slice(0, 60) || "(no heading)"}</li>
                  ))}
                  {result.blocks.length > 20 && <li>… {result.blocks.length - 20} more</li>}
                </ul>
              )}
            </div>
            {result.blocks.length > 0 && (
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="append" /> Append to current blocks</label>
                <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="replace" /> Replace all blocks</label>
              </RadioGroup>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          {!result ? (
            <Button onClick={analyse} disabled={busy} className="gradient-primary">
              {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Converting…</> : <><Upload className="h-4 w-4 mr-1" /> Convert with AI</>}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResult(null)} disabled={busy}>Try again</Button>
              <Button onClick={apply} disabled={!result.blocks.length} className="gradient-primary">Apply</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
