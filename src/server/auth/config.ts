// Auth.js 설정: 카카오 · 구글 로그인, 세션은 Neon 에 저장 (database 전략)
// 키는 Auth.js 가 환경 변수(AUTH_SECRET, AUTH_KAKAO_ID/SECRET, AUTH_GOOGLE_ID/SECRET)에서 자동으로 읽는다.
// AUTH_URL 은 쓰지 않는다: Vercel · 개발 모드에서는 요청 주소를 자동으로 믿음 (설계 13.4)
// 설정을 함수로 넘겨 요청 때 getDb() 를 부른다 (빌드 중 import 만으로 DB 연결을 만들지 않게)
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Kakao from 'next-auth/providers/kakao'
import { getDb } from '@/server/db/client'
import { accounts, sessions, users, verificationTokens } from '@/server/db/schema'

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Kakao, Google],
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  callbacks: {
    // database 전략에서는 세션에 사용자 id 가 기본으로 안 들어가서 직접 넣는다
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
}))
