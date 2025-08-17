interface SecurityLog {
  timestamp: string
  event: string
  ip?: string
  userAgent?: string
  url?: string
  result: 'success' | 'blocked' | 'error'
  reason?: string
  metadata?: Record<string, any>
}

class SecurityLogger {
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // 도메인만 로깅, 경로는 제거
      return `${urlObj.protocol}//${urlObj.hostname}`
    } catch {
      return '[INVALID_URL]'
    }
  }

  private sanitizeUserAgent(userAgent: string): string {
    // User-Agent에서 민감한 정보 제거
    return userAgent
      .replace(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g, '[VERSION]')
      .replace(/[a-f0-9]{8,}/gi, '[HASH]')
      .slice(0, 100) // 길이 제한
  }

  private sanitizeIp(ip: string): string {
    // IPv4의 경우 마지막 옥텟 마스킹
    if (ip.includes('.')) {
      const parts = ip.split('.')
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.[MASKED]`
      }
    }
    // IPv6의 경우 마지막 부분 마스킹
    if (ip.includes(':')) {
      const parts = ip.split(':')
      if (parts.length > 2) {
        return `${parts.slice(0, -2).join(':')}:[MASKED]`
      }
    }
    return '[MASKED]'
  }

  logSecurityEvent(
    event: string,
    request: Request,
    result: 'success' | 'blocked' | 'error',
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    try {
      const forwarded = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      const ip = forwarded?.split(',')[0] || realIp || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      const log: SecurityLog = {
        timestamp: new Date().toISOString(),
        event,
        ip: this.sanitizeIp(ip),
        userAgent: this.sanitizeUserAgent(userAgent),
        result,
        reason,
        metadata: metadata ? this.sanitizeMetadata(metadata) : undefined
      }

      // 콘솔에 로그 출력 (프로덕션에서는 파일이나 외부 서비스로 전송)
      console.log('[SECURITY]', JSON.stringify(log, null, 2))
      
      // Redis에 보안 로그 저장 (선택사항)
      this.storeSecurityLog(log)
    } catch (error) {
      console.error('보안 로그 생성 오류:', error)
    }
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        // URL인 경우 도메인만 저장
        if (value.startsWith('http')) {
          sanitized[key] = this.sanitizeUrl(value)
        } else {
          // 일반 문자열은 길이 제한
          sanitized[key] = value.slice(0, 50)
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value)
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }

  private async storeSecurityLog(log: SecurityLog): Promise<void> {
    try {
      const logKey = `security_log:${Date.now()}`
      await redis.setex(logKey, 86400, JSON.stringify(log)) // 24시간 보관
    } catch (error) {
      console.error('보안 로그 저장 오류:', error)
    }
  }
}

export const securityLogger = new SecurityLogger()
