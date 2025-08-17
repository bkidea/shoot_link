import { redis } from './redis'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10초당 최대 10개 요청
  windowMs: 10000
}

export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()

  try {
    // 간단한 카운터 기반 Rate Limiting (Upstash Redis 호환)
    const currentKey = `rate_limit_current:${identifier}`
    const resetKey = `rate_limit_reset:${identifier}`
    
    // 현재 카운터 가져오기
    const currentCountResult = await redis.get(currentKey)
    const resetTimeResult = await redis.get(resetKey)
    
    const currentCount = typeof currentCountResult === 'number' ? currentCountResult : 0
    const resetTime = typeof resetTimeResult === 'number' ? resetTimeResult : (now + windowMs)
    
    // 윈도우가 지났으면 리셋
    if (now > resetTime) {
      await redis.setex(currentKey, Math.ceil(windowMs / 1000), 1)
      await redis.setex(resetKey, Math.ceil(windowMs / 1000), now + windowMs)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      }
    }
    
    // 요청 수 체크
    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: resetTime
      }
    }
    
    // 카운터 증가
    await redis.incr(currentKey)
    
    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetTime: resetTime
    }
  } catch (error) {
    console.error('Rate limit 체크 오류:', error)
    // Redis 오류 시 기본적으로 허용
    return { allowed: true, remaining: maxRequests, resetTime: now + windowMs }
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  // User-Agent도 포함하여 더 정확한 식별
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `${ip}:${userAgent.slice(0, 50)}`
}
