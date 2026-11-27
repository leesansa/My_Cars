# CLAUDE.md

마이카노트(Vercel 버전): 내 차 맞춤 정비 시기 추천·알림 서비스(포트폴리오). 저장소 최상단이 곧 프로젝트 폴더다. 하위 폴더를 새로 감싸지 않는다.
설계는 `docs/superpowers/specs/2026-11-27-car-care-design-vercel.md`(짝: Cloudflare 버전 `2026-11-26-car-care-design.md`, 서비스 내용은 같음), 구현 계획은 `docs/superpowers/plans/`.

## 소통

- 답변 · 코드 주석 · 커밋 메시지 · 문서는 모두 한국어.
- 작업은 단계별로 하나씩 진행하고, 단계가 끝나면 결과를 보고한 뒤 다음 단계로 넘어간다.
- 되돌리기 어려운 일(DB 초기화 · 마이그레이션 적용, 실제 배포, git push, 파일 대량 삭제)은 한 번 확인받고 한다.
- Vercel · Neon · 카카오 · 구글처럼 계정 로그인이 필요한 일은 사용자가 할 단계를 안내한다.

## 명령 (저장소 최상단에서)

```bash
npm run dev        # next dev, 포트 3000 (쓰고 있으면 3001…로 바뀌니 로그에서 Local 주소 확인)
npm run lint       # eslint (eslint-config-next)
npm run typecheck  # tsc --noEmit
npm test           # vitest (DB 테스트는 PGlite, 접속 정보 필요 없음)
npm run build      # next build
npm run db:generate  # 스키마 → 마이그레이션 SQL (drizzle-kit generate)
```

- 배포는 명령이 아니라 Git 연동이다: main push → 운영, PR → 프리뷰(+ Neon 프리뷰 DB 브랜치). Vercel 은 `vercel-build`(마이그레이션 → `next build`)로 빌드한다.
- 코드를 고치면 lint · typecheck · test · build 를 모두 통과시킨 뒤 끝낸다.

## 구조 (순정 Next.js App Router, Vercel Functions · Node.js 런타임)

```
src/
  app/              페이지 · route handler (app/api/*)
  components/       common/(공용 부품), 화면별 폴더(dashboard/, onboarding/ …)
  hooks/            클라이언트 훅
  lib/              브라우저·서버 공용 유틸, domain/(순수 계산 로직)
  server/           서버 전용: db/(schema.ts, client.ts, test-db.ts, migrations/, seeds/), auth/, jobs/, push/, external/, internal/, http.ts
  styles/           전역 CSS
  types/index.ts    화면·서버가 같이 쓰는 타입
public/             정적 파일 (sw.js, manifest, 아이콘)
vercel.json         Schedules(일일 작업) 설정
```

- `src/lib/domain` 은 DB · 네트워크 · 현재 시각에 의존하지 않는다. 오늘 날짜는 인자로 받는다. 테스트는 같은 폴더의 `__tests__/`.
- `src/server` 는 서버 컴포넌트 · route handler · Server Action 에서만 import 한다. 클라이언트 컴포넌트에서 부르지 않는다.
- 상태가 필요한 컴포넌트만 `'use client'`.
- Edge 런타임은 쓰지 않는다(Neon 드라이버 · `web-push` 가 Node API 를 씀). route 에 `runtime = 'edge'` 를 넣지 않는다.
- 비밀값 · 설정은 `process.env` 로 읽는다. 서버 함수는 테스트를 위해 `db` 를 첫 인자로 받는다(`upsertSubscription(db, …)`).
- 코드 스타일: 작은따옴표, 세미콜론 없음, 2칸 들여쓰기.

## DB (Neon Postgres + Drizzle)

- 앱 쿼리는 풀링 연결 `DATABASE_URL`, 마이그레이션은 직접 연결 `DATABASE_URL_UNPOOLED`. 둘 다 Vercel 의 Neon 연동이 넣어 준다.
- 스키마를 고치면 `npm run db:generate` 로 SQL 을 만들어 커밋한다. 적용은 Vercel 빌드(`vercel-build`)가 한다.
- 마이그레이션은 **추가형만**(테이블 · nullable 컬럼 추가). 컬럼 삭제 · 이름 바꾸기는 두 번의 배포로 나눈다(설계 13.3).
- 테스트는 `src/server/db/test-db.ts`(PGlite 메모리 DB 에 같은 마이그레이션 SQL 적용)를 쓴다.

