import { NextRequest } from 'next/server'

export interface ReferrerInfo {
  source: string
  medium: string
  campaign?: string
  referrer: string
  userAgent: string
  isMobile: boolean
  isApp: boolean
}

export function analyzeReferrer(request: NextRequest): ReferrerInfo {
  // 기본 리퍼러 헤더 확인
  const referrer = request.headers.get('referer') || 'direct'
  
  // UTM 파라미터 확인
  const url = new URL(request.url)
  const utmSource = url.searchParams.get('utm_source')
  const utmMedium = url.searchParams.get('utm_medium')
  const utmCampaign = url.searchParams.get('utm_campaign')
  
  // 사용자 에이전트 분석
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // 모바일 및 앱 감지
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const isApp = /Slack|KakaoTalk|Telegram|WhatsApp|Discord|Teams/.test(userAgent)
  
  // 소스 판별 로직
  let source = 'direct'
  let medium = 'none'
  
  if (utmSource) {
    source = utmSource
    medium = utmMedium || 'unknown'
  } else if (referrer !== 'direct') {
    // 리퍼러 URL에서 도메인 추출
    try {
      const referrerUrl = new URL(referrer)
      source = referrerUrl.hostname
      
      // 소셜 미디어 및 메신저 앱 감지
      if (source.includes('slack.com')) {
        source = 'slack'
        medium = 'chat'
      } else if (source.includes('kakao.com') || source.includes('kakaotalk')) {
        source = 'kakaotalk'
        medium = 'chat'
      } else if (source.includes('telegram.org')) {
        source = 'telegram'
        medium = 'chat'
      } else if (source.includes('whatsapp.com')) {
        source = 'whatsapp'
        medium = 'chat'
      } else if (source.includes('discord.com')) {
        source = 'discord'
        medium = 'chat'
      } else if (source.includes('teams.microsoft.com')) {
        source = 'teams'
        medium = 'chat'
      } else if (source.includes('facebook.com')) {
        source = 'facebook'
        medium = 'social'
      } else if (source.includes('twitter.com') || source.includes('x.com')) {
        source = 'twitter'
        medium = 'social'
      } else if (source.includes('instagram.com')) {
        source = 'instagram'
        medium = 'social'
      } else if (source.includes('linkedin.com')) {
        source = 'linkedin'
        medium = 'social'
      } else if (source.includes('google.com')) {
        source = 'google'
        medium = 'search'
      } else if (source.includes('naver.com')) {
        source = 'naver'
        medium = 'search'
      } else {
        medium = 'referral'
      }
    } catch {
      source = 'unknown'
      medium = 'unknown'
    }
  }
  
  // 모바일 앱에서 직접 접근한 경우
  if (isApp && referrer === 'direct') {
    source = 'mobile_app'
    medium = 'direct'
  }
  
  return {
    source,
    medium,
    campaign: utmCampaign || undefined,
    referrer,
    userAgent,
    isMobile,
    isApp
  }
}

export function formatReferrerDisplay(referrerInfo: ReferrerInfo): string {
  const { source, medium, campaign } = referrerInfo
  
  if (source === 'direct') return '직접 접속'
  if (source === 'mobile_app') return '모바일 앱'
  
  let display = source
  
  if (medium && medium !== 'unknown') {
    display += ` (${medium})`
  }
  
  if (campaign) {
    display += ` - ${campaign}`
  }
  
  return display
}
