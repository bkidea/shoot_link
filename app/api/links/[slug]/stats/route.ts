import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

interface LinkData {
  originalUrl: string
  createdAt: string
  clicks: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // 링크가 존재하는지 확인
    const linkData = await redis.get(`link:${slug}`) as LinkData | null
    if (!linkData) {
      return NextResponse.json(
        { error: '링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 통계 데이터 가져오기
    const [totalClicks, dailyClicks, referrers] = await Promise.all([
      redis.get(`stats:${slug}:total`) || 0,
      redis.hgetall(`stats:${slug}:daily`) || {},
      redis.hgetall(`stats:${slug}:referrers`) || {}
    ])
    
    // 최근 7일 통계 계산
    const last7Days: Record<string, number> = {}
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days[dateStr] = parseInt((dailyClicks as Record<string, string>)[dateStr] || '0')
    }
    
    // 상위 리퍼러 정렬
    const topReferrers = Object.entries(referrers as Record<string, string>)
      .sort(([,a], [,b]) => parseInt(b) - parseInt(a))
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count: parseInt(count) }))
    
    return NextResponse.json({
      success: true,
      stats: {
        totalClicks: parseInt(totalClicks as string) || 0,
        last7Days: last7Days,
        topReferrers: topReferrers,
        createdAt: linkData.createdAt
      }
    })
    
  } catch (error) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
