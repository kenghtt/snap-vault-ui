import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'

export type Section = { title: string; items: string[] }

interface SearchModalProps {
  open: boolean
  onClose: () => void
  sections: Section[]
}

export default function SearchModal({ open, onClose, sections }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      // Slight delay to ensure element is in DOM
      const id = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(id)
    } else {
      setQuery('')
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as string[]
    const all = sections.flatMap((s) => s.items)
    return all.filter((it) => it.toLowerCase().includes(q))
  }, [query, sections])

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)
  const clearQuery = () => setQuery('')

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  const onOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

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
        className="w-[calc(100vw-20vh)] h-[80vh] min-w-[320px] min-h-[320px] max-w-[1400px] max-h-[900px] bg-base-100 border border-base-300 rounded-box shadow-xl relative flex"
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[90%] max-w-3xl mx-auto">
            <label htmlFor="cmdk-search" className="sr-only">Search</label>
            <div className="join w-full">
              <input
                id="cmdk-search"
                ref={inputRef}
                type="text"
                className="input input-bordered input-lg join-item w-full"
                placeholder="Search your files..."
                value={query}
                onChange={onChange}
              />
              {query ? (
                <button className="btn btn-ghost btn-lg join-item" onClick={clearQuery} aria-label="Clear search">✕</button>
              ) : (
                <button className="btn btn-ghost btn-lg join-item" disabled>🔍</button>
              )}
            </div>

            {query && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-base-100 border border-base-300 rounded-box shadow-lg max-h-[40vh] overflow-auto z-10">
                {results.length ? (
                  <ul className="menu menu-sm">
                    {results.map((it, idx) => (
                      <li key={idx}><button type="button" className="justify-start">{it}</button></li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-sm text-base-content/60">No results</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
