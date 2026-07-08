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

// Rameshwar Steel Fab brand palette (matches printed brochure reference)
const BRAND_RED: [number, number, number] = [200, 16, 46]; // #C8102E
const BRAND_DARK: [number, number, number] = [17, 17, 17];
const SOFT_GREY: [number, number, number] = [245, 246, 248];
const BORDER_GREY: [number, number, number] = [220, 222, 226];
const TEXT_GREY: [number, number, number] = [95, 99, 108];
const PINK_TINT: [number, number, number] = [253, 240, 242];

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/rsf-logo.png");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const spaced = (s: string, gap = " ") => s.split("").join(gap);

export async function generateProposalPdf(p: ProposalPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 40;

  const logoDataUrl = await loadLogo();

  const drawHeader = () => {
    // Logo
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, "PNG", MARGIN, 24, 150, 55); } catch { /* noop */ }
    } else {
      doc.setTextColor(...BRAND_RED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("RAMESHWAR", MARGIN, 48);
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_RED);
      doc.text("S T E E L   F A B", MARGIN, 64);
    }
    // Right block
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RED);
    doc.text("Your Success  •  Our Commitment  •  More than Suppliers — Partners", W - MARGIN, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(9);
    doc.text("31, Sayona Industrial Estate, Near Panchratna Estate, Ramol Cross Road,", W - MARGIN, 48, { align: "right" });
    doc.text("Phase IV, Vatva GIDC, Ahmedabad (Gujarat) – 382445", W - MARGIN, 60, { align: "right" });
    doc.text("+91 97256 05639   |   Sales@rameshwar.co.in   |   www.rameshwar.co.in", W - MARGIN, 72, { align: "right" });
    doc.setTextColor(...TEXT_GREY);
    doc.setFontSize(8);
    doc.text("GSTIN: 24ABEPL9780J1ZL", W - MARGIN, 84, { align: "right" });
    // Divider
    doc.setDrawColor(...BORDER_GREY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 100, W - MARGIN, 100);
  };

  const drawFooter = () => {
    doc.setFillColor(...BRAND_RED);
    doc.rect(0, H - 28, W, 28, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      `"Nation First … Always First …"   |   www.rameshwar.co.in   |   GSTIN: 24ABEPL9780J1ZL`,
      W / 2,
      H - 10,
      { align: "center" }
    );
  };

  const newPage = () => {
    doc.addPage();
    drawHeader();
    drawFooter();
  };

  const ensureSpace = (needed: number, cursor: number): number => {
    if (cursor + needed > H - 60) {
      newPage();
      return 130;
    }
    return cursor;
  };

  // ============ PAGE 1 ============
  drawHeader();
  drawFooter();

  let cursor = 120;

  // QUOTATION banner
  doc.setFillColor(...BRAND_RED);
  doc.rect(MARGIN, cursor, W - MARGIN * 2, 42, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(spaced("QUOTATION", "  "), W / 2, cursor + 27, { align: "center" });
  cursor += 60;

  // Info strip: Quote No / Date / Valid Until
  const infoH = 50;
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
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_GREY);
    doc.text(label, x, cursor + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...(red ? BRAND_RED : BRAND_DARK));
    doc.text(value, x, cursor + 38);
  });
  cursor += infoH + 20;

  // Bill To / Subject two-column
  const boxH = 110;
  const halfW = (W - MARGIN * 2 - 16) / 2;
  // Bill To
  doc.setFillColor(...BRAND_RED);
  doc.rect(MARGIN, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("BILL TO", " "), MARGIN + 16, cursor + 18);
  doc.setFontSize(12);
  doc.text((p.customer.contact_person || "Valued Customer").toUpperCase(), MARGIN + 16, cursor + 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(p.customer.company_name || "-", MARGIN + 16, cursor + 54);
  doc.setFontSize(9);
  let by = cursor + 70;
  if (p.customer.mobile) { drawLabelValue(doc, "Mobile :-", p.customer.mobile, MARGIN + 16, by); by += 12; }
  if (p.customer.email) { drawLabelValue(doc, "Email :-", p.customer.email, MARGIN + 16, by); by += 12; }
  const addr = p.customer.address || [p.customer.city, p.customer.country].filter(Boolean).join(", ");
  if (addr) drawLabelValue(doc, "Address :-", addr, MARGIN + 16, by);

  // Subject box (right, pink tint)
  const subX = MARGIN + halfW + 16;
  doc.setFillColor(...PINK_TINT);
  doc.rect(subX, cursor, halfW, boxH, "F");
  doc.setFillColor(...BRAND_RED);
  doc.rect(subX, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("SUBJECT", " "), subX + 16, cursor + 18);
  doc.setTextColor(...BRAND_RED);
  doc.setFontSize(11);
  const subj = `Offer for ${p.product_label}`;
  const subjLines = doc.splitTextToSize(subj, halfW - 24);
  doc.text(subjLines, subX + 16, cursor + 38);
  doc.setTextColor(...BRAND_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Capacity: ${p.capacity}`, subX + 16, cursor + 38 + subjLines.length * 14 + 6);
  doc.text(`Automation: ${p.automation}  |  MOC: ${p.material}`, subX + 16, cursor + 38 + subjLines.length * 14 + 22);
  cursor += boxH + 24;

  // Greeting + intro
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND_DARK);
  doc.text("Dear Sir,", MARGIN, cursor);
  cursor += 16;
  const intro = p.ai.executive_summary
    || `Thank you for your valuable enquiry for the ${p.product_label}. We are pleased to submit our competitive quotation and look forward to a long-term business relationship.`;
  const introLines = doc.splitTextToSize(intro, W - MARGIN * 2);
  doc.text(introLines, MARGIN, cursor);
  cursor += introLines.length * 13 + 14;

  // Product table
  const symbol = currencySymbol(p.currency);
  autoTable(doc, {
    startY: cursor,
    head: [["SR.", "CAT.", "PRODUCT DESCRIPTION", "QTY.", `AMOUNT (${symbol})`]],
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
      { content: formatMoney(m.unit_price * m.qty, p.currency), styles: { halign: "right", fontStyle: "bold" } },
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
    headStyles: { fillColor: BRAND_DARK, textColor: 255, fontSize: 9.5, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 40, halign: "center" },
      1: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 60, halign: "center" },
      4: { cellWidth: 100, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  cursor = (doc as any).lastAutoTable.finalY;

  const c = p.commercials;
  autoTable(doc, {
    startY: cursor,
    body: [
      [{ content: "Sub-Total", styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
       { content: formatMoney(c.machines_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } }],
      [{ content: `GST @ ${c.tax_rate}%  (HSN Code: 84798910)`, styles: { halign: "right" } },
       { content: formatMoney(c.tax, p.currency), styles: { halign: "right" } }],
      [{ content: spaced("NET TOTAL", " "), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
       { content: formatMoney(c.grand_total, p.currency), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } }],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 8, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
    columnStyles: {
      0: { cellWidth: W - MARGIN * 2 - 140 },
      1: { cellWidth: 140, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  cursor = (doc as any).lastAutoTable.finalY + 20;

  // ============ PAGE 2: Terms + Bank ============
  newPage();
  cursor = 130;
  sectionHeader(doc, "TERMS & CONDITIONS", cursor);
  cursor += 26;
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
    styles: { fontSize: 10, cellPadding: 8, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: "bold", fillColor: SOFT_GREY },
      1: { cellWidth: W - MARGIN * 2 - 110 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  cursor = (doc as any).lastAutoTable.finalY + 20;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  const closing = "We trust the above offer meets your requirements. Kindly confirm your order at the earliest to ensure timely delivery. We assure you of our best quality and services at all times.";
  const cLines = doc.splitTextToSize(closing, W - MARGIN * 2);
  doc.text(cLines, MARGIN, cursor);
  cursor += cLines.length * 13 + 20;

  // Red divider
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(1);
  doc.line(MARGIN, cursor, W - MARGIN, cursor);
  cursor += 20;

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

  // ============ PAGE 3+: Technical proposal ============
  newPage();
  cursor = 130;
  sectionHeader(doc, "COMPANY INTRODUCTION", cursor);
  cursor += 22;
  cursor = paragraph(doc, p.ai.company_introduction, MARGIN, cursor, W - MARGIN * 2, H);

  cursor = ensureSpace(60, cursor);
  sectionHeader(doc, "PROJECT OVERVIEW", cursor);
  cursor += 22;
  cursor = paragraph(doc, p.ai.project_overview, MARGIN, cursor, W - MARGIN * 2, H);

  cursor = ensureSpace(60, cursor);
  sectionHeader(doc, "SCOPE OF SUPPLY", cursor);
  cursor += 22;
  cursor = paragraph(doc, p.ai.scope_of_supply, MARGIN, cursor, W - MARGIN * 2, H);

  cursor = ensureSpace(60, cursor);
  sectionHeader(doc, "MANUFACTURING PROCESS", cursor);
  cursor += 22;
  cursor = paragraph(doc, p.ai.manufacturing_process, MARGIN, cursor, W - MARGIN * 2, H);

  // Machine specs table
  cursor = ensureSpace(160, cursor);
  sectionHeader(doc, "MACHINE SPECIFICATIONS", cursor);
  cursor += 22;
  autoTable(doc, {
    startY: cursor,
    head: [["#", "Machine", "Qty", "Capacity", "Motor", "MOC"]],
    body: p.machines.map((m, i) => [i + 1, m.name, m.qty, m.capacity, m.motor, m.material]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
    headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold" },
    margin: { left: MARGIN, right: MARGIN },
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
    styles: { fontSize: 10, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
    headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", fillColor: SOFT_GREY, cellWidth: 220 } },
    margin: { left: MARGIN, right: MARGIN },
  });
  cursor = (doc as any).lastAutoTable.finalY + 24;

  // Feature blocks
  if (p.ai.advantages?.length) {
    cursor = ensureSpace(80, cursor);
    sectionHeader(doc, "KEY ADVANTAGES", cursor);
    cursor += 22;
    cursor = bulletList(doc, p.ai.advantages, MARGIN, cursor, W - MARGIN * 2, H);
  }
  if (p.ai.safety_features?.length) {
    cursor = ensureSpace(80, cursor);
    sectionHeader(doc, "SAFETY FEATURES", cursor);
    cursor += 22;
    cursor = bulletList(doc, p.ai.safety_features, MARGIN, cursor, W - MARGIN * 2, H);
  }
  if (p.ai.quality_assurance) {
    cursor = ensureSpace(80, cursor);
    sectionHeader(doc, "QUALITY ASSURANCE", cursor);
    cursor += 22;
    cursor = paragraph(doc, p.ai.quality_assurance, MARGIN, cursor, W - MARGIN * 2, H);
  }
  if (p.ai.installation) {
    cursor = ensureSpace(80, cursor);
    sectionHeader(doc, "INSTALLATION & COMMISSIONING", cursor);
    cursor += 22;
    cursor = paragraph(doc, p.ai.installation, MARGIN, cursor, W - MARGIN * 2, H);
  }
  if (p.ai.warranty) {
    cursor = ensureSpace(60, cursor);
    sectionHeader(doc, "WARRANTY", cursor);
    cursor += 22;
    cursor = paragraph(doc, p.ai.warranty, MARGIN, cursor, W - MARGIN * 2, H);
  }
  if (p.ai.after_sales) {
    cursor = ensureSpace(60, cursor);
    sectionHeader(doc, "AFTER SALES SUPPORT", cursor);
    cursor += 22;
    cursor = paragraph(doc, p.ai.after_sales, MARGIN, cursor, W - MARGIN * 2, H);
  }
  if (p.ai.value_proposition) {
    cursor = ensureSpace(60, cursor);
    sectionHeader(doc, "WHY RAMESHWAR STEEL FAB", cursor);
    cursor += 22;
    cursor = paragraph(doc, p.ai.value_proposition, MARGIN, cursor, W - MARGIN * 2, H);
  }

  doc.save(`${p.proposal_number.replace(/\//g, "_")}.pdf`);
}

function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_DARK);
  doc.text(label, x, y);
  const lw = doc.getTextWidth(label);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(" " + value, x + lw, y);
}

function sectionHeader(doc: jsPDF, title: string, y: number) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK);
  doc.text(spaced(title, " "), 40, y);
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(2);
  doc.line(40, y + 6, 90, y + 6);
  doc.setDrawColor(...BORDER_GREY);
  doc.setLineWidth(0.5);
  doc.line(92, y + 6, W - 40, y + 6);
}

function paragraph(doc: jsPDF, text: string | undefined, x: number, y: number, maxW: number, H: number): number {
  if (!text) return y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND_DARK);
  const lines = doc.splitTextToSize(text, maxW);
  for (const ln of lines) {
    if (y > H - 60) { doc.addPage(); y = 130; }
    doc.text(ln, x, y);
    y += 14;
  }
  return y + 6;
}

function bulletList(doc: jsPDF, items: string[], x: number, y: number, maxW: number, H: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND_DARK);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, maxW - 16);
    for (let i = 0; i < lines.length; i++) {
      if (y > H - 60) { doc.addPage(); y = 130; }
      if (i === 0) {
        doc.setTextColor(...BRAND_RED);
        doc.text("■", x, y);
        doc.setTextColor(...BRAND_DARK);
      }
      doc.text(lines[i], x + 14, y);
      y += 14;
    }
    y += 2;
  }
  return y + 6;
}

function validUntil(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function currencySymbol(currency: string): string {
  switch (currency) {
    case "INR": return "₹";
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    default: return currency;
  }
}
