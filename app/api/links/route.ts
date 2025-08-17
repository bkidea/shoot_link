import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { generateUniqueSlug } from '@/lib/slug'
import { validateUrl } from '@/lib/security'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { securityLogger } from '@/lib/security-logger'

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting 체크
    const clientId = getClientIdentifier(request)
    const rateLimit = await checkRateLimit(clientId, {
      maxRequests: 5, // 10초당 최대 5개 요청
      windowMs: 10000
    })

    if (!rateLimit.allowed) {
      securityLogger.logSecurityEvent(
        'rate_limit_exceeded',
        request,
        'blocked',
        'Rate limit 초과',
        { clientId, resetTime: rateLimit.resetTime }
      )
      
      return NextResponse.json(
        { 
          error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
          resetTime: rateLimit.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      )
    }

    const { url } = await request.json()
    
    // URL 검증
    const validation = await validateUrl(url, request)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    // 고유한 slug 생성
    const slug = generateUniqueSlug()
    
    // Redis에 저장
    await redis.set(`link:${slug}`, {
      originalUrl: url,
      createdAt: new Date().toISOString(),
      clicks: 0
    })
    
    // 통계 초기화
    await redis.set(`stats:${slug}`, {
      totalClicks: 0,
      dailyClicks: {},
      referrers: {}
    })
    
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://shoot-link.vercel.app'
    const shortUrl = `${baseUrl}/r/${slug}`
    
    // 성공 로그
    securityLogger.logSecurityEvent(
      'link_created',
      request,
      'success',
      undefined,
      { slug, originalUrl: url, shortUrl }
    )
    
    return NextResponse.json({
      success: true,
      slug,
      shortUrl,
      originalUrl: url
    }, {
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
    
  } catch (error) {
    console.error('링크 생성 오류:', error)
    
    // 오류 로그
    securityLogger.logSecurityEvent(
      'link_creation_error',
      request,
      'error',
      `링크 생성 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: '링크 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
