"""t1 모범 답안 — 로그인은 사용자당 한 번, 준비(주문 만들기)는 테스트 시작 때 한 번, 사용자 행동은 가중치로."""
import os

import requests
from locust import HttpUser, between, events, task

# 채점기·비교 실행이 결함 집합을 정한다. 직접 실행할 때는 비어 있어 앱의 프로필을 그대로 따른다.
DEFECTS = os.environ.get("QA_LAB_DEFECTS")


@events.test_start.add_listener
def prepare(environment, **_kwargs):
    # 주문 목록 응답 시간은 주문 수에 따라 달라질 수 있다. 회원 lee 에게 주문 8건을 한 번만 만들어 둔다 (fixture API, 로컬 전용).
    for _ in range(8):
        requests.post(
            f"{environment.host}/__admin/fixtures/orders",
            json={"email": "lee@example.com", "status": "PENDING", "items": [{"productId": 3, "qty": 1}]},
            timeout=10,
        ).raise_for_status()


class Shopper(HttpUser):
    wait_time = between(0.1, 0.5)  # 사용자는 요청 사이에 잠깐 생각한다 (think time)

    def on_start(self):
        if DEFECTS is not None:
            self.client.headers["X-QA-Lab-Defects"] = DEFECTS
        # 로그인은 사용자당 한 번. 매 요청마다 로그인하면 로그인 API 를 부하 시험하게 된다.
        r = self.client.post("/api/auth/login", json={"email": "lee@example.com", "password": "qa-lab-1234"})
        self.client.headers["Authorization"] = f"Bearer {r.json()['token']}"

    @task(5)
    def browse_products(self):
        self.client.get("/api/products")

    @task(3)
    def check_price(self):
        self.client.post("/api/quote", json={"items": [{"productId": 1, "qty": 1}]})

    @task(2)
    def my_orders(self):
        self.client.get("/api/orders")
