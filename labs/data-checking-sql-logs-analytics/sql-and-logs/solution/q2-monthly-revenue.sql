-- 월별 매출: 취소·환불을 뺀 주문의 합계 금액을 월(YYYY-MM)별로 합산
SELECT to_char(created_at, 'YYYY-MM') AS month, SUM(total_amount) AS revenue
FROM orders
WHERE status IN ('PAID', 'SHIPPED', 'DELIVERED')
GROUP BY 1
ORDER BY 1;
