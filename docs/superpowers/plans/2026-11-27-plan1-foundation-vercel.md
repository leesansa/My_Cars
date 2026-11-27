# 계획 1 (Vercel): 기반 구축 (0주차) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 순정 Next.js 앱을 Vercel 에 올리고, Neon · 빌드 단계 마이그레이션 · 프리뷰 DB 브랜치 · 로그인 · Schedules · Web Push · CI/스모크가 **실제로 동작하는지** 확인한다. 이후 모든 기능은 이 기반 위에 올라간다.

**Architecture:** 저장소 최상단에 Next.js(App Router) 앱 하나. Vercel Git 연동이 배포한다(main → 운영, PR → 프리뷰 + Neon DB 브랜치). DB 는 `@neondatabase/serverless` Pool + Drizzle(`neon-serverless`)로 접근하고, 테스트는 PGlite 에 같은 마이그레이션 SQL 을 적용한다. 일일 작업은 `src/server/jobs/daily.ts` 한 함수이고 Vercel Schedules 가 보호된 경로 `POST /api/internal/run-daily` 로 부른다.

**Tech Stack:** Next.js 16 (App Router, Node.js 런타임) · Vercel (Hobby) · Neon Postgres · Drizzle ORM + drizzle-kit (postgresql) · Auth.js v5 (카카오, 구글) + `@auth/drizzle-adapter` · `web-push` · Vitest · PGlite · GitHub Actions · TypeScript strict · 전역 CSS(src/styles) · npm

**Spec:** `docs/superpowers/specs/2026-11-27-car-care-design-vercel.md` (0장 차이, 8장 스택 · 구조 · DB 연결, 9장 데이터 모델(9.0), 10.2 Schedules, 12장 보안, 13장 배포, 15장 0주차, 16장 위험)

## 이 계획의 범위
설계 15장 "가. 0주차"의 8개 항목과 그 결과물(배포 흐름, 전체 스키마, 로그인, 일일 작업 연결, 푸시 발송 경로, CI · 스모크)이다. 끝나면 결정 지점(Schedules 대 Cron Jobs, Neon 첫 요청 지연)의 결과를 `docs/decisions/0001-week0-vercel.md` 에 남긴다. 순수 계산 로직은 계획 2(`2026-11-26-plan2-domain-logic.md`, 그대로 씀)에서 다루며 병행할 수 있다. 화면 기능 · 알림 규칙 · 지도 · 최저가 · 뉴스 · 데모는 계획 3~5.

## 원래 레포(game_servise3)에서 가져오는 것
경로 `C:\Users\tj1\OneDrive\Documents\GitHub\game_servise3` 를 `$O` 라 한다.

