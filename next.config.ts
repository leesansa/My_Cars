import type { NextConfig } from 'next'

// 생성기 기본값의 cacheComponents · partialPrefetching 은 끈다: 설계 11.3 의 캐시는 fetch 의 next.revalidate 방식이고,
// 로그인 화면처럼 요청마다 세션을 읽는 페이지를 Suspense 로 감싸지 않아도 되게 하려는 것
const nextConfig: NextConfig = {}

export default nextConfig
