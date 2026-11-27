// 테스트 전용: 마이그레이션 SQL 을 PGlite(WASM 으로 돌아가는 Postgres, 메모리)에 적용하고 Drizzle 로 감싼다.
// 운영(Neon)과 같은 Postgres 라서 NULLS NOT DISTINCT · ON CONFLICT · text[] 까지 그대로 검증된다 (설계 14장)
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import type { Db } from './client'
import * as schema from './schema'

const MIGRATIONS = join(import.meta.dirname, 'migrations')

export async function createTestDb(): Promise<{ db: Db; client: PGlite }> {
  const client = new PGlite()
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(join(MIGRATIONS, file), 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) await client.exec(stmt)
    }
  }
  return { db: drizzle({ client, schema }), client }
}
