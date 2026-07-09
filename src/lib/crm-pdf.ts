import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/rsf-logo.png.asset.json";

// ---------- Palette (matches RSF proposal PDF) ----------
const BRAND_RED: [number, number, number] = [200, 16, 46];
const BRAND_DARK: [number, number, number] = [17, 17, 17];
const SOFT_GREY: [number, number, number] = [245, 246, 248];
const BORDER_GREY: [number, number, number] = [220, 222, 226];
const TEXT_GREY: [number, number, number] = [95, 99, 108];
const PINK_TINT: [number, number, number] = [253, 240, 242];

const MARGIN = 40;
const HEADER_BOTTOM = 108;
const FOOTER_TOP = 34;
const CONTENT_TOP = 128;

// ---------- Logo cache ----------
type LogoInfo = { dataUrl: string; ratio: number };
let cachedLogo: Promise<LogoInfo | null> | null = null;
function loadLogo(): Promise<LogoInfo | null> {
  if (cachedLogo) return cachedLogo;
  cachedLogo = (async () => {
    try {
      const res = await fetch(logoAsset.url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((r, j) => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result as string);
        fr.onerror = () => j(fr.error);
        fr.readAsDataURL(blob);
      });
      const ratio = await new Promise<number>((r) => {
        const img = new Image();
        img.onload = () => r(img.naturalWidth / img.naturalHeight || 3);
        img.onerror = () => r(3);
        img.src = dataUrl;
      });
      return { dataUrl, ratio };
    } catch { return null; }
  })();
  return cachedLogo;
}

const spaced = (s: string, gap = " ") => s.split("").join(gap);

function currencyPrefix(c: string) {
  return c === "INR" ? "Rs." : c === "USD" ? "USD" : c === "EUR" ? "EUR" : c;
}
function money(amount: number, currency: string) {
  const v = Math.round(amount || 0);
  const grp = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 0 }).format(v);
  return `${currencyPrefix(currency)} ${grp}`;
}
function fitLine(doc: jsPDF, t: string, maxW: number) {
  if (!t) return "";
  if (doc.getTextWidth(t) <= maxW) return t;
  let s = t;
  while (s.length > 1 && doc.getTextWidth(s + "…") > maxW) s = s.slice(0, -1);
  return s + "…";
}
function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, maxW: number) {
  doc.setFont("helvetica", "bold"); doc.setTextColor(...BRAND_DARK);
  doc.text(label, x, y);
  const lw = doc.getTextWidth(label) + 4;
  doc.setFont("helvetica", "normal"); doc.setTextColor(50);
  doc.text(fitLine(doc, value, maxW - lw), x + lw, y);
  return y + 13;
}
function validUntil(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + (days || 30));
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------- Types ----------
export interface QuotePdfInput {
  quote: any;                   // crm_quotations row
  items: any[];                 // crm_quotation_items rows (with capacity/motor/moc)
  company: any | null;          // crm_companies row
}

