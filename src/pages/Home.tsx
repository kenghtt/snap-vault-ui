import { useState, type ChangeEvent, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchModal from '../components/SearchModal'
import SectionsSidebar, { type SectionsSidebarHandle } from '../components/SectionsSidebar'
import SearchInput from '../components/SearchInput'
import DropZone, { type PastedEntry } from '../components/DropZone'
import PastedItemsSidebar from '../components/PastedItemsSidebar'
import PdfPreviewModal from '../components/PdfPreviewModal'
import ImagePreviewModal from '../components/ImagePreviewModal'
import TextPreviewModal from '../components/TextPreviewModal'
import RenameItemModal from '../components/RenameItemModal'
import BackendTextPreviewModal from '../components/BackendTextPreviewModal'
import NoPreviewModal from '../components/NoPreviewModal'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { useSearchEntries } from '../hooks/useSearchEntries'
import { loadPreview, startDownload } from '../lib/entriesPreview'


export default function Home() {
  const [query, setQuery] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [pastedItems, setPastedItems] = useState<PastedEntry[]>([])
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<SectionsSidebarHandle>(null)

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
  // Text preview modal state (local items)
  const [textOpen, setTextOpen] = useState(false)
  const [textEntry, setTextEntry] = useState<PastedEntry | null>(null)
  // Backend preview state
  const [downloadUuid, setDownloadUuid] = useState<string | null>(null)
  const [backendName, setBackendName] = useState<string>('')
  const [backendTextOpen, setBackendTextOpen] = useState(false)
  const [backendText, setBackendText] = useState<string>('')
  const [backendTextTruncated, setBackendTextTruncated] = useState(false)
  const [noPreviewOpen, setNoPreviewOpen] = useState(false)
  const [backendKind, setBackendKind] = useState<string | undefined>(undefined)
  const [backendCreatedAt, setBackendCreatedAt] = useState<string | undefined>(undefined)
  const lastObjUrlRef = useRef<string | null>(null)
  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Queue of incoming entries to process via the rename modal (one at a time)
  const [entryQueue, setEntryQueue] = useState<PastedEntry[]>([])


  const { items, loading, error, hasMore, loadMore, canSearch, searchNow } = useSearchEntries({ q: query, minChars: 2, debounceMs: 150, limit: 25, sort: 'relevance' })

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setResultsOpen(val.trim().length > 0)
  }
  const clearQuery = () => { setQuery(''); setResultsOpen(false) }

  // Click-away: close results when clicking outside the search area while query has text
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!resultsOpen || query.trim().length === 0) return
      const el = searchWrapRef.current
      const target = e.target as Node | null
      if (el && target && !el.contains(target)) {
        setResultsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [resultsOpen, query])

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
        // Refresh the sidebar to show the most recent entries
        void sidebarRef.current?.refresh()
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

  const openImage = (url: string, uuid: string) => {
    // cleanup previous object URL
    const prev = lastObjUrlRef.current
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
    lastObjUrlRef.current = url
    setImageUrl(url)
    setDownloadUuid(uuid)
    setImageOpen(true)
  }
  const openPdf = (url: string, uuid: string) => {
    const prev = lastObjUrlRef.current
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
    lastObjUrlRef.current = url
    setPdfUrl(url)
    setDownloadUuid(uuid)
    setPdfOpen(true)
  }

  const handleSearchItemClick = async (it: { id: string; name: string; kind?: string; created_at?: string }) => {
    try {
      setBackendName(it.name)
      setBackendKind(it.kind)
      setBackendCreatedAt(it.created_at)
      const uuid = it.id
      setDownloadUuid(uuid)
      const res = await loadPreview(uuid)
      if (res.kind === 'text') {
        setBackendText(res.text)
        setBackendTextTruncated(res.truncated)
        setBackendTextOpen(true)
        return
      }
      if (res.kind === 'blob') {
        const objUrl = URL.createObjectURL(res.blob)
        const ct = res.contentType.toLowerCase()
        if (ct.includes('pdf')) {
          openPdf(objUrl, uuid)
        } else if (ct.startsWith('image/')) {
          openImage(objUrl, uuid)
        } else {
          setNoPreviewOpen(true)
        }
        return
      }
      if (res.kind === 'redirect') {
        const url = res.url
        if (/\.pdf($|\?|#)/i.test(url)) {
          openPdf(url, uuid)
        } else {
          // assume image/pdf thumbnail; try image first
          openImage(url, uuid)
        }
        return
      }
      if (res.kind === 'nopreview') {
        setNoPreviewOpen(true)
        return
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || 'Failed to load preview'
      // eslint-disable-next-line no-alert
      alert(msg)
    }
  }

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
        <SectionsSidebar ref={sidebarRef} onItemClick={(entry) => { void handleSearchItemClick({ id: entry.uuid, name: entry.name, kind: entry.kind, created_at: entry.createdAt }) }} />

        {/* Right drop area 80% */}
        <main className="flex-1 p-6 flex flex-col gap-4">
          {/* Search bar on top of Drop to Save */}
          <div>
            <label htmlFor="search" className="sr-only">Search files</label>
            <div ref={searchWrapRef} className="relative w-full max-w-2xl mx-auto" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (canSearch) { void searchNow() } } }}>
              <SearchInput
                inputId="search"
                value={query}
                onChange={onChange}
                onClear={clearQuery}
                onFocus={() => { if (query.trim().length > 0) setResultsOpen(true) }}
                placeholder="Search by name or description…"
                size="md"
              />
              {query.trim().length > 0 && resultsOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-40">
                  <div className="bg-base-100 border border-base-300 rounded-box shadow-xl overflow-hidden">
                    <div className="p-3">
                      {query.trim().length > 0 && query.trim().length < 2 && (
                        <div className="text-sm text-base-content/60">Type at least 2 characters…000</div>
                      )}
                      {loading && (
                        <div className="text-sm" aria-live="polite">Searching…</div>
                      )}
                      {error && (
                        <div className="alert alert-error text-sm" role="alert" aria-live="polite">{error}</div>
                      )}
                      {!loading && !error && canSearch && items.length === 0 && (
                        <div className="text-sm">No results.</div>
                      )}
                    </div>
                    {items.length > 0 && (
                      <ul className="divide-y divide-base-300 max-h-[60vh] overflow-auto">
                        {items.map((it) => (
                          <li key={it.uuid} className="p-3 hover:bg-base-200/60 cursor-pointer" onClick={() => { void handleSearchItemClick({ id: it.uuid, name: it.name, kind: it.kind, created_at: it.created_at }) }}>
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
                      <div className="p-3">
                        <button className="btn btn-sm" onClick={loadMore}>Load more</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
          }
        }
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

      <SearchModal open={cmdkOpen} onClose={() => setCmdkOpen(false)} sections={[]} />
      <PdfPreviewModal
        open={pdfOpen}
        url={pdfUrl}
        onClose={() => {
          setPdfOpen(false)
          const prev = lastObjUrlRef.current
          if (prev && prev.startsWith('blob:')) { URL.revokeObjectURL(prev); lastObjUrlRef.current = null }
        }}
        onDownload={downloadUuid ? () => startDownload(downloadUuid) : undefined}
      />
      <ImagePreviewModal
        open={imageOpen}
        url={imageUrl}
        onClose={() => {
          setImageOpen(false)
          const prev = lastObjUrlRef.current
          if (prev && prev.startsWith('blob:')) { URL.revokeObjectURL(prev); lastObjUrlRef.current = null }
        }}
        onDownload={downloadUuid ? () => startDownload(downloadUuid) : undefined}
      />
      <TextPreviewModal open={textOpen} entry={textEntry} onClose={() => setTextOpen(false)} />
      <BackendTextPreviewModal
        open={backendTextOpen}
        name={backendName}
        text={backendText}
        truncated={backendTextTruncated}
        onClose={() => setBackendTextOpen(false)}
        onDownload={downloadUuid ? () => startDownload(downloadUuid) : undefined}
      />
      <NoPreviewModal
        open={noPreviewOpen}
        name={backendName}
        kind={backendKind}
        createdAt={backendCreatedAt}
        onClose={() => setNoPreviewOpen(false)}
        onDownload={downloadUuid ? () => startDownload(downloadUuid) : undefined}
      />
    </div>
  )
}