| 처리 | 파일 |
|---|---|
| 그대로 복사 | `public/sw.js`, `public/manifest.webmanifest`, `public/icons/icon.svg`, `src/styles/*`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/api/health/route.ts`(+test), `src/app/api/auth/[...nextauth]/route.ts`, `src/components/common/PushSubscribeButton.tsx`, `src/server/auth/session.ts`(+test), `src/server/internal/token.ts`(+test), `src/server/push/subscriptions.ts`, `src/app/api/push/subscribe/route.ts`, `src/app/api/push/test/route.ts`, `vitest.config.ts`, `scripts/vapid-keys.mjs`(출력 이름만 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 로) |
| 고쳐서 | `src/server/db/schema.ts`(pg-core, 설계 9.0), `client.ts`(Neon), `test-db.ts`(PGlite), `schema.test.ts` · `push.test.ts` · `subscribe/route.test.ts`(원시 쿼리를 PGlite 로), `auth/config.ts`(pg 어댑터, `cloudflare:workers` 대신 `process.env`, `AUTH_URL` 없음), `push/send.ts` · `vapid.ts`(web-push), `jobs/daily.ts`, `run-daily/route.ts`(+test, `CRON_SECRET`), `.github/workflows/ci.yml`, `drizzle.config.ts` |
| 버림 | `src/worker.ts`, `cloudflare.config.ts`, `vite.config.ts`, `.dev.vars.example`, `deploy.yml`, SQLite 마이그레이션(`0000_init.sql` · meta), `vinext` · `@vinext/cloudflare` · `cf` · `@cloudflare/vite-plugin` · `@block65/webcrypto-web-push` · vite 관련 의존성 |
| 새로 | `vercel.json`, `.env.example`, `.github/workflows/smoke.yml`, `docs/decisions/0001-week0-vercel.md` |

## 사람이 직접 해야 하는 일 (구현 에이전트가 대신할 수 없음)
- Vercel 로그인, GitHub 저장소 `leesansa/My_Cars` 가져오기(Import), Deployment Protection 설정
- Vercel Marketplace 에서 Neon 연결(리전 선택, 프리뷰 브랜치 생성 · PR 닫힘 시 삭제 켜기), 로컬 `vercel env pull`
- Vercel 환경 변수 입력(아래 Global Constraints 이름)
- 카카오 개발자 콘솔 · 구글 클라우드 콘솔: Redirect URI 등록, 키 발급
- GitHub main 브랜치 보호 규칙
- 휴대폰에서 푸시 수신 확인

각 작업에서 이 일이 필요한 단계는 **[사람]**으로 표시한다. 에이전트는 무엇을 어디에 넣을지 안내만 한다. 비밀값은 채팅 · 저장소에 쓰지 않는다. **git push · 배포로 이어지는 병합 · 운영 DB 에 마이그레이션이 적용되는 병합은 에이전트가 하기 전에 사용자 확인을 받는다.**

## Global Constraints
- 화면의 시각 디자인은 사용자의 Figma 디자인이 오면 적용한다. 그 전까지 기능 우선 기본 화면(토큰 기반 최소 스타일) (CLAUDE.md "디자인 (Figma)").
- TypeScript `strict: true`. 코드 스타일: 작은따옴표, 세미콜론 없음, 2칸.
- Node.js 런타임만. `export const runtime = 'edge'` 금지.
- 환경 변수 (설계 13.4): Neon 연동이 넣는 것 `DATABASE_URL`(풀링), `DATABASE_URL_UNPOOLED`(직접). 직접 넣는 것 `AUTH_SECRET`, `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`(16자 이상 무작위). 공개: `NEXT_PUBLIC_KAKAO_MAP_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. **`AUTH_URL` 은 넣지 않는다.**
- 앱 쿼리는 `DATABASE_URL`, 마이그레이션(drizzle-kit)은 `DATABASE_URL_UNPOOLED`.
- 마이그레이션은 추가형만(설계 13.3). `package.json`: `"vercel-build": "drizzle-kit migrate && next build"`.
- Postgres 타입(설계 9.0): 시각 `timestamptz`(UTC), 날짜만 의미 있는 값 `date`(KST, Drizzle `mode: 'string'` → `'YYYY-MM-DD'`), 불리언 `boolean`, 목록 `text[]`, 고정 값 `pgEnum`, id `text` + `crypto.randomUUID()`.
- 일일 작업: Schedules `0 9 * * *`, `timezone: 'Asia/Seoul'`, `POST /api/internal/run-daily`, 헤더 `Authorization: Bearer <CRON_SECRET>`. `CRON_SECRET` 이 비어 있으면 항상 401. Schedules 와 Cron Jobs 를 동시에 두지 않는다. GitHub Actions `schedule` 은 쓰지 않는다.
- GitHub Actions 에는 Secrets 가 필요 없다(CI 는 DB 없이 PGlite).

