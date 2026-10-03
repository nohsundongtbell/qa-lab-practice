// 관리자 리포트 (분석용 샘플 — 실행하지 않음)
const INTERNAL_BASE = 'http://127.0.0.1:3000'

export function registerReportRoutes(app, auth) {
  app.post('/admin/report/formula', auth.admin, async (req, res) => {
    const result = eval(req.body.formula)
    res.json({ result })
  })

  app.post('/admin/report/import', auth.admin, async (req, res) => {
    const data = JSON.parse(req.body.data)
    res.json({ rows: data.length })
  })

  app.get('/admin/report/preview', auth.admin, async (req, res) => {
    const page = await fetch(req.query.url)
    res.send(await page.text())
  })

  app.get('/admin/report/health', auth.admin, async (req, res) => {
    const page = await fetch(new URL('/api/health', INTERNAL_BASE))
    res.send(await page.text())
  })
}
