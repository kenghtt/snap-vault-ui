import { useEffect } from 'react'

interface NoPreviewModalProps {
  open: boolean
  name?: string
  kind?: string
  createdAt?: string
  sizeLabel?: string
  onClose: () => void
  onDownload?: () => void
}

export default function NoPreviewModal({ open, name = 'Item', kind, createdAt, sizeLabel, onClose, onDownload }: NoPreviewModalProps) {
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/50 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[min(96vw,800px)] bg-base-100 border border-base-300 rounded-box shadow-xl">
        <div className="px-4 py-2 border-b border-base-300 flex items-center justify-between">
          <div className="font-semibold truncate pr-4" title={name}>{name}</div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button className="btn btn-sm" onClick={onDownload} aria-label="Download">Download</button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded bg-base-200 flex items-center justify-center">
            <span className="text-3xl">📁</span>
          </div>
          <div className="flex-1">
            <div className="text-base">No preview available for this item.</div>
            <div className="text-sm text-base-content/70 mt-1">
              {kind && <span className="mr-3">Type: {kind}</span>}
              {createdAt && <span className="mr-3">Uploaded: {new Date(createdAt).toLocaleString()}</span>}
              {sizeLabel && <span>Size: {sizeLabel}</span>}
            </div>
            <div className="mt-3">
              {onDownload && <button className="btn" onClick={onDownload}>Download</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
