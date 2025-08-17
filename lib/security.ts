// 차단할 도메인 목록
const BLACKLISTED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'malicious-site.com',
  'phishing-example.com'
]

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

export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL이 입력되지 않았습니다.' }
  }
  
  if (!isValidUrl(url)) {
    return { isValid: false, error: '올바른 URL 형식이 아닙니다.' }
  }
  
  if (isBlacklistedDomain(url)) {
    return { isValid: false, error: '허용되지 않는 도메인입니다.' }
  }
  
  return { isValid: true }
}
