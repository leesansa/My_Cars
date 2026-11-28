// 배포 후 스모크 테스트용 (배포가 끝나면 GitHub Actions(smoke.yml)가 이 주소로 살아 있는지 확인). 기본은 DB 에 접속하지 않는다
// commit: 지금 응답한 배포의 커밋 앞 7자리. 스모크가 "새 배포가 운영 도메인에 붙었는지" 비교한다 (로컬은 null)
// ?db=1 이면 DB 왕복 시간(dbMs)을 잰다: Neon 이 잠든 뒤 첫 요청 지연 측정용 (설계 15장 0주차, 16장)
//   아무나 불러 Neon 을 계속 깨우지 못하게 CRON_SECRET Bearer 토큰이 있어야 한다
import { sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { bearerToken, isValidJobToken } from '@/server/internal/token'

export async function GET(request: Request): Promise<Response> {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null
  if (new URL(request.url).searchParams.get('db') !== '1') return Response.json({ ok: true, commit })
  if (!isValidJobToken(bearerToken(request.headers.get('authorization')), process.env.CRON_SECRET ?? '')) {
    return Response.json({ error: '권한이 없습니다' }, { status: 401 })
  }
  const started = performance.now()
  await getDb().execute(sql`select 1`)
  return Response.json({ ok: true, commit, dbMs: Math.round(performance.now() - started) })
}
