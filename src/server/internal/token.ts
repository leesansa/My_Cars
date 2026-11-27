// 내부 작업 경로(/api/internal/*)의 토큰 검사. 응답 시간으로 토큰을 알아내지 못하게 끝까지 비교한다
// (런타임에 상관없이 같은 코드로 돌도록 Node 의 timingSafeEqual 대신 직접 비교)

export function bearerToken(header: string | null): string | null {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

export function isValidJobToken(token: string | null, secret: string): boolean {
  if (!token || !secret) return false
  const a = new TextEncoder().encode(token)
  const b = new TextEncoder().encode(secret)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
