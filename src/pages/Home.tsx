import { useMemo, useState, type ChangeEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchModal from '../components/SearchModal'
import SectionsSidebar from '../components/SectionsSidebar'
import SearchInput from '../components/SearchInput'
import DropZone, { type PastedEntry } from '../components/DropZone'
import PastedItemsSidebar from '../components/PastedItemsSidebar'
import PdfPreviewModal from '../components/PdfPreviewModal'
import ImagePreviewModal from '../components/ImagePreviewModal'
import TextPreviewModal from '../components/TextPreviewModal'
import RenameItemModal from '../components/RenameItemModal'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'


export default function Home() {
  const [query, setQuery] = useState('')
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [pastedItems, setPastedItems] = useState<PastedEntry[]>([])
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login', { replace: true })
  }
  // Rename modal state
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [renameDescription, setRenameDescription] = useState('')
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
  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Queue of incoming entries to process via the rename modal (one at a time)
  const [entryQueue, setEntryQueue] = useState<PastedEntry[]>([])

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

  // Determine if text is likely a resolvable URL to open in a browser tab
  const isProbablyUrl = (text: string): boolean => {
    const t = text.trim()
    if (!t) return false
    // Accept http(s) and protocol-less common cases starting with www.
    const withProto = /^https?:\/\//i.test(t) ? t : (/^www\./i.test(t) ? `https://${t}` : '')
    try {
      const candidate = withProto || t
      const u = new URL(candidate)
      // Basic sanity: must have hostname and no spaces
      return !!u.hostname && !/\s/.test(t)
    } catch {
      return false
    }
  }

  // Unified upload helper to send binary/text/link to backend
  const uploadEntryToServer = async (
    entry: PastedEntry,
    finalName?: string,
    description?: string | null
  ): Promise<boolean> => {
    setUploading(true)
    setUploadError(null)
    try {
      const descToSend = description == null ? '' : description

      if (entry.kind === 'file' && entry.file) {
        // Binary upload -> POST /api/entries/binaries (multipart)
        const form = new FormData()
        form.append('file', entry.file)
        form.append('filename', (finalName && finalName.trim().length > 0 ? finalName : (entry.name || entry.file.name)))
        if (descToSend) form.append('description', descToSend)

        const res = await apiFetch('/api/entries/binaries', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          if (res.status === 413) {
            throw new Error('Upload rejected: request too large (HTTP 413). Increase server/proxy upload limits (e.g., Nginx client_max_body_size, backend multipart max size).')
          }
          throw new Error(text || `Upload failed with status ${res.status}`)
        }
      } else if (entry.kind === 'text') {
        const text = entry.text
        const isLink = isProbablyUrl(text)
        if (isLink) {
          // Link entry -> POST /api/entries/link (JSON)
          const normalizedUrl = /^https?:\/\//i.test(text.trim())
            ? text.trim()
            : (/^www\./i.test(text.trim()) ? `https://${text.trim()}` : text.trim())
          const payload: Record<string, unknown> = {
            title: (finalName && finalName.trim().length > 0 ? finalName : text.slice(0, 60)),
            url: normalizedUrl,
          }
          if (descToSend) payload.description = descToSend

          const res = await apiFetch('/api/entries/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            if (res.status === 413) {
              throw new Error('Upload rejected: request too large (HTTP 413). Increase server/proxy upload limits (e.g., Nginx client_max_body_size, backend multipart max size).')
            }
            throw new Error(text || `Upload failed with status ${res.status}`)
          }
        } else {
          // Text entry -> POST /api/entries/text (JSON)
          const payload: Record<string, unknown> = {
            title: (finalName && finalName.trim().length > 0 ? finalName : text.slice(0, 60)),
            content: text,
            contentFormat: 'plain',
          }
          if (descToSend) payload.description = descToSend

          const res = await apiFetch('/api/entries/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            if (res.status === 413) {
              throw new Error('Upload rejected: request too large (HTTP 413). Increase server/proxy upload limits (e.g., Nginx client_max_body_size, backend multipart max size).')
            }
            throw new Error(text || `Upload failed with status ${res.status}`)
          }
        }
      } else {
        throw new Error('Unsupported entry type')
      }

      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadError(message)
      return false
    } finally {
      setUploading(false)
    }
  }

    // Handle incoming entries (from paste or drop). Queue them and show rename modal one-by-one.
    const processIncoming = (entries: PastedEntry[]) => {
      if (!entries || entries.length === 0) return
      setEntryQueue((prev) => {
        const combined = [...prev, ...entries]
        if (!renameOpen && !pendingEntry && combined.length > 0) {
          const [first, ...rest] = combined
          setPendingEntry(first)
          setRenameInput('')
          setRenameDescription('')
          setRenameOpen(true)
          return rest
        }
        return combined
      })
    }

    const closeRenameModal = () => {
      setRenameOpen(false)
      setPendingEntry(null)
      setRenameInput('')
      setRenameDescription('')
    }

    const cancelRename = () => {
      if (pendingEntry) {
        // Do not upload on cancel; just add to sidebar history for reference
        setPastedItems((prev) => [pendingEntry, ...prev])
      }
      // Advance to next entry in the queue or close the modal
      setEntryQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev
          setPendingEntry(next)
          setRenameInput('')
          setRenameDescription('')
          setRenameOpen(true)
          return rest
        } else {
          closeRenameModal()
          return prev
        }
      })
    }

    const submitRename = async () => {
      if (!pendingEntry) return closeRenameModal()
      const name = renameInput.trim()
      const descTrim = renameDescription.trim()
      const descriptionToSend = descTrim.length > 0 ? descTrim : null

      // Upload both file and text/link entries per backend API
      const finalName = pendingEntry.kind === 'file'
        ? (name || pendingEntry.name || (pendingEntry.file ? pendingEntry.file.name : 'Untitled'))
        : (name || (pendingEntry.kind === 'text' ? pendingEntry.text.slice(0, 60) : 'Untitled'))

      const success = await uploadEntryToServer(pendingEntry, finalName, descriptionToSend)
      if (success) {
        const finalized: PastedEntry = { ...pendingEntry, displayName: finalName }
        setPastedItems((prev) => [finalized, ...prev])
        // advance to next entry in queue or close
        setEntryQueue((prev) => {
          if (prev.length > 0) {
            const [next, ...rest] = prev
            setPendingEntry(next)
            setRenameInput('')
            setRenameDescription('')
            setRenameOpen(true)
            return rest
          } else {
            closeRenameModal()
            return prev
          }
        })
      } else {
        // keep modal open to allow retry/correction
      }
      return
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
        <div className="flex-none gap-2 items-center">
          <span className="badge badge-outline hidden sm:inline">{user?.email}</span>
          <button className="btn btn-outline btn-sm" onClick={handleSignOut}>Sign out</button>
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
          {/* hidden usage to satisfy linter that the queue state is read */}
          <div aria-hidden className="hidden" data-queue-length={entryQueue.length} />
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

      <RenameItemModal
        open={renameOpen}
        pendingEntry={pendingEntry}
        name={renameInput}
        description={renameDescription}
        onNameChange={setRenameInput}
        onDescriptionChange={setRenameDescription}
        onCancel={cancelRename}
        onSubmit={submitRename}
        uploading={uploading}
        uploadError={uploadError}
      />

      <SearchModal open={cmdkOpen} onClose={() => setCmdkOpen(false)} sections={sections} />
      <PdfPreviewModal open={pdfOpen} url={pdfUrl} onClose={() => setPdfOpen(false)} />
      <ImagePreviewModal open={imageOpen} url={imageUrl} onClose={() => setImageOpen(false)} />
      <TextPreviewModal open={textOpen} entry={textEntry} onClose={() => setTextOpen(false)} />
    </div>
  )
}
