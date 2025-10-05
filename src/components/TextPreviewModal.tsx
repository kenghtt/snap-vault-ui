import { useEffect, useMemo, useState } from 'react'
import type { PastedEntry } from './DropZone'

interface TextPreviewModalProps {
  open: boolean
  entry: PastedEntry | null
  onClose: () => void
}

type TextKind = 'plain' | 'json' | 'csv' | 'md'

const MAX_CHARS = 100_000
const MAX_LINES = 5000
const MAX_CSV_ROWS = 500
const MAX_CSV_COLS = 50

function detectKind(mime?: string, name?: string): TextKind {
  const m = (mime || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (m.startsWith('application/json') || n.endsWith('.json')) return 'json'
  if (m.startsWith('text/csv') || n.endsWith('.csv')) return 'csv'
  if (m.includes('markdown') || n.endsWith('.md')) return 'md'
  if (m.startsWith('text/')) return 'plain'
  // Fallback by extension
  if (n.endsWith('.txt') || n.endsWith('.log')) return 'plain'
  return 'plain'
}

function clampText(input: string): { text: string; truncated: boolean } {
  let truncated = false
  let text = input
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS)
    truncated = true
  }
  const lines = text.split(/\r?\n/)
  if (lines.length > MAX_LINES) {
    text = lines.slice(0, MAX_LINES).join('\n')
    truncated = true
  }
  return { text, truncated }
}

function parseCsvSubset(text: string): { rows: string[][]; truncatedRows: boolean; truncatedCols: boolean } {
  // Naive CSV parser for MVP: split by lines, then by commas.
  // Handles quoted commas very simply ("...") but not full RFC. Good enough for small demos.
  const rows: string[][] = []
  let truncatedRows = false
  let truncatedCols = false
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < Math.min(lines.length, MAX_CSV_ROWS); i++) {
    const line = lines[i]
    const cols: string[] = []
    let cur = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (ch === '"') {
        // Toggle quote state or escape double quote
        if (inQuotes && line[j + 1] === '"') {
          cur += '"'
          j++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur)
        cur = ''
        if (cols.length >= MAX_CSV_COLS) {
          truncatedCols = true
          // skip remaining
          cur = ''
          // consume rest quickly
          // break to stop reading more cells on this line
          // but ensure we finish loop to not mis-handle quotes
          // we can just break because remaining content is ignored
          break
        }
      } else {
        cur += ch
      }
    }
    cols.push(cur)
    rows.push(cols.slice(0, MAX_CSV_COLS))
  }
  if (lines.length > MAX_CSV_ROWS) truncatedRows = true
  return { rows, truncatedRows, truncatedCols }
}

export default function TextPreviewModal({ open, entry, onClose }: TextPreviewModalProps) {
  const [rawText, setRawText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wrap, setWrap] = useState(true)

  const name = useMemo(() => {
    if (!entry) return ''
    if (entry.kind === 'text') return entry.displayName || 'Text snippet'
    return entry.displayName || entry.name || 'Untitled'
  }, [entry])

  const kind: TextKind = useMemo(() => {
    if (!entry) return 'plain'
    if (entry.kind === 'text') return 'plain'
    return detectKind(entry.mime, entry.name)
  }, [entry])

  useEffect(() => {
    let alive = true
    async function load() {
      setError(null)
      setLoading(true)
      try {
        if (!entry) {
          setRawText('')
          return
        }
        if (entry.kind === 'text') {
          setRawText(entry.text)
        } else if (entry.kind === 'file') {
          if (entry.file) {
            const txt = await entry.file.text()
            if (!alive) return
            setRawText(txt)
          } else if (entry.url) {
            // Try fetch text if CORS allows
            const res = await fetch(entry.url)
            const txt = await res.text()
            if (!alive) return
            setRawText(txt)
          } else {
            setError('No readable source for this file.')
          }
        }
      } catch {
        setError('Failed to load text content.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    if (open) load()
    return () => { alive = false }
  }, [open, entry])

  const { text: limited, truncated } = useMemo(() => clampText(rawText), [rawText])

  const jsonPretty = useMemo(() => {
    if (kind !== 'json') return null
    try {
      const obj = JSON.parse(rawText)
      return JSON.stringify(obj, null, 2)
    } catch {
      return null
    }
  }, [kind, rawText])

  const csvData = useMemo(() => {
    if (kind !== 'csv') return null
    return parseCsvSubset(rawText)
  }, [kind, rawText])

  if (!open || !entry) return null

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
          <div className="font-semibold truncate pr-4" title={name}>{name}</div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={() => setWrap((w) => !w)} aria-label="Toggle wrap">{wrap ? 'No wrap' : 'Wrap'}</button>
            <button
              className="btn btn-sm"
              onClick={() => navigator.clipboard.writeText(jsonPretty ?? limited)}
              aria-label="Copy"
            >Copy</button>
            <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="p-4">Loading…</div>
          ) : error ? (
            <div className="p-4 text-error">{error}</div>
          ) : kind === 'csv' && csvData ? (
            <div className="overflow-auto">
              <table className="table table-zebra table-sm text-left">
                <tbody>
                  {csvData.rows.map((r, i) => (
                    <tr key={i}>
                      {r.slice(0, MAX_CSV_COLS).map((c, j) => (
                        <td key={j} className="whitespace-pre">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(csvData.truncatedRows || csvData.truncatedCols) && (
                <div className="mt-2 text-xs opacity-70">
                  Preview truncated {csvData.truncatedRows ? `(rows > ${MAX_CSV_ROWS})` : ''} {csvData.truncatedCols ? `(cols > ${MAX_CSV_COLS})` : ''}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`text-sm ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-auto'} text-left`}
              style={{ tabSize: 2 }}
            >
{jsonPretty ?? limited}
            </div>
          )}
          {truncated && kind !== 'csv' && (
            <div className="mt-2 text-xs opacity-70">Preview truncated to {MAX_LINES} lines / {MAX_CHARS} characters.</div>
          )}
        </div>
      </div>
    </div>
  )
}