## Review Focus
- `CRON_SECRET` 이 설정되지 않은 배포 → 토큰 없음 · 빈 Bearer(`Bearer `) 요청도 401 이고 작업이 실행되지 않아야 한다. (Task 4 테스트)
- 같은 endpoint 로 다른 사용자가 다시 구독 → 행 하나, 소유자 · 키가 새 값으로 바뀌어야 한다(기기 주인이 바뀐 경우). (Task 5 테스트)
- 차종 없는 공통 규칙 `(item_code, fuel_type, NULL)` 두 번 → 두 번째는 고유 위반이어야 한다(`NULLS NOT DISTINCT` 가 실제 SQL 에 들어갔는지). (Task 2 테스트)
- `date` 컬럼을 읽으면 `Date` 가 아니라 `'YYYY-MM-DD'` 문자열이어야 한다(시간대 때문에 하루 밀리는 것 방지). (Task 2 테스트)
- 프리뷰 빌드의 마이그레이션 → 프리뷰 DB 브랜치에만 적용되고 운영 DB 는 그대로여야 한다. (Task 2 Step 9 수동 확인)

---

### Task 1: 앱 정리, 그대로 가져올 파일, 첫 Vercel 배포

**Files:**
- Delete: `src/app/page.module.css`, `src/app/globals.css`, `src/app/favicon.ico`, `public/*.svg`(생성기 기본 파일)
- Copy(그대로): `$O/src/app/page.tsx`, `$O/src/app/layout.tsx`, `$O/src/styles/*`, `$O/src/app/api/health/route.ts`, `route.test.ts`, `$O/vitest.config.ts`, `$O/public/sw.js`, `manifest.webmanifest`, `icons/icon.svg`
- Create: `.github/workflows/ci.yml`(원래 것에서 고침), `.env.example`

**Interfaces:**
- Produces: `GET /api/health` → `200 {"ok": true}`; npm 스크립트 `dev`, `build`, `lint`, `typecheck`, `test`

- [ ] **Step 1: 생성기 기본 파일 지우고 위 파일 복사.** `layout.tsx` 는 `login.css` 를 import 하므로 `src/styles/login.css` 도 함께 온다.

- [ ] **Step 2: `npm i -D vitest`, `"test": "vitest run"` 추가.**

- [ ] **Step 3: 검사**

Run: `npm run lint && npm run typecheck && npm test && npm run build` → 모두 exit 0, 테스트 1개(health) 통과.

- [ ] **Step 4: `ci.yml` 작성** — 원래 것에서 주석만 Vercel 에 맞게(“배포는 Vercel Git 연동, 이 워크플로는 검사만, Secrets 불필요”). 트리거 `pull_request` + `push`(main 외 브랜치, `**.md` 제외), concurrency 취소, Node 24, `npm ci → lint → typecheck → test → build`.

- [ ] **Step 5: `.env.example` 작성** — Global Constraints 의 변수 이름을 값 없이, 각 줄 위에 어디서 얻는지 한 줄 주석(원래 `.dev.vars.example` 문체). 맨 위: "로컬 값은 `vercel env pull .env.local` 로 받는다".

- [ ] **Step 6: Commit** — `chore: 원래 레포의 화면 · 스타일 · PWA 파일과 CI 가져오기`

- [ ] **Step 7: (확인 받고) 브랜치 push, PR 열기** — CI 초록색 확인.

- [ ] **Step 8: [사람] Vercel 에서 Import** — Vercel 대시보드 → Add New → Project → `leesansa/My_Cars`, Framework Next.js, 설정 기본값. PR 프리뷰 배포가 뜨는지 확인.

- [ ] **Step 9: (확인 받고) PR 병합 → 첫 운영 배포** — `https://<project>.vercel.app/api/health` 가 `{"ok":true}`.

---

### Task 2: Neon + Drizzle 스키마, 빌드 단계 마이그레이션, 프리뷰 DB 브랜치

**Files:**
- Create: `src/server/db/schema.ts`, `src/server/db/client.ts`, `src/server/db/test-db.ts`, `src/server/db/schema.test.ts`, `drizzle.config.ts`, `src/server/db/migrations/0000_*.sql`(생성)
- Modify: `package.json`(`db:generate`, `vercel-build`)

