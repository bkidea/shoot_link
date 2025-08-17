'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()
      
      if (data.success) {
        setShortUrl(data.shortUrl)
      } else {
        setError(data.error || '링크 생성에 실패했습니다.')
      }
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      alert('링크가 복사되었습니다!')
    } catch {
      alert('복사에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ShootLink</h1>
          <p className="text-gray-600">긴 링크를 짧게 만들어보세요</p>
        </div>

        {/* URL 입력 폼 */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '생성 중...' : '짧은 링크 만들기'}
          </button>
        </form>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* 결과 표시 */}
        {shortUrl && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-medium text-gray-800 mb-3">생성된 짧은 링크</h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={shortUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                복사
              </button>
            </div>
            <div className="flex gap-2">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-center text-sm rounded hover:bg-blue-700 transition-colors"
              >
                링크 열기
              </a>
              <a
                href={`/s/${shortUrl.split('/r/')[1]}`}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                통계 보기
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
