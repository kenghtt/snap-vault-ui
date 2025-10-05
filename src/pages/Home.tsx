import { useMemo, useState, type ChangeEvent, useEffect } from 'react'
import SearchModal from '../components/SearchModal'
import SectionsSidebar from '../components/SectionsSidebar'
import SearchInput from '../components/SearchInput'
import DropZone, { type PastedEntry } from '../components/DropZone'
import PastedItemsSidebar from '../components/PastedItemsSidebar'
import PdfPreviewModal from '../components/PdfPreviewModal'
import ImagePreviewModal from '../components/ImagePreviewModal'
import TextPreviewModal from '../components/TextPreviewModal'


export default function Home() {
  const [query, setQuery] = useState('')
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [pastedItems, setPastedItems] = useState<PastedEntry[]>([])
  // Rename modal state
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [pendingEntry, setPendingEntry] = useState<PastedEntry | null>(null)
  // PDF preview modal state
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  // Image preview modal state
  const [imageOpen, setImageOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  // Text preview modal state
  const [textOpen, setTextOpen] = useState(false)
  const [textEntry, setTextEntry] = useState<PastedEntry | null>(null)

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
        {/* Left sidebar */}
        <SectionsSidebar sections={sections} />

        {/* Right drop area 80% */}
        <main className="flex-1 p-6 flex flex-col gap-4">
          {/* Search bar on top of Drop to Save */}
          <div>
            <label htmlFor="search" className="sr-only">Search files</label>
            <div className="relative w-full max-w-2xl mx-auto">
              <SearchInput
                inputId="search"
                value={query}
                onChange={onChange}
                onClear={clearQuery}
                placeholder="Search your files..."
                results={searchResults}
                showDropdown={query.trim().length > 0}
                size="md"
              />
            </div>
          </div>

          <DropZone onEntries={processIncoming} />
        </main>

        {/* Far right sidebar for pasted items */}
        <PastedItemsSidebar
          items={pastedItems}
          onItemClick={(entry) => {
            if (entry.kind === 'file') {
              const name = entry.name?.toLowerCase()
              const mime = entry.mime?.toLowerCase()
              const isPdf = (mime?.includes('pdf') ?? false) || (name?.endsWith('.pdf') ?? false)
              const isImage = !!(mime?.startsWith('image/') || (name ? /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name) : false))
              const isTextLike = (mime?.startsWith('text/') ?? false) || (mime?.includes('json') ?? false) || (mime?.includes('csv') ?? false) || (name ? /\.(txt|md|log|json|csv)$/.test(name) : false)

              if (isPdf) {
                const url = entry.url ? entry.url : (entry.file ? URL.createObjectURL(entry.file) : null)
                if (url) {
                  setPdfUrl(url)
                  setPdfOpen(true)
                }
                return
              }
              if (isImage) {
                const url = entry.url ? entry.url : (entry.file ? URL.createObjectURL(entry.file) : null)
                if (url) {
                  setImageUrl(url)
                  setImageOpen(true)
                }
                return
              }
              if (isTextLike) {
                setTextEntry(entry)
                setTextOpen(true)
                return
              }
            } else if (entry.kind === 'text') {
              setTextEntry(entry)
              setTextOpen(true)
              return
            }
          }}
        />
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
      <PdfPreviewModal open={pdfOpen} url={pdfUrl} onClose={() => setPdfOpen(false)} />
      <ImagePreviewModal open={imageOpen} url={imageUrl} onClose={() => setImageOpen(false)} />
      <TextPreviewModal open={textOpen} entry={textEntry} onClose={() => setTextOpen(false)} />
    </div>
  )
}
