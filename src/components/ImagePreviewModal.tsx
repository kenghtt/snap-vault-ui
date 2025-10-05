import { useEffect } from 'react'
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'

interface ImagePreviewModalProps {
  open: boolean
  url: string | null
  alt?: string
  onClose: () => void
}

export default function ImagePreviewModal({ open, url, alt = 'Image preview', onClose }: ImagePreviewModalProps) {
  // Close on Escape no matter what has focus
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

  if (!open || !url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/40 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-[min(96vw,1400px)] h-[min(90vh,900px)] bg-base-100 border border-base-300 rounded-box shadow-xl overflow-hidden flex items-center justify-center p-4">
        {/* Constrain image area */}
        <div className="max-w-full max-h-full">
          <Zoom>
            <img
              src={url}
              alt={alt}
              className="max-w-full max-h-[78vh] object-contain rounded-md cursor-zoom-in"
            />
          </Zoom>
        </div>
      </div>
    </div>
  )
}
