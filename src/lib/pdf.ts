import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AiProposalContent } from "./ai.functions";
import type { Machine, Utilities, Commercials } from "./proposal-catalog";
import type { ProposalBlock } from "./blocks";
import logoAsset from "@/assets/rsf-logo.png.asset.json";

export interface ProposalTermsClause { title: string; body: string }

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
    address?: string | null;
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
  quotation_type?: "domestic" | "export";
  terms?: ProposalTermsClause[];
  blocks?: ProposalBlock[];
  sales_engineer?: { name?: string | null; phone?: string | null; email?: string | null } | null;
}

// Rameshwar Steel Fab brand palette (matches printed brochure)
const BRAND_RED: [number, number, number] = [200, 16, 46]; // #C8102E
const BRAND_DARK: [number, number, number] = [17, 17, 17];
const SOFT_GREY: [number, number, number] = [245, 246, 248];
const BORDER_GREY: [number, number, number] = [220, 222, 226];
const TEXT_GREY: [number, number, number] = [95, 99, 108];
const PINK_TINT: [number, number, number] = [253, 240, 242];

const HEADER_BOTTOM = 108;   // Y where content may start
const FOOTER_TOP = 34;       // reserved from bottom for footer
const CONTENT_TOP = 128;     // first content baseline
const MARGIN = 40;

// -------- Logo loader (singleton, aspect-preserving) --------
type LogoInfo = { dataUrl: string; ratio: number };
let cachedLogo: Promise<LogoInfo | null> | null = null;

function loadLogo(): Promise<LogoInfo | null> {
  if (cachedLogo) return cachedLogo;
  cachedLogo = (async () => {
    try {
      const res = await fetch(logoAsset.url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      });
      const ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 3);
        img.onerror = () => resolve(3);
        img.src = dataUrl;
      });
      return { dataUrl, ratio };
    } catch {
      return null;
    }
  })();
  return cachedLogo;
}

const spaced = (s: string, gap = " ") => s.split("").join(gap);

// Built-in helvetica does not include ₹ (or €£¥ reliably). Substitute a safe
// prefix for the PDF while still respecting locale grouping.
function pdfMoney(amount: number, currency: string): string {
  const value = Math.round(amount || 0);
  const grouped = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
  return `${currencyPrefix(currency)} ${grouped}`;
}
function currencyPrefix(currency: string): string {
  switch (currency) {
    case "INR": return "Rs.";
    case "USD": return "USD";
    case "EUR": return "EUR";
    case "GBP": return "GBP";
    case "AED": return "AED";
    default: return currency;
  }
}

// Truncate a string to fit within `maxWidth` pt at the current font settings,
// appending an ellipsis when needed. Used for single-line labels.
function fitLine(doc: jsPDF, text: string, maxWidth: number): string {
  if (!text) return "";
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + "…") > maxWidth) s = s.slice(0, -1);
  return s + "…";
}

