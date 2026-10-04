/**
 * ⚠️ 채점기 전용 정답 데이터 (스포일러). README 에서 링크하지 않는다.
 * 기준: 결함 프로필 advanced(웹 결함 DF-020~026 모두 켜짐), 화면 v1.
 * 화면에서 실제로 이렇게 나오는지는 t1 채점(결함 하나씩 켜서 귀속)과 test:labs 의 solution 통과로 확인한다.
 */

/** 점검 대상 화면 (분류표·체크리스트의 page 값) */
export const PAGES = ['signup', 'login', 'products', 'cart', 'orders', 'order-detail']

export const CATEGORIES = ['violation', 'false-positive', 'needs-review']

/**
 * t2: axe 결과 항목 → 올바른 분류. 학습자 행은 rule 이 같고 target 조건을 만족하면 그 항목으로 본다.
 * (같은 문제가 여러 화면에 나오면 여러 행이어도 된다 — 모두 같은 분류여야 한다)
 */
export const TRIAGE_TRUTH = [
  { key: 'image-alt', rule: 'image-alt', category: 'violation', defect: 'DF-020' },
  { key: 'label', rule: 'label', category: 'violation', defect: 'DF-021' },
  { key: 'color-contrast/stock', rule: 'color-contrast', target: (t) => !/promo/.test(t), category: 'violation', defect: 'DF-022' },
  { key: 'button-name', rule: 'button-name', category: 'violation', defect: 'DF-023' },
  { key: 'heading-order', rule: 'heading-order', category: 'violation', defect: 'DF-024' },
  // 실습 안내 띠는 랜드마크 밖에 두는 것을 허용한다 (SPEC §10.8)
  { key: 'region', rule: 'region', category: 'false-positive' },
  // 배경이 그라데이션이라 axe 가 판정을 미룬다 (incomplete). 사람이 확인해야 한다
  { key: 'color-contrast/promo', rule: 'color-contrast', target: (t) => /promo/.test(t), category: 'needs-review' },
]

/** t3: 키보드 점검 항목 */
export const CHECKS = ['K1', 'K2', 'K3', 'K4']

/**
 * t3: 결과가 fail 이어야 하는 칸과, 그 칸을 fail 로 적으면 검출로 보는 결함.
 * ambiguous: fail 로 적어도 거짓 보고가 아닌 칸 (그 결함 때문에 함께 실패한다고 볼 수 있음)
 */
export const KEYBOARD_TRUTH = [
  { defect: 'DF-025', cells: [['order-detail', 'K1']], ambiguous: [['order-detail', 'K3']] },
  { defect: 'DF-026', cells: PAGES.map((p) => [p, 'K2']), ambiguous: [] },
]

/** 축약 표기 상·중·하 */
export const SEVERITIES = ['상', '중', '하']

/**
 * t4: 보고서에 있어야 하는 문제와 허용하는 KWCAG 2.2 검사항목·심각도.
 * 검사항목 번호는 reference/kwcag-2.2.md 와 같다. 한 문제에 두 검사항목이 모두 맞을 수 있는 매핑은 후보를 넓게 받는다.
 */
export const REPORT_TRUTH = [
  { key: 'image-alt', source: 'axe', match: (r) => r.ref === 'image-alt', kwcag: ['1.1.1'], severity: ['중', '하'], defect: 'DF-020', kind: 'auto' },
  { key: 'label', source: 'axe', match: (r) => r.ref === 'label', kwcag: ['3.3.2'], severity: ['상', '중'], defect: 'DF-021', kind: 'auto' },
  { key: 'color-contrast', source: 'axe', match: (r) => r.ref === 'color-contrast', kwcag: ['1.4.3'], severity: ['중', '하'], defect: 'DF-022', kind: 'auto' },
  // 해석이 둘 다 가능해 둘 다 받는다: 이름 없는 아이콘 버튼 (1.1.1 대체 텍스트로 보는 관행과 4.2.1 로 보는 관점)
  { key: 'button-name', source: 'axe', match: (r) => r.ref === 'button-name', kwcag: ['1.1.1', '4.2.1'], severity: ['상', '중'], defect: 'DF-023', kind: 'auto' },
  // 해석이 둘 다 가능해 둘 다 받는다: 제목 수준 건너뜀 (2.4.2 제목 제공 / 1.3.2 콘텐츠의 선형 구조)
  { key: 'heading-order', source: 'axe', match: (r) => r.ref === 'heading-order', kwcag: ['2.4.2', '1.3.2'], severity: ['중', '하'], defect: 'DF-024', kind: 'auto' },
  { key: 'keyboard-pay', source: 'keyboard', match: (r) => r.page === 'order-detail' && ['K1', 'K3'].includes(r.ref), kwcag: ['2.1.1'], severity: ['상'], defect: 'DF-025', kind: 'manual' },
  { key: 'focus-visible', source: 'keyboard', match: (r) => r.ref === 'K2', kwcag: ['2.1.2'], severity: ['상', '중'], defect: 'DF-026', kind: 'manual' },
]
