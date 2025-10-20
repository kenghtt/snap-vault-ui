# Frontend Implementation Guide — /preview and /download (Backend is Live)

Last updated: 2025-10-17 20:11 local

Status for UI team: The backend is complete, deployed, and live with the new preview and download flow. Please start implementing the frontend changes below to consume these services.

---

## What Changed in the Backend (Summary for Frontend)

- Added two new user-scoped endpoints under /api/entries:
  - GET /api/entries/{uuid}/preview — best-effort inline preview with smart rules
  - GET /api/entries/{uuid}/download — force download of the original asset
- Ownership enforced on every request using the Supabase user JWT (Authorization: Bearer <token>):
  - If you don’t own the entry or the token is invalid/expired, you’ll see 404 or 401 (404 preferred to avoid probing).
- Preview behavior by type:
  - Text entries: returns 200 OK inline with Content-Type text/* and header X-Preview-Truncated: true|false (64 KiB cap)
  - Binary entries (images, PDFs): will 302 redirect to a short-lived signed URL for a generated thumbnail (w2048) when available; otherwise may redirect to small originals (≤ 5 MiB); else 204 No Content with X-Preview-Available: false and X-Download-URL
  - Links: not previewable → 204 No Content with X-Preview-Available: false and X-Download-URL
- Download behavior by type:
  - Binary entries: 302 redirect to a signed URL with Content-Disposition=attachment; filename="<safe>"
  - Text entries: 200 OK with full text and Content-Disposition attachment (no signed URL)
- Signed URL TTL: ~60 seconds. Do not cache or persist these URLs; request fresh URLs per interaction.
- CORS: EntriesController allows origin http://localhost:3000 (adjust your local dev origin accordingly). In production, ensure your app’s origin is allowed.
- Headers you should handle:
  - From /preview (text): X-Preview-Truncated: true|false, Cache-Control: private, max-age=60
  - From /preview (not previewable): X-Preview-Available: false, X-Download-URL: /api/entries/{uuid}/download
  - From any 302 from backend: Cache-Control: no-store; follow the Location URL

Backend internals worth knowing (no action required by UI):
- BinarySource now includes thumbnail metadata (thumb_w2048_path, thumb_generated_at).
- Thumbnails are generated at upload when appropriate; else preview may fall back to small originals or show “no preview”.
- SupabaseStorageService mints signed URLs per request and selects inline vs attachment based on endpoint.

---

## Endpoints You Need to Call

1) GET /api/entries/{uuid}/preview when the user selects an item from the search result
- Purpose: Show the fastest, safe representation for a preview modal/lightbox.
- Auth: Required — Authorization: Bearer <Supabase user JWT>
- Responses:
  - 200 OK (inline bytes - show the picture/screenshot/image/pdf etc inline how it currently already does and use the appropriate modal to render the image vieable)
    - Text preview up to 64 KiB
    - Content-Type for text may be: text/plain; charset=UTF-8, text/markdown; charset=UTF-8, or text/html; charset=UTF-8 (based on stored format)
    - Header: X-Preview-Truncated: true|false
  - 302 Found (Location: <signed url>)
    - For thumbnails and some originals; Location points to short-lived signed URL. Browser should follow.
  - 204 No Content (not previewable) - when not previewable, front end should show folder 
    - Headers: X-Preview-Available: false, X-Download-URL: /api/entries/{uuid}/download
  - 401/404 in auth/ownership errors

2) GET /api/entries/{uuid}/download when user clicks the download icon to which it will download to the browser into the user's downloads folder (there should be a download icon top right of the preview modal )
- Purpose: Force save to user’s disk for any entry.
- Auth: Required — Authorization: Bearer <Supabase user JWT>
- Responses:
  - 302 Found with Location to signed URL for binaries (attachment; filename="...")
  - 200 OK inline body for text with Content-Disposition: attachment; filename="..."
  - 401/404 in auth/ownership errors


Notes:
- These endpoints are under /api/entries — see also existing search and upload endpoints.
- Signed URLs expire quickly (~60s). Always fetch at click-time.

---

## Frontend Integration Tasks (Action Items)

- Auth
  - Ensure all calls include Authorization: Bearer <Supabase user JWT>.
  - Handle 401 by prompting re-auth/refresh token.
- Preview Modal/Lightbox
  - For a selected search hit, call GET /api/entries/{uuid}/preview.
  - Handle the three outcome shapes:
    - 200 OK: 
      - if type is text, use the text and render it how it already does currently
      - If type is image or pdf, render directly in the ImagePreviewModal/PdfPreviewModal component (already existing today)
    - 302 Found: Follow the redirect automatically. For <img> or <object> tags, you can simply set src to the API endpoint and let the browser follow redirects to the signed URL. Alternatively, prefetch the Location, but note TTL.
    - 204 No Content: Show a “No preview available” placeholder with a Download button wired to X-Download-URL. (make sure this is implemented, all previews should contain this download icon and should actually download it into their browser)
  - Accessibility: Ensure keyboard and screen-reader support for modal interactions.
- Download Button
  - For any entry, use GET /api/entries/{uuid}/download. This button should be available top right of every preview modal, and should download through the browser into the users download folder on their machine
  - Let the browser follow 302 to the signed URL; download should start automatically.
- “View full content” for text
  - If preview was truncated, decide on a UI path:
    - Option A: Reuse preview endpoint to show more (still capped at 64 KiB). Not ideal for large text.
    - Option B: Introduce a dedicated content route in UI that calls a fuller endpoint when added. For now, use download to get full text as a file.
- Search result item affordances
  - If backend search payload includes previewable: true|false (as spec’d), you can enable hover/quick preview affordances. If not yet wired, still call /preview at click-time.
- Caching and URL Lifetimes
  - Do not store signed URLs in state for long. Treat them as ephemeral (≈60s).
  - If a preview URL expires, simply re-call /preview.
- Error handling
  - 401 → prompt login.
  - 404 → show not found. This can also mean “not owned”; don’t differentiate in UI.
  - Other 4xx/5xx → toast + retry affordance.

---

## Example Integration Patterns

1) Image/PDF preview tag (simplest)

```html
<!-- The browser will follow 302 to the signed URL automatically -->
<img alt="preview" src="/api/entries/${uuid}/preview" />
<!-- or for PDFs/images -->
<object data="/api/entries/${uuid}/preview" type="application/pdf" width="100%" height="600"></object>
```

If your app requires attaching Authorization headers manually, you cannot rely on simple tag navigation for protected endpoints. In that case, either:
- Use a token-attached fetch to retrieve a blob when 200 OK (text/image) and set an object URL, or
- Call /preview to get a 302, then programmatically navigate the browser to the Location (window.location = locationUrl) which won’t include your Authorization header but goes directly to the signed URL (public for the TTL). For iframes/objects, updating src is fine.

2) Fetch with handling 200/302/204

- This is just an example, use appropriate way according to what the app is already using 
```ts
async function loadPreview(uuid: string, token: string) {
  const res = await fetch(`/api/entries/${uuid}/preview`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual' // prevent auto-follow to inspect 302
  });

  if (res.status === 200) {
    const ct = res.headers.get('Content-Type') || '';
    const truncated = res.headers.get('X-Preview-Truncated') === 'true';
    if (ct.startsWith('text/')) {
      const text = await res.text();
      return { kind: 'text', truncated, text, contentType: ct } as const;
    }
    const blob = await res.blob();
    return { kind: 'blob', blob, contentType: ct } as const;
  }

  if (res.status === 302) {
    const loc = res.headers.get('Location');
    if (!loc) throw new Error('Redirect missing Location');
    return { kind: 'redirect', url: loc } as const;
  }

  if (res.status === 204) {
    const dl = res.headers.get('X-Download-URL');
    return { kind: 'nopreview', downloadUrl: dl ?? '' } as const;
  }

  if (res.status === 401) throw new Error('Unauthorized');
  if (res.status === 404) throw new Error('Not found');
  throw new Error(`Unexpected status ${res.status}`);
}
```

3) Download click handler

```ts
function startDownload(uuid: string) {
  // Navigating the browser to the API endpoint lets it follow 302 to the signed URL
  window.location.href = `/api/entries/${uuid}/download`;
}
```

If you must attach Authorization explicitly (e.g., when your API is on a different origin without cookies), use fetch with redirect: 'follow' and then programmatically open the final URL.

---

## UI/UX Guidance

- Prefer to use existing preview modal components
- Show a subtle indicator when a text preview is truncated; provide a clear Download action for the full content.
- For non-previewable binaries, show a recognizable placeholder (file type icon) with a single primary Download CTA.
- Remember that preview URLs expire fast; implement re-fetch on expiration.

---

## Migration Checklist for Frontend

- [ ] Use Authorization: Bearer <Supabase user JWT> on /api/entries calls
- [ ] Use existing preview modals that shows results from /api/entries/{uuid}/preview
- [ ] Support 200/302/204 branches with appropriate UI
- [ ] Wire Download button to /api/entries/{uuid}/download
- [ ] Render text previews and honor X-Preview-Truncated
- [ ] Render image/pdf when returned inline or after redirect
- [ ] Handle 401/404/5xx with consistent UX
- [ ] Avoid caching or persisting signed URLs beyond the session interaction
- [ ] Adjust local dev origin to http://localhost:3000 or match backend CORS config
- [ ] All preview modals should contain a download icon at the top right of the modal
- [ ] For items that are not able to be previewed, instead show folder icon and a Download button top right which . Also display the file name and type along witt upload date and file size
---

## Reference: Backend Behavior Details

- Controller: EntriesController (@RequestMapping("/api/entries"))
- /preview
  - Text: up to 64 KiB, content type reflects stored format (plain/markdown/html). Sets X-Preview-Truncated.
  - Binary: determines previewability by MIME: image/* or application/pdf; excludes SVG. If thumbnail exists → 302 to signed thumb. If small original (≤ 5 MiB) → 302 to signed original. Else 204 with X-Preview-Available: false and X-Download-URL.
  - Links: 204 with X-Preview-Available: false and X-Download-URL.
  - Ownership: non-owner → 404; invalid token → 401.
- /download
  - Binary: 302 to signed original with Content-Disposition attachment and safe filename.
  - Text: 200 OK body with Content-Disposition attachment; Content-Type text/plain.
  - Ownership: same as above.
- Signed URL TTL: ~60 seconds.

---
