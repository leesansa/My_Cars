import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// DB 는 가짜로: 호출 여부와 왕복 시간 측정만 본다
const execute = vi.fn(async () => ({ rows: [] }))
const getDb = vi.fn(() => ({ execute }))
vi.mock('@/server/db/client', () => ({ getDb: () => getDb() }))

const { GET } = await import('./route')
const call = (query = '', auth?: string) =>
  GET(new Request(`http://localhost/api/health${query}`, { headers: auth ? { authorization: auth } : {} }))

beforeEach(() => {
  getDb.mockClear()
  execute.mockClear()
  vi.stubEnv('CRON_SECRET', 's3cret')
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '9b7a642dc6b73d06fc4ac820e5e552b88c36ebe4')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/health', () => {
  it('200 과 ok · 배포된 커밋(앞 7자리)을 돌려주고 DB 에 접속하지 않는다 (스모크용)', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, commit: '9b7a642' })
    expect(getDb).not.toHaveBeenCalled()
  })

  it('커밋 정보가 없으면(로컬) commit 은 null 이다', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '')
    const res = await call()
    expect(await res.json()).toEqual({ ok: true, commit: null })
  })

  it('?db=1 은 토큰이 없으면 401 이고 DB 에 접속하지 않는다 (아무나 Neon 을 깨우지 못하게)', async () => {
    const res = await call('?db=1')
    expect(res.status).toBe(401)
    expect(getDb).not.toHaveBeenCalled()
  })

  it('?db=1 은 토큰이 틀려도 401 이다', async () => {
    const res = await call('?db=1', 'Bearer wrong!')
    expect(res.status).toBe(401)
    expect(getDb).not.toHaveBeenCalled()
  })

  it('?db=1 에 CRON_SECRET 토큰이 맞으면 DB 왕복 시간(dbMs)을 함께 돌려준다 (측정용)', async () => {
    const res = await call('?db=1', 'Bearer s3cret')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.commit).toBe('9b7a642')
    expect(typeof body.dbMs).toBe('number')
    expect(execute).toHaveBeenCalledTimes(1)
  })
})
