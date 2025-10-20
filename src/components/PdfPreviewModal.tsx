import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure pdf.js worker for Vite by importing worker as URL
// This keeps bundle small and works in dev/build
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string

interface PdfPreviewModalProps {
  open: boolean
  url: string | null
  onClose: () => void
  onDownload?: () => void
}

export default function PdfPreviewModal({ open, url, onClose, onDownload }: PdfPreviewModalProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.1)

  useEffect(() => {
    if (open) {
      setPageNumber(1)
      setScale(1.1)
    }
  }, [open])

  // Ensure Escape always closes, regardless of focus
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose])

  const onLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages)

  const canPrev = pageNumber > 1
  const canNext = numPages ? pageNumber < numPages : false

  if (!open || !url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/50 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="w-[min(96vw,1200px)] h-[min(92vh,900px)] bg-base-100 border border-base-300 rounded-box shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-2 border-b border-base-300 flex items-center justify-between">
          <div className="font-semibold">PDF Preview</div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} aria-label="Zoom out">−</button>
            <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
            <button className="btn btn-sm" onClick={() => setScale((s) => Math.min(3, s + 0.1))} aria-label="Zoom in">+</button>
            <div className="divider divider-horizontal m-0"></div>
            <button className="btn btn-sm" disabled={!canPrev} onClick={() => setPageNumber((p) => Math.max(1, p - 1))} aria-label="Prev page">◀</button>
            <span className="text-sm tabular-nums">
              {pageNumber} / {numPages ?? '…'}
            </span>
            <button className="btn btn-sm" disabled={!canNext} onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))} aria-label="Next page">▶</button>
            <div className="divider divider-horizontal m-0"></div>
            {onDownload && (
              <button className="btn btn-sm" onClick={onDownload} aria-label="Download">Download</button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-auto flex items-start justify-center bg-base-200/50">
          <div className="my-4">
            <Document file={url} onLoadSuccess={onLoadSuccess} loading={<div className="p-6">Loading PDF…</div>} error={<div className="p-6 text-error">Failed to load PDF.</div>}>
              <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={true} />
            </Document>
          </div>
        </div>
      </div>
    </div>
  )
}
