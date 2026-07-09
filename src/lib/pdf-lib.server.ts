// Static server-only re-export so Vite bundles pdf-lib with proper CJS/ESM interop
// (dynamic `import("pdf-lib")` from a shared *.functions.ts module was producing
// "Cannot destructure property '__extends' of '__toESM(...).default' as it is undefined").
export { PDFDocument, StandardFonts, rgb } from "pdf-lib";
