"""t3 모범 답안 — 요청 변조 / 응답 가로채기 / 상태를 가진 애드온."""
import json
import re

from mitmproxy import http

PRODUCT_DETAIL = re.compile(r"^/api/products/\d+$")
PAY = re.compile(r"^/api/orders/\d+/pay$")


class QaLabAddon:
    def __init__(self) -> None:
        self.count = 0  # 프록시를 지나간 요청 수 (상태)

    def request(self, flow: http.HTTPFlow) -> None:
        path = flow.request.path.split("?")[0]
        if flow.request.method == "GET" and PRODUCT_DETAIL.match(path):
            # 요청 변조: 클라이언트가 보낸 같은 헤더는 덮어쓴다
            flow.request.headers["X-QA-Lab-Defects"] = "DF-013"
        if flow.request.method == "POST" and PAY.match(path):
            # 응답 가로채기: flow.response 를 채우면 요청은 앱에 전달되지 않는다
            flow.response = http.Response.make(
                503,
                json.dumps({"code": "PAYMENT_GATEWAY_DOWN"}),
                {"Content-Type": "application/json"},
            )

    def response(self, flow: http.HTTPFlow) -> None:
        # response 훅은 직접 만든 응답에도 불린다 — 헤더 붙이기와 카운터는 여기서 한 번에
        self.count += 1
        flow.response.headers["X-Proxied-By"] = "qa-lab"
        flow.response.headers["X-Proxy-Count"] = str(self.count)


addons = [QaLabAddon()]
