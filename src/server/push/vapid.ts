// VAPID 키 (푸시 서버에 "이 앱이 보낸 알림"임을 증명). 공개키는 브라우저 구독에도 쓰여서 NEXT_PUBLIC_ 으로 화면에도 넘긴다
import type { Vapid } from './send'

export function getVapid(): Vapid {
  // 푸시 서비스가 문제 있을 때 연락할 곳. mailto: 또는 https 주소여야 해서 운영 주소를 쓴다 (Vercel 이 넣어 주는 시스템 변수)
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost'
  return {
    subject: `https://${host}`,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  }
}
