import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // 링크가 존재하는지 확인
    const linkData = await redis.get(`link:${slug}`)
    if (!linkData) {
      return NextResponse.json(
        { error: '링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 리퍼러 상세 정보 가져오기
    const referrerDetails = await redis.hgetall(`stats:${slug}:referrer_details`)
    
    return NextResponse.json({
      success: true,
      details: referrerDetails
    })
    
  } catch (error) {
    console.error('리퍼러 상세 정보 조회 오류:', error)
    return NextResponse.json(
      { error: '리퍼러 상세 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
