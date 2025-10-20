
# SnapVault Frontend — Search Integration Guide (React)

> **Backend status:** `/api/entries/search` is implemented and live. Database has `pg_trgm` enabled with trigram GIN indexes on `name` and `description`. This document describes the **frontend** changes to consume that endpoint cleanly with debouncing (150 ms), min-chars guard, and in‑flight cancellation.

---

## 0) UX / Behavior Requirements

- **Search scope:** metadata-only (name, description) for the current user.
- **Min characters:** do **not** call the API until input length is **≥ 2**.
- **Debounce:** wait **150 ms** after the last keystroke before issuing the request (trailing debounce).
- **Abort previous calls:** if the user types again while a request is in flight, **cancel** the previous request and only process the newest response.
- **Pagination:** support `limit` + `offset` paging; show “Load more” when more results are available.
- **Auth:** include `Authorization: Bearer <JWT>` for every request.
- **States:** show loading, empty, and error states; avoid flicker.
- **A11y:** announce loading and errors (`aria-live="polite"`).

---

## 1) API Contract (matches backend)

**Method:** `GET`  
**URL:** `/api/entries/search?q=<q>&limit=<n>&offset=<n>&sort=<mode>`  
**Headers:** `Authorization: Bearer <access_token>`  
**Body:** none

**Query parameters**
- `q` (required): string
- `limit` (default `25`, clamp `1..100`)
- `offset` (default `0`, `>= 0`)
- `sort`: `relevance | created_desc | created_asc` (default `relevance`)

**Example URLs**
- `/api/entries/search?q=meeting+notes`
- `/api/entries/search?q=photo&limit=10&offset=0&sort=created_desc`

**Response shape** (example)
```ts
type SearchItem = {
  id: number;
  kind: 'binary' | 'text' | 'link';
  name: string;
  description: string | null;
  created_at: string; // ISO
};

type SearchResponse = {
  items: SearchItem[];
  limit: number;
  offset: number;
};
```

---

## 2) Frontend Responsibilities

#### Note: Zustand just got installed for state mgmt (preferred state management), please consider using it when appropriate. 

1. **Search box behavior**
   - Ignore queries with length `< 2` → clear results, hide loading.
   - Debounce **150 ms** before firing a request.
   - If the user presses **Enter**, you may bypass debounce and search immediately.

2. **Request lifecycle**
   - Use **`AbortController`** to cancel in-flight requests when a new keystroke occurs.
   - On response, ensure it’s the **latest** request (if using a request-id strategy); if using `AbortController` correctly, this is covered.
   - Handle 401 (expired token) by triggering your existing re-auth flow.

3. **Pagination**
   - Keep `offset` in component state.
   - “Load more” calls the same endpoint with `offset = items.length`, appending results.
   - `hasMore = response.items.length === limit` (simple heuristic).

4. **Rendering**
   - Loading indicator while fetching.
   - Empty state when `items.length === 0` and `q.length >= 2`.
   - Error banner with retry option.

5. **Accessibility / Perf**
   - `aria-live="polite"` for loading and error messages.
   - Avoid logging raw queries if they might be sensitive; log only lengths + timings.

---

## 3) Minimal Implementation Sketches (reference-only)

> Use these as guidance; adapt to your app’s state mgmt (zustand when appropriate), styling, and auth.
> These are simplified examples, not production-ready.
### 3.1 Token access (Supabase example)
```ts
// auth/getAccessToken.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON!);

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
```

### 3.2 Search client with AbortController
```ts
// api/searchEntries.ts
export type SortMode = 'relevance' | 'created_desc' | 'created_asc';
export type SearchItem = { id: number; kind: 'binary'|'text'|'link'; name: string; description: string | null; created_at: string; };
export type SearchResponse = { items: SearchItem[]; limit: number; offset: number; };

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) usp.set(k, String(v));
  return usp.toString();
}

export async function searchEntries(opts: {
  token: string; q: string; limit?: number; offset?: number; sort?: SortMode; signal?: AbortSignal;
}): Promise<SearchResponse> {
  const { token, q, limit = 25, offset = 0, sort = 'relevance', signal } = opts;
  const qs = buildQuery({ q, limit, offset, sort });
  const res = await fetch(`/api/entries/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }, signal
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status} ${res.statusText}`);
  return res.json();
}
```

