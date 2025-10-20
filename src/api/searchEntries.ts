import { apiJson } from '../lib/api'

export type SortMode = 'relevance' | 'created_desc' | 'created_asc'
export type SearchItem = {
    uuid: string;
    id: string; kind: 'binary' | 'text' | 'link'; name: string; description: string | null; created_at: string }
export type SearchResponse = { items: SearchItem[]; limit: number; offset: number }

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) usp.set(k, String(v))
  return usp.toString()
}

export async function searchEntries(opts: { q: string; limit?: number; offset?: number; sort?: SortMode; signal?: AbortSignal }): Promise<SearchResponse> {
  const { q, limit = 25, offset = 0, sort = 'relevance', signal } = opts
  const qs = buildQuery({ q, limit, offset, sort })
  return apiJson<SearchResponse>(`/api/entries/search?${qs}`, { method: 'GET', signal })
}