export async function buildProposalPdf(p: ProposalPdfInput) {
  if (p.blocks && p.blocks.length) return buildBlockPdf(p);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const logo = await loadLogo();

  const drawHeader = () => {
    // Logo (aspect-preserved). Bound height at 46pt so it never crowds the header.
    if (logo) {
      try {
        const h = 54;
        const w = h * logo.ratio;
        doc.addImage(logo.dataUrl, "PNG", MARGIN, 24, w, h, undefined, "FAST");
      } catch {
        /* fall through to text logo */
      }
    }
    // Right block — address + contact
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RED);
    doc.text("Your Success  •  Our Commitment  •  More than Suppliers — Partners", W - MARGIN, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(8.5);
    doc.text("31, Sayona Industrial Estate, Near Panchratna Estate, Ramol Cross Road,", W - MARGIN, 48, { align: "right" });
    doc.text("Phase IV, Vatva GIDC, Ahmedabad (Gujarat) – 382445", W - MARGIN, 60, { align: "right" });
    doc.text("+91 97256 05639   |   Sales@rameshwar.co.in   |   www.rameshwar.co.in", W - MARGIN, 72, { align: "right" });
    doc.setTextColor(...TEXT_GREY);
    doc.setFontSize(8);
    doc.text("GSTIN: 24ABEPL9780J1ZL", W - MARGIN, 84, { align: "right" });
    // Divider
    doc.setDrawColor(...BORDER_GREY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, HEADER_BOTTOM - 4, W - MARGIN, HEADER_BOTTOM - 4);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(...BRAND_RED);
    doc.rect(0, H - FOOTER_TOP, W, FOOTER_TOP, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text(
      `"Nation First … Always First …"   |   www.rameshwar.co.in   |   GSTIN: 24ABEPL9780J1ZL`,
      W / 2,
      H - 13,
      { align: "center" },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${pageNum} of ${totalPages}`, W - MARGIN, H - 13, { align: "right" });
  };

  // Header on every page; footer is finalised at the end so page counts are correct.
  const paintChrome = () => { drawHeader(); };

  const newPage = () => {
    doc.addPage();
    paintChrome();
  };

  const ensureSpace = (needed: number, cursor: number): number => {
    if (cursor + needed > H - FOOTER_TOP - 12) {
      newPage();
      return CONTENT_TOP;
    }
    return cursor;
  };

  // ============ PAGE 1 ============
  paintChrome();
  let cursor = 120;

  // QUOTATION banner
  doc.setFillColor(...BRAND_RED);
  doc.rect(MARGIN, cursor, W - MARGIN * 2, 40, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  const banner = p.quotation_type === "export" ? "EXPORT QUOTATION" : "QUOTATION";
  doc.text(spaced(banner, "  "), W / 2, cursor + 26, { align: "center" });
  cursor += 56;

  // Info strip: Quote No / Date / Valid Until
  const infoH = 48;
  doc.setFillColor(...SOFT_GREY);
  doc.rect(MARGIN, cursor, W - MARGIN * 2, infoH, "F");
  doc.setFillColor(...BRAND_RED);
  doc.rect(MARGIN, cursor, 4, infoH, "F");
  const colW = (W - MARGIN * 2) / 3;
  const infoItems: [string, string, boolean][] = [
    ["Quote No.", p.proposal_number, false],
    ["Date", p.date, false],
    ["Valid Until", validUntil(p.date), true],
  ];
  infoItems.forEach(([label, value, red], i) => {
    const x = MARGIN + 20 + i * colW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_GREY);
    doc.text(label, x, cursor + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...(red ? BRAND_RED : BRAND_DARK));
    doc.text(fitLine(doc, value, colW - 24), x, cursor + 36);
  });
  cursor += infoH + 18;

  // Bill To / Subject two-column
  const boxH = 115;
  const halfW = (W - MARGIN * 2 - 16) / 2;
  // Bill To box
  doc.setFillColor(...BRAND_RED);
  doc.rect(MARGIN, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("BILL TO", " "), MARGIN + 16, cursor + 16);
  doc.setFontSize(11.5);
  doc.text(
    fitLine(doc, (p.customer.contact_person || "Valued Customer").toUpperCase(), halfW - 20),
    MARGIN + 16,
    cursor + 34,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(50);
  doc.text(fitLine(doc, p.customer.company_name || "-", halfW - 20), MARGIN + 16, cursor + 50);
  doc.setFontSize(9);
  let by = cursor + 66;
  if (p.customer.mobile) { by = drawLabelValue(doc, "Mobile :-", p.customer.mobile, MARGIN + 16, by, halfW - 20); }
  if (p.customer.email) { by = drawLabelValue(doc, "Email :-", p.customer.email, MARGIN + 16, by, halfW - 20); }
  const addr = p.customer.address || [p.customer.city, p.customer.country].filter(Boolean).join(", ");
  if (addr) drawLabelValue(doc, "Address :-", addr, MARGIN + 16, by, halfW - 20);

  // Subject box (right, pink tint)
  const subX = MARGIN + halfW + 16;
  doc.setFillColor(...PINK_TINT);
  doc.rect(subX, cursor, halfW, boxH, "F");
  doc.setFillColor(...BRAND_RED);
  doc.rect(subX, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("SUBJECT", " "), subX + 16, cursor + 16);
  doc.setTextColor(...BRAND_RED);
  doc.setFontSize(11);
  const subj = `Offer for ${p.product_label}`;
  const subjLines = doc.splitTextToSize(subj, halfW - 24) as string[];
  doc.text(subjLines, subX + 16, cursor + 34);
  const subjBottom = cursor + 34 + subjLines.length * 13;
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(fitLine(doc, `Capacity: ${p.capacity}`, halfW - 24), subX + 16, subjBottom + 8);
  doc.text(
    fitLine(doc, `Automation: ${p.automation}  |  MOC: ${p.material}`, halfW - 24),
    subX + 16,
    subjBottom + 22,
  );
  cursor += boxH + 22;

  // Greeting + intro
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Dear Sir,", MARGIN, cursor);
  cursor += 14;
  const intro =
    p.ai.executive_summary ||
    `Thank you for your valuable enquiry for the ${p.product_label}. We are pleased to submit our competitive quotation and look forward to a long-term business relationship.`;
  const introLines = doc.splitTextToSize(intro, W - MARGIN * 2) as string[];
  // clip intro to at most 5 lines on page 1 to reserve room for the price table
  const shownIntro = introLines.slice(0, 5);
  doc.text(shownIntro, MARGIN, cursor);
  cursor += shownIntro.length * 12 + 12;

  // Product table
  autoTable(doc, {
    startY: cursor,
    head: [["SR.", "CAT.", "PRODUCT DESCRIPTION", "QTY.", `AMOUNT (${currencyPrefix(p.currency)})`]],
    body: p.machines.map((m, i) => [
      { content: String(i + 1), styles: { textColor: BRAND_RED, fontStyle: "bold", halign: "center" } },
      { content: String.fromCharCode(65 + i), styles: { textColor: BRAND_RED, fontStyle: "bold", halign: "center" } },
      {
        content:
          `${m.name}\n` +
          `MOC: ${m.material}   |   Capacity: ${m.capacity}\n` +
          `Motor: ${m.motor}   |   Qty: ${m.qty}`,
        styles: { fontStyle: "normal" },
      },
      { content: `${m.qty} NOS.`, styles: { halign: "center" } },
      { content: pdfMoney(m.unit_price * m.qty, p.currency), styles: { halign: "right", fontStyle: "bold" } },
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
    headStyles: { fillColor: BRAND_DARK, textColor: 255, fontSize: 9.5, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 36, halign: "center" },
      1: { cellWidth: 36, halign: "center" },
      3: { cellWidth: 56, halign: "center" },
      4: { cellWidth: 110, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid",
    didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY;

  const c = p.commercials;
  const isExport = p.quotation_type === "export";
  autoTable(doc, {
    startY: cursor,
    body: [
      [
        { content: "Sub-Total", styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
        { content: pdfMoney(c.machines_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
      ],
      isExport
        ? [
            { content: "Export packing & documentation (included)", styles: { halign: "right" } },
            { content: pdfMoney(0, p.currency), styles: { halign: "right" } },
          ]
        : [
            { content: `GST @ ${c.tax_rate}%  (HSN Code: 84798910)`, styles: { halign: "right" } },
            { content: pdfMoney(c.tax, p.currency), styles: { halign: "right" } },
          ],
      [
        { content: spaced(isExport ? "TOTAL (FOB)" : "NET TOTAL", " "), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
        { content: pdfMoney(isExport ? c.machines_total : c.grand_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
    columnStyles: {
      0: { cellWidth: W - MARGIN * 2 - 150 },
      1: { cellWidth: 150, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid",
    didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY + 18;

  // ============ PAGE 2: Terms + Bank ============
  newPage();
  cursor = CONTENT_TOP;
  sectionHeader(doc, "TERMS & CONDITIONS", cursor);
  cursor += 24;
  const termsRows: [string, string][] = (p.terms && p.terms.length
    ? p.terms
    : isExport
      ? [
          { title: "Incoterms", body: "FOB Mundra Port, India (Incoterms 2020)." },
          { title: "Export Packing", body: "Sea-worthy export packing with ISPM-15 fumigation certificate." },
          { title: "Payment", body: "30% advance; 70% against copy of shipping documents." },
          { title: "Delivery", body: "6-8 weeks from receipt of advance and technical clearance." },
          { title: "Warranty", body: "18 months from date of Bill of Lading." },
          { title: "Validity", body: `Offer valid until ${validUntil(p.date)}` },
        ]
      : [
          { title: "Freight", body: "Extra at Actual" },
          { title: "GST", body: `@ ${c.tax_rate}% extra with HSN Code: 84798910` },
          { title: "Payment", body: "50% advance with commercial order; 50% against Proforma Invoice before dispatch, after FAT" },
          { title: "Delivery", body: "14 working days from date of receipt of advance with commercial order" },
          { title: "Warranty", body: "24 months from date of Invoice" },
          { title: "Validity", body: `Offer valid until ${validUntil(p.date)}` },
        ]
  ).map(t => [t.title, t.body] as [string, string]);
  autoTable(doc, {
    startY: cursor,
    body: termsRows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, valign: "middle", overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: "bold", fillColor: SOFT_GREY },
      1: { cellWidth: W - MARGIN * 2 - 110 },
    },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid",
    didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY + 18;

  cursor = ensureSpace(60, cursor);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  const closing =
    "We trust the above offer meets your requirements. Kindly confirm your order at the earliest to ensure timely delivery. We assure you of our best quality and services at all times.";
  const cLines = doc.splitTextToSize(closing, W - MARGIN * 2) as string[];
  doc.text(cLines, MARGIN, cursor);
  cursor += cLines.length * 13 + 16;

  // Red divider
  cursor = ensureSpace(110, cursor);
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(1);
  doc.line(MARGIN, cursor, W - MARGIN, cursor);
  cursor += 18;

  // Signature + Bank
  const sigColW = (W - MARGIN * 2 - 20) / 2;
  const se = p.sales_engineer || {};
  const seName = (se.name && se.name.trim()) ? se.name.trim().toUpperCase() : "YAMINI MODI";
  const sePhone = (se.phone && se.phone.trim()) ? se.phone.trim() : "+91 94099 49532";
  const seEmail = se.email && se.email.trim() ? se.email.trim() : "";
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_GREY);
  doc.text("With warm regards,", MARGIN, cursor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK);
  doc.text(fitLine(doc, seName, sigColW), MARGIN, cursor + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_RED);
  doc.text("Sales Engineer", MARGIN, cursor + 36);
  doc.setTextColor(...BRAND_DARK);
  doc.text("RAMESHWAR STEEL FAB", MARGIN, cursor + 50);
  doc.text(`M: ${sePhone}`, MARGIN, cursor + 64);
  if (seEmail) doc.text(`E: ${seEmail}`, MARGIN, cursor + 78);

  // Bank details box
  const bx = MARGIN + sigColW + 20;
  const bkH = 90;
  doc.setFillColor(...SOFT_GREY);
  doc.rect(bx, cursor - 12, sigColW, bkH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("BANK DETAILS", " "), bx + 12, cursor + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Bank Name:  HDFC Bank", bx + 12, cursor + 24);
  doc.text("A/C Name:  Rameshwar Steel Fab", bx + 12, cursor + 40);
  doc.text("A/C No.:  XXXXXXXXXXXX", bx + 12, cursor + 56);
  doc.text("IFSC:  HDFC0XXXXXX", bx + 12, cursor + 72);

  // ============ Technical proposal pages ============
  newPage();
  cursor = CONTENT_TOP;

  const contentSections: Array<[string, string | string[] | undefined, "text" | "bullets"]> = [
    ["COMPANY INTRODUCTION", p.ai.company_introduction, "text"],
    ["PROJECT OVERVIEW", p.ai.project_overview, "text"],
    ["SCOPE OF SUPPLY", p.ai.scope_of_supply, "text"],
    ["MANUFACTURING PROCESS", p.ai.manufacturing_process, "text"],
  ];
  for (const [title, body, kind] of contentSections) {
    if (!body || (Array.isArray(body) && !body.length)) continue;
    cursor = ensureSpace(80, cursor);
    sectionHeader(doc, title, cursor);
    cursor += 22;
    cursor = kind === "text"
      ? paragraph(doc, body as string, MARGIN, cursor, W - MARGIN * 2, H, ensureSpace)
      : bulletList(doc, body as string[], MARGIN, cursor, W - MARGIN * 2, H, ensureSpace);
  }

  // Machine specs table
  cursor = ensureSpace(140, cursor);
  sectionHeader(doc, "MACHINE SPECIFICATIONS", cursor);
  cursor += 22;
  autoTable(doc, {
    startY: cursor,
    head: [["#", "Machine", "Qty", "Capacity", "Motor", "MOC"]],
    body: p.machines.map((m, i) => [i + 1, m.name, m.qty, m.capacity, m.motor, m.material]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
    headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 26, halign: "center" }, 2: { cellWidth: 40, halign: "center" } },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid",
    didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY + 20;

  // Utilities
  cursor = ensureSpace(220, cursor);
  sectionHeader(doc, "UTILITY REQUIREMENT", cursor);
  cursor += 22;
  const u = p.utilities;
  autoTable(doc, {
    startY: cursor,
    head: [["Parameter", "Value"]],
    body: [
      ["Connected Load", `${u.connected_load_kw ?? "-"} kW`],
      ["Running Load", `${u.running_load_kw ?? "-"} kW`],
      ["Power Consumption", `${u.power_kwh_day ?? "-"} kWh / day`],
      ["Water Requirement", `${u.water_kld ?? "-"} KL / day`],
      ["Steam", `${u.steam_kg_hr ?? "-"} kg/hr`],
      ["Compressed Air", `${u.air_cfm ?? "-"} CFM`],
      ["Manpower", `${u.manpower ?? "-"} persons / shift`],
      ["Floor Space", `${u.floor_space_sqm ?? "-"} sqm`],
      ["Production / Shift", `${u.production_per_shift_kg ?? "-"} kg`],
      ["Production / Day", `${u.production_per_day_kg ?? "-"} kg`],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
    headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", fillColor: SOFT_GREY, cellWidth: 220 } },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid",
    didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY + 22;

  // Feature blocks
  const featureSections: Array<[string, string | string[] | undefined, "text" | "bullets"]> = [
    ["KEY ADVANTAGES", p.ai.advantages, "bullets"],
    ["SAFETY FEATURES", p.ai.safety_features, "bullets"],
    ["QUALITY ASSURANCE", p.ai.quality_assurance, "text"],
    ["INSTALLATION & COMMISSIONING", p.ai.installation, "text"],
    ["WARRANTY", p.ai.warranty, "text"],
    ["AFTER SALES SUPPORT", p.ai.after_sales, "text"],
    ["WHY RAMESHWAR STEEL FAB", p.ai.value_proposition, "text"],
  ];
  for (const [title, body, kind] of featureSections) {
    if (!body || (Array.isArray(body) && !body.length)) continue;
    cursor = ensureSpace(80, cursor);
    sectionHeader(doc, title, cursor);
    cursor += 22;
    cursor = kind === "text"
      ? paragraph(doc, body as string, MARGIN, cursor, W - MARGIN * 2, H, ensureSpace)
      : bulletList(doc, body as string[], MARGIN, cursor, W - MARGIN * 2, H, ensureSpace);
  }

  // Finalise footers with correct page counts
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  return { doc, filename: `${p.proposal_number.replace(/\//g, "_")}.pdf` };
}

export async function generateProposalPdf(p: ProposalPdfInput) {
  const { doc, filename } = await buildProposalPdf(p);
  doc.save(filename);
}

export async function getProposalPdfBlobUrl(p: ProposalPdfInput): Promise<{ url: string; filename: string }> {
  const { doc, filename } = await buildProposalPdf(p);
  const blob = doc.output("blob");
  return { url: URL.createObjectURL(blob), filename };
}

// ================= Block-driven builder =================
// When the proposal has a custom `blocks` layout (from the visual editor),
// we render blocks in order instead of the legacy fixed layout.
export async function buildBlockPdf(p: ProposalPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const logo = await loadLogo();

  const drawHeader = () => {
    if (logo) {
      try {
        const h = 54;
        const w = h * logo.ratio;
        doc.addImage(logo.dataUrl, "PNG", MARGIN, 24, w, h, undefined, "FAST");
      } catch { /* noop */ }
    }
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...BRAND_RED);
    doc.text("Your Success  •  Our Commitment  •  More than Suppliers — Partners", W - MARGIN, 34, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(60); doc.setFontSize(8.5);
    doc.text("31, Sayona Industrial Estate, Near Panchratna Estate, Ramol Cross Road,", W - MARGIN, 48, { align: "right" });
    doc.text("Phase IV, Vatva GIDC, Ahmedabad (Gujarat) – 382445", W - MARGIN, 60, { align: "right" });
    doc.text("+91 97256 05639   |   Sales@rameshwar.co.in   |   www.rameshwar.co.in", W - MARGIN, 72, { align: "right" });
    doc.setTextColor(...TEXT_GREY); doc.setFontSize(8);
    doc.text("GSTIN: 24ABEPL9780J1ZL", W - MARGIN, 84, { align: "right" });
    doc.setDrawColor(...BORDER_GREY); doc.setLineWidth(0.5);
    doc.line(MARGIN, HEADER_BOTTOM - 4, W - MARGIN, HEADER_BOTTOM - 4);
  };
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(...BRAND_RED); doc.rect(0, H - FOOTER_TOP, W, FOOTER_TOP, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
    doc.text(`"Nation First … Always First …"   |   www.rameshwar.co.in   |   GSTIN: 24ABEPL9780J1ZL`, W / 2, H - 13, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`Page ${pageNum} of ${totalPages}`, W - MARGIN, H - 13, { align: "right" });
  };
  const paintChrome = () => { drawHeader(); };
  const newPage = () => { doc.addPage(); paintChrome(); };
  const ensureSpace = (needed: number, cursor: number): number => {
    if (cursor + needed > H - FOOTER_TOP - 12) { newPage(); return CONTENT_TOP; }
    return cursor;
  };

  paintChrome();
  let cursor = CONTENT_TOP;
  let coverRendered = false;

  const blocks = p.blocks!.filter(b => b.visible);
  for (let idx = 0; idx < blocks.length; idx++) {
    const b = blocks[idx];
    // Force cover to start at top of a fresh page (except when it's first block).
    if (b.type === "cover") {
      if (idx > 0) { newPage(); cursor = 120; }
      cursor = renderCover(doc, p, W, cursor, ensureSpace, paintChrome);
      coverRendered = true;
      continue;
    }
    // If content follows a cover, start on a new page.
    if (coverRendered) { newPage(); cursor = CONTENT_TOP; coverRendered = false; }

    switch (b.type) {
      case "ai_section": {
        const val = b.aiKey ? (p.ai as any)[b.aiKey] : undefined;
        const text = typeof val === "string" ? val : Array.isArray(val) ? val.join(" ") : "";
        if (!text.trim()) break;
        cursor = ensureSpace(60, cursor);
        sectionHeader(doc, (b.heading || b.aiKey || "Section").toUpperCase(), cursor);
        cursor += 22;
        cursor = paragraph(doc, text, MARGIN, cursor, W - MARGIN * 2, H, ensureSpace);
        break;
      }
      case "ai_bullets": {
        const val = b.aiKey ? (p.ai as any)[b.aiKey] : undefined;
        const items: string[] = Array.isArray(val) ? val : typeof val === "string" && val.trim() ? [val] : [];
        if (!items.length) break;
        cursor = ensureSpace(60, cursor);
        sectionHeader(doc, (b.heading || b.aiKey || "Section").toUpperCase(), cursor);
        cursor += 22;
        cursor = bulletList(doc, items, MARGIN, cursor, W - MARGIN * 2, H, ensureSpace);
        break;
      }
      case "text": {
        if (!b.body?.trim() && !b.heading?.trim()) break;
        if (b.heading?.trim()) {
          cursor = ensureSpace(60, cursor);
          sectionHeader(doc, b.heading.toUpperCase(), cursor);
          cursor += 22;
        } else {
          cursor = ensureSpace(30, cursor);
        }
        if (b.body?.trim()) cursor = paragraph(doc, b.body, MARGIN, cursor, W - MARGIN * 2, H, ensureSpace);
        break;
      }
      case "spacer": {
        const h = Math.max(0, Math.min(200, b.height ?? 24));
        cursor = ensureSpace(h, cursor); cursor += h;
        break;
      }
      case "image": {
        if (!b.imageUrl) break;
        try {
          const info = await fetchImage(b.imageUrl);
          if (!info) break;
          const maxW = W - MARGIN * 2;
          const maxH = 320;
          let iw = info.w, ih = info.h;
          const ratio = Math.min(maxW / iw, maxH / ih, 1);
          iw = iw * ratio; ih = ih * ratio;
          cursor = ensureSpace(ih + (b.caption ? 20 : 8), cursor);
          doc.addImage(info.dataUrl, info.fmt, MARGIN + (maxW - iw) / 2, cursor, iw, ih, undefined, "FAST");
          cursor += ih + 6;
          if (b.caption) {
            doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...TEXT_GREY);
            doc.text(b.caption, W / 2, cursor + 10, { align: "center" });
            cursor += 18;
          }
        } catch { /* skip broken image */ }
        break;
      }
      case "table": {
        const heads = b.tableHeaders && b.tableHeaders.length ? [b.tableHeaders] : undefined;
        const body = (b.tableRows || []).filter(r => r && r.length);
        if (!body.length) break;
        if (b.heading?.trim()) {
          cursor = ensureSpace(60, cursor);
          sectionHeader(doc, b.heading.toUpperCase(), cursor);
          cursor += 22;
        }
        autoTable(doc, {
          startY: cursor, head: heads, body,
          theme: "grid",
          styles: { fontSize: 9.5, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
          headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold" },
          margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
          rowPageBreak: "avoid", didDrawPage: paintChrome,
        });
        cursor = (doc as any).lastAutoTable.finalY + 14;
        break;
      }
      case "machines": {
        if (!p.machines.length) break;
        cursor = ensureSpace(80, cursor);
        sectionHeader(doc, (b.heading || "MACHINE SPECIFICATIONS").toUpperCase(), cursor);
        cursor += 22;
        autoTable(doc, {
          startY: cursor,
          head: [["#", "Machine", "Qty", "Capacity", "Motor", "MOC"]],
          body: p.machines.map((m, i) => [i + 1, m.name, m.qty, m.capacity, m.motor, m.material]),
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
          headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { cellWidth: 26, halign: "center" }, 2: { cellWidth: 40, halign: "center" } },
          margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
          rowPageBreak: "avoid", didDrawPage: paintChrome,
        });
        cursor = (doc as any).lastAutoTable.finalY + 18;
        break;
      }
      case "utilities": {
        const u = p.utilities;
        cursor = ensureSpace(120, cursor);
        sectionHeader(doc, (b.heading || "UTILITY REQUIREMENT").toUpperCase(), cursor);
        cursor += 22;
        autoTable(doc, {
          startY: cursor, head: [["Parameter", "Value"]],
          body: [
            ["Connected Load", `${u.connected_load_kw ?? "-"} kW`],
            ["Running Load", `${u.running_load_kw ?? "-"} kW`],
            ["Power Consumption", `${u.power_kwh_day ?? "-"} kWh / day`],
            ["Water Requirement", `${u.water_kld ?? "-"} KL / day`],
            ["Steam", `${u.steam_kg_hr ?? "-"} kg/hr`],
            ["Compressed Air", `${u.air_cfm ?? "-"} CFM`],
            ["Manpower", `${u.manpower ?? "-"} persons / shift`],
            ["Floor Space", `${u.floor_space_sqm ?? "-"} sqm`],
            ["Production / Shift", `${u.production_per_shift_kg ?? "-"} kg`],
            ["Production / Day", `${u.production_per_day_kg ?? "-"} kg`],
          ],
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
          headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { fontStyle: "bold", fillColor: SOFT_GREY, cellWidth: 220 } },
          margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
          rowPageBreak: "avoid", didDrawPage: paintChrome,
        });
        cursor = (doc as any).lastAutoTable.finalY + 18;
        break;
      }
      case "commercials": {
        const c = p.commercials; const isExport = p.quotation_type === "export";
        cursor = ensureSpace(140, cursor);
        sectionHeader(doc, (b.heading || "COMMERCIAL QUOTATION").toUpperCase(), cursor);
        cursor += 22;
        autoTable(doc, {
          startY: cursor,
          head: [["#", "Description", "Qty", `Amount (${currencyPrefix(p.currency)})`]],
          body: p.machines.map((m, i) => [
            i + 1, `${m.name} — ${m.capacity} (${m.material})`, `${m.qty} NOS.`,
            { content: pdfMoney(m.unit_price * m.qty, p.currency), styles: { halign: "right" } },
          ]),
          theme: "grid",
          styles: { fontSize: 9.5, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
          headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { cellWidth: 26, halign: "center" }, 2: { cellWidth: 60, halign: "center" }, 3: { cellWidth: 110, halign: "right" } },
          margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
          rowPageBreak: "avoid", didDrawPage: paintChrome,
        });
        cursor = (doc as any).lastAutoTable.finalY;
        autoTable(doc, {
          startY: cursor,
          body: [
            [
              { content: "Sub-Total", styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
              { content: pdfMoney(c.machines_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
            ],
            isExport
              ? [{ content: "Export packing & documentation (included)", styles: { halign: "right" } }, { content: pdfMoney(0, p.currency), styles: { halign: "right" } }]
              : [{ content: `GST @ ${c.tax_rate}%  (HSN Code: 84798910)`, styles: { halign: "right" } }, { content: pdfMoney(c.tax, p.currency), styles: { halign: "right" } }],
            [
              { content: spaced(isExport ? "TOTAL (FOB)" : "NET TOTAL", " "), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
              { content: pdfMoney(isExport ? c.machines_total : c.grand_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
            ],
          ],
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
          columnStyles: { 0: { cellWidth: W - MARGIN * 2 - 150 }, 1: { cellWidth: 150, halign: "right" } },
          margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
          rowPageBreak: "avoid", didDrawPage: paintChrome,
        });
        cursor = (doc as any).lastAutoTable.finalY + 18;
        break;
      }
      case "terms": {
        const c = p.commercials; const isExport = p.quotation_type === "export";
        const rows: [string, string][] = (p.terms && p.terms.length
          ? p.terms
          : isExport
            ? [
                { title: "Incoterms", body: "FOB Mundra Port, India (Incoterms 2020)." },
                { title: "Export Packing", body: "Sea-worthy export packing with ISPM-15 fumigation certificate." },
                { title: "Payment", body: "30% advance; 70% against copy of shipping documents." },
                { title: "Delivery", body: "6-8 weeks from receipt of advance and technical clearance." },
                { title: "Warranty", body: "18 months from date of Bill of Lading." },
                { title: "Validity", body: `Offer valid until ${validUntil(p.date)}` },
              ]
            : [
                { title: "Freight", body: "Extra at Actual" },
                { title: "GST", body: `@ ${c.tax_rate}% extra with HSN Code: 84798910` },
                { title: "Payment", body: "50% advance with commercial order; 50% against Proforma Invoice before dispatch, after FAT" },
                { title: "Delivery", body: "14 working days from date of receipt of advance with commercial order" },
                { title: "Warranty", body: "24 months from date of Invoice" },
                { title: "Validity", body: `Offer valid until ${validUntil(p.date)}` },
              ]
        ).map(t => [t.title, t.body] as [string, string]);
        cursor = ensureSpace(100, cursor);
        sectionHeader(doc, (b.heading || "TERMS & CONDITIONS").toUpperCase(), cursor);
        cursor += 22;
        autoTable(doc, {
          startY: cursor, body: rows, theme: "grid",
          styles: { fontSize: 10, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, valign: "middle", overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: 110, fontStyle: "bold", fillColor: SOFT_GREY }, 1: { cellWidth: W - MARGIN * 2 - 110 } },
          margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
          rowPageBreak: "avoid", didDrawPage: paintChrome,
        });
        cursor = (doc as any).lastAutoTable.finalY + 18;
        break;
      }
    }
  }

  // Finalise footers with correct page counts
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawFooter(i, totalPages); }
  return { doc, filename: `${p.proposal_number.replace(/\//g, "_")}.pdf` };
}

// Render the cover / page-1 hero: banner + info strip + Bill To + Subject + intro.
function renderCover(
  doc: jsPDF, p: ProposalPdfInput, W: number, startCursor: number,
  ensureSpace: (n: number, c: number) => number, _paintChrome: () => void,
): number {
  let cursor = startCursor;
  // banner
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, cursor, W - MARGIN * 2, 40, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  const banner = p.quotation_type === "export" ? "EXPORT QUOTATION" : "QUOTATION";
  doc.text(spaced(banner, "  "), W / 2, cursor + 26, { align: "center" });
  cursor += 56;
  // info strip
  const infoH = 48;
  doc.setFillColor(...SOFT_GREY); doc.rect(MARGIN, cursor, W - MARGIN * 2, infoH, "F");
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, cursor, 4, infoH, "F");
  const colW = (W - MARGIN * 2) / 3;
  const info: [string, string, boolean][] = [
    ["Quote No.", p.proposal_number, false],
    ["Date", p.date, false],
    ["Valid Until", validUntil(p.date), true],
  ];
  info.forEach(([label, value, red], i) => {
    const x = MARGIN + 20 + i * colW;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...TEXT_GREY);
    doc.text(label, x, cursor + 18);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...(red ? BRAND_RED : BRAND_DARK));
    doc.text(fitLine(doc, value, colW - 24), x, cursor + 36);
  });
  cursor += infoH + 18;
  // bill to + subject
  const boxH = 115;
  const halfW = (W - MARGIN * 2 - 16) / 2;
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("BILL TO", " "), MARGIN + 16, cursor + 16);
  doc.setFontSize(11.5);
  doc.text(fitLine(doc, (p.customer.contact_person || "Valued Customer").toUpperCase(), halfW - 20), MARGIN + 16, cursor + 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(50);
  doc.text(fitLine(doc, p.customer.company_name || "-", halfW - 20), MARGIN + 16, cursor + 50);
  doc.setFontSize(9);
  let by = cursor + 66;
  if (p.customer.mobile) by = drawLabelValue(doc, "Mobile :-", p.customer.mobile, MARGIN + 16, by, halfW - 20);
  if (p.customer.email) by = drawLabelValue(doc, "Email :-", p.customer.email, MARGIN + 16, by, halfW - 20);
  const addr = p.customer.address || [p.customer.city, p.customer.country].filter(Boolean).join(", ");
  if (addr) drawLabelValue(doc, "Address :-", addr, MARGIN + 16, by, halfW - 20);

  const subX = MARGIN + halfW + 16;
  doc.setFillColor(...PINK_TINT); doc.rect(subX, cursor, halfW, boxH, "F");
  doc.setFillColor(...BRAND_RED); doc.rect(subX, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("SUBJECT", " "), subX + 16, cursor + 16);
  doc.setTextColor(...BRAND_RED); doc.setFontSize(11);
  const subjLines = doc.splitTextToSize(`Offer for ${p.product_label}`, halfW - 24) as string[];
  doc.text(subjLines, subX + 16, cursor + 34);
  const subjBottom = cursor + 34 + subjLines.length * 13;
  doc.setTextColor(...BRAND_DARK); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(fitLine(doc, `Capacity: ${p.capacity}`, halfW - 24), subX + 16, subjBottom + 8);
  doc.text(fitLine(doc, `Automation: ${p.automation}  |  MOC: ${p.material}`, halfW - 24), subX + 16, subjBottom + 22);
  cursor += boxH + 22;

  // intro
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...BRAND_DARK);
  doc.text("Dear Sir,", MARGIN, cursor); cursor += 14;
  const intro = p.ai.executive_summary || `Thank you for your enquiry for the ${p.product_label}. We are pleased to submit our proposal.`;
  const introLines = doc.splitTextToSize(intro, W - MARGIN * 2) as string[];
  const shown = introLines.slice(0, 6);
  doc.text(shown, MARGIN, cursor);
  cursor = ensureSpace(0, cursor + shown.length * 12 + 12);
  return cursor;
}

// Fetch an image URL and return data URL + intrinsic size + format.
async function fetchImage(url: string): Promise<{ dataUrl: string; w: number; h: number; fmt: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
      img.onerror = () => resolve({ w: 400, h: 300 });
      img.src = dataUrl;
    });
    const fmt: "PNG" | "JPEG" = /image\/png/i.test(blob.type) ? "PNG" : "JPEG";
    return { dataUrl, w, h, fmt };
  } catch { return null; }
}

