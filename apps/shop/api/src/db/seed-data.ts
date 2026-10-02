/**
 * 시드 데이터. 경계값 실습에 쓰기 좋도록 금액과 누적 구매액을 일부러 경계에 맞춰 두었다.
 * 학습자에게 공개되는 정보다(README의 "시드 계정" 표와 같은 내용).
 */
export const SEED_PASSWORD = 'qa-lab-1234'

export const seedMembers = [
  { email: 'admin@example.com', name: '관리자', zipcode: '04524', address: '서울 중구 세종대로 110', role: 'ADMIN', totalSpent: 0 },
  { email: 'kim@example.com', name: '김일반', zipcode: '06236', address: '서울 강남구 테헤란로 152', role: 'CUSTOMER', totalSpent: 0 },
  { email: 'lee@example.com', name: '이실버', zipcode: '48058', address: '부산 해운대구 센텀중앙로 79', role: 'CUSTOMER', totalSpent: 100_000 },
  { email: 'park@example.com', name: '박골드', zipcode: '34126', address: '대전 유성구 대학로 99', role: 'CUSTOMER', totalSpent: 500_000 },
  { email: 'choi@example.com', name: '최브이아이피', zipcode: '13529', address: '경기 성남시 분당구 판교역로 166', role: 'CUSTOMER', totalSpent: 1_000_000 },
  { email: 'jeju@example.com', name: '고제주', zipcode: '63309', address: '제주 제주시 첨단로 242', role: 'CUSTOMER', totalSpent: 0 },
] as const

export const seedProducts = [
  { name: '무선 키보드', price: 50_000, stock: 30 },
  { name: '무선 마우스', price: 25_000, stock: 50 },
  { name: '마우스 패드', price: 4_990, stock: 100 },
  { name: 'USB-C 케이블', price: 9_900, stock: 200 },
  { name: '노트북 거치대', price: 39_000, stock: 20 },
  { name: '모니터 암', price: 89_000, stock: 10 },
  { name: '기계식 키보드', price: 129_000, stock: 5 },
  { name: '웹캠', price: 49_999, stock: 15 },
  { name: '데스크 매트', price: 1_000, stock: 300 },
  { name: '한정판 머그컵', price: 15_000, stock: 1 },
  { name: '품절 텀블러', price: 22_000, stock: 0 },
  { name: '4K 모니터', price: 459_000, stock: 3 },
] as const

/**
 * 쿠폰. 유효 기간은 시드 시점(KST 오늘)을 기준으로 상대적으로 정한다.
 * offset 은 오늘로부터의 일 수.
 */
export const seedCoupons = [
  { code: 'WELCOME3000', type: 'FIXED', amount: 3_000, rate: null, maxDiscount: null, minOrderAmount: 20_000, from: -30, until: 365 },
  { code: 'SALE10', type: 'PERCENT', amount: null, rate: 10, maxDiscount: 5_000, minOrderAmount: 30_000, from: -30, until: 365 },
  { code: 'BIG20', type: 'PERCENT', amount: null, rate: 20, maxDiscount: 10_000, minOrderAmount: 0, from: -30, until: 365 },
  { code: 'FIXED10000', type: 'FIXED', amount: 10_000, rate: null, maxDiscount: null, minOrderAmount: 100_000, from: -30, until: 365 },
  { code: 'EXPIRED5000', type: 'FIXED', amount: 5_000, rate: null, maxDiscount: null, minOrderAmount: 0, from: -60, until: -1 },
  { code: 'SOON5000', type: 'FIXED', amount: 5_000, rate: null, maxDiscount: null, minOrderAmount: 0, from: 1, until: 30 },
] as const
