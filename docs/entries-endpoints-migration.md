# SnapVault Frontend Migration: Split Upload Endpoints

This guide explains how to migrate from the old mixed upload endpoint to the new dedicated endpoints for binaries, text, and links.

## TL;DR
- Old: `POST /api/items/upload` with a `kind` switch (multipart form).
- New:
  - `POST /api/entries/binaries` (multipart)
  - `POST /api/entries/text` (JSON)
  - `POST /api/entries/link` (JSON)

No backend schema changes are required. The backend persists data to the same Supabase tables/relations.

---

## 1) Binary uploads
- Endpoint: `POST /api/entries/binaries`
- Content-Type: `multipart/form-data`
- Form fields:
  - `file` (required): The file input
  - `filename` (optional): Custom filename; defaults to the uploaded file’s original name
  - `description` (optional): Description saved on the entry

Example (fetch):
```js
const form = new FormData();
form.append('file', file); // File | Blob
form.append('filename', desiredName); // optional
form.append('description', desc); // optional

const res = await fetch('/api/entries/binaries', {
  method: 'POST',
  body: form,
  credentials: 'include',
});
const data = await res.json();
```

Example (cURL):
```bash
curl -X POST \
  -F "file=@/path/to/file.png" \
  -F "filename=my-file.png" \
  -F "description=Optional description" \
  http://localhost:8080/api/entries/binaries
```

Sample response:
```json
{
  "entryId": 123,
  "binarySourceId": 456,
  "bucket": "sv-dev-temp",
  "path": "items/my-file.png",
  "publicUrl": "https://<supabase-url>/storage/v1/object/public/sv-dev-temp/items/my-file.png",
  "description": "Optional description"
}
```

---

## 2) Text entries
- Endpoint: `POST /api/entries/text`
- Content-Type: `application/json`
- JSON body:
  - `title` (optional)
  - `description` (optional)
  - `content` (required)
  - `contentFormat` (optional; default `plain`; accepted: `plain`, `markdown`, `html`)

Example (fetch):
```js
const res = await fetch('/api/entries/text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My note',
    description: 'A quick note',
    content: '# Hello',
    contentFormat: 'markdown',
  }),
  credentials: 'include',
});
const data = await res.json();
```

Example (cURL):
```bash
curl -X POST http://localhost:8080/api/entries/text \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "My note",
    "description": "A quick note",
    "content": "# Hello",
    "contentFormat": "markdown"
  }'
```

Sample response:
```json
{ "entryId": 201, "textBodyId": 302 }
```

---

## 3) Link entries
- Endpoint: `POST /api/entries/link`
- Content-Type: `application/json`
- JSON body:
  - `title` (optional)
  - `description` (optional)
  - `url` (required)
  - `faviconUrl` (optional)

Example (fetch):
```js
const res = await fetch('/api/entries/link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'JetBrains',
    description: 'Homepage',
    url: 'https://www.jetbrains.com',
    faviconUrl: 'https://www.jetbrains.com/favicon.ico',
  }),
  credentials: 'include',
});
const data = await res.json();
```

Example (cURL):
```bash
curl -X POST http://localhost:8080/api/entries/link \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "JetBrains",
    "description": "Homepage",
    "url": "https://www.jetbrains.com",
    "faviconUrl": "https://www.jetbrains.com/favicon.ico"
  }'
```

Sample response:
```json
{ "entryId": 501, "linkTargetId": 601, "url": "https://www.jetbrains.com" }
```

---

## Error handling
- HTTP 400 is returned when required fields are missing:
  - `file` for binaries
  - `content` for text
  - `url` for links
- Other server-side errors return HTTP 500 with a message.

## CORS
- No frontend changes required for CORS; backend is configured to allow `http://localhost:3000` and typical methods/headers.

## Migration checklist
- [ ] Replace `POST /api/items/upload` usages with one of:
  - [ ] `POST /api/entries/binaries` (multipart)
  - [ ] `POST /api/entries/text` (JSON)
  - [ ] `POST /api/entries/link` (JSON)
- [ ] Remove `kind` from frontend payloads; each endpoint implies its type.
- [ ] For file uploads, send multipart fields: `file`, optional `filename`, `description`.
- [ ] For text entries, send JSON: `content` (required), optional `title`, `description`, `contentFormat`.
- [ ] For link entries, send JSON: `url` (required), optional `title`, `description`, `faviconUrl`.
- [ ] Update any API client typings/interfaces to reflect the new response shapes above.
- [ ] Listing and delete endpoints under `/api/items` remain unchanged.

## Decommission plan (optional)
- Phase 1: Keep `/api/items/upload` available for a short migration window or return `410 Gone` with pointers to new endpoints.
- Phase 2: Remove `/api/items/upload` after frontend releases are fully deployed.
