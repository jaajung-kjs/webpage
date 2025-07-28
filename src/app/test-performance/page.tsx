'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface PerformanceResult {
  page: string
  loadTime: number
  apiCalls: number
  status: 'success' | 'error'
  details?: any
}

export default function PerformanceTestPage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<PerformanceResult[]>([])
  const [currentTest, setCurrentTest] = useState('')

  const testPages = [
    { name: 'Community List', path: '/community' },
    { name: 'Community Detail', path: '/community/1' },
    { name: 'Case List', path: '/cases' },
    { name: 'Case Detail', path: '/cases/1' },
    { name: 'Resource List', path: '/resources' },
    { name: 'Resource Detail', path: '/resources/1' }
  ]

  const measurePageLoad = async (pageName: string, pagePath: string): Promise<PerformanceResult> => {
    const startTime = performance.now()
    let apiCallCount = 0

    // Intercept fetch to count API calls
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      apiCallCount++
      return originalFetch(...args)
    }

    try {
      // Navigate to the page
      setCurrentTest(`Testing ${pageName}...`)
      
      // Create iframe to load page
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = pagePath
      document.body.appendChild(iframe)

      // Wait for page to load
      await new Promise((resolve) => {
        iframe.onload = resolve
        setTimeout(resolve, 5000) // Max 5 seconds
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Clean up
      document.body.removeChild(iframe)
      window.fetch = originalFetch

      return {
        page: pageName,
        loadTime: Math.round(loadTime),
        apiCalls: apiCallCount,
        status: 'success'
      }
    } catch (error) {
      window.fetch = originalFetch
      return {
        page: pageName,
        loadTime: 0,
        apiCalls: apiCallCount,
        status: 'error',
        details: error
      }
    }
  }

  const runPerformanceTests = async () => {
    setTesting(true)
    setResults([])

    for (const page of testPages) {
      const result = await measurePageLoad(page.name, page.path)
      setResults(prev => [...prev, result])
    }

    setCurrentTest('')
    setTesting(false)
  }

  const getLoadTimeColor = (loadTime: number) => {
    if (loadTime < 1000) return 'text-green-600'
    if (loadTime < 2000) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAverage = (results: PerformanceResult[], key: 'loadTime' | 'apiCalls') => {
    const values = results.filter(r => r.status === 'success').map(r => r[key])
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Performance Test Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              상세 페이지 성능 최적화 테스트
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Test Controls */}
              <div className="flex items-center justify-between">
                <Button 
                  onClick={runPerformanceTests} 
                  disabled={testing}
                  className="kepco-gradient"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      테스트 진행 중...
                    </>
                  ) : (
                    '성능 테스트 시작'
                  )}
                </Button>
                {currentTest && (
                  <p className="text-sm text-muted-foreground">{currentTest}</p>
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {getAverage(results, 'loadTime')}ms
                        </div>
                        <p className="text-xs text-muted-foreground">평균 로딩 시간</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {getAverage(results, 'apiCalls')}
                        </div>
                        <p className="text-xs text-muted-foreground">평균 API 호출 수</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">테스트 결과</h3>
                    {results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{result.page}</p>
                            <p className="text-sm text-muted-foreground">
                              API 호출: {result.apiCalls}회
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getLoadTimeColor(result.loadTime)}`}>
                            {result.loadTime}ms
                          </p>
                          {result.page.includes('Detail') && result.loadTime < 2000 && (
                            <Badge variant="outline" className="text-green-600">
                              최적화됨
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Optimization Notes */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">최적화 결과</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• 상세 페이지 API 호출을 병렬 처리로 변경</li>
                      <li>• Promise.all()을 사용하여 좋아요/북마크 상태 동시 확인</li>
                      <li>• 불필요한 함수 호출 제거로 코드 간소화</li>
                      <li>• 순차적 API 호출 대신 병렬 처리로 성능 개선</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}