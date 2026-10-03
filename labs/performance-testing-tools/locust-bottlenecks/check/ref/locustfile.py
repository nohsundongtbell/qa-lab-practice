"""채점기가 병목 판정에 쓰는 기준 부하 시나리오 (학습자 locustfile 과 별개). 채점 전용."""
import os

import requests
from locust import HttpUser, between, events, task

DEFECTS = os.environ.get("QA_LAB_DEFECTS")


@events.test_start.add_listener
def prepare(environment, **_kwargs):
    # 주문 목록 응답 시간은 주문 수에 비례할 수 있으므로, 회원 lee 에게 주문 8건(10건 이하)을 만들어 둔다.
    for _ in range(8):
        requests.post(
            f"{environment.host}/__admin/fixtures/orders",
            json={"email": "lee@example.com", "status": "PENDING", "items": [{"productId": 3, "qty": 1}]},
            timeout=10,
        ).raise_for_status()


class Shopper(HttpUser):
    wait_time = between(0.05, 0.15)

    def on_start(self):
        if DEFECTS is not None:
            self.client.headers["X-QA-Lab-Defects"] = DEFECTS
        r = self.client.post("/api/auth/login", json={"email": "lee@example.com", "password": "qa-lab-1234"})
        self.client.headers["Authorization"] = f"Bearer {r.json()['token']}"

    @task(3)
    def products(self):
        self.client.get("/api/products")

    @task(2)
    def quote(self):
        self.client.post("/api/quote", json={"items": [{"productId": 1, "qty": 1}]})

    @task(1)
    def orders(self):
        self.client.get("/api/orders")
