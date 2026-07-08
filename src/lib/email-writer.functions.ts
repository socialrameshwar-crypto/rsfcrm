import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TONES = [
  "formal", "executive", "corporate", "sales", "follow-up",
  "appreciation", "inquiry", "proposal", "quotation",
  "introduction", "reminder", "negotiation", "customer-support",
] as const;

const Input = z.object({
  tone: z.enum(TONES).default("proposal"),
  intent: z.string().optional().default(""),
  proposal: z.object({
    proposal_number: z.string(),
    title: z.string(),
    product_label: z.string(),
    capacity: z.string(),
    automation: z.string().optional().default(""),
    material: z.string().optional().default(""),
    currency: z.string().optional().default("INR"),
    total_value: z.number().optional().default(0),
    quotation_type: z.enum(["domestic", "export"]).optional().default("domestic"),
  }),
  customer: z.object({
    company_name: z.string().nullable().optional(),
    contact_person: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }),
  sender: z.object({
    name: z.string().optional().default("Rameshwar Steel Fab"),
    title: z.string().optional().default("Sales & Business Development"),
    phone: z.string().optional().default(""),
    email: z.string().optional().default(""),
  }).optional().default({} as any),
});

export type EmailDraft = {
  subjects: string[];
  body: string;
  whatsapp: string;
  followup: string;
};

const FALLBACK = (d: z.infer<typeof Input>): EmailDraft => {
  const co = d.customer.company_name || "your organization";
  const person = d.customer.contact_person || "Sir/Madam";
  const subjectBase = `${d.proposal.product_label} — Proposal ${d.proposal.proposal_number}`;
  return {
    subjects: [
      subjectBase,
      `Proposal ${d.proposal.proposal_number} · ${d.proposal.product_label} for ${co}`,
      `${d.proposal.product_label} (${d.proposal.capacity}) — Commercial Offer`,
      `Rameshwar Steel Fab — Proposal for ${d.proposal.product_label}`,
      `Technical & Commercial Offer · ${d.proposal.proposal_number}`,
    ],
    body: `Dear ${person},\n\nThank you for your interest in Rameshwar Steel Fab.\n\nPlease find enclosed our technical and commercial proposal ${d.proposal.proposal_number} for the supply of a ${d.proposal.product_label} of ${d.proposal.capacity}. The offer covers design, manufacturing, factory testing, delivery, installation and commissioning at your site.\n\nWe would be glad to arrange a call to walk you through the scope and discuss any customization required for ${co}.\n\nLooking forward to your feedback.\n\nWarm regards,\n${d.sender?.name || "Rameshwar Steel Fab"}\n${d.sender?.title || "Sales & Business Development"}\n${d.sender?.phone || ""}\n${d.sender?.email || ""}`,
    whatsapp: `Dear ${person}, sharing our proposal ${d.proposal.proposal_number} for the ${d.proposal.product_label} (${d.proposal.capacity}). Kindly review and let us know a convenient time for a quick discussion. — ${d.sender?.name || "Rameshwar Steel Fab"}`,
    followup: `Dear ${person},\n\nFurther to our proposal ${d.proposal.proposal_number} shared earlier, I wanted to check if you had a chance to review the technical scope and commercials. I would be happy to clarify any points or arrange a technical discussion at your convenience.\n\nWarm regards,\n${d.sender?.name || "Rameshwar Steel Fab"}`,
  };
};

export const generateProposalEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<EmailDraft> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return FALLBACK(data);

    const system = `You are a Senior Corporate Communications Manager at a Fortune 500 industrial equipment manufacturer. You write polished, MNC-grade B2B emails in flawless professional English. Tone is corporate, confident, respectful and persuasive — never robotic, never salesy, never using emojis. Emails are ready to send without further editing.`;

    const user = `Draft a ${data.tone} B2B email from Rameshwar Steel Fab (Indian OEM of soap, detergent, LABSA and process plants) to a prospective ${data.proposal.quotation_type === "export" ? "international" : "domestic"} customer, accompanying proposal ${data.proposal.proposal_number}.

Context:
- Customer: ${data.customer.company_name || "N/A"} (${data.customer.contact_person || "N/A"}), ${data.customer.country || "N/A"}, industry: ${data.customer.industry || "N/A"}
- Product: ${data.proposal.product_label}, capacity ${data.proposal.capacity}, ${data.proposal.automation}, MOC ${data.proposal.material}
- Proposal value: ${data.proposal.currency} ${data.proposal.total_value}
- Quotation type: ${data.proposal.quotation_type}
- Sender: ${data.sender?.name}, ${data.sender?.title}${data.sender?.phone ? ", " + data.sender.phone : ""}${data.sender?.email ? ", " + data.sender.email : ""}
${data.intent ? `- Additional intent from sender: ${data.intent}` : ""}

Return ONLY valid JSON in this exact shape (no markdown, no code fences):
{
  "subjects": [string, string, string, string, string],  // 5 subject line options; professional, business-appropriate
  "body": string,                                         // Full email body: greeting, personalized opening, purpose, structured content, benefits, call-to-action, professional closing, signature block. Use \\n for line breaks. No markdown. No emojis.
  "whatsapp": string,                                     // Short 2-3 line WhatsApp version, respectful and professional
  "followup": string                                      // Short polite follow-up email variant (3-4 short paragraphs)
}

Rules:
- The body must reference the proposal number and product naturally.
- Do not fabricate specifications not provided above.
- Do not include placeholder brackets like [Name]; use the actual names above, or "Sir/Madam" if a name is missing.
- Signature block must show sender name, title, and (when provided) phone and email on separate lines.
- Keep body between 130 and 220 words.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        console.error("Email AI error", res.status, await res.text());
        return FALLBACK(data);
      }
      const j = await res.json();
      const raw = j?.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw);
      const fb = FALLBACK(data);
      return {
        subjects: Array.isArray(parsed.subjects) && parsed.subjects.length ? parsed.subjects.slice(0, 5).map(String) : fb.subjects,
        body: typeof parsed.body === "string" && parsed.body.trim() ? parsed.body : fb.body,
        whatsapp: typeof parsed.whatsapp === "string" && parsed.whatsapp.trim() ? parsed.whatsapp : fb.whatsapp,
        followup: typeof parsed.followup === "string" && parsed.followup.trim() ? parsed.followup : fb.followup,
      };
    } catch (e) {
      console.error("Email generation failed", e);
      return FALLBACK(data);
    }
  });
