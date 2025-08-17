import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { slug, referrer } = await request.json()
    
    if (!slug) {
      return NextResponse.json(
        { error: 'slug가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 링크가 존재하는지 확인
    const linkData = await redis.get(`link:${slug}`)
    if (!linkData) {
      return NextResponse.json(
        { error: '링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 클릭 수 증가
    await redis.incr(`link:${slug}:clicks`)
    
    // 통계 업데이트
    const today = new Date().toISOString().split('T')[0]
    await redis.hincrby(`stats:${slug}:daily`, today, 1)
    await redis.incr(`stats:${slug}:total`)
    
    // 리퍼러 정보 기록
    if (referrer) {
      await redis.hincrby(`stats:${slug}:referrers`, referrer, 1)
    }
    
    return NextResponse.json({
      success: true,
      message: '클릭이 기록되었습니다.'
    })
    
  } catch (error) {
    console.error('클릭 기록 오류:', error)
    return NextResponse.json(
      { error: '클릭 기록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
