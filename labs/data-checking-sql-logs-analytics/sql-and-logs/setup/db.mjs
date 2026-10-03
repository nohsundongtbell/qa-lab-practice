/** 랩이 쓰는 DB 접속 정보. 대상 앱의 로컬 전용 Postgres(127.0.0.1)만 쓴다. */
export const SCHEMA = 'qa_lab_data'
export const READER = { user: 'qa_reader', password: 'qa-reader' }

/** 관리자 접속 문자열(QA_LAB_DB_URL)에서 읽기 전용 계정의 접속 문자열을 만든다. */
export function readerUrlFrom(adminUrl) {
  const u = new URL(adminUrl)
  u.username = READER.user
  u.password = READER.password
  return u.toString()
}
