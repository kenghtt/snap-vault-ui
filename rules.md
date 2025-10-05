## ✅ Preview these (high-value, common, lightweight)

### **Images / Screenshots**

- **JPG / JPEG, PNG, GIF, WebP, BMP**

- Why: 80%+ of what people dump will be screenshots or images.

- How: Thumbnail → lightbox/zoom preview. (GIFs can loop inline.)


### **PDFs**

- Show first page (or full doc for small ones).

- How: use a PDF viewer (e.g., PDF.js / react-pdf) or Google Drive preview link.

- Why: Receipts, statements, docs — very common.


### **Text-based**

- **TXT, MD, LOG, JSON, CSV (small)**

- Why: Notes, snippets, configs, order numbers.

- How: Inline render with monospace font + “Copy” button. For CSV/JSON, optionally a small table/pretty print.


### **Links**

- Any URL saved as an item.

- Show favicon + page title + description/OG image.

- How: Like Slack/Discord unfurl.

- Why: Users often stash Amazon product links, YouTube videos, docs.


### **Audio/Video (short/common formats)**

- **MP3, MP4, WebM, MOV** (short clips only).

- How: inline HTML5 `<audio>` or `<video>`.

- Why: Voice memos, quick clips.

- Limitations: Don’t try to handle huge media libraries.


---

## ⚠️ Maybe preview later (optional / power-user value)

- **DOCX, XLSX, PPTX (Office)**

    - Option 1: convert to PDF for preview.

    - Option 2: “Open in Google Docs/Sheets/Slides.”

    - Why: nice to have, but heavier. MVP can just download.

- **Markdown / Code (JS, PY, etc.)**

    - Syntax-highlight preview later if power users want it.

- **HEIC (iPhone photos)**

    - Convert to JPG on upload.


---

## ❌ Don’t preview (just show as file icon + download/open)

- **ZIP, RAR, TAR.GZ, 7z** → archives

- **EXE, DMG, APK** → executables (security risk, useless to preview)

- **Large binaries (ISO, PSD, AI, CAD, etc.)**

- **Encrypted files / Unknown formats**


👉 Just show: file icon + extension label + “Download / Open in original app.”

---

## ✨ Rule of Thumb

- **Preview when it’s “glanceable”** → Images, PDFs, Text, Links, Short Media.

- **Skip preview when it’s “workable” only in its own app** → Archives, executables, huge binaries, special formats.


---

✅ **Bottom line for MVP:**  
Support previews for **Images, PDFs, Text/CSV, Links, Short Audio/Video**.  
Everything else = show metadata + download button.

That covers ~90% of real-world “quick dump” use cases (screenshots, receipts, docs, links, snippets).
