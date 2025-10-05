import type { PastedEntry } from './DropZone'

export default function PastedItemsSidebar({ items, onItemClick }: { items: PastedEntry[]; onItemClick?: (entry: PastedEntry, index: number) => void }) {
  return (
    <aside className="w-[22%] max-w-sm min-w-[260px] bg-base-200 border-l border-base-300 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3">Pasted Items</h3>
      {items.length === 0 ? (
        <div className="text-sm text-base-content/60">
          Click the Drop to Save area to activate it, then paste with Cmd/Ctrl + V.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((entry, idx) => (
            <li key={idx}>
              <button type="button" onClick={() => onItemClick?.(entry, idx)} className="w-full text-left p-3 rounded-box bg-base-100 border border-base-300 hover:border-primary hover:shadow transition">
                {entry.kind === 'text' ? (
                  <div>
                    <div className="text-xs uppercase opacity-60 mb-1">Text</div>
                    {entry.displayName ? (
                      <div className="text-xs opacity-70 mb-1">Name: {entry.displayName}</div>
                    ) : null}
                    <div className="whitespace-pre-wrap break-words text-sm max-h-40 overflow-auto">{entry.text}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs uppercase opacity-60 mb-1">Clipboard File</div>
                    <div className="text-sm">
                      Type: <span className="font-mono">{entry.mime}</span>
                    </div>
                    {(entry.displayName || entry.name) ? (
                      <div className="text-xs opacity-70">Name: {entry.displayName ?? entry.name}</div>
                    ) : null}
                    {typeof entry.size === 'number' ? (
                      <div className="text-xs opacity-70">Size: {Math.round((entry.size as number) / 1024)} KB</div>
                    ) : null}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