**Interfaces:**
- Produces:
  - `getDb(): Db` — 모듈 범위에서 한 번 만든 `Pool({ connectionString: process.env.DATABASE_URL })` + `drizzle({ client: pool, schema })` (`drizzle-orm/neon-serverless`, 대화형 트랜잭션 지원 — 설계 8.4). 처음 호출할 때 만든다(빌드 중 import 만으로 연결하지 않게).
  - `type Db = PgDatabase<PgQueryResultHKT, typeof schema>` (`drizzle-orm/pg-core`) — Neon 과 PGlite 가 둘 다 이 모양으로 들어온다.
  - `createTestDb(): Promise<{ db: Db; client: PGlite }>` — 메모리 PGlite 에 `migrations/*.sql` 을 이름순으로, `--> statement-breakpoint` 로 나눠 `client.exec`, `drizzle-orm/pglite` 로 감쌈.
  - 스키마 export 이름은 원래 `schema.ts` 그대로(`users`, `accounts`, `sessions`, `verificationTokens`, `vehicleModels`, `maintenanceItems`, `maintenanceRules`, `seasonalItems`, `vehicles`, `odometerReadings`, `maintenanceRecords`, `calibrationDismissals`, `seasonalChecks`, `pushSubscriptions`, `notificationPrefs`, `notifications`, `FUEL_TYPES`, `FuelType`) + 새로 `demoPushSends`.

원래 `$O/src/server/db/schema.ts` 를 기준으로 컬럼 · FK · cascade · 인덱스 · 주석은 같게 두고 다음만 바꾼다:

| 원래 (SQLite) | 바꿀 것 (pg-core) |
|---|---|
| `text(..., { mode: 'json' }).$type<FuelType[]>()` | `fuelType('...').array().notNull()` (`excluded_fuel_types` 는 `.default(sql\`'{}'\`)`) |
| `text().$type<'A'\|'B'>()` | `pgEnum`: `fuel_type`(FUEL_TYPES), `odometer_source`(ONBOARDING/MANUAL/MAINTENANCE), `record_source`(ONBOARDING/MANUAL), `notification_type`(DUE_SOON/OVERDUE/SEASONAL/TEST), `season`(SPRING/SUMMER/FALL/WINTER) |
| `integer(mode: 'boolean')` | `boolean().notNull().default(x)` |
| `createdAt` (strftime) | `timestamp(name, { withTimezone: true, mode: 'string' }).notNull().defaultNow()` · `last_success_at` · `read_at` 도 timestamptz nullable |
| `date: text` (정비일 · 실측일) | `date(name, { mode: 'string' })` |
| Auth 테이블 `timestamp_ms` | `timestamp(name, { mode: 'date' })` (어댑터가 Date 를 씀), `expires_at` 은 `integer` |
| `maintenance_rules` coalesce 식 인덱스 + 손 수정 주석 | `unique('maintenance_rules_item_fuel_model_uq').on(t.itemCode, t.fuelType, t.vehicleModelId).nullsNotDistinct()`, 손 수정 주석 삭제 |
| (없음) | `demoPushSends = pgTable('demo_push_sends', { endpointHash: text('endpoint_hash').primaryKey(), lastSentAt: timestamptz notNull })` (설계 9.4) |

- [ ] **Step 1: 설치** — `npm i drizzle-orm @neondatabase/serverless && npm i -D drizzle-kit @electric-sql/pglite`

- [ ] **Step 2: 실패하는 테스트** — `$O/src/server/db/schema.test.ts` 의 7개를 PGlite 로 옮긴다: `client.exec(...)` / `client.query(sql, params)`, `count` 는 `select count(*)::int as n`, 고유 위반은 `rejects.toThrow(/unique|duplicate/i)`, 기본값 테스트의 기대값은 `{ due_soon: true, overdue: true, seasonal: true, all_off: false }`, 생성 시각 테스트는 `created_at` 이 `Date` 또는 ISO 로 읽혀 `new Date(...).toISOString()` 이 성공하는지. vehicle_models 시드의 연료 값은 `'{GASOLINE}'`. 추가:
```ts
it('date 컬럼은 YYYY-MM-DD 문자열로 읽힌다', async () => {
  const [r] = await t.db.select().from(odometerReadings)
  expect(r.date).toBe('2026-11-01')
})
it('text[] 는 배열로 읽힌다', async () => { /* vehicleModels 1행 insert(drizzle) → fuelTypes toEqual(['GASOLINE','HYBRID']) */ })
```
Run: `npm test` → FAIL (스키마 없음)

