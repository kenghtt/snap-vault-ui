

import { useEffect, useRef, useState, type DragEvent } from 'react'

export type PastedEntry =
  | { kind: 'text'; text: string; displayName?: string }
  | { kind: 'file'; mime: string; name?: string; size?: number; displayName?: string; file?: File; url?: string }

interface DropZoneProps {
  onEntries: (entries: PastedEntry[]) => void
}

export default function DropZone({ onEntries }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const dropRef = useRef<HTMLDivElement | null>(null)

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
      if (dt.files && dt.files.length > 0) {
        Array.from(dt.files).forEach((file) => {
          const url = URL.createObjectURL(file)
          entries.push({ kind: 'file', mime: file.type || 'application/octet-stream', name: file.name, size: file.size, file, url })
        })
      }
      const text = dt.getData && dt.getData('text/plain')
      if (text && text.trim().length > 0) {
        entries.push({ kind: 'text', text })
      }
      if (dt.items && dt.items.length > 0 && (!dt.files || dt.files.length === 0)) {
        Array.from(dt.items).forEach((item) => {
          if (item.kind === 'file') {
            const file = item.getAsFile()
            if (file) {
              const url = URL.createObjectURL(file)
              entries.push({ kind: 'file', mime: file.type || item.type || 'application/octet-stream', name: file.name, size: file.size, file, url })
            }
          }
        })
      }
    }
    if (entries.length > 0) {
      onEntries(entries)
      setIsActive(true)
    }
  }

  // Paste handling when drop zone is active
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!isActive) return
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
            const url = URL.createObjectURL(file)
            entries.push({ kind: 'file', mime: file.type || 'application/octet-stream', name: file.name, size: file.size, file, url })
          })
        }
        if (dt.items && dt.items.length > 0 && (!dt.files || dt.files.length === 0)) {
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
        onEntries(entries)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isActive, onEntries])

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
    <div
      ref={dropRef}
      onClick={() => setIsActive(true)}
      className={
        'h-[70vh] w-full rounded-lg border-2 border-dashed flex items-center justify-center text-center transition-all duration-200 cursor-pointer ' +
        (isOver ? 'bg-info/10 border-info text-info ' : 'bg-base-200/60 border-info/60 text-primary ') +
        (isActive ? ' border-amber-400 shadow-[0_0_25px_4px_rgba(245,158,11,0.6)]' : '')
      }
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-pressed={isActive}
      role="button"
      title={isActive ? 'Active: Paste (Cmd/Ctrl+V) will go here' : 'Click to activate, then paste with Cmd/Ctrl+V'}
    >
      <div>
        <div className="text-3xl font-bold mb-2">↓ Drop to Save</div>
        <div className="opacity-80">Files, links, notes, screenshots</div>
        {isActive && (
          <div className="mt-3 text-sm text-amber-500">Active — Paste here with Cmd/Ctrl + V</div>
        )}
      </div>
    </div>
  )
}
