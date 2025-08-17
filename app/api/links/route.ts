import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { generateUniqueSlug } from '@/lib/slug'
import { validateUrl } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    // URL 검증
    const validation = validateUrl(url)
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
    
    const shortUrl = `${process.env.PUBLIC_BASE_URL}/r/${slug}`
    
    return NextResponse.json({
      success: true,
      slug,
      shortUrl,
      originalUrl: url
    })
    
  } catch (error) {
    console.error('링크 생성 오류:', error)
    return NextResponse.json(
      { error: '링크 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