### 3.3 Hook with **minChars=2**, **debounce=150 ms**, **cancel in-flight**
```ts
// hooks/useSearchEntries.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken } from '../auth/getAccessToken';
import { searchEntries, type SearchItem, type SortMode } from '../api/searchEntries';

type State = { items: SearchItem[]; loading: boolean; error: string | null; hasMore: boolean; };
type Params = { q: string; minChars?: number; debounceMs?: number; limit?: number; sort?: SortMode; };

export function useSearchEntries({ q, minChars = 2, debounceMs = 150, limit = 25, sort = 'relevance' }: Params) {
  const [state, setState] = useState<State>({ items: [], loading: false, error: null, hasMore: false });
  const [offset, setOffset] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const canSearch = q.trim().length >= minChars;

  // Reset when q/sort/limit changes
  useEffect(() => {
    setOffset(0);
    setState({ items: [], loading: false, error: null, hasMore: false });
  }, [q, sort, limit]);

  useEffect(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

    if (!canSearch) { setState({ items: [], loading: false, error: null, hasMore: false }); return; }

    setState(prev => ({ ...prev, loading: true, error: null }));

    timerRef.current = window.setTimeout(async () => {
      try {
        const token = await getAccessToken(); if (!token) throw new Error('Not authenticated');
        const controller = new AbortController(); abortRef.current = controller;
        const resp = await searchEntries({ token, q: q.trim(), limit, offset: 0, sort, signal: controller.signal });
        setState({ items: resp.items, loading: false, error: null, hasMore: resp.items.length === limit });
        setOffset(resp.items.length);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setState(prev => ({ ...prev, loading: false, error: e?.message || 'Search failed' }));
      } finally {
        abortRef.current = null;
      }
    }, debounceMs);

    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [q, canSearch, debounceMs, limit, sort]);

  const loadMore = useMemo(() => {
    return async () => {
      if (!canSearch || state.loading) return;
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const token = await getAccessToken(); if (!token) throw new Error('Not authenticated');
        const controller = new AbortController(); abortRef.current = controller;
        const resp = await searchEntries({ token, q: q.trim(), limit, offset, sort, signal: controller.signal });
        setState(prev => ({
          items: [...prev.items, ...resp.items],
          loading: false,
          error: null,
          hasMore: resp.items.length === limit
        }));
        setOffset(prev => prev + resp.items.length);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setState(prev => ({ ...prev, loading: false, error: e?.message || 'Search failed' }));
      } finally {
        abortRef.current = null;
      }
    };
  }, [q, canSearch, limit, offset, sort, state.loading]);

  return { ...state, loadMore, canSearch };
}
```

### 3.4 Component skeleton (wire-up)
```tsx
// components/EntriesSearch.tsx
import { useState } from 'react';
import { useSearchEntries } from '../hooks/useSearchEntries';

export function EntriesSearch() {
  const [q, setQ] = useState('');
  const { items, loading, error, hasMore, loadMore, canSearch } = useSearchEntries({
    q, minChars: 2, debounceMs: 150, limit: 25, sort: 'relevance'
  });

  return (
    <div className="sv-search">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by name or description…"
        aria-label="Search entries"
      />

      {q.trim().length > 0 && q.trim().length < 2 && (
        <div className="sv-hint">Type at least 2 characters…</div>
      )}

      {loading && <div className="sv-loading" aria-live="polite">Searching…</div>}
      {error && <div className="sv-error" role="alert">{error}</div>}

      {!loading && !error && canSearch && items.length === 0 && (
        <div className="sv-empty">No results.</div>
      )}

      <ul className="sv-results">
        {items.map(it => (
          <li key={it.uuid}>
            <div className="sv-title">{it.name}</div>
            {it.description && <div className="sv-desc">{it.description}</div>}
            <div className="sv-meta">
              <span>{it.kind}</span>
              <span>{new Date(it.created_at).toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && !loading && (
        <button onClick={loadMore}>Load more</button>
      )}
    </div>
  );
}
```

---

## 4) Error & Edge Handling

- **Min chars**: when `q.length < 2`, do not call; clear list & loading.
- **Abort**: always abort the previous request on a new keystroke to prevent stale results.
- **Network errors**: show a concise message; allow retry on next keystroke.
- **401/expired token**: kick off re-login flow or token refresh.
- **Backspace to empty**: clear results immediately (no request).

---

## 5) Testing Checklist

- No network calls when `q.length < 2`.
- Debounce of **150 ms** verified: rapid typing triggers at most one call after the pause.
- New keystroke **cancels** prior call (`AbortError` visible in DevTools).
- Correct headers (`Authorization: Bearer <JWT>`).
- Pagination appends items; `hasMore` toggles as expected.
- Loading/empty/error states render correctly.
- Optional: pressing **Enter** triggers immediate search (skip debounce).

---

## 6) Notes / Variations

- If using TanStack Query:
  - `enabled: q.length >= 2`
  - debounce `q` to `qDebounced` before passing to the query key
  - React Query auto-cancels when the query key changes
- Consider caching by `q` to avoid repeated calls when toggling sort.
- Do not log raw `q` for privacy; log query length and timings.

---

### TL;DR

- **Min 2 chars**, **150 ms debounce**, **AbortController** cancelation.
- Send **Bearer** token, use `limit/offset`, render loading/empty/error and “Load more”.
- This guide gives your frontend AI enough structure to implement the feature with your project’s patterns.
