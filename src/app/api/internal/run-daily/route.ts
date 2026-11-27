// 일일 작업 실행 경로. Vercel Schedules 가 POST 로 부르고, 로컬 · 프리뷰에서는 같은 경로를 curl 로 직접 부른다 (설계 10.3)
// 헤더 Authorization: Bearer <CRON_SECRET>. CRON_SECRET 이 비어 있으면 항상 401 (열린 채로 배포되지 않게)
import { runDaily } from '@/server/jobs/daily'
import { bearerToken, isValidJobToken } from '@/server/internal/token'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  if (!isValidJobToken(bearerToken(request.headers.get('authorization')), process.env.CRON_SECRET ?? '')) {
    return Response.json({ error: '권한이 없습니다' }, { status: 401 })
  }
  // Schedules 는 같은 회차를 두 번 보낼 수 있어서 실행 ID 를 남긴다 (설계 10.2)
  console.log(`[run-daily] ce-id=${request.headers.get('ce-id') ?? '-'}`)
  return Response.json(await runDaily(new Date()))
}
