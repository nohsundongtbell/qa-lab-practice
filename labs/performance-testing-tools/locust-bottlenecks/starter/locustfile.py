"""t1. 쇼핑 사용자의 부하 시나리오를 작성하세요.

시나리오 (채점기가 Locust 를 헤드리스로 실행해 확인합니다):
  - 상품 목록 보기   GET  /api/products
  - 금액 미리보기    POST /api/quote       (로그인 필요)
  - 내 주문 목록     GET  /api/orders      (로그인 필요)
규칙:
  - 로그인(POST /api/auth/login)은 사용자당 한 번만 (on_start). 요청마다 로그인하지 않습니다.
  - 내 주문 목록의 응답 시간은 주문 수에 따라 달라질 수 있습니다. 회원에게 주문을 몇 건 만들어 두세요.
    fixture API 를 쓰면 한 번에 만들 수 있습니다: POST {host}/__admin/fixtures/orders
    { "email": "lee@example.com", "status": "PENDING", "items": [{ "productId": 3, "qty": 1 }] }
  - 환경 변수 QA_LAB_DEFECTS 가 있으면 요청 헤더 X-QA-Lab-Defects 로 보내세요 (결함 집합을 직접 정해 비교할 때 씁니다).
참고: https://docs.locust.io/en/stable/writing-a-locustfile.html
"""
from locust import HttpUser, between, task


class Shopper(HttpUser):
    wait_time = between(0.1, 0.5)

    @task
    def browse_products(self):
        self.client.get("/api/products")

    # TODO: on_start 에서 로그인하고, quote 와 orders 작업을 더하세요.
