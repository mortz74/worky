import { useState, useEffect, useRef } from 'react'

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
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = id => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  const selected = options.filter(o => value.includes(o.id))

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

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--white)', border: '1px solid var(--slate-200)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 500,
          maxHeight: 220, overflowY: 'auto',
        }}>
          {options.length === 0
            ? <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--slate-400)' }}>No options available</div>
            : options.map(o => (
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
      )}
    </div>
  )
}
