import { useState } from 'react'
import Pagination from './Pagination'

const fmt = d => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getDate = f => f.createdAt || f.created_at || ''

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

const ArchiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
)

const UnarchiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
    <polyline points="10 14 12 12 14 14"/><line x1="12" y1="12" x2="12" y2="17"/>
  </svg>
)

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

function SortIcon({ active, dir }) {
  if (!active) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ opacity: 0.3, marginLeft: 3 }}>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  )
  return dir === 'asc'
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10" style={{ marginLeft: 3, color: 'var(--blue-500)' }}><polyline points="5 12 12 5 19 12"/></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10" style={{ marginLeft: 3, color: 'var(--blue-500)' }}><polyline points="19 12 12 19 5 12"/></svg>
}

export default function FileList({ files = [], onAdd, onDelete, onArchive, onUnarchive }) {
  const [showArchived, setShowArchived] = useState(false)
  const [sortDir, setSortDir]           = useState('desc')
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(10)

  const visible = (showArchived ? files : files.filter(f => !f.archived))
    .slice()
    .sort((a, b) => {
      const da = getDate(a), db = getDate(b)
      return sortDir === 'desc' ? db.localeCompare(da) : da.localeCompare(db)
    })

  const archivedCount = files.filter(f => f.archived).length
  const paginated = visible.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = () => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1) }

  const thBase = { textAlign: 'left', padding: '8px 18px', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--slate-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-800)' }}>📎 Files</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--slate-100)', color: 'var(--slate-500)', borderRadius: 10, padding: '1px 7px' }}>
            {files.filter(f => !f.archived).length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {archivedCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--slate-500)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setPage(1) }} style={{ accentColor: 'var(--blue-500)', cursor: 'pointer' }} />
              Show Archived ({archivedCount})
            </label>
          )}
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onAdd}>+ Add File</button>
        </div>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
          {files.length === 0 ? 'No files attached yet.' : 'No active files. Turn on "Show Archived" to see archived files.'}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
              <th style={thBase}>File Name</th>
              <th style={thBase}>Description</th>
              <th
                style={{ ...thBase, cursor: 'pointer', userSelect: 'none', width: 120, color: 'var(--blue-600)' }}
                onClick={toggleSort}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  Date <SortIcon active={true} dir={sortDir} />
                </span>
              </th>
              <th style={{ ...thBase, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(file => (
              <tr key={file.id} style={{ borderBottom: '1px solid var(--slate-100)', opacity: file.archived ? 0.5 : 1, background: file.archived ? 'var(--slate-50)' : 'transparent' }}>
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
                      <span style={{ fontSize: 10, background: 'var(--slate-200)', color: 'var(--slate-500)', borderRadius: 4, padding: '1px 5px', fontWeight: 600, marginLeft: 2 }}>ARCHIVED</span>
                    )}
                  </a>
                </td>

                {/* Description */}
                <td style={{ padding: '10px 18px', fontSize: 12, color: 'var(--slate-500)', maxWidth: 280 }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {file.description || <span style={{ color: 'var(--slate-300)' }}>—</span>}
                  </span>
                </td>

                {/* Date */}
                <td style={{ padding: '10px 18px', fontSize: 12, color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
                  {fmt(getDate(file))}
                </td>

                {/* Actions */}
                <td style={{ padding: '10px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                    {file.archived ? (
                      <button className="btn btn-icon" style={{ padding: '5px 7px', color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center' }} onClick={() => onUnarchive(file.id)} title="Unarchive">
                        <UnarchiveIcon />
                      </button>
                    ) : (
                      <button className="btn btn-icon" style={{ padding: '5px 7px', color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center' }} onClick={() => onArchive(file.id)} title="Archive">
                        <ArchiveIcon />
                      </button>
                    )}
                    <button className="btn btn-icon" style={{ padding: '5px 7px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center' }} onClick={() => onDelete(file.id)} title="Remove">
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {visible.length > 0 && (
        <Pagination total={visible.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  )
}
