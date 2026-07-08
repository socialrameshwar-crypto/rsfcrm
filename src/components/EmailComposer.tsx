import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles, Copy, Mail, MessageCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { generateProposalEmail, type EmailDraft } from "@/lib/email-writer.functions";

const TONES = [
  { value: "proposal", label: "Proposal" },
  { value: "quotation", label: "Quotation" },
  { value: "formal", label: "Formal" },
  { value: "executive", label: "Executive" },
  { value: "corporate", label: "Corporate" },
  { value: "sales", label: "Sales" },
  { value: "follow-up", label: "Follow-up" },
  { value: "appreciation", label: "Appreciation" },
  { value: "inquiry", label: "Inquiry" },
  { value: "introduction", label: "Introduction" },
  { value: "reminder", label: "Reminder" },
  { value: "negotiation", label: "Negotiation" },
  { value: "customer-support", label: "Customer support" },
] as const;

export interface EmailComposerContext {
  proposal: {
    proposal_number: string;
    title: string;
    product_label: string;
    capacity: string;
    automation?: string;
    material?: string;
    currency?: string;
    total_value?: number;
    quotation_type?: "domestic" | "export";
  };
  customer: {
    company_name?: string | null;
    contact_person?: string | null;
    country?: string | null;
    industry?: string | null;
    email?: string | null;
  };
}

export function EmailComposer({
  open,
  onOpenChange,
  ctx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctx: EmailComposerContext;
}) {
  const compose = useServerFn(generateProposalEmail);
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>("proposal");
  const [intent, setIntent] = useState("");
  const [to, setTo] = useState(ctx.customer.email || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(() => !!to && !!subject && !!body, [to, subject, body]);

  const generate = async () => {
    setLoading(true);
    try {
      const d = await compose({
        data: {
          tone,
          intent,
          proposal: {
            proposal_number: ctx.proposal.proposal_number,
            title: ctx.proposal.title,
            product_label: ctx.proposal.product_label,
            capacity: ctx.proposal.capacity,
            automation: ctx.proposal.automation || "",
            material: ctx.proposal.material || "",
            currency: ctx.proposal.currency || "INR",
            total_value: Number(ctx.proposal.total_value || 0),
            quotation_type: ctx.proposal.quotation_type || "domestic",
          },
          customer: ctx.customer,
        },
      });
      setDraft(d);
      setSubject(d.subjects[0] || "");
      setBody(d.body);
      toast.success("Email drafted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to draft email");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, what = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(what);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const openMailClient = () => {
    const params = new URLSearchParams();
    if (cc) params.set("cc", cc);
    if (bcc) params.set("bcc", bcc);
    params.set("subject", subject);
    params.set("body", body);
    window.location.href = `mailto:${encodeURIComponent(to)}?${params.toString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Email Composer · {ctx.proposal.proposal_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={v => setTone(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Optional intent / hint for the AI</Label>
            <Input
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder="e.g. Emphasize delivery lead time and offer a plant visit"
            />
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full gradient-primary">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Drafting…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate MNC-grade email</>}
        </Button>

        {draft && draft.subjects.length > 1 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Suggested subjects — click to use</Label>
            <div className="flex flex-wrap gap-2">
              {draft.subjects.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition ${subject === s ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="email"><Mail className="h-3 w-3 mr-1" /> Email</TabsTrigger>
            <TabsTrigger value="whatsapp" disabled={!draft}><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</TabsTrigger>
            <TabsTrigger value="followup" disabled={!draft}><Clock className="h-3 w-3 mr-1" /> Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>To</Label><Input value={to} onChange={e => setTo(e.target.value)} placeholder="customer@example.com" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Cc</Label><Input value={cc} onChange={e => setCc(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Bcc</Label><Input value={bcc} onChange={e => setBcc(e.target.value)} /></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Body</Label>
                <Button size="sm" variant="ghost" onClick={() => copy(body, "Body copied")} disabled={!body}><Copy className="h-3 w-3 mr-1" /> Copy body</Button>
              </div>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={14} placeholder="Click Generate to draft an email, or write your own." className="font-sans" />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-2 pt-3">
            <Label>WhatsApp message</Label>
            <Textarea value={draft?.whatsapp || ""} readOnly rows={5} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(draft?.whatsapp || "", "WhatsApp text copied")}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
              <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(draft?.whatsapp || "")}`, "_blank")}>
                <MessageCircle className="h-3 w-3 mr-1" /> Open in WhatsApp
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="followup" className="space-y-2 pt-3">
            <Label>Follow-up email</Label>
            <Textarea value={draft?.followup || ""} readOnly rows={10} />
            <Button size="sm" variant="outline" onClick={() => copy(draft?.followup || "", "Follow-up copied")}><Copy className="h-3 w-3 mr-1" /> Copy follow-up</Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="text-xs text-muted-foreground">Attach the downloaded PDF in your mail client before sending.</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={openMailClient} disabled={!canSend} className="gradient-primary">
              <Mail className="h-4 w-4 mr-1" /> Open in mail app
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
