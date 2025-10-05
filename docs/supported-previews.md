# Currently Supported Previews (MVP as implemented)

This document lists the file types that the app can currently preview in‑app based on the existing code (ImagePreviewModal, PdfPreviewModal, TextPreviewModal) and detection logic in Home.tsx.

Last updated: 2025-10-05

## Summary
- Images: JPG/JPEG, PNG, GIF, WebP, BMP, SVG (detected via MIME `image/*` or by extension)
- PDFs: PDF files (via react‑pdf)
- Text‑like:
  - Plain text (TXT/LOG/MD and other `text/*`)
  - JSON (pretty‑printed)
  - CSV (first N rows in a simple table)

Everything else currently shows as metadata in the right sidebar (type/name/size) without an inline preview.

## Detection details (how the app decides what to open)
From `src/pages/Home.tsx`:

- PDF
  - If file MIME contains `pdf` OR name ends with `.pdf` → opens PdfPreviewModal
- Image
  - If MIME starts with `image/` OR name ends with one of: `.png .jpg .jpeg .gif .webp .bmp .svg` → opens ImagePreviewModal
- Text‑like
  - If MIME starts with `text/`
  - OR MIME contains `json` or `csv`
  - OR name ends with one of: `.txt .md .log .json .csv`
  → opens TextPreviewModal (with specialized handling for JSON/CSV)
- Pasted text snippets (not files)
  - Always open in TextPreviewModal as plain text

## Notes on current behavior
- JSON: rendered as pretty‑printed raw text (attempts to parse and indent). If parsing fails, falls back to raw text.
- CSV: rendered as a simple table with safeguards:
  - Up to 500 rows × 50 columns; shows a truncation note if exceeded.
- Plain/MD/LOG: rendered as left‑aligned text. A Wrap/No‑wrap toggle and Copy button are available.
- PDFs: opened in a modal with zoom and pagination controls.
- Images: opened in a modal with click‑to‑zoom lightbox behavior (react‑medium‑image‑zoom).

## Not implemented yet (no inline preview)
- Links (URL unfurl)
- Audio/Video players
- Office formats (DOCX/XLSX/PPTX)
- Archives (ZIP/RAR/7z/TAR.GZ) – these intentionally do not preview per rules; metadata only

For future plans and recommended libraries, see:
- rules.md → preview scope and rules
- docs/preview-tech-stack.md → library recommendations
