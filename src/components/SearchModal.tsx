import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import SearchInput from './SearchInput'

export type Section = { title: string; items: string[] }

interface SearchModalProps {
  open: boolean
  onClose: () => void
  sections: Section[]
  panelClassName?: string
}

export default function SearchModal({ open, onClose, sections, panelClassName }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
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
        className={(panelClassName ?? 'w-[calc(100vw-20vh)] h-[80vh]') + ' min-w-[320px] min-h-[320px] max-w-[1400px] max-h-[900px] bg-base-100 border border-base-300 rounded-box shadow-xl relative flex'}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[90%] max-w-3xl mx-auto">
            <label htmlFor="cmdk-search" className="sr-only">Search</label>
            <SearchInput
              inputId="cmdk-search"
              ref={inputRef}
              value={query}
              onChange={onChange}
              onClear={clearQuery}
              placeholder="Search your files..."
              results={results}
              showDropdown={query.trim().length > 0}
              size="lg"
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  )
}
