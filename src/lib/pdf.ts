import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AiProposalContent } from "./ai.functions";
import type { Machine, Utilities, Commercials } from "./proposal-catalog";
import { formatMoney } from "./format";

export interface ProposalPdfInput {
  proposal_number: string;
  title: string;
  date: string;
  customer: {
    company_name?: string | null;
    contact_person?: string | null;
    email?: string | null;
    mobile?: string | null;
    country?: string | null;
    city?: string | null;
  };
  product_label: string;
  capacity: string;
  automation: string;
  material: string;
  currency: string;
  machines: Machine[];
  utilities: Utilities;
  commercials: Commercials;
  ai: AiProposalContent;
  template: string;
}

const TEMPLATE_COLORS: Record<string, { primary: [number, number, number]; accent: [number, number, number] }> = {
  "corporate-blue": { primary: [11, 61, 145], accent: [30, 111, 217] },
  "premium-black": { primary: [17, 17, 17], accent: [199, 158, 74] },
  "industrial-grey": { primary: [55, 65, 81], accent: [107, 114, 128] },
  "modern-white": { primary: [15, 23, 42], accent: [30, 111, 217] },
  "export-edition": { primary: [7, 51, 102], accent: [220, 38, 38] },
};

export function generateProposalPdf(p: ProposalPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const colors = TEMPLATE_COLORS[p.template] ?? TEMPLATE_COLORS["corporate-blue"];
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const drawHeader = () => {
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, W, 60, "F");
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RAMESHWAR STEEL FAB", 40, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Manufacturer of Soap, Detergent, LABSA & Industrial Process Plants", 40, 42);
    doc.setFontSize(9);
    doc.text(p.proposal_number, W - 40, 26, { align: "right" });
    doc.text(p.date, W - 40, 42, { align: "right" });
  };
  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(40, H - 40, W - 40, H - 40);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Rameshwar Steel Fab  |  sales@rameshwarsteelfab.com  |  www.rameshwarsteelfab.com", 40, H - 26);
    doc.text(`Page ${pageNum}`, W - 40, H - 26, { align: "right" });
  };

  // COVER
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, W, H, "F");
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.text("TECHNICAL & COMMERCIAL PROPOSAL", 40, 120);
  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(p.title, W - 80);
  doc.text(titleLines, 40, 170);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(`For: ${p.customer.company_name || "Valued Customer"}`, 40, 260);
  if (p.customer.country) doc.text(`Location: ${[p.customer.city, p.customer.country].filter(Boolean).join(", ")}`, 40, 285);
  doc.setFontSize(11);
  doc.text(`Proposal No.: ${p.proposal_number}`, 40, 330);
  doc.text(`Date: ${p.date}`, 40, 348);
  doc.setFillColor(...colors.accent);
  doc.rect(40, H - 140, W - 80, 3, "F");
  doc.setFontSize(10);
  doc.text("Prepared by Rameshwar Steel Fab  |  Engineering Excellence Since 1998", 40, H - 110);

  const addPage = () => {
    doc.addPage();
    drawHeader();
  };

  const section = (title: string, body?: string, bullets?: string[]) => {
    if (cursor > H - 140) addPage(), (cursor = 90);
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, 40, cursor);
    cursor += 6;
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(1.2);
    doc.line(40, cursor, 100, cursor);
    cursor += 16;
    doc.setTextColor(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    if (body) {
      const lines = doc.splitTextToSize(body, W - 80);
      for (const ln of lines) {
        if (cursor > H - 60) addPage(), (cursor = 90);
        doc.text(ln, 40, cursor);
        cursor += 14;
      }
      cursor += 4;
    }
    if (bullets) {
      for (const b of bullets) {
        const lines = doc.splitTextToSize(`•  ${b}`, W - 90);
        for (const ln of lines) {
          if (cursor > H - 60) addPage(), (cursor = 90);
          doc.text(ln, 50, cursor);
          cursor += 14;
        }
      }
      cursor += 6;
    }
  };

  addPage();
  let cursor = 90;

  // Customer block
  doc.setFillColor(245, 247, 251);
  doc.rect(40, cursor - 10, W - 80, 90, "F");
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CUSTOMER DETAILS", 52, cursor + 8);
  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cd = [
    ["Company", p.customer.company_name || "-"],
    ["Contact Person", p.customer.contact_person || "-"],
    ["Email", p.customer.email || "-"],
    ["Phone", p.customer.mobile || "-"],
    ["Location", [p.customer.city, p.customer.country].filter(Boolean).join(", ") || "-"],
  ];
  cd.forEach((row, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${row[0]}:`, 52, cursor + 28 + i * 12);
    doc.setFont("helvetica", "normal");
    doc.text(String(row[1]), 150, cursor + 28 + i * 12);
  });
  cursor += 100;

  section("Executive Summary", p.ai.executive_summary);
  section("Company Introduction", p.ai.company_introduction);
  section("Project Overview", p.ai.project_overview);
  section("Scope of Supply", p.ai.scope_of_supply);
  section("Manufacturing Process", p.ai.manufacturing_process);

  // Machine list table
  addPage();
  cursor = 90;
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Machine Specifications & Scope", 40, cursor);
  cursor += 20;
  autoTable(doc, {
    startY: cursor,
    head: [["#", "Machine", "Qty", "Capacity", "Motor", "MOC"]],
    body: p.machines.map((m, i) => [i + 1, m.name, m.qty, m.capacity, m.motor, m.material]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: colors.primary, textColor: 255 },
    margin: { left: 40, right: 40 },
  });
  cursor = (doc as any).lastAutoTable.finalY + 20;

  // Utility sheet
  if (cursor > H - 200) addPage(), (cursor = 90);
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Utility Requirement", 40, cursor);
  cursor += 20;
  const u = p.utilities;
  autoTable(doc, {
    startY: cursor,
    head: [["Parameter", "Value"]],
    body: [
      ["Connected Load", `${u.connected_load_kw} kW`],
      ["Running Load", `${u.running_load_kw} kW`],
      ["Power Consumption", `${u.power_kwh_day} kWh / day`],
      ["Water Requirement", `${u.water_kld} KL / day`],
      ["Steam", `${u.steam_kg_hr} kg/hr`],
      ["Compressed Air", `${u.air_cfm} CFM`],
      ["Manpower", `${u.manpower} persons / shift`],
      ["Floor Space", `${u.floor_space_sqm} sqm`],
      ["Production / Shift", `${u.production_per_shift_kg} kg`],
      ["Production / Day", `${u.production_per_day_kg} kg`],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: colors.accent, textColor: 255 },
    margin: { left: 40, right: 40 },
  });
  cursor = (doc as any).lastAutoTable.finalY + 30;

  // Commercial
  addPage();
  cursor = 90;
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Commercial Quotation", 40, cursor);
  cursor += 20;
  autoTable(doc, {
    startY: cursor,
    head: [["#", "Machine", "Qty", "Unit Price", "Amount"]],
    body: p.machines.map((m, i) => [
      i + 1,
      m.name,
      m.qty,
      formatMoney(m.unit_price, p.currency),
      formatMoney(m.unit_price * m.qty, p.currency),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: colors.primary, textColor: 255 },
    margin: { left: 40, right: 40 },
  });
  cursor = (doc as any).lastAutoTable.finalY + 12;
  const c = p.commercials;
  autoTable(doc, {
    startY: cursor,
    body: [
      ["Machines Total", formatMoney(c.machines_total, p.currency)],
      ["Freight", formatMoney(c.freight, p.currency)],
      ["Packing", formatMoney(c.packing, p.currency)],
      ["Installation", formatMoney(c.installation, p.currency)],
      ["Commissioning", formatMoney(c.commissioning, p.currency)],
      [`Tax (${c.tax_rate}%)`, formatMoney(c.tax, p.currency)],
      [{ content: "GRAND TOTAL", styles: { fontStyle: "bold", fillColor: colors.primary, textColor: 255 } }, { content: formatMoney(c.grand_total, p.currency), styles: { fontStyle: "bold", fillColor: colors.primary, textColor: 255 } }],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 5, halign: "right" },
    columnStyles: { 0: { halign: "left", cellWidth: 300 } },
    margin: { left: 40, right: 40 },
  });
  cursor = (doc as any).lastAutoTable.finalY + 24;

  section("Advantages", undefined, p.ai.advantages);
  section("Safety Features", undefined, p.ai.safety_features);
  section("Quality Assurance", p.ai.quality_assurance);
  section("Installation & Commissioning", p.ai.installation);
  section("Warranty", p.ai.warranty);
  section("After Sales Support", p.ai.after_sales);
  section("Why Rameshwar Steel Fab", p.ai.value_proposition);

  section("Terms & Conditions", undefined, [
    "Prices are Ex-Works unless mentioned otherwise.",
    "Payment: 40% advance along with PO, 50% before dispatch, 10% after commissioning.",
    "Delivery: 10-14 weeks from receipt of advance and technical clearance.",
    "Validity of offer: 30 days from date of proposal.",
    "Foundation, civil work, utilities up to battery limit are in customer scope.",
    "Statutory taxes, duties and freight extra as applicable.",
  ]);

  // Header + footer across all content pages
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    drawFooter(i - 1);
  }

  doc.save(`${p.proposal_number.replace(/\//g, "_")}.pdf`);
}
