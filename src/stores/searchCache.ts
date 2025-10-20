import { create } from 'zustand'
import type { SearchItem } from '../api/searchEntries'

export type SearchKey = string

export type CachedResults = {
  items: SearchItem[]
  hasMore: boolean
  offset: number
  timestamp: number
}

export interface SearchCacheState {
  cache: Record<SearchKey, CachedResults>
  set(key: SearchKey, value: CachedResults): void
  get(key: SearchKey): CachedResults | undefined
  clear(): void
}

export const useSearchCache = create<SearchCacheState>((set, get) => ({
  cache: {},
  set: (key, value) => set((state) => ({ cache: { ...state.cache, [key]: value } })),
  get: (key) => get().cache[key],
  clear: () => set({ cache: {} }),
}))

export function makeSearchKey(q: string, sort: string, limit: number): SearchKey {
  return `${q.trim()}\n${sort}\n${limit}`
}
