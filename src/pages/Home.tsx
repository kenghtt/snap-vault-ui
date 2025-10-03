import { useMemo, useState, type DragEvent, type ChangeEvent, useEffect, useRef } from 'react'
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

type PastedEntry =
  | { kind: 'text'; text: string; displayName?: string }
  | { kind: 'file'; mime: string; name?: string; size?: number; displayName?: string }

export default function Home() {
  const [isOver, setIsOver] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [query, setQuery] = useState('')
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [pastedItems, setPastedItems] = useState<PastedEntry[]>([])
  // Rename modal state
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [pendingEntry, setPendingEntry] = useState<PastedEntry | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)

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
    const entries: PastedEntry[] = []
    const dt = (e as DragEvent & { dataTransfer?: DataTransfer }).dataTransfer
    if (dt) {
      // Files
      if (dt.files && dt.files.length > 0) {
        Array.from(dt.files).forEach((file) => {
          entries.push({ kind: 'file', mime: file.type || 'application/octet-stream', name: file.name, size: file.size })
        })
      }
      // Some text drops provide plain text
      const text = dt.getData && dt.getData('text/plain')
      if (text && text.trim().length > 0) {
        entries.push({ kind: 'text', text })
      }
      // Items for additional file detection
      if (dt.items && dt.items.length > 0) {
        Array.from(dt.items).forEach((item) => {
          if (item.kind === 'file') {
            const file = item.getAsFile()
            if (file) {
              entries.push({ kind: 'file', mime: file.type || item.type || 'application/octet-stream', name: file.name, size: file.size })
            }
          }
        })
      }
    }
    if (entries.length > 0) {
      processIncoming(entries)
      setIsActive(true)
    }
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)
  const clearQuery = () => setQuery('')

    // Handle incoming entries (from paste or drop). If rename modal is open, append directly.
    const processIncoming = (entries: PastedEntry[]) => {
      if (!entries || entries.length === 0) return
      if (renameOpen) {
        setPastedItems((prev) => [...entries, ...prev])
        return
      }
      const [first, ...rest] = entries
      if (rest.length) setPastedItems((prev) => [...rest, ...prev])
      setPendingEntry(first)
      setRenameInput('')
      setRenameOpen(true)
    }

    const closeRenameModal = () => {
      setRenameOpen(false)
      setPendingEntry(null)
      setRenameInput('')
    }

    const cancelRename = () => {
      if (pendingEntry) {
        setPastedItems((prev) => [pendingEntry, ...prev])
      }
      closeRenameModal()
    }

    const submitRename = () => {
      if (!pendingEntry) return closeRenameModal()
      const name = renameInput.trim()
      let finalized: PastedEntry
      if (name) {
        finalized = { ...pendingEntry, displayName: name }
      } else if (pendingEntry.kind === 'text') {
        finalized = { ...pendingEntry, displayName: 'new name' }
      } else {
        // File with no new name: keep original filename (if present)
        finalized = pendingEntry
      }
      setPastedItems((prev) => [finalized, ...prev])
      closeRenameModal()
    }

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

  // Paste handling when drop zone is active
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!isActive) return
      // If active, consume paste into our drop zone
      e.preventDefault()
      const entries: PastedEntry[] = []
      const dt = e.clipboardData
      if (dt) {
        const text = dt.getData('text/plain')
        if (text && text.trim().length > 0) {
          entries.push({ kind: 'text', text })
        }
        if (dt.files && dt.files.length > 0) {
          Array.from(dt.files).forEach((file) => {
            entries.push({ kind: 'file', mime: file.type || 'application/octet-stream', name: file.name, size: file.size })
          })
        }
        // Some browsers expose items with kind 'file' for images without a filename
        if (dt.items && dt.items.length > 0) {
          Array.from(dt.items).forEach((item) => {
            if (item.kind === 'file') {
              const file = item.getAsFile()
              if (file) {
                entries.push({ kind: 'file', mime: file.type || item.type || 'application/octet-stream', name: (file as any).name, size: file.size })
              }
            }
          })
        }
      }
      if (entries.length > 0) {
        processIncoming(entries)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isActive])

  // Deactivate when clicking outside drop zone
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      const container = dropRef.current
      if (container && !container.contains(target)) {
        setIsActive(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
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
            ref={dropRef}
            onClick={() => setIsActive(true)}
            className={
              "h-[70vh] w-full rounded-lg border-2 border-dashed flex items-center justify-center text-center transition-all duration-200 cursor-pointer " +
              (isOver ? "bg-info/10 border-info text-info " : "bg-base-200/60 border-info/60 text-primary ") +
              (isActive ? " border-amber-400 shadow-[0_0_25px_4px_rgba(245,158,11,0.6)]" : "")
            }
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            aria-pressed={isActive}
            role="button"
            title={isActive ? "Active: Paste (Cmd/Ctrl+V) will go here" : "Click to activate, then paste with Cmd/Ctrl+V"}
          >
            <div>
              <div className="text-3xl font-bold mb-2">↓ Drop to Save</div>
              <div className="opacity-80">Files, links, notes, screenshots</div>
              {isActive && (
                <div className="mt-3 text-sm text-amber-500">Active — Paste here with Cmd/Ctrl + V</div>
              )}
            </div>
          </div>
        </main>

        {/* Far right sidebar for pasted items */}
        <aside className="w-[22%] max-w-sm min-w-[260px] bg-base-200 border-l border-base-300 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3">Pasted Items</h3>
          {pastedItems.length === 0 ? (
            <div className="text-sm text-base-content/60">
              Click the Drop to Save area to activate it, then paste with Cmd/Ctrl + V.
            </div>
          ) : (
            <ul className="space-y-3">
              {pastedItems.map((entry, idx) => (
                <li key={idx} className="p-3 rounded-box bg-base-100 border border-base-300">
                  {entry.kind === 'text' ? (
                    <div>
                      <div className="text-xs uppercase opacity-60 mb-1">Text</div>
                      {entry.displayName ? (
                        <div className="text-xs opacity-70 mb-1">Name: {entry.displayName}</div>
                      ) : null}
                      <div className="whitespace-pre-wrap break-words text-sm max-h-40 overflow-auto">{entry.text}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs uppercase opacity-60 mb-1">Clipboard File</div>
                      <div className="text-sm">
                        Type: <span className="font-mono">{entry.mime}</span>
                      </div>
                      {(entry.displayName || entry.name) ? (
                        <div className="text-xs opacity-70">Name: {entry.displayName ?? entry.name}</div>
                      ) : null}
                      {typeof entry.size === 'number' ? (
                        <div className="text-xs opacity-70">Size: {Math.round((entry.size as number) / 1024)} KB</div>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      {renameOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-base-300/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelRename()
          }}
        >
          <div className="bg-base-100 border border-base-300 rounded-box shadow-xl p-5 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Name this item</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitRename()
              }}
            >
              <input
                type="text"
                className="input input-bordered w-full mb-3"
                placeholder={
                  pendingEntry?.kind === 'file'
                    ? (pendingEntry?.name || 'Untitled')
                    : (pendingEntry?.text?.slice(0, 40) || 'Untitled')
                }
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelRename()
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={cancelRename}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SearchModal open={cmdkOpen} onClose={() => setCmdkOpen(false)} sections={sections} />
    </div>
  )
}
