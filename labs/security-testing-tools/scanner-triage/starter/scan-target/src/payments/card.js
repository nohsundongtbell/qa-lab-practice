// 카드 정보 저장 (분석용 샘플 — 실행하지 않음)
export async function saveCard(db, memberId, cardNumber) {
  await db.query('INSERT INTO cards (member_id, number) VALUES ($1, $2)', [memberId, cardNumber])
}

export async function saveCardLast4(db, memberId, cardNumber) {
  await db.query('INSERT INTO cards (member_id, last4) VALUES ($1, $2)', [memberId, cardNumber.slice(-4)])
}
