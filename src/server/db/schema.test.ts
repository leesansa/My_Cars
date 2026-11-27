// 마이그레이션 SQL 을 PGlite(WASM Postgres)에 적용해 제약 조건(외래키 · 유니크 · 기본값 · 타입)을 확인한다
import { beforeEach, describe, expect, it } from 'vitest'
import { odometerReadings, vehicleModels } from './schema'
import { createTestDb } from './test-db'

let t: Awaited<ReturnType<typeof createTestDb>>
const count = async (table: string) => (await t.client.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n

beforeEach(async () => {
  t = await createTestDb()
  await t.client.exec(`
    insert into users (id, email) values ('u1', 'a@example.com');
    insert into maintenance_items (code, name, description, sort_order) values ('ENGINE_OIL', '엔진오일', '설명', 1);
    insert into vehicles (id, user_id, model_year, fuel_type, daily_km) values ('v1', 'u1', 2021, 'GASOLINE', 31);
    insert into odometer_readings (id, vehicle_id, date, km, source) values ('r1', 'v1', '2026-11-01', 42000, 'ONBOARDING');
  `)
})

describe('Postgres 스키마', () => {
  it('사용자를 지우면 그 사용자의 데이터가 모두 지워진다 (회원 탈퇴)', async () => {
    await t.client.exec(`
      insert into maintenance_records (id, vehicle_id, item_code, date, km, source) values ('m1', 'v1', 'ENGINE_OIL', '2025-12-01', 33300, 'MANUAL');
      insert into push_subscriptions (id, user_id, endpoint, p256dh, auth) values ('p1', 'u1', 'https://push.example/1', 'k', 'a');
      insert into notification_prefs (user_id) values ('u1');
      insert into notifications (id, user_id, vehicle_id, type, dedupe_key, title, body, url) values ('n1', 'u1', 'v1', 'TEST', 'TEST:1', 't', 'b', '/');
    `)
    await t.client.exec(`delete from users where id = 'u1'`)
    for (const table of ['vehicles', 'odometer_readings', 'maintenance_records', 'push_subscriptions', 'notification_prefs', 'notifications']) {
      expect(await count(table), table).toBe(0)
    }
  })

  it('같은 dedupe_key 의 알림은 두 번 저장되지 않는다', async () => {
    const insert = `insert into notifications (id, user_id, type, dedupe_key, title, body, url) values ($1, 'u1', 'DUE_SOON', 'DUE_SOON:v1:ENGINE_OIL:m1', 't', 'b', '/')`
    await t.client.query(insert, ['n1'])
    await expect(t.client.query(insert, ['n2'])).rejects.toThrow(/unique|duplicate/i)
  })

  it('같은 endpoint 의 푸시 구독은 두 번 저장되지 않는다', async () => {
    const insert = `insert into push_subscriptions (id, user_id, endpoint, p256dh, auth) values ($1, 'u1', 'https://push.example/1', 'k', 'a')`
    await t.client.query(insert, ['p1'])
    await expect(t.client.query(insert, ['p2'])).rejects.toThrow(/unique|duplicate/i)
  })

  it('차종 없는(일반) 규칙도 항목 · 연료당 하나만 허용하고, 차종 지정 규칙은 따로 둘 수 있다', async () => {
    await t.client.exec(`insert into vehicle_models (id, maker, name, year_from, fuel_types) values ('m-avante', '현대', '아반떼', 2020, '{GASOLINE}')`)
    const insert = `insert into maintenance_rules (id, item_code, fuel_type, vehicle_model_id, interval_km, interval_months) values ($1, 'ENGINE_OIL', 'GASOLINE', $2, 10000, 12)`
    await t.client.query(insert, ['a', null])
    await expect(t.client.query(insert, ['b', null])).rejects.toThrow(/unique|duplicate/i)
    await expect(t.client.query(insert, ['c', 'm-avante'])).resolves.toBeDefined()
  })

  it('실측을 지우면 연결된 정비 기록의 연결만 풀리고, 그 실측을 가리키던 보정 무시 기록은 지워진다', async () => {
    await t.client.exec(`
      insert into maintenance_records (id, vehicle_id, item_code, date, km, odometer_reading_id, source) values ('m1', 'v1', 'ENGINE_OIL', '2026-11-01', 42000, 'r1', 'MANUAL');
      insert into calibration_dismissals (vehicle_id, dismissed_at_reading_id) values ('v1', 'r1');
    `)
    await t.client.exec(`delete from odometer_readings where id = 'r1'`)
    expect((await t.client.query(`select odometer_reading_id as r from maintenance_records where id = 'm1'`)).rows).toEqual([{ r: null }])
    expect(await count('calibration_dismissals')).toBe(0)
  })

  it('알림 설정 기본값은 모두 켜짐, 전체 끄기는 꺼짐', async () => {
    await t.client.exec(`insert into notification_prefs (user_id) values ('u1')`)
    expect((await t.client.query(`select due_soon, overdue, seasonal, all_off from notification_prefs`)).rows).toEqual([
      { due_soon: true, overdue: true, seasonal: true, all_off: false },
    ])
  })

  it('생성 시각은 기본값으로 현재 시각(timestamptz)이 들어간다', async () => {
    const { created_at } = (await t.client.query<{ created_at: Date | string }>(`select created_at from vehicles where id = 'v1'`)).rows[0]
    expect(Date.now() - new Date(created_at).getTime()).toBeLessThan(60_000)
  })

  it('date 컬럼은 YYYY-MM-DD 문자열로 읽힌다', async () => {
    const [r] = await t.db.select().from(odometerReadings)
    expect(r.date).toBe('2026-11-01')
  })

  it('text[] 는 배열로 읽힌다', async () => {
    await t.db.insert(vehicleModels).values({ maker: '현대', name: '아반떼', yearFrom: 2020, fuelTypes: ['GASOLINE', 'HYBRID'] })
    const [m] = await t.db.select().from(vehicleModels)
    expect(m.fuelTypes).toEqual(['GASOLINE', 'HYBRID'])
  })
})
