# 0001. 0주차 결과 (Vercel 버전)

- 날짜: 2026-11-27
- 상태: 확정 (스모크 첫 실행 · Schedules 자동 실행 확인은 남음, 아래 "남은 확인")
- 관련: 설계 `docs/superpowers/specs/2026-11-27-car-care-design-vercel.md` 15장 · 16장, 계획 `docs/superpowers/plans/2026-11-27-plan1-foundation-vercel.md`

## 결론

**순정 Next.js + Vercel + Neon + Vercel Schedules 그대로 간다. 결정 지점의 대체안(Cron Jobs, 리전 재검토)은 필요 없다.**
0주차 위험 요소(배포 · 빌드 단계 마이그레이션 · 프리뷰 DB 브랜치 · 로그인 · 일일 작업 · Web Push)가 운영 주소에서 모두 동작했다.

## 항목별 결과

| 항목 | 결과 | 택한 방법 · 근거 |
|---|---|---|
| Vercel 배포 | 동작 | Git 연동. 운영 https://mycar-note.vercel.app (프로젝트 `mycar-note`, Hobby). 함수 리전 `sin1`(vercel.json `regions`) |
| Neon 연결 | 동작 | Vercel Storage 에서 Neon `mycar-note-db`(Singapore, Free) 생성 · 연결, 변수 접두사 `DATABASE` → `DATABASE_URL` · `DATABASE_URL_UNPOOLED` |
| 빌드 단계 마이그레이션 | 동작 | `vercel-build` = `drizzle-kit migrate && next build`. 운영 빌드에서 17개 테이블 생성 |
| 프리뷰 DB 브랜치 | 동작 | PR #1 프리뷰 빌드가 "migrations applied successfully", 같은 시점 운영(main 브랜치) 테이블 0개 → 프리뷰 브랜치에만 적용 |
| 프리뷰 보호 | 켜짐 | Deployment Protection: Vercel Authentication, Standard Protection (운영 도메인만 공개) |
| Auth.js (카카오 · 구글) | 동작 | next-auth `5.0.0-beta.32` + `@auth/drizzle-adapter`(pg). `AUTH_URL` 없이 콜백이 https 운영 주소로 잡힘. 운영에서 두 제공자 로그인 · 세션 저장 확인 |
| 일일 작업 (Schedules, Beta) | 동작 | `vercel.json` `schedules.run-daily`(0 9 * * *, Asia/Seoul, POST). `vercel schedules` 로 active 확인, 수동 invoke → succeeded, 로그에 `ce-id` · `[runDaily]`. 토큰 없음 · 틀림 401 |
| Web Push | 동작 | `web-push` 의 `generateRequestDetails` + fetch. 운영에서 안드로이드 Chrome 수신, `last_success_at` 기록 |
| 테스트 DB | 동작 | PGlite 에 같은 마이그레이션 SQL. `NULLS NOT DISTINCT` · `text[]` · `date` 문자열까지 검증 (테스트 39개) |
| CI | 동작 | `ci.yml` (Secrets 없음) 매 push 통과 |
| 배포 후 스모크 | 설정함, 첫 실행 전 | `smoke.yml` (`deployment_status`). Vercel 설정 `deployment_status Events` 를 켜야 이벤트가 옴(기본 꺼짐) |
| DB 응답 시간 | 아래 표 | `/api/health?db=1` 의 `select 1` 왕복 |

### 응답 시간 (한국 → 운영, curl `time_total` / 서버 측 `dbMs`)

| 상황 | 전체 응답 | dbMs |
|---|---|---|
| 배포 직후 첫 요청 (새 함수 인스턴스) | 1.82s | 762 |
| 깨어 있을 때 5회 | 0.14 ~ 0.60s | 2 ~ 77 (대부분 2~4) |
| Neon 잠든 뒤 첫 요청 (7분 무요청) | 1.90s (바로 다음 요청 0.35s) | 618 (바로 다음 3) |

결정 지점(첫 요청 2초 초과 → 리전 재확인 · 로딩 화면): **2초 아래(1.90s)라 대체안 없이 간다.** 다만 기준에 가까우므로 설계 16장대로 랜딩은 DB 없이 두고, 대시보드에는 로딩 화면을 계획 3 에서 넣는다.

## 주의할 점 (Vercel 에서 알게 된 것)

1. **프로젝트 이름은 소문자만.** `MyCars` 거부 → `mycar-note`. create-next-app 도 폴더 이름(`My_Cars`)의 대문자를 거부해서 임시 폴더에서 만들어 옮김.
2. **create-next-app 기본값이 `cacheComponents` 를 켠다.** 설계 11.3(fetch revalidate)과 맞지 않고 세션 읽는 페이지를 Suspense 로 감싸야 해서 껐다.
3. **`vercel link` 가 `.gitignore` 끝에 `.env*` 를 덧붙여 `!.env.example` 예외를 덮는다.** 되돌렸다. 다시 link 하면 확인할 것.
4. **Development 환경 변수가 운영 DB(main 브랜치)를 가리킨다.** Neon 연동은 Preview 만 브랜치를 나눈다. 로컬은 `.env.development.local` 에 Neon `dev` 브랜치 주소를 넣어 쓴다(아직 dev 브랜치 없음 → 남은 확인).
5. **`deployment_status` 이벤트는 기본 꺼짐.** Settings → Git → `deployment_status Events` 를 켜야 GitHub Deployment 가 생기고 smoke.yml 이 돈다.
6. **스모크는 배포별 주소가 아닌 운영 도메인을 검사한다.** 배포별 주소(`environment_url`)는 Standard Protection 으로 로그인이 필요해 401.
7. **`web-push` 는 CommonJS** 라 기본 import 가 테스트(vitest)에서 비어 있음 → 이름 import.
8. Git Bash 에서 `vercel api /v9/...` 는 경로가 Windows 경로로 바뀜 → `MSYS_NO_PATHCONV=1`.

## 남은 확인

- [ ] 스모크 첫 실행 (다음 운영 배포 때 Actions 에 Smoke 가 초록색)
- [ ] Schedules 자동 실행 (2026-11-28 09:00~09:15 KST, `vercel schedules executions list run-daily`)
- [ ] GitHub main 브랜치 보호 (PR 필수 + `check` 필수) — 켜면 main 직접 push 대신 PR 로 병합
- [ ] Neon `dev` 브랜치 + `.env.development.local` 채우기, 로컬 로그인 확인

## 다시 검토할 때

- Schedules 가 Beta 를 벗어나며 설정이 바뀌거나 실행이 멈출 때 → 대체안 Cron Jobs(설계 13.5)
- 사용자가 늘어 일일 작업이 `maxDuration` 을 넘길 때 → Vercel Queues(Schedules 의 queue 대상)