// -------- helpers --------


function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number): number {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_DARK);
  doc.text(label, x, y);
  const lw = doc.getTextWidth(label + " ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  const remaining = maxWidth - lw;
  const lines = doc.splitTextToSize(value, remaining) as string[];
  lines.forEach((ln, i) => doc.text(ln, x + lw, y + i * 12));
  return y + lines.length * 12 + 2;
}

function sectionHeader(doc: jsPDF, title: string, y: number) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced(title, " "), MARGIN, y);
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(2);
  doc.line(MARGIN, y + 6, MARGIN + 46, y + 6);
  doc.setDrawColor(...BORDER_GREY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN + 48, y + 6, W - MARGIN, y + 6);
}

function paragraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  _H: number,
  ensureSpace: (needed: number, y: number) => number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const ln of lines) {
    y = ensureSpace(14, y);
    doc.text(ln, x, y);
    y += 13;
  }
  return y + 6;
}

function bulletList(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  maxW: number,
  _H: number,
  ensureSpace: (needed: number, y: number) => number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, maxW - 16) as string[];
    for (let i = 0; i < lines.length; i++) {
      y = ensureSpace(14, y);
      if (i === 0) {
        doc.setTextColor(...BRAND_RED);
        doc.text("■", x, y);
        doc.setTextColor(...BRAND_DARK);
      }
      doc.text(lines[i], x + 14, y);
      y += 13;
    }
    y += 3;
  }
  return y + 6;
}

function validUntil(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