- [ ] **Step 3: `schema.ts`(위 표), `drizzle.config.ts`** — `dialect: 'postgresql'`, `schema`, `out: './src/server/db/migrations'`, `dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! }`. 주석: "generate 는 DB 없이, migrate 는 Vercel 빌드가 실행".

- [ ] **Step 4: `npm pkg set scripts.db:generate="drizzle-kit generate" scripts.vercel-build="drizzle-kit migrate && next build"`, `npm run db:generate`** → `0000_*.sql` 에 `NULLS NOT DISTINCT` 가 있는지 눈으로 확인.

- [ ] **Step 5: `test-db.ts`, `client.ts` 구현.** `client.ts` 첫 줄 주석: 서버 코드에서만 import, 풀링 연결, 트랜잭션 되는 드라이버를 고른 이유(설계 8.4). Node 22 이상이라 `neonConfig.webSocketConstructor` 설정은 필요 없다(주석 한 줄).

- [ ] **Step 6: 검사** — `npm run lint && npm run typecheck && npm test && npm run build` → 통과.

- [ ] **Step 7: Commit** — `feat: Neon Postgres 스키마와 Drizzle 마이그레이션`

- [ ] **Step 8: [사람] Neon 연결** — Vercel 프로젝트 → Storage(또는 Marketplace) → Neon → Create. 리전은 목록에서 한국과 가장 가까운 곳, 환경 Production · Preview · Development 모두, **Preview 브랜치 생성 켜기**, **PR/브랜치 삭제 시 DB 브랜치 삭제 켜기**(설정 이름은 화면에서 확인). 그다음 로컬에서 `npx vercel login` → `npx vercel link` → `npx vercel env pull .env.local`. 에이전트는 함수 리전을 Neon 리전에 맞추는 `vercel.json` `"regions": ["<Neon 과 같은 리전 코드>"]` 를 이 단계 결과를 보고 넣는다(설계 16장).

- [ ] **Step 9: [사람] 프리뷰 보호 · 프리뷰 DB 확인** — Settings → Deployment Protection → Vercel Authentication 을 Preview 에 켠다(설계 12장). (확인 받고) push → PR 프리뷰 빌드 로그에 `drizzle-kit migrate` 성공. Neon 콘솔에서 **프리뷰 브랜치에는 테이블이 있고 main 브랜치에는 없는지** 확인.

- [ ] **Step 10: (확인 받고) 병합** — 운영 빌드 로그에서 마이그레이션 성공, Neon main 브랜치에 테이블 생성 확인.

---

### Task 3: 로그인 (Auth.js, 카카오 · 구글)

**Files:**
- Create: `src/server/auth/config.ts`(고쳐서)
- Copy(그대로): `src/server/auth/session.ts`, `session.test.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/login/page.tsx`(푸시 버튼 줄은 Task 5 전까지 빼 두고 Task 5 에서 되살림)

**Interfaces:**
- Consumes: Task 2 `getDb()`, `users` · `accounts` · `sessions` · `verificationTokens`
- Produces: `handlers`, `auth`, `signIn`, `signOut` (`config.ts`); `requireUserId(): Promise<string>`, `getUserId(): Promise<string | null>`, `class UnauthorizedError` (`session.ts`, 원래와 같음)

- [ ] **Step 1: `npm i next-auth@5.0.0-beta.32 @auth/drizzle-adapter`** (원래와 같은 고정 버전. 더 새 beta 가 있으면 사용자에게 알리고 고정 버전 유지)

- [ ] **Step 2: 복사한 `session.test.ts` 실행** → FAIL (`config` 없음)

