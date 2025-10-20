import { useEffect } from 'react'

interface BackendTextPreviewModalProps {
  open: boolean
  name?: string
  text: string
  truncated?: boolean
  onClose: () => void
  onDownload?: () => void
}

export default function BackendTextPreviewModal({ open, name = 'Text preview', text, truncated = false, onClose, onDownload }: BackendTextPreviewModalProps) {
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
      <div className="w-[min(96vw,1000px)] h-[min(92vh,800px)] bg-base-100 border border-base-300 rounded-box shadow-xl flex flex-col">
        <div className="px-4 py-2 border-b border-base-300 flex items-center justify-between">
          <div className="font-semibold truncate pr-4" title={name}>{name}{truncated ? ' (preview)' : ''}</div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button className="btn btn-sm" onClick={onDownload} aria-label="Download">Download</button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="whitespace-pre-wrap break-words text-sm">{text}</pre>
          {truncated && (
            <div className="mt-2 text-xs text-base-content/70">Preview truncated. Use Download to get full content.</div>
          )}
        </div>
      </div>
    </div>
  )
}
