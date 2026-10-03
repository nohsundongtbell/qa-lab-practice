-- 중복 회원: 이메일이 (대소문자·앞뒤 공백을 무시하면) 같은 회원 중 나중에 가입한 계정
SELECT m.id
FROM members m
WHERE EXISTS (
  SELECT 1 FROM members e
  WHERE e.id < m.id AND lower(trim(e.email)) = lower(trim(m.email))
)
ORDER BY m.id;
