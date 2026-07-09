import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney } from "./crm";

export function generateQuotationPDF(q: any, items: any[], company: any | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const RED: [number, number, number] = [192, 39, 45];
  const CHAR: [number, number, number] = [30, 30, 30];

  // Red header band
  doc.setFillColor(...RED);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(20);
  doc.text("RAMESHWAR STEEL FAB", 40, 32);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("Soap • Detergent • LABSA • Steel Fabrication", 40, 48);
  doc.text("GSTIN: 24AAACR1234A1Z5  |  info@rsfab.in  |  +91 98765 43210", 40, 60);

  doc.setTextColor(...CHAR);
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("QUOTATION", W - 40, 95, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`No: ${q.quote_no}`, W - 40, 112, { align: "right" });
  doc.text(`Date: ${q.quote_date}`, W - 40, 126, { align: "right" });
  doc.text(`Validity: ${q.validity_days} days`, W - 40, 140, { align: "right" });

  // Bill to
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("BILL TO", 40, 100);
  doc.setFont("helvetica", "normal").setFontSize(10);
  const billLines = [
    company?.company_name || "—",
    company?.address || "",
    [company?.state, company?.country].filter(Boolean).join(", "),
    company?.gstin ? `GSTIN: ${company.gstin}` : "",
  ].filter(Boolean);
  billLines.forEach((l, i) => doc.text(l, 40, 116 + i * 13));

  // Items
  autoTable(doc, {
    startY: 175,
    head: [["#", "Product / Description", "Qty", "Unit Price", "Amount"]],
    body: items.map((it, i) => [
      i + 1,
      it.product_name,
      String(it.qty),
      fmtMoney(it.unit_price, q.currency),
      fmtMoney(it.line_total, q.currency),
    ]),
    theme: "striped",
    headStyles: { fillColor: RED, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      2: { halign: "right", cellWidth: 50 },
      3: { halign: "right", cellWidth: 90 },
      4: { halign: "right", cellWidth: 90 },
    },
  });

  const y = (doc as any).lastAutoTable.finalY + 15;
  const labelX = W - 200;
  const valX = W - 40;
  doc.setFontSize(10);
  doc.text("Subtotal", labelX, y);
  doc.text(fmtMoney(q.subtotal, q.currency), valX, y, { align: "right" });
  let yy = y + 15;
  if (q.tax_mode === "cgst_sgst") {
    doc.text("CGST", labelX, yy); doc.text(fmtMoney(q.cgst, q.currency), valX, yy, { align: "right" }); yy += 15;
    doc.text("SGST", labelX, yy); doc.text(fmtMoney(q.sgst, q.currency), valX, yy, { align: "right" }); yy += 15;
  } else if (q.tax_mode === "igst") {
    doc.text("IGST", labelX, yy); doc.text(fmtMoney(q.igst, q.currency), valX, yy, { align: "right" }); yy += 15;
  } else {
    doc.text("Export — No GST", labelX, yy); doc.text("—", valX, yy, { align: "right" }); yy += 15;
  }
  doc.setDrawColor(...RED); doc.setLineWidth(1);
  doc.line(labelX - 10, yy, valX, yy);
  yy += 15;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("GRAND TOTAL", labelX, yy);
  doc.text(fmtMoney(q.grand_total, q.currency), valX, yy, { align: "right" });

  // Terms
  yy += 40;
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("Payment Terms", 40, yy);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(q.payment_terms || "50% advance, 50% before dispatch", 40, yy + 14, { maxWidth: W - 80 });

  yy += 50;
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("Bank Details", 40, yy);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("Account Name: Rameshwar Steel Fab   |   A/c No: 000000000000   |   IFSC: HDFC0000000   |   Bank: HDFC Bank", 40, yy + 14);

  // Footer
  doc.setFontSize(8).setTextColor(120);
  doc.text("This is a computer-generated quotation. E&OE.", W / 2, 820, { align: "center" });

  doc.save(`${q.quote_no}.pdf`);
}
