import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Sparkles, FileText, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";
import {
  createTemplateStub, uploadTemplatePdf, uploadThumbnail, updateTemplate,
} from "@/lib/templates";
import { renderPdfToPngs, renderPdfThumbnail } from "@/lib/pdfjs-loader";
import { analyzeTemplate } from "@/lib/templates.functions";

export const Route = createFileRoute("/_authenticated/templates/new")({
  head: () => ({ meta: [{ title: "Import Template" }] }),
  component: NewTemplate,
});

function NewTemplate() {
  const nav = useNavigate();
  const analyze = useServerFn(analyzeTemplate);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Quotation");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("Ready");
  const [progress, setProgress] = useState(0);

  const onFile = (f: File | null) => {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.pdf$/i, ""));
  };

  const run = async () => {
    if (!file) { toast.error("Please choose a PDF file"); return; }
    if (!name.trim()) { toast.error("Please give the template a name"); return; }
    setBusy(true);
    try {
      // 1. Create row
      setStep("Creating template…"); setProgress(10);
      const t = await createTemplateStub(name.trim(), category);
      await updateTemplate(t.id, { description: description.trim() || null } as any);

      // 2. Upload PDF
      setStep("Uploading PDF…"); setProgress(25);
      await uploadTemplatePdf(t.id, file);

      // 3. Save source URL
      await updateTemplate(t.id, { source_pdf_url: `template-pdfs/${t.id}/source.pdf` } as any);

      // 4. Render pages + thumbnail
      setStep("Rendering pages…"); setProgress(45);
      const { pages, pageSizes } = await renderPdfToPngs(file, { scale: 1.6, maxPages: 6 });
      const thumb = await renderPdfThumbnail(file);
      const thumbPath = await uploadThumbnail(t.id, thumb);
      await updateTemplate(t.id, { thumbnail_url: thumbPath, source_pdf_pages: pageSizes.length } as any);

      // 5. AI analyze
      setStep("AI analyzing layout & fields…"); setProgress(70);
      await analyze({ data: { templateId: t.id, pages, pageSizes } });

      setStep("Done"); setProgress(100);
      toast.success("Template imported");
      nav({ to: "/templates/$id", params: { id: t.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/templates"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Template</h1>
        <p className="text-sm text-muted-foreground">
          Upload your company quotation PDF. AI will read the design, detect dynamic fields, and save it as a master template.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <Label>PDF file</Label>
          <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-accent/40 transition">
            <input type="file" accept="application/pdf" className="hidden"
              onChange={e => onFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                </div>
                <Check className="h-5 w-5 text-success" />
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <div className="font-medium">Click to choose a PDF</div>
                <div className="text-xs text-muted-foreground">Up to 6 pages will be analyzed</div>
              </>
            )}
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Template name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Quotation 2026" />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Quotation" />
          </div>
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="When to use this template…" rows={2} />
        </div>

        {busy && (
          <div className="space-y-2">
            <div className="text-sm flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" /> {step}
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={run} disabled={busy || !file}>
            <Sparkles className="h-4 w-4 mr-2" /> {busy ? "Importing…" : "Analyze & Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
