import { useState } from 'react'

// Link icon SVG
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

// Archive icon SVG
const ArchiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
)

export default function FileList({ files = [], onAdd, onDelete, onArchive, onUnarchive }) {
  const [showArchived, setShowArchived] = useState(false)

  const visible = showArchived ? files : files.filter(f => !f.archived)
  const archivedCount = files.filter(f => f.archived).length

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--slate-200)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-800)' }}>📎 Files</span>
          <span style={{
            fontSize: 11, fontWeight: 700, background: 'var(--slate-100)',
            color: 'var(--slate-500)', borderRadius: 10, padding: '1px 7px',
          }}>
            {files.filter(f => !f.archived).length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Show Archived toggle */}
          {archivedCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--slate-500)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                style={{ accentColor: 'var(--blue-500)', cursor: 'pointer' }}
              />
              Show Archived ({archivedCount})
            </label>
          )}

          {/* Add File button */}
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onAdd}>
            + Add File
          </button>
        </div>
      </div>

      {/* File table */}
      {visible.length === 0 ? (
        <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
          {files.length === 0 ? 'No files attached yet.' : 'No active files. Turn on "Show Archived" to see archived files.'}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
              <th style={{ textAlign: 'left', padding: '8px 18px', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>File Name</th>
              <th style={{ textAlign: 'left', padding: '8px 18px', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '8px 18px', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(file => (
              <tr
                key={file.id}
                style={{
                  borderBottom: '1px solid var(--slate-100)',
                  opacity: file.archived ? 0.5 : 1,
                  background: file.archived ? 'var(--slate-50)' : 'transparent',
                  transition: 'background .15s',
                }}
              >
                {/* File Name */}
                <td style={{ padding: '10px 18px', maxWidth: 220 }}>
                  <a
                    href={file.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--blue-600)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <LinkIcon />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    {file.archived && (
                      <span style={{ fontSize: 10, background: 'var(--slate-200)', color: 'var(--slate-500)', borderRadius: 4, padding: '1px 5px', fontWeight: 600, marginLeft: 2 }}>
                        ARCHIVED
                      </span>
                    )}
                  </a>
                </td>

                {/* Description */}
                <td style={{ padding: '10px 18px', fontSize: 12, color: 'var(--slate-500)', maxWidth: 280 }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {file.description || <span style={{ color: 'var(--slate-300)' }}>—</span>}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '10px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    {/* Open */}
                    <a
                      href={file.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '3px 10px', textDecoration: 'none', display: 'inline-block' }}
                    >
                      Open
                    </a>

                    {/* Archive / Unarchive */}
                    {file.archived ? (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onUnarchive(file.id)}
                        title="Unarchive"
                      >
                        <ArchiveIcon /> Unarchive
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onArchive(file.id)}
                        title="Archive"
                      >
                        <ArchiveIcon /> Archive
                      </button>
                    )}

                    {/* Remove (unlink from entity) */}
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '3px 10px', color: '#ef4444', borderColor: '#fecaca' }}
                      onClick={() => onDelete(file.id)}
                      title="Remove from this page"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