- [ ] **Step 3: `config.ts`** — 원래 것에서: `cloudflare:workers` import 삭제, providers 는 `Kakao()`, `Google()`(Auth.js 가 `AUTH_KAKAO_ID` 등을 `process.env` 에서 자동으로 읽음), `secret` · `trustHost` 줄 삭제(Vercel 과 개발 모드에서는 자동), `NextAuth(() => ({ ... }))` 함수 형태 유지(요청 때 `getDb()`), session 콜백 유지. 첫 줄 주석에 "AUTH_URL 은 쓰지 않음(설계 13.4)".

- [ ] **Step 4: 검사** — lint · typecheck · test · build 통과. Commit `feat: Auth.js 카카오 · 구글 로그인 (Neon 세션)`

- [ ] **Step 5: [사람] OAuth 등록** — 카카오 · 구글 Redirect URI: `https://<project>.vercel.app/api/auth/callback/kakao`, `.../google`, `http://localhost:3000/api/auth/callback/kakao`, `.../google`. 키는 Vercel 환경 변수(Production · Development, Sensitive)에 `AUTH_SECRET`(`npx auth secret` 출력), `AUTH_KAKAO_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`. 다시 `vercel env pull .env.local`.

- [ ] **Step 6: 로컬 확인** — `npm run dev` → `/login` 에서 카카오 · 구글 로그인 → Neon `dev`(Development) 브랜치의 `users` · `accounts` · `sessions` 에 행. 로그아웃 시 `sessions` 행 삭제.

- [ ] **Step 7: (확인 받고) push · 병합 → [사람] 운영 주소에서 카카오 로그인** (설계 15장 항목). 프리뷰에서는 로그인하지 않는다(설계 13.6).

---

### Task 4: 일일 작업 연결 (Schedules + CRON_SECRET)

**Files:**
- Copy(그대로): `src/server/internal/token.ts`, `token.test.ts`
- Create(고쳐서): `src/server/jobs/daily.ts`, `src/app/api/internal/run-daily/route.ts`, `route.test.ts`
- Create: `vercel.json`

**Interfaces:**
- Consumes: `bearerToken(header: string | null): string | null`, `isValidJobToken(token: string | null, secret: string): boolean`
- Produces: `runDaily(now: Date): Promise<{ startedAt: string; processed: number }>` (본문은 원래와 같음, 주석만 "Vercel Schedules 가 매일 09:00 KST(±15분)에 run-daily 경로로 부름. 알림 계산은 계획 4")

- [ ] **Step 1: 실패하는 테스트** — 원래 `route.test.ts` 에서 `vi.mock('cloudflare:workers')` 대신 `vi.stubEnv('CRON_SECRET', 's3cret')`(beforeEach) 로. 3개 테스트 유지 + 추가:
```ts
it('CRON_SECRET 이 비어 있으면 어떤 요청도 401', async () => {
  vi.stubEnv('CRON_SECRET', '')
  expect((await call('Bearer ')).status).toBe(401)
  expect((await call()).status).toBe(401)
  expect(runDaily).not.toHaveBeenCalled()
})
```
Run: `npm test` → FAIL

- [ ] **Step 2: `route.ts`** — `POST` 만. `process.env.CRON_SECRET ?? ''` 로 검사, 통과하면 `console.log` 에 `ce-id` 헤더 값(설계 10.2, 중복 실행 추적), `runDaily(new Date())` 결과 JSON. `export const maxDuration = 60`.

- [ ] **Step 3: `vercel.json`** — 설계 13.5 의 `schedules.run-daily` 그대로(`jitter` 적지 않음) + Task 2 의 `regions`. 구현 전에 Vercel 문서에서 Schedules 설정 키가 설계와 같은지 확인하고, 다르면 문서를 따르고 차이를 결정 기록에 남긴다.

- [ ] **Step 4: 검사 · Commit** — `feat: 일일 작업을 Vercel Schedules 와 보호된 경로로 연결`

