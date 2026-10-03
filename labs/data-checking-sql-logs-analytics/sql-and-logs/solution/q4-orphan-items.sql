-- 고아 주문 품목: 가리키는 주문이 없는 order_items (LEFT JOIN 후 짝이 없는 행)
SELECT i.id
FROM order_items i
LEFT JOIN orders o ON o.id = i.order_id
WHERE o.id IS NULL
ORDER BY i.id;
