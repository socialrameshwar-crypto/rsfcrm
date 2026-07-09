import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

export const TEMPLATE_PDF_BUCKET = "template-pdfs";

/** Coordinates are in PDF points (72dpi), origin bottom-left as PDF convention. */
export interface OverlayField {
  id: string;
  page: number;         // 1-based
  token: string;        // e.g. "customer_name"
  label: string;        // human label
  /** x,y are the top-left of the drawable box, in PDF points, measured from the TOP of the page (editor-friendly). We convert on export. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  color?: string;       // hex #rrggbb
  defaultValue?: string;
  /** When true, cover the area with a white rectangle first (blank out original text). */
  whiteout?: boolean;
}

export interface PdfTemplateMeta {
  mode: "pdf_overlay";
  source_pdf_url: string;   // storage path inside template-pdfs bucket
  source_pdf_pages: number;
  overlays: OverlayField[];
}

export interface UploadedPdf {
  storagePath: string;
  pages: number;
  bytes: Uint8Array;
}

/** Upload a PDF file to the template-pdfs bucket, path scoped to the current user. */
export async function uploadTemplatePdf(file: File): Promise<UploadedPdf> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const bytes = new Uint8Array(await file.arrayBuffer());

  // count pages up front
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPageCount();

  const path = `${userData.user.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(TEMPLATE_PDF_BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { storagePath: path, pages, bytes };
}

/** Signed URL (private bucket). Cached for performance. */
const urlCache = new Map<string, { url: string; expires: number }>();
export async function getTemplatePdfUrl(storagePath: string): Promise<string> {
  const cached = urlCache.get(storagePath);
  if (cached && cached.expires > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage
    .from(TEMPLATE_PDF_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data) throw new Error(error?.message || "Failed to sign PDF URL");
  urlCache.set(storagePath, { url: data.signedUrl, expires: Date.now() + 3600_000 });
  return data.signedUrl;
}

export async function fetchTemplatePdfBytes(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(TEMPLATE_PDF_BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message || "Failed to download template PDF");
  return new Uint8Array(await data.arrayBuffer());
}

/** Render a specific PDF page to a data URL for the editor canvas. */
export async function renderPdfPage(
  bytesOrUrl: Uint8Array | string,
  pageNumber: number,
  scale = 1.5,
): Promise<{ dataUrl: string; widthPt: number; heightPt: number; widthPx: number; heightPx: number }> {
  const loadingTask = typeof bytesOrUrl === "string"
    ? pdfjsLib.getDocument({ url: bytesOrUrl })
    : pdfjsLib.getDocument({ data: bytesOrUrl });
  const doc = await loadingTask.promise;
  try {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");
    // pdfjs v6 requires `canvas` in render params
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    const dataUrl = canvas.toDataURL("image/png");
    const ptViewport = page.getViewport({ scale: 1 });
    return {
      dataUrl,
      widthPt: ptViewport.width,
      heightPt: ptViewport.height,
      widthPx: canvas.width,
      heightPx: canvas.height,
    };
  } finally {
    try { await (doc as any).destroy?.(); } catch { /* noop */ }
  }
}

/** Look up total pages without rendering. */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [0, 0, 0];
  const m = hex.replace("#", "");
  const int = parseInt(m.length === 3 ? m.split("").map(c => c + c).join("") : m, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

/** Stamp overlay values onto the source PDF and return the merged PDF bytes. */
export async function stampPdfOverlay(
  sourceBytes: Uint8Array,
  overlays: OverlayField[],
  values: Record<string, string>,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  for (const f of overlays) {
    const page = pages[f.page - 1];
    if (!page) continue;
    const { height: pageH } = page.getSize();
    const font = f.bold ? helvBold : helv;
    const raw = values[f.token] ?? f.defaultValue ?? "";
    // convert editor top-left origin to pdf bottom-left origin
    const boxYBottom = pageH - f.y - f.height;

    if (f.whiteout) {
      page.drawRectangle({
        x: f.x, y: boxYBottom, width: f.width, height: f.height,
        color: rgb(1, 1, 1), borderWidth: 0, rotate: degrees(0),
      });
    }
    if (!raw) continue;

    const [r, g, b] = hexToRgb(f.color);
    const lines = wrapText(String(raw), f.width, font, f.fontSize);
    const lineHeight = f.fontSize * 1.2;
    let cursorY = pageH - f.y - f.fontSize; // baseline of first line
    for (const line of lines) {
      const w = font.widthOfTextAtSize(line, f.fontSize);
      let drawX = f.x;
      if (f.align === "center") drawX = f.x + (f.width - w) / 2;
      else if (f.align === "right") drawX = f.x + f.width - w;
      page.drawText(line, {
        x: drawX,
        y: cursorY,
        size: f.fontSize,
        font,
        color: rgb(r, g, b),
      });
      cursorY -= lineHeight;
      if (cursorY < pageH - f.y - f.height) break;
    }
  }

  return await pdf.save();
}

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const out: string[] = [];
  for (const p of paragraphs) {
    if (!p) { out.push(""); continue; }
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const candidate = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** Convert a stamped PDF into a Blob URL for preview. */
export function pdfBytesToBlobUrl(bytes: Uint8Array): string {
  // Copy into a fresh ArrayBuffer so no ambiguity with SharedArrayBuffer typing
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

/** Common dynamic tokens available in proposals. */
export const OVERLAY_TOKENS: { token: string; label: string }[] = [
  { token: "customer_name", label: "Customer name" },
  { token: "company_name", label: "Company name" },
  { token: "contact_person", label: "Contact person" },
  { token: "email", label: "Email" },
  { token: "mobile", label: "Mobile" },
  { token: "address", label: "Address" },
  { token: "country", label: "Country" },
  { token: "proposal_number", label: "Proposal number" },
  { token: "date", label: "Date" },
  { token: "valid_until", label: "Valid until" },
  { token: "product", label: "Product" },
  { token: "capacity", label: "Capacity" },
  { token: "automation", label: "Automation" },
  { token: "material", label: "Material" },
  { token: "currency", label: "Currency" },
  { token: "subtotal", label: "Subtotal" },
  { token: "tax", label: "Tax" },
  { token: "grand_total", label: "Grand total" },
  { token: "sales_engineer", label: "Sales engineer" },
  { token: "custom_1", label: "Custom 1" },
  { token: "custom_2", label: "Custom 2" },
  { token: "custom_3", label: "Custom 3" },
];
