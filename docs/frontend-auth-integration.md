# Frontend integration guide: Auth + JWT with Supabase

This backend is a Spring Security OAuth2 Resource Server that validates Supabase-issued JWT access tokens on every protected request.

What the frontend must do
- Sign in via Supabase Auth (GoTrue) using the Supabase JS client.
- Read the short-lived access token from the Supabase session (session.access_token).
- Send the access token in every API call using the Authorization header:
  - Authorization: Bearer <access_token>
- Do not send the refresh token to the backend. Never use the service role key from the browser.

Environment values the frontend should know
- API base URL: e.g., http://localhost:8080 for local dev.
- CORS: localhost:3000 is allowed by default. If your UI runs on a different origin, update the backend CORS config.

Protected vs public endpoints
- Public (no auth):
  - GET /actuator/health
  - Anything under /public/**
  - OPTIONS preflight requests are permitted automatically.
- Protected (requires Bearer JWT):
  - All other endpoints, including entries APIs under /api/entries/**
  - /me (used to inspect the current user) requires a valid JWT.

Testing the current user (/me)
- Example request:
  curl -i \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    http://localhost:8080/me

- Example successful response:
  {
    "authenticated": true,
    "userId": "<sub-from-token>",
    "email": "user@example.com",
    "role": "authenticated"
  }

- If the header is missing/invalid:
  - 401 Unauthorized
- If authenticated but not allowed (future role rules):
  - 403 Forbidden

Entries API request examples (frontend)
- Create text entry (JSON):
  fetch("/api/entries/text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      title: "My note",
      description: "Optional description",
      content: "Hello world",
      contentFormat: "plain"
    })
  })

- Create link entry (JSON):
  fetch("/api/entries/link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      title: "A link",
      description: "Optional",
      url: "https://example.com",
      faviconUrl: "https://example.com/favicon.ico"
    })
  })

- Upload binary (multipart/form-data):
  const form = new FormData();
  form.append("file", file);
  form.append("filename", file.name);
  form.append("description", "Optional description");

  fetch("/api/entries/binaries", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`
      // Note: do NOT set Content-Type manually for multipart; the browser will set boundary.
    },
    body: form
  })

Important JWT details enforced by backend
- Signature: ES256 verified via Supabase JWKS at {supabase.url}/auth/v1/.well-known/jwks.json
- Issuer (iss): must equal {supabase.url}/auth/v1
- Audience (aud): must include "authenticated" (configurable)
- Role claim (role): must be missing or equal to "authenticated" (rejects anon and service_role)
- Expiration (exp): token must not be expired

Frontend logic changes required
- Always attach Authorization header with the Supabase access token for protected routes.
- Handle 401 by triggering Supabase session refresh or re-login; do not retry endlessly.
- Optionally handle 403 as an authorization problem (show message or redirect).
- Use /me to confirm the session and get the current user fields (sub/email/role) if needed.

Local development modes
- Normal mode (auth ON):
  - security.auth.enabled=true (default)
  - All protected endpoints require a valid JWT.
- Local no-auth mode (for debugging):
  - Set environment variable SECURITY_AUTH_ENABLED=false (or set in application.properties)
  - In this mode, every endpoint is permitted without a token. Do NOT use this in shared/staging/prod.

CORS
- Currently allows origin http://localhost:3000 and common methods/headers. If your UI domain differs, update CorsConfig.

Backend properties (for reference)
- supabase.url: https://<project-id>.supabase.co
- security.supabase.issuer: ${supabase.url}/auth/v1
- security.supabase.jwksUri: ${supabase.url}/auth/v1/.well-known/jwks.json
- security.supabase.expectedAudience: authenticated (default, configurable)

Troubleshooting
- 401 with a fresh token: ensure you used the access token (not refresh token) and issuer/audience match environment.
- 403: token is valid but role is not acceptable or endpoint adds further authorization in the future.
- CORS errors in browser: check the browser console network tab; ensure your frontend origin is allowed in backend CORS config.