// ---------- Main ----------
export async function generateQuotationPDF(q: any, items: any[], company: any | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const logo = await loadLogo();

  const isExport = q.tax_mode === "export" || (q.currency && q.currency !== "INR");
  const currency = q.currency || "INR";

  // Pick primary contact from company.contacts JSON if present
  const primaryContact = Array.isArray(company?.contacts) && company.contacts.length ? company.contacts[0] : null;

  const drawHeader = () => {
    if (logo) {
      try {
        const h = 54; const w = h * logo.ratio;
        doc.addImage(logo.dataUrl, "PNG", MARGIN, 24, w, h, undefined, "FAST");
      } catch { /* ignore */ }
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
  const drawFooter = (pn: number, tot: number) => {
    doc.setFillColor(...BRAND_RED); doc.rect(0, H - FOOTER_TOP, W, FOOTER_TOP, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
    doc.text(`"Nation First … Always First …"   |   www.rameshwar.co.in   |   GSTIN: 24ABEPL9780J1ZL`, W / 2, H - 13, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`Page ${pn} of ${tot}`, W - MARGIN, H - 13, { align: "right" });
  };
  const paintChrome = () => drawHeader();
  const newPage = () => { doc.addPage(); paintChrome(); };
  const ensure = (need: number, cur: number) => (cur + need > H - FOOTER_TOP - 12 ? (newPage(), CONTENT_TOP) : cur);

  // ============ PAGE 1 ============
  paintChrome();
  let cursor = 120;

  // Banner
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, cursor, W - MARGIN * 2, 40, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  const banner = isExport ? "EXPORT QUOTATION" : "QUOTATION";
  doc.text(spaced(banner, "  "), W / 2, cursor + 26, { align: "center" });
  cursor += 56;

  // Info strip
  const infoH = 48;
  doc.setFillColor(...SOFT_GREY); doc.rect(MARGIN, cursor, W - MARGIN * 2, infoH, "F");
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, cursor, 4, infoH, "F");
  const colW = (W - MARGIN * 2) / 3;
  const infoItems: [string, string, boolean][] = [
    ["Quote No.", q.quote_no || "—", false],
    ["Date", fmtDate(q.quote_date), false],
    ["Valid Until", validUntil(q.quote_date, q.validity_days), true],
  ];
  infoItems.forEach(([label, value, red], i) => {
    const x = MARGIN + 20 + i * colW;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...TEXT_GREY);
    doc.text(label, x, cursor + 18);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(...(red ? BRAND_RED : BRAND_DARK));
    doc.text(fitLine(doc, value, colW - 24), x, cursor + 36);
  });
  cursor += infoH + 18;

  // Bill To / Subject
  const boxH = 115;
  const halfW = (W - MARGIN * 2 - 16) / 2;
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("BILL TO", " "), MARGIN + 16, cursor + 16);
  doc.setFontSize(11.5);
  const contactName = (primaryContact?.name || "Valued Customer").toUpperCase();
  doc.text(fitLine(doc, contactName, halfW - 20), MARGIN + 16, cursor + 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(50);
  doc.text(fitLine(doc, company?.company_name || "—", halfW - 20), MARGIN + 16, cursor + 50);
  doc.setFontSize(9);
  let by = cursor + 66;
  const mobile = primaryContact?.phone || primaryContact?.mobile || "";
  const email = primaryContact?.email || "";
  const address = company?.address || [company?.state, company?.country].filter(Boolean).join(", ");
  if (mobile) by = drawLabelValue(doc, "Mobile :-", mobile, MARGIN + 16, by, halfW - 20);
  if (email) by = drawLabelValue(doc, "Email :-", email, MARGIN + 16, by, halfW - 20);
  if (address) drawLabelValue(doc, "Address :-", address, MARGIN + 16, by, halfW - 20);

  // Subject box
  const subX = MARGIN + halfW + 16;
  doc.setFillColor(...PINK_TINT); doc.rect(subX, cursor, halfW, boxH, "F");
  doc.setFillColor(...BRAND_RED); doc.rect(subX, cursor, 4, boxH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("SUBJECT", " "), subX + 16, cursor + 16);
  doc.setTextColor(...BRAND_RED); doc.setFontSize(11);
  const subj = q.subject || `Offer as per your enquiry`;
  const subjLines = doc.splitTextToSize(subj, halfW - 24) as string[];
  doc.text(subjLines.slice(0, 3), subX + 16, cursor + 34);
  cursor += boxH + 22;

  // Greeting + intro
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...BRAND_DARK);
  doc.text("Dear Sir/Madam,", MARGIN, cursor);
  cursor += 14;
  const intro = q.intro_note ||
    `Thank you for your valuable enquiry. We are pleased to submit our competitive quotation and look forward to a long-term business relationship. All equipment offered below is designed and manufactured by Rameshwar Steel Fab to industry-leading quality standards.`;
  const introLines = doc.splitTextToSize(intro, W - MARGIN * 2) as string[];
  const shownIntro = introLines.slice(0, 5);
  doc.text(shownIntro, MARGIN, cursor);
  cursor += shownIntro.length * 12 + 12;

  // Product table
  autoTable(doc, {
    startY: cursor,
    head: [["SR.", "PRODUCT DESCRIPTION", "QTY.", `AMOUNT (${currencyPrefix(currency)})`]],
    body: items.map((it, i) => {
      const specBits = [
        it.moc ? `MOC: ${it.moc}` : null,
        it.capacity ? `Capacity: ${it.capacity}` : null,
        it.motor ? `Motor: ${it.motor}` : null,
        `Qty: ${it.qty}`,
      ].filter(Boolean);
      const spec = specBits.length > 1 ? `\n${specBits.slice(0, 2).join("   |   ")}\n${specBits.slice(2).join("   |   ")}` : "";
      return [
        { content: String(i + 1), styles: { textColor: BRAND_RED, fontStyle: "bold", halign: "center" } },
        { content: `${it.product_name}${spec}`, styles: {} },
        { content: `${it.qty} NOS.`, styles: { halign: "center" } },
        { content: money(Number(it.line_total ?? it.qty * it.unit_price), currency), styles: { halign: "right", fontStyle: "bold" } },
      ];
    }),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, overflow: "linebreak" },
    headStyles: { fillColor: BRAND_DARK, textColor: 255, fontSize: 9.5, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 42, halign: "center" },
      2: { cellWidth: 60, halign: "center" },
      3: { cellWidth: 120, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid",
    didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY;

  // Totals
  const totalsBody: any[] = [[
    { content: "Sub-Total", styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
    { content: money(Number(q.subtotal || 0), currency), styles: { halign: "right", fontStyle: "bold", fillColor: SOFT_GREY } },
  ]];
  if (q.tax_mode === "cgst_sgst") {
    totalsBody.push([{ content: "CGST @ 9%", styles: { halign: "right" } }, { content: money(Number(q.cgst || 0), currency), styles: { halign: "right" } }]);
    totalsBody.push([{ content: "SGST @ 9%", styles: { halign: "right" } }, { content: money(Number(q.sgst || 0), currency), styles: { halign: "right" } }]);
  } else if (q.tax_mode === "igst") {
    totalsBody.push([{ content: "IGST @ 18%  (HSN Code: 84798910)", styles: { halign: "right" } }, { content: money(Number(q.igst || 0), currency), styles: { halign: "right" } }]);
  } else {
    totalsBody.push([{ content: "Export packing & documentation (included)", styles: { halign: "right" } }, { content: money(0, currency), styles: { halign: "right" } }]);
  }
  totalsBody.push([
    { content: spaced(isExport ? "TOTAL (FOB)" : "GRAND TOTAL", " "), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
    { content: money(Number(q.grand_total || 0), currency), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND_RED, textColor: 255, fontSize: 12 } },
  ]);
  autoTable(doc, {
    startY: cursor, body: totalsBody, theme: "grid",
    styles: { fontSize: 10, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK },
    columnStyles: { 0: { cellWidth: W - MARGIN * 2 - 150 }, 1: { cellWidth: 150, halign: "right" } },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid", didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY + 18;

  // ============ PAGE 2: Terms + Signature + Bank ============
  newPage();
  cursor = CONTENT_TOP;
  sectionHeader(doc, "TERMS & CONDITIONS", cursor);
  cursor += 24;

  const defaultDomestic: [string, string][] = [
    ["Freight", "Extra at Actual"],
    ["GST", "@ 18% extra with HSN Code: 84798910"],
    ["Payment", q.payment_terms || "50% advance with commercial order; 50% against Proforma Invoice before dispatch, after FAT"],
    ["Delivery", "14 working days from date of receipt of advance with commercial order"],
    ["Warranty", "24 months from date of Invoice"],
    ["Validity", `Offer valid until ${validUntil(q.quote_date, q.validity_days)}`],
  ];
  const defaultExport: [string, string][] = [
    ["Incoterms", "FOB Mundra Port, India (Incoterms 2020). CIF / CFR available on request."],
    ["Export Packing", "Sea-worthy export packing in wooden crates with fumigation certificate (ISPM-15)."],
    ["Payment", q.payment_terms || "30% advance with order; 70% against copy of shipping documents via bank / TT."],
    ["Delivery", "6-8 weeks from receipt of advance and technical clearance."],
    ["Shipping Documents", "Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, Fumigation Certificate."],
    ["Warranty", "18 months from date of Bill of Lading against manufacturing defects."],
    ["Installation", "Buyer to arrange VISA, boarding/lodging and travel of RSF supervision engineer(s)."],
    ["Taxes & Duties", "All import duties, VAT and local taxes in destination country to buyer's account."],
    ["Validity", `Offer valid until ${validUntil(q.quote_date, q.validity_days)}`],
  ];
  const customTerms: [string, string][] = Array.isArray(q.terms_json)
    ? (q.terms_json as any[]).map(t => [String(t.title || ""), String(t.body || "")] as [string, string]).filter(([t, b]) => t || b)
    : [];
  const termsRows = customTerms.length ? customTerms : (isExport ? defaultExport : defaultDomestic);

  autoTable(doc, {
    startY: cursor, body: termsRows, theme: "grid",
    styles: { fontSize: 10, cellPadding: 7, lineColor: BORDER_GREY, lineWidth: 0.5, textColor: BRAND_DARK, valign: "middle", overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 130, fontStyle: "bold", fillColor: SOFT_GREY }, 1: { cellWidth: W - MARGIN * 2 - 130 } },
    margin: { left: MARGIN, right: MARGIN, top: HEADER_BOTTOM, bottom: FOOTER_TOP + 8 },
    rowPageBreak: "avoid", didDrawPage: paintChrome,
  });
  cursor = (doc as any).lastAutoTable.finalY + 18;

  cursor = ensure(60, cursor);
  doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(...BRAND_DARK);
  const closing = "We trust the above offer meets your requirements. Kindly confirm your order at the earliest to ensure timely delivery. We assure you of our best quality and services at all times.";
  const cLines = doc.splitTextToSize(closing, W - MARGIN * 2) as string[];
  doc.text(cLines, MARGIN, cursor);
  cursor += cLines.length * 13 + 16;

  cursor = ensure(130, cursor);
  doc.setDrawColor(...BRAND_RED); doc.setLineWidth(1);
  doc.line(MARGIN, cursor, W - MARGIN, cursor);
  cursor += 18;

  // Signature (Sales Engineer)
  const sigColW = (W - MARGIN * 2 - 20) / 2;
  doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(...TEXT_GREY);
  doc.text("With warm regards,", MARGIN, cursor);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BRAND_DARK);
  const seName = (q.sales_engineer_name || "Sales Team").toUpperCase();
  doc.text(fitLine(doc, seName, sigColW), MARGIN, cursor + 20);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...BRAND_RED);
  doc.text("Sales Engineer", MARGIN, cursor + 36);
  doc.setTextColor(...BRAND_DARK);
  doc.text("RAMESHWAR STEEL FAB", MARGIN, cursor + 50);
  let sy = cursor + 64;
  if (q.sales_engineer_phone) { doc.text(`M: ${q.sales_engineer_phone}`, MARGIN, sy); sy += 14; }
  if (q.sales_engineer_email) { doc.text(`E: ${q.sales_engineer_email}`, MARGIN, sy); }

  // Bank details box
  const bx = MARGIN + sigColW + 20;
  const bkH = 100;
  doc.setFillColor(...SOFT_GREY); doc.rect(bx, cursor - 12, sigColW, bkH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND_DARK);
  doc.text(spaced("BANK DETAILS", " "), bx + 12, cursor + 4);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Bank Name:  HDFC Bank", bx + 12, cursor + 24);
  doc.text("A/C Name:  Rameshwar Steel Fab", bx + 12, cursor + 40);
  doc.text("A/C No.:  XXXXXXXXXXXX", bx + 12, cursor + 56);
  doc.text("IFSC:  HDFC0XXXXXX", bx + 12, cursor + 72);

  // Finalise page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(i, total); }

  doc.save(`${q.quote_no || "Quotation"}.pdf`);
}

function sectionHeader(doc: jsPDF, title: string, y: number) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_RED); doc.rect(MARGIN, y, 4, 18, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BRAND_DARK);
  doc.text(spaced(title, " "), MARGIN + 12, y + 14);
  doc.setDrawColor(...BORDER_GREY); doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 20, W - MARGIN, y + 20);
}
