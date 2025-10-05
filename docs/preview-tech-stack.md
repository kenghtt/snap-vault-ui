# Preview Tech Stack Recommendations

This document maps the preview requirements from `rules.md` to actively maintained, production‑ready open‑source repositories you can use. The goal is to cover the MVP: Images, PDFs, Text/CSV/JSON, Links, and short Audio/Video clips. Everything else should show metadata + a download button.

Last reviewed: 2025-10-04

Note: Activity status is based on public indicators (stars, issues, releases) and long‑term maintenance history. Always check the repo’s README and changelog for the latest status before pinning a dependency.


## Images / Screenshots (JPG/PNG/GIF/WebP/BMP)
- yet-another-react-lightbox (https://github.com/igordanchenko/yet-another-react-lightbox)
  - Modern, actively maintained lightbox with zoom, thumbnails, and plugins.
  - Great DX, tree‑shakeable, works well with Next/Vite.
- react-medium-image-zoom (https://github.com/rpearce/react-medium-image-zoom)
  - Simple click‑to‑zoom experience. Lightweight and stable.
- Optional helpers
  - file-type (browser) (https://github.com/sindresorhus/file-type)
    - Detect file MIME/extension from binary when the type is missing or unreliable.

How to implement: Render thumbnails in the list and open a lightbox on click. For GIFs, allow inline playback.


## PDFs
- react-pdf (https://github.com/diegomura/react-pdf)
  - React wrapper around PDF.js for rendering PDFs in React apps.
  - Actively maintained and widely adopted.
- pdf.js (upstream) (https://github.com/mozilla/pdf.js)
  - The underlying PDF rendering engine from Mozilla.

How to implement: For small PDFs, render pages inline; for larger, render first page with a "Open full" action.


## Text-based (TXT/MD/LOG/JSON/CSV small)
- Pretty print + syntax highlighting
  - prism-react-renderer (https://github.com/FormidableLabs/prism-react-renderer)
    - Well-maintained, SSR-friendly syntax highlighting.
  - react-syntax-highlighter (https://github.com/react-syntax-highlighter/react-syntax-highlighter)
    - Broad language support and themes.
- JSON viewer
  - react-json-view (https://github.com/mac-s-g/react-json-view)
    - Popular JSON inspector with expand/collapse.
- CSV parsing
  - PapaParse (https://github.com/mholt/PapaParse)
    - Battle-tested CSV parser; works in browsers and web workers.

How to implement: Render monospace text with Copy button. For JSON, use a collapsible tree. For small CSV, show a simple table (first N rows) parsed by PapaParse.


## Links (URL unfurl: favicon, title, description/OG image)
- Microlink (client + optional server) (https://github.com/microlinkhq/microlink)
  - Reliable link preview extraction (Open Graph, meta tags, etc.).
  - Offers both an API and libraries; OSS SDK is kept active.
- Alternative (client-only, lighter)
  - link-preview-js (https://github.com/ospfranco/link-preview-js)
    - Extracts metadata; note: some sites require a server/proxy due to CORS.

How to implement: On paste/save of a URL, call Microlink (or your proxy) to fetch metadata, cache it, and render card with favicon, title, description, and image.


## Audio/Video (short clips: MP3/MP4/WebM/MOV)
- react-player (https://github.com/CookPete/react-player)
  - Mature, highly used player supporting many sources.
  - For simple local files, native <audio>/<video> also works.

How to implement: Use native players for local files to keep bundle small; fall back to react-player when you need URL/source compatibility beyond basics.


## Optional / Later (power-user value)
- Office (DOCX/XLSX/PPTX)
  - Convert to PDF server-side for preview.
  - Candidates: Gotenberg (https://github.com/gotenberg/gotenberg) or LibreOffice in a container; expose an internal API.
- HEIC → JPG conversion (browser)
  - heic2any (https://github.com/alexcorvi/heic2any)
    - Client-side conversion to JPG/PNG; good for iPhone photos.


## Do not preview (archives, executables, huge binaries)
- Show an icon, extension label, file size, and a Download/Open button.


## Recommended minimal stack for MVP
- Images: yet-another-react-lightbox
- PDFs: react-pdf
- Text/code: prism-react-renderer (or react-syntax-highlighter)
- JSON: react-json-view
- CSV: PapaParse
- Links: Microlink (with a small server proxy if needed)
- Audio/Video: native HTML5 players; react-player if/when needed
- Detection helper: file-type (browser) to firm up MIME types

This set is actively maintained and widely used, reducing risk of referencing outdated repos while keeping the implementation lean for an early alpha.
