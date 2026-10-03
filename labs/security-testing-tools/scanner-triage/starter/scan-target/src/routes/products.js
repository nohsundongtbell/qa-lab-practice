// 상품 검색·상세 라우트 (분석용 샘플 — 실행하지 않음)
import { escapeHtml } from '../util/html.js'

export function registerProductRoutes(app, db) {
  app.get('/products/search', async (req, res) => {
    const rows = await db.query("SELECT id, name, price FROM products WHERE name LIKE '%" + req.query.q + "%'")
    res.json(rows)
  })

  app.get('/products/:id', async (req, res) => {
    const rows = await db.query('SELECT id, name, price FROM products WHERE id = $1', [req.params.id])
    res.json(rows[0] ?? null)
  })

  app.get('/products/search-page', async (req, res) => {
    res.send('<h1>검색 결과: ' + req.query.q + '</h1>')
  })

  app.get('/products/search-page-safe', async (req, res) => {
    res.send('<h1>검색 결과: ' + escapeHtml(req.query.q) + '</h1>')
  })
}
