-- 상태(status)별 주문 수
SELECT status, COUNT(*) AS cnt
FROM orders
GROUP BY status;
