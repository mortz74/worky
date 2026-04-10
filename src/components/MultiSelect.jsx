import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * MultiSelect — dropdown with checkboxes, shows selected items as pills.
 *
 * Props:
 *   options      [{id, label, prefix?}]   all available options
 *   value        string[]                 currently selected ids
 *   onChange     (ids: string[]) => void  called on every change
 *   placeholder  string                   shown when nothing selected
 */
export default function MultiSelect({ options = [], value = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const ref = useRef(null)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const h = e => {
      // Close only if the click is outside BOTH the trigger and the portal dropdown
      if (
        ref.current && !ref.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open) {
      // Measure trigger position to place dropdown via fixed positioning (escapes overflow clipping)
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
      }
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const toggle = id => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  const selected = options.filter(o => value.includes(o.id))
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const dropdown = open && createPortal(
    <div ref={dropdownRef} style={{
      position: 'fixed',
      top: dropdownPos.top,
      left: dropdownPos.left,
      width: dropdownPos.width,
      background: 'var(--white)', border: '1px solid var(--slate-200)',
      borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 9999,
    }}>
      {/* Search input */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--slate-100)' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onClick={e => e.stopPropagation()}
          placeholder="Type to filter…"
          style={{
            width: '100%', border: 'none', outline: 'none', fontSize: 13,
            color: 'var(--slate-800)', background: 'transparent',
          }}
        />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0
          ? <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--slate-400)' }}>No matches</div>
          : filtered.map(o => (
              <label key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', cursor: 'pointer',
                background: value.includes(o.id) ? 'var(--blue-50)' : 'transparent',
                transition: 'background .1s',
              }}>
                <input
                  type="checkbox"
                  checked={value.includes(o.id)}
                  onChange={() => toggle(o.id)}
                  style={{ accentColor: 'var(--blue-600)', flexShrink: 0 }}
                />
                {o.prefix && <span style={{ fontSize: 15 }}>{o.prefix}</span>}
                <span style={{ fontSize: 13, fontWeight: value.includes(o.id) ? 600 : 400, color: 'var(--slate-800)' }}>
                  {o.label}
                </span>
              </label>
            ))
        }
      </div>
    </div>,
    document.body
  )

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 38, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
          padding: '5px 10px', border: '1px solid var(--slate-200)', borderRadius: 6,
          background: 'var(--white)', cursor: 'pointer', userSelect: 'none', fontSize: 13,
        }}
      >
        {selected.length === 0
          ? <span style={{ color: 'var(--slate-400)', flex: 1 }}>{placeholder}</span>
          : selected.map(o => (
              <span key={o.id} style={{
                background: 'var(--blue-100)', color: 'var(--blue-700)',
                fontSize: 11, fontWeight: 600, padding: '2px 6px 2px 8px',
                borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {o.prefix && <span>{o.prefix} </span>}
                {o.label}
                <span
                  onClick={e => { e.stopPropagation(); toggle(o.id) }}
                  style={{ cursor: 'pointer', opacity: 0.6, fontSize: 13, lineHeight: 1, marginLeft: 1 }}
                >×</span>
              </span>
            ))
        }
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ width: 13, height: 13, marginLeft: 'auto', color: 'var(--slate-400)', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {dropdown}
    </div>
  )
}
