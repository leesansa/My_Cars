// drizzle-kit 설정. generate(스키마 → SQL)는 DB 없이 돌고, migrate 는 Vercel 빌드(`vercel-build`)가 실행한다 (설계 13.3)
// 마이그레이션은 풀링이 아닌 직접 연결(DATABASE_URL_UNPOOLED)을 쓴다 (설계 8.4)
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? '' },
})
