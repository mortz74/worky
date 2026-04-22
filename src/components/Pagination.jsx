export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderTop: '1px solid var(--slate-100)',
      fontSize: 13, color: 'var(--slate-500)',
    }}>
      {/* Left: count + page size picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>{total === 0 ? '0 items' : `${from}–${to} of ${total}`}</span>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
          style={{
            fontSize: 12, padding: '3px 6px', border: '1px solid var(--slate-200)',
            borderRadius: 6, background: 'var(--white)', color: 'var(--slate-600)',
            cursor: 'pointer',
          }}
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
        </select>
      </div>

      {/* Right: prev / page numbers / next */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PageBtn onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹</PageBtn>

        {pageNumbers(page, totalPages).map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--slate-400)' }}>…</span>
            : <PageBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PageBtn>
        )}

        <PageBtn onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>›</PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 30, padding: '0 6px',
        border: '1px solid', borderRadius: 6,
        fontSize: 13, fontWeight: active ? 700 : 500, cursor: disabled ? 'default' : 'pointer',
        borderColor: active ? 'var(--blue-500)' : 'var(--slate-200)',
        background: active ? 'var(--blue-50)' : 'var(--white)',
        color: active ? 'var(--blue-600)' : disabled ? 'var(--slate-300)' : 'var(--slate-600)',
      }}
    >
      {children}
    </button>
  )
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
