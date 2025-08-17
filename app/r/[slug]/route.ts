import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { analyzeReferrer, formatReferrerDisplay } from '@/lib/referrer'

interface LinkData {
  originalUrl: string
  createdAt: string
  clicks: number
}

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Redis에서 링크 정보 가져오기
    const linkData = await redis.get(`link:${slug}`) as LinkData | null
    
    console.log('Link data:', linkData)
    console.log('Link data type:', typeof linkData)
    
    if (!linkData) {
      return NextResponse.json(
        { error: '링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // linkData가 객체인지 확인
    if (typeof linkData !== 'object' || !linkData.originalUrl) {
      console.error('Invalid link data structure:', linkData)
      return NextResponse.json(
        { error: '잘못된 링크 데이터 구조입니다.' },
        { status: 500 }
      )
    }
    
    // 클릭 수 증가
    await redis.incr(`link:${slug}:clicks`)
    
    // 통계 업데이트
    const today = new Date().toISOString().split('T')[0]
    await redis.hincrby(`stats:${slug}:daily`, today, 1)
    await redis.incr(`stats:${slug}:total`)
    
    // 개선된 리퍼러 분석
    const referrerInfo = analyzeReferrer(request)
    const referrerKey = `${referrerInfo.source}:${referrerInfo.medium}`
    const referrerDisplay = formatReferrerDisplay(referrerInfo)
    
    // 리퍼러 통계 업데이트
    await redis.hincrby(`stats:${slug}:referrers`, referrerKey, 1)
    
    // 상세 리퍼러 정보 저장 (선택사항)
    const referrerDetail = {
      display: referrerDisplay,
      source: referrerInfo.source,
      medium: referrerInfo.medium,
      campaign: referrerInfo.campaign,
      isMobile: referrerInfo.isMobile,
      isApp: referrerInfo.isApp,
      timestamp: new Date().toISOString()
    }
    
    await redis.hset(`stats:${slug}:referrer_details`, { [referrerKey]: JSON.stringify(referrerDetail) })
    
    console.log('Referrer info:', referrerInfo)
    console.log('Redirecting to:', linkData.originalUrl)
    
    // 원래 URL로 리다이렉트
    return NextResponse.redirect(linkData.originalUrl)
    
  } catch (error) {
    console.error('리다이렉트 오류:', error)
    return NextResponse.json(
      { error: '리다이렉트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
