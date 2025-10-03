import { useMemo, useState, type DragEvent, type ChangeEvent, useEffect } from 'react'
import SearchModal from '../components/SearchModal'

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-base-content/50">No matches</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-base-content/80">
              <span className="mt-0.5">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Home() {
  const [isOver, setIsOver] = useState(false)
  const [query, setQuery] = useState('')
  const [cmdkOpen, setCmdkOpen] = useState(false)

  const sections = useMemo(
    () => [
      { title: 'Today', items: ['Zoom link: Standup', 'Note: New idea'] },
      { title: 'Yesterday', items: ['Screenshot: bug.png', 'Text: To-do list'] },
      { title: '2 days ago', items: ['Image: sketch.jpg', 'Note: Retro notes'] },
      { title: 'This week', items: ['PDF: design-spec.pdf', 'Link: sprint board'] },
      { title: '2 weeks ago', items: ['Video: demo.mov', 'Doc: meeting-notes.txt'] },
    ],
    []
  )

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as string[]
    const allItems = sections.flatMap((sec) => sec.items)
    return allItems.filter((it) => it.toLowerCase().includes(q))
  }, [query, sections])

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }
  const onDragLeave = () => setIsOver(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    // No-op for now; just a static UI placeholder
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)
  const clearQuery = () => setQuery('')

  // Command palette keyboard shortcuts: Cmd+K / Ctrl+K / '/'
  useEffect(() => {
    const isEditable = (el: Element | null): boolean => {
      if (!el) return false
      const tag = (el as HTMLElement).tagName
      const editable = (el as HTMLElement).isContentEditable
      return editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element | null
      const inEditable = isEditable(target)
      const key = e.key.toLowerCase()
      if ((e.metaKey && key === 'k') || (e.ctrlKey && key === 'k')) {
        e.preventDefault()
        if (!inEditable) setCmdkOpen(true)
      } else if (key === '/' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        if (!inEditable) {
          e.preventDefault()
          setCmdkOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav placeholder */}
      <div className="navbar bg-base-300 shadow-sm">
        <div className="flex-1">
          <a className="btn btn-ghost text-2xl font-extrabold">SnapVault</a>
        </div>
        <div className="flex-none gap-2">
          <a className="btn btn-ghost" href="/home">Home</a>
          <button className="btn btn-ghost">Features</button>
          <button className="btn btn-ghost">Pricing</button>
          <button className="btn btn-primary">Login</button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Left sidebar 20% */}
        <aside className="w-[20%] max-w-sm min-w-[240px] bg-base-200 border-r border-base-300 p-4 overflow-y-auto">
          {sections.map((sec, i) => (
            <Section key={i} title={sec.title} items={sec.items} />
          ))}
        </aside>

        {/* Right drop area 80% */}
        <main className="flex-1 p-6 flex flex-col gap-4">
          {/* Search bar on top of Drop to Save */}
          <div>
            <label htmlFor="search" className="sr-only">Search files</label>
            <div className="relative w-full max-w-2xl mx-auto">
              <div className="join w-full">
                <input
                  id="search"
                  type="text"
                  className="input input-bordered join-item w-full"
                  placeholder="Search your files..."
                  value={query}
                  onChange={onChange}
                />
                {query ? (
                  <button className="btn btn-ghost join-item" onClick={clearQuery} aria-label="Clear search">
                    ✕
                  </button>
                ) : (
                  <button className="btn btn-ghost join-item" disabled>
                    🔍
                  </button>
                )}
              </div>

              {query && (
                <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-box shadow-lg max-h-64 overflow-auto">
                  {searchResults.length ? (
                    <ul className="menu menu-sm">
                      {searchResults.map((it, idx) => (
                        <li key={idx}>
                          <button type="button" className="justify-start">{it}</button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-sm text-base-content/60">No results</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className={
              "h-[70vh] w-full rounded-lg border-2 border-dashed flex items-center justify-center text-center transition-colors " +
              (isOver ? "bg-info/10 border-info text-info" : "bg-base-200/60 border-info/60 text-primary")
            }
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div>
              <div className="text-3xl font-bold mb-2">↓ Drop to Save</div>
              <div className="opacity-80">Files, links, notes, screenshots</div>
            </div>
          </div>
        </main>
      </div>
      <SearchModal open={cmdkOpen} onClose={() => setCmdkOpen(false)} sections={sections} />
    </div>
  )
}
