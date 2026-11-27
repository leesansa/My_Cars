// 배포 후 스모크 테스트용 (배포가 끝나면 GitHub Actions(smoke.yml)가 이 주소로 살아 있는지 확인). 기본은 DB 에 접속하지 않는다
// ?db=1 이면 DB 왕복 시간(dbMs)을 잰다: Neon 이 잠든 뒤 첫 요청 지연 측정용 (설계 15장 0주차, 16장)
import { sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'

export async function GET(request: Request): Promise<Response> {
  if (new URL(request.url).searchParams.get('db') !== '1') return Response.json({ ok: true })
  const started = performance.now()
  await getDb().execute(sql`select 1`)
  return Response.json({ ok: true, dbMs: Math.round(performance.now() - started) })
}
