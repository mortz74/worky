const STATUS = {
  todo:       ['badge-todo',       'To Do'],
  inprogress: ['badge-inprogress', 'In Progress'],
  review:     ['badge-review',     'In Review'],
  done:       ['badge-done',       'Done'],
  blocked:    ['badge-blocked',    'Blocked'],
  active:     ['badge-active',     'Active'],
  archive:    ['badge-archive',    'Archive'],
}

export default function StatusBadge({ status }) {
  const [cls, label] = STATUS[status] || ['badge-todo', status]
  return <span className={`badge badge-dot ${cls}`}>{label}</span>
}
