-- 합계 불일치: 저장된 합계 ≠ 품목 합계 − 등급 할인 − 쿠폰 할인 + 배송비
SELECT o.id
FROM orders o
JOIN (SELECT order_id, SUM(line_total) AS items_sum FROM order_items GROUP BY order_id) i ON i.order_id = o.id
WHERE o.total_amount <> i.items_sum - o.grade_discount - o.coupon_discount + o.shipping_fee
ORDER BY o.id;
