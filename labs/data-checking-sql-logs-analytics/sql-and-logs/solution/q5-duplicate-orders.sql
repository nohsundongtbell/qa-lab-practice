-- 중복 주문: 같은 회원·같은 금액으로 10초 안에 먼저 들어온 주문이 있는 주문 (나중 주문의 id)
SELECT o.id
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM orders e
  WHERE e.id < o.id
    AND e.member_id = o.member_id
    AND e.total_amount = o.total_amount
    AND abs(extract(epoch FROM (o.created_at - e.created_at))) <= 10
)
ORDER BY o.id;
