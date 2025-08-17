import { getGSBCache, setGSBCache } from './gsb-cache'
import { securityLogger } from './security-logger'

// 차단할 도메인 목록
const BLACKLISTED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'malicious-site.com',
  'phishing-example.com'
]

// Google Safe Browsing API를 사용한 악성 URL 검증
async function checkGoogleSafeBrowsing(url: string, request: Request): Promise<boolean> {
  try {
    // 캐시 확인
    const cached = await getGSBCache(url)
    if (cached) {
      securityLogger.logSecurityEvent(
        'gsb_cache_hit',
        request,
        'success',
        undefined,
        { url: url, cachedResult: cached.isSafe }
      )
      return cached.isSafe
    }

    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY
    if (!apiKey) {
      console.warn('Google Safe Browsing API 키가 설정되지 않았습니다.')
      securityLogger.logSecurityEvent(
        'gsb_api_key_missing',
        request,
        'error',
        'API 키가 설정되지 않음'
      )
      return true // API 키가 없으면 검증을 건너뜀
    }

    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: {
          clientId: 'shoot-link',
          clientVersion: '1.0.0'
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      })
    })

    if (!response.ok) {
      console.warn('Google Safe Browsing API 호출 실패:', response.status)
      securityLogger.logSecurityEvent(
        'gsb_api_error',
        request,
        'error',
        `API 호출 실패: ${response.status}`,
        { url: url, status: response.status }
      )
      return true // API 호출 실패 시 검증을 건너뜀
    }

    const data = await response.json()
    const isSafe = !data.matches || data.matches.length === 0
    
    // 결과를 캐시에 저장
    await setGSBCache(url, isSafe)
    
    // 보안 로그 기록
    if (isSafe) {
      securityLogger.logSecurityEvent(
        'gsb_safe_url',
        request,
        'success',
        undefined,
        { url: url }
      )
    } else {
      securityLogger.logSecurityEvent(
        'gsb_threat_detected',
        request,
        'blocked',
        'Google Safe Browsing에서 위협 감지',
        { url: url, threats: data.matches }
      )
    }
    
    return isSafe
  } catch (error) {
    console.error('Google Safe Browsing 검증 오류:', error)
    securityLogger.logSecurityEvent(
      'gsb_validation_error',
      request,
      'error',
      `검증 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { url: url }
    )
    return true // 오류 발생 시 검증을 건너뜀
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export function isBlacklistedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    return BLACKLISTED_DOMAINS.some(blacklisted =>
      hostname.includes(blacklisted)
    )
  } catch {
    return true // 잘못된 URL은 차단
  }
}

export async function validateUrl(url: string, request: Request): Promise<{ isValid: boolean; error?: string }> {
  if (!url) {
    securityLogger.logSecurityEvent(
      'url_validation_empty',
      request,
      'blocked',
      'URL이 입력되지 않음'
    )
    return { isValid: false, error: 'URL이 입력되지 않았습니다.' }
  }

  if (!isValidUrl(url)) {
    securityLogger.logSecurityEvent(
      'url_validation_invalid_format',
      request,
      'blocked',
      '올바르지 않은 URL 형식'
    )
    return { isValid: false, error: '올바른 URL 형식이 아닙니다.' }
  }

  if (isBlacklistedDomain(url)) {
    securityLogger.logSecurityEvent(
      'url_validation_blacklisted',
      request,
      'blocked',
      '허용되지 않는 도메인'
    )
    return { isValid: false, error: '허용되지 않는 도메인입니다.' }
  }

  // Google Safe Browsing 검증
  const isSafe = await checkGoogleSafeBrowsing(url, request)
  if (!isSafe) {
    return { isValid: false, error: '보안상 위험한 URL입니다. Google Safe Browsing에서 차단되었습니다.' }
  }

  securityLogger.logSecurityEvent(
    'url_validation_success',
    request,
    'success',
    undefined,
    { url: url }
  )

  return { isValid: true }
}
