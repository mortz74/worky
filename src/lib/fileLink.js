import { sb } from './supabase'

// Mirrors the generated files.link_key column (see DB) so duplicates can be found client-side
export function linkKey(link = '') {
  const m = re => (link.match(re) || [])[1]
  const gmail = m(/mail\.google\.com\/.*#[^/]+\/([A-Za-z0-9]{10,})/)
  return m(/\/d\/([A-Za-z0-9_-]{20,})/)
    || m(/\/folders\/([A-Za-z0-9_-]{20,})/)
    || m(/[?&]id=([A-Za-z0-9_-]{20,})/)
    || (gmail ? 'gmail:' + gmail : null)
    || link.trim()
    || null
}

export async function findFileByLink(link) {
  const key = linkKey(link)
  if (!key) return null
  const { data } = await sb.from('files').select('*').eq('link_key', key).limit(1)
  return data?.[0] || null
}
