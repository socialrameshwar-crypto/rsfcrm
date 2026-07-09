// Client-only pdfjs loader. Never import at module scope of a route file.
// Usage: const pdfjs = await loadPdfJs();
export async function loadPdfJs() {
  const pdfjs: any = await import("pdfjs-dist");
  // Use the worker URL that ships with the package. Vite handles ?url.
  // Fallback to CDN if unavailable.
  try {
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

/** Render every page of a PDF (from a File or ArrayBuffer) into PNG data URLs. */
export async function renderPdfToPngs(
  source: File | ArrayBuffer,
  opts: { scale?: number; maxPages?: number } = {},
): Promise<{ pages: string[]; pageSizes: Array<{ width: number; height: number }> }> {
  const pdfjs = await loadPdfJs();
  const data = source instanceof File ? await source.arrayBuffer() : source;
  const doc = await pdfjs.getDocument({ data }).promise;
  const scale = opts.scale ?? 1.5;
  const maxPages = Math.min(opts.maxPages ?? 8, doc.numPages);
  const pages: string[] = [];
  const pageSizes: Array<{ width: number; height: number }> = [];
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.push(canvas.toDataURL("image/png"));
    const vp1 = page.getViewport({ scale: 1 });
    pageSizes.push({ width: vp1.width, height: vp1.height });
  }
  return { pages, pageSizes };
}

/** Render only page 1 as a compact thumbnail data URL (JPEG). */
export async function renderPdfThumbnail(source: File | ArrayBuffer, maxWidth = 400): Promise<string> {
  const pdfjs = await loadPdfJs();
  const data = source instanceof File ? await source.arrayBuffer() : source;
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(2, maxWidth / vp1.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}
