# Backend request details from the frontend

This document shows exactly what the frontend sends to the backend for protected API calls, including headers and example request bodies for each endpoint used in the app.

Environment variables influencing requests
- VITE_API_BASE_URL: Base URL prepended to relative API paths (e.g., http://localhost:8080)
- VITE_LOG_API: If set to true or 1, the app logs outgoing request method, URL, headers, and a safe summary of the body to the browser console for debugging.

Shared behavior (all protected requests)
- Authorization header is attached automatically using the Supabase access token from the current session.
  - Authorization: Bearer <access_token>
- Content-Type header:
  - For JSON requests, the code sets Content-Type: application/json (unless you override it).
  - For multipart/form-data requests, Content-Type is NOT set manually; the browser assigns it with the proper boundary.
- On a 401 response, the frontend attempts a one-time session refresh and retries once with a fresh token. A second 401 results in an error shown to the user and logged (if VITE_LOG_API is enabled).

Inspecting runtime requests (optional)
- Add VITE_LOG_API=true to your .env.local and restart dev server.
- The console will show entries like:
  [apiFetch] → { method, url, headers, body }
- For FormData, the log includes a list of fields with size/type, not the full binary contents.

Endpoints and example requests

1) Create a text entry
- Method/Path: POST /api/entries/text
- Headers:
  - Authorization: Bearer <access_token>
  - Content-Type: application/json
- Example JSON body:
  {
    "title": "My note title",
    "description": "Optional description",
    "content": "Hello world",
    "contentFormat": "plain"
  }
- Example cURL (replace base URL as needed):
  curl -i \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{
      "title": "My note title",
      "description": "Optional description",
      "content": "Hello world",
      "contentFormat": "plain"
    }' \
    "$API_BASE_URL/api/entries/text"

2) Create a link entry
- Method/Path: POST /api/entries/link
- Headers:
  - Authorization: Bearer <access_token>
  - Content-Type: application/json
- Example JSON body:
  {
    "title": "A link",
    "description": "Optional",
    "url": "https://example.com"
  }
- Example cURL:
  curl -i \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{
      "title": "A link",
      "description": "Optional",
      "url": "https://example.com"
    }' \
    "$API_BASE_URL/api/entries/link"

3) Upload a binary (file) entry
- Method/Path: POST /api/entries/binaries
- Headers:
  - Authorization: Bearer <access_token>
  - Content-Type: (not set manually; browser sets correct multipart boundary)
- Example multipart body fields:
  - file: the uploaded file binary (filename and mime come from the File object)
  - filename: desired filename to store
  - description: optional text description
- Example JavaScript:
  const form = new FormData();
  form.append("file", file);
  form.append("filename", file.name);
  form.append("description", "Optional description");
  fetch(`${API_BASE_URL}/api/entries/binaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
- Example cURL (approximation; content-type boundary will differ):
  curl -i \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -X POST \
    -F file=@"/path/to/file.pdf" \
    -F filename="file.pdf" \
    -F description="Optional description" \
    "$API_BASE_URL/api/entries/binaries"

4) Check current user (/me)
- Method/Path: GET /me
- Headers:
  - Authorization: Bearer <access_token>
- Example cURL:
  curl -i \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$API_BASE_URL/me"

Where the token comes from
- The frontend uses Supabase JS: const { data } = await supabase.auth.getSession();
- It takes data.session?.access_token and puts it into the Authorization header for each request.

Common 401 causes and how to diagnose
- Missing/expired access token: ensure the user is logged in via Supabase; enable VITE_LOG_API to confirm the header is present.
- Token from a different Supabase project/issuer: backend verifies iss against your Supabase URL; make sure VITE_SUPABASE_URL in the UI and backend config match the same project.
- Audience mismatch: backend expects audience "authenticated" by default. Ensure your token includes that aud. Supabase user tokens typically include it.
- Using refresh token instead of access token: the UI uses the access token (correct). If testing via cURL, fetch the access token via Supabase client or from local storage/session and pass it as Bearer.
- Clock skew or expired token: try re-login, then retry.

Notes
- Preflight (OPTIONS) requests will not include Authorization and should be allowed by backend CORS.
- For multipart uploads, do not set Content-Type manually; let the browser define the boundary, and let the backend parse multipart form data accordingly.