- [ ] **Step 5: 로컬 확인** — `.env.local` 에 `CRON_SECRET` 이 있게([사람] Vercel 에 넣고 pull). `curl -X POST http://localhost:3000/api/internal/run-daily` → 401, `-H "Authorization: Bearer $CRON_SECRET"` → 200 + 서버 로그 `[runDaily] 시작`.

- [ ] **Step 6: (확인 받고) 병합 → 운영 확인** — Vercel 대시보드에 Schedule 이 보이는지, 수동 실행 → 함수 로그에 `[runDaily]`. 토큰 없이 curl → 401. 다음 날 09:00~09:15 KST 자동 실행 로그를 결정 기록에 남긴다. **결정 지점**: Schedules 가 설정 · 실행되지 않으면 `vercel.json` 을 `crons`(`0 0 * * *`, GET)로 바꾸고 route 에 `GET` 도 같은 처리로 추가한다(둘을 동시에 두지 않음).

---

### Task 5: Web Push 발송 경로 (web-push)

**Files:**
- Copy(그대로): `src/server/push/subscriptions.ts`, `src/app/api/push/subscribe/route.ts`, `src/app/api/push/test/route.ts`, `src/components/common/PushSubscribeButton.tsx`, `scripts/vapid-keys.mjs`(출력 이름 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- Create(고쳐서): `src/server/push/send.ts`, `src/server/push/vapid.ts`, `src/server/push/push.test.ts`, `src/app/api/push/subscribe/route.test.ts`
- Modify: `src/app/login/page.tsx` (Task 3 에서 뺀 푸시 버튼 되살림)

**Interfaces:**
- Consumes: Task 2 `Db`, `pushSubscriptions`, `createTestDb()`; Task 3 `requireUserId()`
- Produces (원래와 같은 이름 · 모양):
  - `type PushPayload = { title: string; body: string; url: string }`, `type Vapid = { subject: string; publicKey: string; privateKey: string }`
  - `sendPush(sub: SubscriptionKeys, payload: PushPayload, vapid: Vapid, fetchFn?: FetchFn): Promise<SendResult>`
  - `sendToUser(db: Db, userId: string, payload: PushPayload, vapid: Vapid, fetchFn?: FetchFn): Promise<{ sent: number; removed: number }>`
  - `getVapid(): Vapid` — `subject` = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` (없으면 `https://localhost`), `publicKey` = `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `privateKey` = `VAPID_PRIVATE_KEY`

- [ ] **Step 1: `npm i web-push && npm i -D @types/web-push`**

- [ ] **Step 2: 실패하는 테스트** — 원래 `push.test.ts` 9개와 `subscribe/route.test.ts` 3개를 옮긴다: `createTestDb()` 는 `await`, `t.raw.exec/prepare` 대신 `t.client.exec/query`(`.rows`), `last_success_at` 은 `new Date(row.last_success_at).getTime()` 이 NaN 이 아닌지. `fakeFetch` 방식 그대로(암호화 · 서명은 진짜로 돎). 추가:
```ts
it('다른 사용자가 같은 endpoint 로 구독하면 소유자와 키가 바뀐다', async () => {
  await upsertSubscription(t.db, 'u1', { endpoint: 'https://push.example/a', p256dh: 'P1', auth: 'A1' })
  await upsertSubscription(t.db, 'u2', { endpoint: 'https://push.example/a', p256dh: 'P2', auth: 'A2' })
  // rows: [{ user_id: 'u2', p256dh: 'P2', auth: 'A2' }]
})
```
Run: `npm test` → FAIL (`@block65` import 없음)

- [ ] **Step 3: `send.ts`** — `buildPushPayload` 대신 `webpush.generateRequestDetails({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload), { vapidDetails: vapid, TTL: 24 * 60 * 60 })` → `fetchFn(details.endpoint, { method: details.method, headers: details.headers, body: details.body })`. 결과 판정(404 · 410 = gone)과 `sendToUser` 는 원래 그대로. 첫 줄 주석: "Node 런타임이라 web-push 를 그대로 씀. 보내기는 fetch 로 해서 테스트에서 바꿔 끼울 수 있게".

- [ ] **Step 4: `vapid.ts`(위 Interfaces), `login/page.tsx` 푸시 버튼 되살림. 검사 · Commit** — `feat: Web Push 구독 · 발송 (web-push)`

- [ ] **Step 5: [사람] VAPID 키** — `node scripts/vapid-keys.mjs` 를 운영용 · 개발용 따로 실행, Vercel 환경 변수에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`(Sensitive). pull 후 로컬에서 로그인 → 알림 받기 → 테스트 알림 수신.

- [ ] **Step 6: (확인 받고) 병합 → [사람] 운영 주소에서 휴대폰(안드로이드 Chrome) 수신**, 알림을 누르면 `/dashboard` 열림, `push_subscriptions.last_success_at` 기록.

---

### Task 6: CI 보호 · 배포 후 스모크 · 응답 시간 측정 · 결정 기록

**Files:**
- Create: `.github/workflows/smoke.yml`, `docs/decisions/0001-week0-vercel.md`
- Modify: `src/app/api/health/route.ts`, `route.test.ts`

**Interfaces:**
- Produces: `GET /api/health` → `200 {"ok": true}` (DB 접속 없음, 스모크용 그대로); `GET /api/health?db=1` → `200 {"ok": true, "dbMs": number}` (`select 1` 왕복 시간, 0주차 측정용)

- [ ] **Step 1: 실패하는 테스트** — `GET(new Request('http://x/api/health'))` → `{ ok: true }` 이고 `getDb` 목이 호출되지 않음; `?db=1` → `dbMs` 가 숫자, `getDb` 1회.

- [ ] **Step 2: 구현** — `GET(request: Request)`, `?db=1` 일 때만 `getDb().execute(sql\`select 1\`)` 를 `performance.now()` 로 잼.

- [ ] **Step 3: `smoke.yml`** — `on: deployment_status`, job 조건 `github.event.deployment_status.state == 'success' && github.event.deployment.environment == 'Production'`, 단계: `curl -fsS "$URL/"` 와 `curl -fsS "$URL/api/health"` (`URL = github.event.deployment_status.environment_url`). 실패 시 할 일(Vercel Instant Rollback, 수동)을 주석으로.

- [ ] **Step 4: 검사 · Commit** — `ci: 배포 후 스모크와 DB 응답 시간 측정 경로`

- [ ] **Step 5: [사람] main 브랜치 보호** — GitHub → Settings → Branches(Rulesets) → main: PR 필수, 상태 검사 `check`(CI) 필수.

- [ ] **Step 6: (확인 받고) 병합 → 스모크 워크플로 초록색 확인.**

- [ ] **Step 7: 측정** — Neon 이 잠든 뒤(5분 이상 요청 없음) `curl -w "%{time_total}\n" -o - https://<project>.vercel.app/api/health?db=1` 1회, 이어서 5회. 첫 요청 · 이후 평균의 `time_total` 과 `dbMs` 를 기록. **결정 지점**: 첫 요청이 2초를 넘으면 리전 재확인, 랜딩은 DB 없이 정적 유지, 대시보드에 로딩 화면(설계 16장)을 계획 3 에 넣는다.

- [ ] **Step 8: `docs/decisions/0001-week0-vercel.md`** — 원래 `0001-runtime.md` 형식(결론 · 항목별 결과 표 · 주의할 점 · 다시 검토할 때). 항목: Vercel 배포, Neon 연결 · 리전, 빌드 단계 마이그레이션, 프리뷰 DB 브랜치, Auth.js, Schedules(또는 Cron Jobs 로 바꿨는지), web-push, PGlite 테스트, CI · 보호 · 스모크, 응답 시간. Commit `docs: 0주차 결과 기록 (Vercel)`.

- [ ] **Step 9: 최종 확인** — `npm run lint && npm run typecheck && npm test && npm run build` → 모두 exit 0, 운영 `/api/health` 200.
