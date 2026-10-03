// 주문 조회·수정 라우트 (분석용 샘플 — 실행하지 않음)
export function registerOrderRoutes(app, db, auth) {
  app.get('/orders/:id', auth.required, async (req, res) => {
    const rows = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id])
    res.json(rows[0] ?? null)
  })

  app.get('/my/orders/:id', auth.required, async (req, res) => {
    const rows = await db.query('SELECT * FROM orders WHERE id = $1 AND member_id = $2', [req.params.id, req.user.id])
    res.json(rows[0] ?? null)
  })

  app.patch('/my/orders/:id', auth.required, async (req, res) => {
    const order = await loadOwnOrder(db, req.params.id, req.user.id)
    Object.assign(order, req.body)
    await saveOrder(db, order)
    res.json(order)
  })
}

async function loadOwnOrder(db, id, memberId) {
  const rows = await db.query('SELECT * FROM orders WHERE id = $1 AND member_id = $2', [id, memberId])
  return rows[0]
}

async function saveOrder(db, order) {
  await db.query('UPDATE orders SET status = $2, total = $3 WHERE id = $1', [order.id, order.status, order.total])
}
