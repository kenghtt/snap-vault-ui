import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import SearchInput from './SearchInput'
import { useSearchEntries } from '../hooks/useSearchEntries'

export type Section = { title: string; items: string[] }

interface SearchModalProps {
  open: boolean
  onClose: () => void
  sections: Section[]
  panelClassName?: string
}

export default function SearchModal({ open, onClose, panelClassName }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const { items, loading, error, hasMore, loadMore, canSearch, searchNow } = useSearchEntries({ q: query, minChars: 2, debounceMs: 150, limit: 25, sort: 'relevance' })

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 0)
      setResultsOpen(query.trim().length > 0)
      return () => clearTimeout(id)
    } else {
      setQuery('')
      setResultsOpen(false)
    }
  }, [open, query])

  // Ensure Escape always closes the modal, regardless of focus
  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Enter') {
        // Optional: bypass debounce on Enter
        void searchNow()
      }
    }
    // Use capture to catch it early even if other handlers stop it later
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose, searchNow])

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setResultsOpen(val.trim().length > 0)
  }
  const clearQuery = () => { setQuery(''); setResultsOpen(false) }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  const onOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Click-away within modal panel to hide results (but keep modal open)
  useEffect(() => {
    if (!open) return
    const handler = (ev: globalThis.MouseEvent) => {
      if (!resultsOpen || query.trim().length === 0) return
      const box = searchBoxRef.current
      const target = ev.target as Node | null
      if (box && target && !box.contains(target)) {
        setResultsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, resultsOpen, query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/40 backdrop-blur-md p-4"
      onKeyDown={onKeyDown}
      onClick={onOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={panelRef}
        className={(panelClassName ?? 'w-[calc(100vw-20vh)] h-[80vh]') + ' min-w-[320px] min-h-[320px] max-w-[1400px] max-h-[900px] bg-base-100 border border-base-300 rounded-box shadow-xl relative flex'}
      >
        <div className="flex-1 flex items-start justify-center pt-12">
          <div ref={searchBoxRef} className="relative w-[90%] max-w-3xl mx-auto">
            <label htmlFor="cmdk-search" className="sr-only">Search</label>
            <SearchInput
              inputId="cmdk-search"
              ref={inputRef}
              value={query}
              onChange={onChange}
              onClear={clearQuery}
              onFocus={() => { if (query.trim().length > 0) setResultsOpen(true) }}
              placeholder="Search by name or description…"
              showDropdown={false}
              size="lg"
              autoFocus
            />

            {resultsOpen && (
              <div>
                {/* Hints and states */}
                {query.trim().length > 0 && query.trim().length < 2 && (
                  <div className="mt-3 text-sm text-base-content/60">Type at least 2 characters… ABC</div>
                )}

                {loading && (
                  <div className="mt-3 text-sm" aria-live="polite">Searching…</div>
                )}

                {error && (
                  <div className="mt-3 alert alert-error text-sm" role="alert" aria-live="polite">{error}</div>
                )}

                {!loading && !error && canSearch && items.length === 0 && (
                  <div className="mt-3 text-sm">No results.</div>
                )}

                {/* Results */}
                {items.length > 0 && (
                  <ul className="mt-4 divide-y divide-base-300 rounded-box border border-base-300 overflow-hidden">
                    {items.map((it) => (
                      <li key={it.uuid} className="p-3 hover:bg-base-200/60">
                        <div className="font-medium">{it.name}</div>
                        {it.description && <div className="text-sm text-base-content/70 line-clamp-2">{it.description}</div>}
                        <div className="text-xs text-base-content/60 flex gap-2 mt-1">
                          <span>{it.kind}</span>
                          <span>{new Date(it.created_at).toLocaleString()}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {hasMore && !loading && (
                  <div className="mt-3">
                    <button className="btn btn-sm" onClick={loadMore}>Load more</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
