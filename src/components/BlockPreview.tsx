import { formatMoney } from "@/lib/format";
import type { ProposalBlock } from "@/lib/blocks";
import type { AiProposalContent } from "@/lib/ai.functions";
import type { Machine, Utilities, Commercials } from "@/lib/proposal-catalog";

interface Props {
  blocks: ProposalBlock[];
  ai: AiProposalContent;
  machines: Machine[];
  utilities: Record<string, number | string>;
  commercials: Commercials;
  currency: string;
  customer: any;
  productLabel: string;
  proposalNumber: string;
  title: string;
  capacity: string;
  automation: string;
  material: string;
  createdAt: string;
  terms: { title: string; body: string }[];
  device: "a4" | "desktop" | "mobile";
}

export function BlockPreview(p: Props) {
  const widthClass =
    p.device === "mobile" ? "max-w-[380px]" :
    p.device === "a4" ? "max-w-[820px]" :
    "max-w-[1100px]";

  return (
    <div className={`mx-auto ${widthClass} bg-white text-neutral-900 shadow-lg`}>
      <div className="px-10 py-8 space-y-8 text-[13px] leading-relaxed">
        {p.blocks.filter(b => b.visible).map((b) => (
          <BlockRender key={b.id} block={b} p={p} />
        ))}
      </div>
    </div>
  );
}

function BlockRender({ block, p }: { block: ProposalBlock; p: Props }) {
  switch (block.type) {
    case "cover":
      return (
        <div className="text-center border-b-4 border-primary pb-6">
          <div className="text-xs uppercase tracking-widest text-neutral-500">Technical & Commercial Proposal</div>
          <h1 className="text-3xl font-bold mt-3">{p.title}</h1>
          <div className="text-sm mt-2 text-neutral-600">{p.productLabel} · {p.capacity} · {p.automation} · {p.material}</div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-left">
            <div>
              <div className="uppercase text-neutral-500 text-[10px]">Prepared for</div>
              <div className="font-semibold">{p.customer?.company_name || p.customer?.customer_name || "—"}</div>
              <div className="text-neutral-600">{[p.customer?.city, p.customer?.country].filter(Boolean).join(", ")}</div>
            </div>
            <div className="text-right">
              <div className="uppercase text-neutral-500 text-[10px]">Proposal #</div>
              <div className="font-semibold">{p.proposalNumber}</div>
              <div className="text-neutral-600">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>
        </div>
      );

    case "ai_section": {
      const v = block.aiKey ? (p.ai as any)[block.aiKey] : "";
      const txt = Array.isArray(v) ? v.join("\n") : (v || "");
      if (!txt) return null;
      return (
        <Section title={block.heading || ""}>
          <p className="whitespace-pre-line">{txt}</p>
        </Section>
      );
    }
    case "ai_bullets": {
      const v = block.aiKey ? (p.ai as any)[block.aiKey] : [];
      const items: string[] = Array.isArray(v) ? v : String(v || "").split("\n").filter(Boolean);
      if (!items.length) return null;
      return (
        <Section title={block.heading || ""}>
          <ul className="list-disc pl-5 space-y-1">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
        </Section>
      );
    }

    case "machines":
      return (
        <Section title={block.heading || "Machine List"}>
          <table className="w-full text-[12px] border-collapse">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-1.5 text-left">#</th>
                <th className="p-1.5 text-left">Machine</th>
                <th className="p-1.5">Qty</th>
                <th className="p-1.5 text-left">Capacity</th>
                <th className="p-1.5 text-left">Motor</th>
                <th className="p-1.5 text-left">MOC</th>
                <th className="p-1.5 text-right">Unit</th>
                <th className="p-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {p.machines.map((m, i) => (
                <tr key={i} className="border-b border-neutral-200">
                  <td className="p-1.5">{i + 1}</td>
                  <td className="p-1.5">{m.name}</td>
                  <td className="p-1.5 text-center">{m.qty}</td>
                  <td className="p-1.5">{m.capacity}</td>
                  <td className="p-1.5">{m.motor}</td>
                  <td className="p-1.5">{m.material}</td>
                  <td className="p-1.5 text-right">{formatMoney(m.unit_price, p.currency)}</td>
                  <td className="p-1.5 text-right font-medium">{formatMoney(m.qty * m.unit_price, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      );

    case "utilities": {
      const entries = Object.entries(p.utilities || {});
      if (!entries.length) return null;
      return (
        <Section title={block.heading || "Utility Requirements"}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {entries.map(([k, v]) => (
              <div key={k} className="border border-neutral-200 p-2 rounded">
                <div className="text-[10px] uppercase text-neutral-500">{k.replace(/_/g, " ")}</div>
                <div className="font-semibold">{String(v)}</div>
              </div>
            ))}
          </div>
        </Section>
      );
    }

    case "commercials": {
      const c = p.commercials;
      return (
        <Section title={block.heading || "Commercial Quotation"}>
          <table className="w-full text-[12px]">
            <tbody className="divide-y divide-neutral-200">
              {[
                ["Machines total", c.machines_total],
                ["Freight", c.freight],
                ["Packing", c.packing],
                ["Installation", c.installation],
                ["Commissioning", c.commissioning],
                [`Tax (${c.tax_rate || 0}%)`, c.tax],
              ].map(([k, v]) => (
                <tr key={k as string}><td className="p-2 text-neutral-600">{k}</td><td className="p-2 text-right">{formatMoney(v as number, p.currency)}</td></tr>
              ))}
              <tr className="bg-primary text-primary-foreground"><td className="p-2 font-bold">GRAND TOTAL</td><td className="p-2 text-right font-bold text-base">{formatMoney(c.grand_total, p.currency)}</td></tr>
            </tbody>
          </table>
        </Section>
      );
    }

    case "terms":
      if (!p.terms.length) return null;
      return (
        <Section title={block.heading || "Terms & Conditions"}>
          <div className="space-y-3">
            {p.terms.map((t, i) => (
              <div key={i}>
                <div className="font-semibold text-[12px]">{i + 1}. {t.title}</div>
                <p className="whitespace-pre-line text-[12px]">{t.body}</p>
              </div>
            ))}
          </div>
        </Section>
      );

    case "text":
      return (
        <Section title={block.heading || ""}>
          <p className="whitespace-pre-line">{block.body}</p>
        </Section>
      );

    case "image":
      if (!block.imageUrl) return null;
      return (
        <div className="text-center">
          <img src={block.imageUrl} alt={block.caption || ""} className="mx-auto max-h-[400px] rounded border" />
          {block.caption && <div className="text-[11px] text-neutral-500 mt-1">{block.caption}</div>}
        </div>
      );

    case "table":
      return (
        <Section title={block.heading || ""}>
          <table className="w-full text-[12px] border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>{(block.tableHeaders || []).map((h, i) => <th key={i} className="p-1.5 text-left border border-neutral-300">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(block.tableRows || []).map((row, i) => (
                <tr key={i}>{row.map((c, j) => <td key={j} className="p-1.5 border border-neutral-300">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </Section>
      );

    case "spacer":
      return <div style={{ height: block.height || 24 }} />;

    default:
      return null;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {title && <h2 className="text-primary font-bold uppercase tracking-wide text-[13px] border-b border-primary pb-1 mb-3">{title}</h2>}
      {children}
    </div>
  );
}
