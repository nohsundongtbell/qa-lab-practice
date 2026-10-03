-- 구매액 상위 3명 (취소·환불 제외)
SELECT member_id, SUM(total_amount) AS total
FROM orders
WHERE status IN ('PAID', 'SHIPPED', 'DELIVERED')
GROUP BY member_id
ORDER BY total DESC
LIMIT 3;
