"""t3. mitmproxy 애드온 — 앱 앞에서 요청·응답을 가로채 바꿉니다.

채점기가 이 파일로 mitmproxy(리버스 프록시 모드)를 띄우고, 프록시 주소로 요청을 보내 아래 동작을 확인합니다.

  1. 모든 응답에 헤더 X-Proxied-By: qa-lab 을 붙인다. (본문은 그대로)
  2. 상품 상세(GET /api/products/<숫자>) 요청에 헤더 X-QA-Lab-Defects: DF-013 을 넣는다.
     (클라이언트가 보낸 같은 헤더는 덮어쓴다. 앱은 이 헤더로 이 요청에만 결함을 켠다.)
  3. 결제 요청(POST /api/orders/<id>/pay)은 앱에 보내지 않고,
     503 상태와 JSON 본문 {"code": "PAYMENT_GATEWAY_DOWN"} 으로 직접 답한다.
  4. 프록시를 지나간 요청 수를 응답 헤더 X-Proxy-Count 에 적는다. (요청마다 1씩 늘어난다)

참고: https://docs.mitmproxy.org/stable/addons-overview/
"""
from mitmproxy import http


class QaLabAddon:
    def request(self, flow: http.HTTPFlow) -> None:
        # 앱으로 가기 전의 요청. flow.request.method, .path, .headers 를 읽고 고칠 수 있다.
        pass

    def response(self, flow: http.HTTPFlow) -> None:
        # 앱에서 돌아온 응답. flow.response.headers, .text 를 읽고 고칠 수 있다.
        pass


addons = [QaLabAddon()]
