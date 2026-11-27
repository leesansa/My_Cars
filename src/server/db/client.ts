// Neon 연결. 서버 코드에서만 import 한다.
// 앱 쿼리는 풀링 연결(DATABASE_URL). 정비 기록 + 실측 저장처럼 한 트랜잭션이 필요한 쓰기가 있어서(설계 8.4)
// 대화형 트랜잭션이 되는 WebSocket 방식(Pool, neon-serverless)을 쓴다. Node 22 이상은 WebSocket 이 내장이라 따로 설정하지 않는다
import { Pool } from '@neondatabase/serverless'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

// 서버 함수들이 받는 DB 타입. 운영은 Neon, 테스트는 PGlite(test-db.ts) 가 같은 모양으로 들어온다
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

let db: Db | undefined

// 처음 쓸 때 한 번 만들고 재사용한다 (Vercel Functions 는 인스턴스를 재사용함). 빌드 중 import 만으로는 연결하지 않는다
export function getDb(): Db {
  db ??= drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }), schema })
  return db
}
