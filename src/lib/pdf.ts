import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AiProposalContent } from "./ai.functions";
import type { Machine, Utilities, Commercials } from "./proposal-catalog";
import logoAsset from "@/assets/rsf-logo.png.asset.json";

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
  doc.text(spaced("QUOTATION", "  "), W / 2, cursor + 26, { align: "center" });
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
  autoTable(doc, {
    startY: cursor,
    body: [
      [
        { content: "Sub-Total", styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
        { content: pdfMoney(c.machines_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
      ],
      [
        { content: `GST @ ${c.tax_rate}%  (HSN Code: 84798910)`, styles: { halign: "right" } },
        { content: pdfMoney(c.tax, p.currency), styles: { halign: "right" } },
      ],
      [
        { content: spaced("NET TOTAL", " "), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
        { content: pdfMoney(c.grand_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
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
  autoTable(doc, {
    startY: cursor,
    body: [
      ["Freight", "Extra at Actual"],
      ["IGST", `@ ${c.tax_rate}% Extra with HSN Code: 84798910`],
      ["Payment", "50% advance with commercial order; 50% against Proforma Invoice before dispatch, After FAT"],
      ["Delivery", "14 Working Days from date of receipt of advance with commercial order"],
      ["Warranty", "24 Months from date of Invoice"],
      ["Validity", `Offer valid until ${validUntil(p.date)}`],
    ],
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
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_GREY);
  doc.text("With warm regards,", MARGIN, cursor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK);
  doc.text("YAMINI MODI", MARGIN, cursor + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_RED);
  doc.text("Manager – Sales", MARGIN, cursor + 36);
  doc.setTextColor(...BRAND_DARK);
  doc.text("RAMESHWAR STEEL FAB", MARGIN, cursor + 50);
  doc.text("M: +91 94099 49532", MARGIN, cursor + 64);

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
