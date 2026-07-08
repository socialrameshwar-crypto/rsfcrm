import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  customer: z.object({
    company_name: z.string().optional().nullable(),
    contact_person: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
  }),
  product_type: z.string(),
  product_label: z.string(),
  capacity: z.string(),
  automation: z.string(),
  material: z.string(),
});

export type AiProposalContent = {
  executive_summary: string;
  company_introduction: string;
  project_overview: string;
  scope_of_supply: string;
  manufacturing_process: string;
  advantages: string[];
  safety_features: string[];
  quality_assurance: string;
  installation: string;
  warranty: string;
  after_sales: string;
  value_proposition: string;
};

const FALLBACK = (data: z.infer<typeof Input>): AiProposalContent => ({
  executive_summary: `Rameshwar Steel Fab is pleased to submit this technical and commercial proposal for a ${data.product_label} of ${data.capacity} (${data.automation}, ${data.material}) for ${data.customer.company_name || "your esteemed organization"}. Our engineering-led approach delivers a turnkey plant that is production-ready, energy-efficient, and built to international standards.`,
  company_introduction: `Rameshwar Steel Fab is a leading manufacturer of Soap, Detergent, LABSA, Liquid Detergent and Industrial Process Plants. Over decades of engineering excellence we have commissioned plants across India, Africa, the Middle East and South-East Asia — combining robust mechanical design, quality fabrication, and reliable after-sales service.`,
  project_overview: `The proposed ${data.product_label} is engineered for a nominal output of ${data.capacity} with ${data.automation.toLowerCase()} operation. Contact parts are built in ${data.material} to ensure product purity, long service life and compliance with hygienic manufacturing practices.`,
  scope_of_supply: `Our scope covers design, manufacturing, factory assembly, quality testing, shipment, on-site erection, commissioning, operator training and post-commissioning support of the complete plant as detailed in the machine list.`,
  manufacturing_process: `Raw materials are received, weighed and charged into the reactor / mixer where controlled processing takes place. The intermediate product is transferred to downstream units for shaping, drying, cooling and packing — all interlocked through the central control panel to guarantee consistent product quality and safe operation.`,
  advantages: [
    "Compact footprint with optimized layout",
    "High production efficiency and low utility consumption",
    "Robust industrial-grade construction",
    "Easy operation and low maintenance",
    "PLC / HMI ready control architecture",
    "Fast payback and proven ROI",
  ],
  safety_features: [
    "Emergency stop on every operating station",
    "Interlocked guards on all rotating parts",
    "Overload and single-phasing protection",
    "Pressure and temperature safety devices",
    "Earthing and MCB protection on the panel",
  ],
  quality_assurance: "Every machine is built under a documented QAP — mill test certificates for raw materials, in-process inspections, hydro / load testing where applicable, and pre-dispatch inspection at our works. Final acceptance is confirmed against jointly signed FAT and SAT protocols.",
  installation: "A team of trained erection engineers will supervise foundation checks, mechanical assembly, piping, electrical wiring, no-load trials and load trials at site. A written installation schedule is shared before mobilization.",
  warranty: "Twelve (12) months warranty from the date of commissioning or fifteen (15) months from date of dispatch, whichever is earlier, against defects in material and workmanship — under normal operating conditions.",
  after_sales: "Dedicated service engineers, genuine spares, remote diagnostic support and annual maintenance contracts ensure your plant runs at rated capacity throughout its lifecycle.",
  value_proposition: `Partnering with Rameshwar Steel Fab means faster time-to-production, predictable operating cost, and a single accountable engineering partner — from design through decades of operation.`,
});

export const generateAiProposal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<AiProposalContent> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return FALLBACK(data);

    const prompt = `You are a senior sales engineer at Rameshwar Steel Fab, an Indian OEM of Soap, Detergent, LABSA, Liquid Detergent and Industrial Process Plants. Write a professional, human, export-quality technical proposal for the following enquiry. Return ONLY a JSON object matching this TypeScript type — no prose, no code fences:

type Out = {
  executive_summary: string;         // 3-4 sentences
  company_introduction: string;      // 2-3 sentences
  project_overview: string;          // 3-4 sentences, mention product/capacity/automation/material
  scope_of_supply: string;           // 2-3 sentences
  manufacturing_process: string;     // 4-6 sentences describing the process flow
  advantages: string[];              // 5-7 short bullets
  safety_features: string[];         // 4-6 short bullets
  quality_assurance: string;         // 2-3 sentences
  installation: string;              // 2-3 sentences
  warranty: string;                  // 1-2 sentences
  after_sales: string;               // 1-2 sentences
  value_proposition: string;         // 2-3 persuasive sentences addressed to customer
};

Enquiry:
- Customer: ${data.customer.company_name || "N/A"} (${data.customer.contact_person || "N/A"}), ${data.customer.country || "N/A"}, industry: ${data.customer.industry || "N/A"}
- Product: ${data.product_label}
- Capacity: ${data.capacity}
- Automation: ${data.automation}
- Material of construction (contact parts): ${data.material}

Write in polished professional English suitable for international clients. Do not use markdown.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You output only valid JSON matching the requested schema." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        console.error("AI gateway error", res.status, await res.text());
        return FALLBACK(data);
      }
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw);
      return { ...FALLBACK(data), ...parsed };
    } catch (e) {
      console.error("AI proposal generation failed", e);
      return FALLBACK(data);
    }
  });
