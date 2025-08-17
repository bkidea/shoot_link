import { redis } from './redis'

interface GSBCacheResult {
  isSafe: boolean
  timestamp: number
  expiresAt: number
}

const CACHE_DURATION = 3600 * 1000 // 1시간 캐시

export async function getGSBCache(url: string): Promise<GSBCacheResult | null> {
  try {
    const cacheKey = `gsb:${Buffer.from(url).toString('base64')}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      const result: GSBCacheResult = JSON.parse(cached as string)
      if (Date.now() < result.expiresAt) {
        return result
      }
      // 만료된 캐시 삭제
      await redis.del(cacheKey)
    }
    
    return null
  } catch (error) {
    console.error('GSB 캐시 조회 오류:', error)
    return null
  }
}

export async function setGSBCache(url: string, isSafe: boolean): Promise<void> {
  try {
    const cacheKey = `gsb:${Buffer.from(url).toString('base64')}`
    const now = Date.now()
    
    const cacheResult: GSBCacheResult = {
      isSafe,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    }
    
    await redis.setex(cacheKey, Math.ceil(CACHE_DURATION / 1000), JSON.stringify(cacheResult))
  } catch (error) {
    console.error('GSB 캐시 저장 오류:', error)
  }
}

export async function clearGSBCache(url?: string): Promise<void> {
  try {
    if (url) {
      const cacheKey = `gsb:${Buffer.from(url).toString('base64')}`
      await redis.del(cacheKey)
    } else {
      // 모든 GSB 캐시 삭제
      const keys = await redis.keys('gsb:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  } catch (error) {
    console.error('GSB 캐시 삭제 오류:', error)
  }
}
