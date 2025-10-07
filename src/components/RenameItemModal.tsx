import { type PastedEntry } from './DropZone'

interface RenameItemModalProps {
  open: boolean
  pendingEntry: PastedEntry | null
  name: string
  onNameChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
  uploading: boolean
  uploadError: string | null
}

export default function RenameItemModal({
  open,
  pendingEntry,
  name,
  onNameChange,
  onCancel,
  onSubmit,
  uploading,
  uploadError,
}: RenameItemModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-base-300/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="bg-base-100 border border-base-300 rounded-box shadow-xl p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Name this item</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <input
            type="text"
            className="input input-bordered w-full mb-2"
            placeholder={
              pendingEntry?.kind === 'file'
                ? (pendingEntry?.name || 'Untitled')
                : (pendingEntry && 'text' in pendingEntry ? pendingEntry.text?.slice(0, 40) || 'Untitled' : 'Untitled')
            }
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
              }
            }}
            autoFocus
            disabled={uploading}
          />
          {uploadError && (
            <div className="text-error text-sm mb-2">{uploadError}</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={`btn ${uploading ? 'btn-disabled' : ''}`} onClick={onCancel} disabled={uploading}>Cancel</button>
            <button type="submit" className={`btn btn-primary ${uploading ? 'loading' : ''}`} disabled={uploading}>{uploading ? 'Uploading' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
