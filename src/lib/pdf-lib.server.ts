// Static server-only re-export. Vite aliases `pdf-lib` to the bundled ESM build
// so PDF generation does not hit the tslib/__extends interop crash in production.
export { PDFDocument, StandardFonts, rgb } from "pdf-lib";
