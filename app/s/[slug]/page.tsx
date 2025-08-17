'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalClicks: number
  last7Days: Record<string, number>
  topReferrers: Array<{ referrer: string; count: number }>
  createdAt: string
}

export default function StatsPage() {
  const params = useParams()
  const slug = params.slug as string
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/links/${slug}/stats`)
        const data = await response.json()
        
        if (data.success) {
          setStats(data.stats)
        } else {
          setError(data.error || '통계를 불러올 수 없습니다.')
        }
      } catch {
        setError('서버 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchStats()
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">통계를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">통계를 찾을 수 없습니다</h1>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/r/${slug}`

  // 리퍼러 표시 이름 포맷팅
  const formatReferrerName = (referrerKey: string) => {
    if (referrerKey === 'direct:none') return '직접 접속'
    if (referrerKey === 'mobile_app:direct') return '모바일 앱'
    
    const [source, medium] = referrerKey.split(':')
    
    if (source === 'slack') return 'Slack (채팅)'
    if (source === 'kakaotalk') return '카카오톡 (채팅)'
    if (source === 'telegram') return 'Telegram (채팅)'
    if (source === 'whatsapp') return 'WhatsApp (채팅)'
    if (source === 'discord') return 'Discord (채팅)'
    if (source === 'teams') return 'Teams (채팅)'
    if (source === 'facebook') return 'Facebook (소셜)'
    if (source === 'twitter') return 'Twitter (소셜)'
    if (source === 'instagram') return 'Instagram (소셜)'
    if (source === 'linkedin') return 'LinkedIn (소셜)'
    if (source === 'google') return 'Google (검색)'
    if (source === 'naver') return 'Naver (검색)'
    
    return `${source} (${medium})`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">링크 통계</h1>
          <p className="text-gray-600 text-sm">{shortUrl}</p>
        </div>

        {/* 링크 정보 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
          <h2 className="font-medium text-gray-800 mb-3">생성 정보</h2>
          <p className="text-sm text-gray-600">
            생성일: {new Date(stats.createdAt).toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* 총 클릭 수 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
          <h2 className="font-medium text-gray-800 mb-3">총 클릭 수</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.totalClicks.toLocaleString()}</p>
        </div>

        {/* 최근 7일 통계 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
          <h2 className="font-medium text-gray-800 mb-3">최근 7일</h2>
          <div className="space-y-2">
            {Object.entries(stats.last7Days).map(([date, clicks]) => (
              <div key={date} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
                <span className="font-medium">{clicks}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 상위 리퍼러 */}
        {stats.topReferrers.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <h2 className="font-medium text-gray-800 mb-3">상위 리퍼러</h2>
            <div className="space-y-2">
              {stats.topReferrers.map((referrer, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">
                    {formatReferrerName(referrer.referrer)}
                  </span>
                  <span className="font-medium">{referrer.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 홈으로 돌아가기 */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
