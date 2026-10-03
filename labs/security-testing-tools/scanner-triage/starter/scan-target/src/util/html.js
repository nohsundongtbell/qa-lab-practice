// HTML 이스케이프 (분석용 샘플 — 실행하지 않음)
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => MAP[c])
}
