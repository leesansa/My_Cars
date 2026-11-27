import { beforeEach, describe, expect, it, vi } from 'vitest'

// DB 는 가짜로: 호출 여부와 왕복 시간 측정만 본다
const execute = vi.fn(async () => ({ rows: [] }))
const getDb = vi.fn(() => ({ execute }))
vi.mock('@/server/db/client', () => ({ getDb: () => getDb() }))

const { GET } = await import('./route')

beforeEach(() => {
  getDb.mockClear()
  execute.mockClear()
})

describe('GET /api/health', () => {
  it('200 과 { ok: true } 를 돌려주고 DB 에 접속하지 않는다 (스모크용)', async () => {
    const res = await GET(new Request('http://localhost/api/health'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(getDb).not.toHaveBeenCalled()
  })

  it('?db=1 이면 DB 왕복 시간(dbMs)을 함께 돌려준다 (0주차 측정용)', async () => {
    const res = await GET(new Request('http://localhost/api/health?db=1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(typeof body.dbMs).toBe('number')
    expect(execute).toHaveBeenCalledTimes(1)
  })
})
