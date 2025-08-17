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
  const key = `rate_limit:${identifier}`
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // 현재 요청 수 확인
    const requests = await redis.zrangebyscore(key, windowStart, '+inf')
    const currentCount = requests.length

    if (currentCount >= maxRequests) {
      // 윈도우 내 첫 번째 요청 시간 확인
      const firstRequest = await redis.zrange(key, 0, 0, { withScores: true })
      const resetTime = firstRequest.length > 0 ? firstRequest[0].score + windowMs : now + windowMs
      
      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // 새 요청 추가
    await redis.zadd(key, now, now.toString())
    // 윈도우 밖의 오래된 요청들 제거
    await redis.zremrangebyscore(key, '-inf', windowStart)
    // 키 만료 시간 설정
    await redis.expire(key, Math.ceil(windowMs / 1000))

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetTime: now + windowMs
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