## 디자인 (Figma)

- 페이지의 시각 디자인(레이아웃 · 색 · 글꼴 · 간격 · 컴포넌트 모양)은 사용자가 Figma 로 직접 만든다. 임의로 디자인을 정하거나 꾸미지 않는다.
- Figma 디자인이 오기 전까지 화면은 **기능 우선 기본 화면**으로 만든다: 의미 있는 HTML 구조, 접근성(라벨 · 포커스 · 텍스트 배지), 동작과 데이터 연결, 상태(로딩 · 빈 상태 · 오류)까지. 스타일은 `variables.css` 토큰을 쓴 최소한(읽을 수 있는 간격 · 정렬)만.
- 컴포넌트는 나중에 디자인을 입히기 쉽게 나눈다: 데이터 · 로직(서버 컴포넌트, 훅, `src/lib`)과 보이는 부분(마크업 · 클래스)을 분리하고, 클래스 이름은 `화면__요소` 규칙을 지킨다.
- 사용자가 Figma 링크를 주면 그때 디자인을 적용한다:
  1. Figma MCP 로 해당 프레임을 읽는다 (design-to-code 스킬을 먼저 불러옴, `get_design_context` · `get_screenshot`).
  2. 색 · 글꼴 · 간격 · 모서리 값은 `variables.css` 토큰으로 옮기고, 화면별 CSS 는 `src/styles/` 의 해당 파일에 쓴다. Figma 가 만든 코드를 그대로 붙이지 않고 이 프로젝트 구조 · 규칙에 맞춘다.
  3. 기능 · 데이터 흐름은 바꾸지 않는다. 디자인에 없는 상태(오류 · 빈 상태 등)는 같은 토큰으로 맞춰 만들고 사용자에게 알린다.
  4. 데스크탑 · 모바일을 Figma 와 나란히 비교해 확인한다.
- Figma 에 없는 화면이 필요해지면 만들기 전에 사용자에게 디자인이 있는지 묻는다.

## 스타일 규칙

- CSS 는 `src/styles/` 의 전역 CSS 파일(Tailwind 안 씀). `app/layout.tsx` 에서 variables → reset → globals → (공통 · 화면별) → responsive 순으로 불러온다.
- 클래스 이름은 `화면__요소`, 상태는 `is-` 접두사(`is-on`, `is-over`).
- 색 · 글꼴 · 간격은 `variables.css` 토큰만 쓴다. 인라인 스타일은 계산값(진행률 `--progress` 등)에만.
- 정비 상태 색(`--c-ok` · `--c-soon` · `--c-over` · `--c-unknown`)은 색만으로 구분하지 않고 텍스트 배지를 함께 쓴다.
- 모바일 우선. 넓은 화면 조정은 `responsive.css` 한 곳에 모은다.

## Git

- 브랜치에서 작업하고 PR 로 main 에 합친다(main 은 CI 통과 필수로 보호). 원격 `origin` = 이 저장소(My_Cars).
- 커밋 메시지: `feat: …`(기능), `fix: …`, `docs: …`(문서), `ci: …`(워크플로), `chore: …`(설정 · 정리). 첫 줄 요약 + 필요하면 `-` 목록.
- 커밋 전에 `git status` 로 의도한 파일만 들어가는지 본다. `.env*` 는 절대 커밋하지 않는다(값 없는 `.env.example` 만).
- 새 도구를 설치하면 그 도구의 캐시 · 생성물이 `.gitignore` 에 있는지 확인한다.

## 비밀값

- 운영 · 프리뷰 값은 Vercel 환경 변수(Production / Preview / Development 별, Sensitive)에만. 로컬은 `vercel env pull .env.local` 로 받은 `.env.local`.
- 새 변수를 추가하면 `.env.example` 에 이름과 설명(값 없이)을 같이 적는다. 환경 변수를 바꾸면 재배포해야 반영된다.

## 화면 확인

- 화면을 바꾸면 데스크탑(1440×900)과 모바일(390×844) 둘 다 실제로 열어서 본다. 모바일은 가로 넘침(`scrollWidth`)을 확인.
- 개발 서버를 띄웠으면 끝나고 그 프로세스만 정확히 끈다.
