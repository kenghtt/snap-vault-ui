import { forwardRef, useMemo } from 'react'
import type { ChangeEvent } from 'react'

export interface SearchInputProps {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  placeholder?: string
  results?: string[]
  showDropdown?: boolean
  size?: 'md' | 'lg'
  autoFocus?: boolean
  inputId?: string
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, onClear, placeholder = 'Search...', results = [], showDropdown = false, size = 'md', autoFocus = false, inputId },
  ref
) {
  const hasQuery = value.trim().length > 0
  const inputSizeClass = size === 'lg' ? 'input-lg' : ''
  const btnSizeClass = size === 'lg' ? 'btn-lg' : ''

  const dropdown = useMemo(() => {
    if (!showDropdown || !hasQuery) return null
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-base-100 border border-base-300 rounded-box shadow-lg max-h-64 overflow-auto z-10">
        {results.length ? (
          <ul className="menu menu-sm">
            {results.map((it, idx) => (
              <li key={idx}><button type="button" className="justify-start">{it}</button></li>
            ))}
          </ul>
        ) : (
          <div className="p-3 text-sm text-base-content/60">No results</div>
        )}
      </div>
    )
  }, [showDropdown, hasQuery, results])

  return (
    <div className="relative w-full">
      <div className="join w-full">
        <input
          id={inputId}
          ref={ref}
          type="text"
          className={`input input-bordered ${inputSizeClass} join-item w-full`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
        />
        {hasQuery ? (
          <button type="button" className={`btn btn-ghost ${btnSizeClass} join-item`} onClick={onClear} aria-label="Clear search">✕</button>
        ) : (
          <button type="button" className={`btn btn-ghost ${btnSizeClass} join-item`} disabled>🔍</button>
        )}
      </div>
      {dropdown}
    </div>
  )
})

export default SearchInput
