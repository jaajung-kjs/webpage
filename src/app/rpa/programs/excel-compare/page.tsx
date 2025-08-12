'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload, Download, Play, AlertCircle, CheckCircle, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers'

interface ComparisonResult {
  total_rows: number
  differences: Array<{
    row_number: number
    index: number
    file1_point: string
    file2_point: string
  }>
  file1_rows: number
  file2_rows: number
  match_rate: number
  download_url?: string
}

export default function ExcelComparePage() {
  const router = useRouter()
  const { user, profile, loading, isMember } = useAuth()
  
  // 상태 관리
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Member 권한 체크
  useEffect(() => {
    if (!loading) {
      if (!user || !isMember) {
        router.push('/')
      }
    }
  }, [user, isMember, loading, router])

  // 로딩 중이거나 권한 없으면 표시 안함
  if (loading || !user || !isMember) {
    return null
  }

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    const uploadedFile = e.target.files?.[0]
    if (uploadedFile) {
      // 파일 타입 검증
      if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Excel 파일(.xlsx, .xls)만 지원됩니다.')
        return
      }

      // 파일 크기 검증 (20MB)
      if (uploadedFile.size > 20 * 1024 * 1024) {
        toast.error('파일 크기는 20MB를 초과할 수 없습니다.')
        return
      }

      if (fileNumber === 1) {
        setFile1(uploadedFile)
      } else {
        setFile2(uploadedFile)
      }
      
      toast.success(`파일 ${fileNumber}이 선택되었습니다.`)
    }
  }

  // RPA 실행 핸들러
  const handleExecute = async () => {
    if (!file1 || !file2) {
      toast.error('비교할 두 개의 파일을 모두 선택해주세요.')
      return
    }

    setProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // 프로그레스 시뮬레이션
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // FormData 생성
      const formData = new FormData()
      formData.append('file1', file1)
      formData.append('file2', file2)

      // AWS API Gateway 엔드포인트 호출
      const response = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://your-api-gateway-url/prod/excel-compare', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('서버 오류가 발생했습니다.')
      }

      const data = await response.json()
      
      clearInterval(progressInterval)
      setProgress(100)

      // 결과 설정
      setResult(data)

      toast.success('파일 비교가 성공적으로 완료되었습니다.')
    } catch (error) {
      toast.error('파일 처리 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  // 결과 다운로드 핸들러
  const handleDownload = async () => {
    if (!result?.download_url) return
    
    try {
      const response = await fetch(result.download_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'comparison_results.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('결과 파일 다운로드를 시작합니다.')
    } catch (error) {
      toast.error('다운로드 중 오류가 발생했습니다.')
    }
  }

  // 초기화 핸들러
  const handleReset = () => {
    setFile1(null)
    setFile2(null)
    setResult(null)
    setProgress(0)
    setShowDetails(false)
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* 뒤로가기 버튼 */}
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => router.push('/rpa')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          RPA 목록으로
        </Button>

        {/* 메인 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Excel 포인트 이름 비교
            </CardTitle>
            <CardDescription>
              두 Excel 파일의 포인트 이름을 자동으로 비교하고 차이점을 찾아드립니다.
              시트와 컬럼을 자동으로 감지하여 비교합니다.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 파일 업로드 섹션 */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* 파일 1 */}
              <div className="space-y-2">
                <Label htmlFor="file1-upload">파일 1 (기준 파일)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 1)}
                    className="hidden"
                    id="file1-upload"
                    disabled={processing}
                  />
                  <label htmlFor="file1-upload" className="cursor-pointer">
                    {file1 ? (
                      <div className="space-y-1">
                        <FileSpreadsheet className="mx-auto h-6 w-6 text-green-600" />
                        <p className="text-sm font-medium truncate">{file1.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file1.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          클릭하여 파일 선택
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* 파일 2 */}
              <div className="space-y-2">
                <Label htmlFor="file2-upload">파일 2 (비교 파일)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 2)}
                    className="hidden"
                    id="file2-upload"
                    disabled={processing}
                  />
                  <label htmlFor="file2-upload" className="cursor-pointer">
                    {file2 ? (
                      <div className="space-y-1">
                        <FileSpreadsheet className="mx-auto h-6 w-6 text-blue-600" />
                        <p className="text-sm font-medium truncate">{file2.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file2.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          클릭하여 파일 선택
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* 진행 상태 */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    파일 분석 및 비교 중...
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* 결과 섹션 */}
            {result && !processing && (
              <>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <div className="font-medium">비교가 완료되었습니다!</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">총 비교 행:</span>
                          <span className="ml-2 font-medium">{result.total_rows}개</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">차이점:</span>
                          <span className="ml-2 font-medium text-orange-600">
                            {result.differences.length}개
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">파일1 행 수:</span>
                          <span className="ml-2 font-medium">{result.file1_rows}개</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">파일2 행 수:</span>
                          <span className="ml-2 font-medium">{result.file2_rows}개</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">일치율:</span>
                        <span className="ml-2 text-lg font-bold">
                          {result.match_rate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* 차이점 상세 보기 */}
                {result.differences.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                    >
                      {showDetails ? '상세 내용 숨기기' : '차이점 상세 보기'}
                    </Button>
                    
                    {showDetails && (
                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">행 번호</th>
                              <th className="text-left p-2">파일1 포인트명</th>
                              <th className="text-left p-2">파일2 포인트명</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.differences.slice(0, 20).map((diff, idx) => (
                              <tr key={idx} className="border-b hover:bg-muted/50">
                                <td className="p-2">{diff.row_number}</td>
                                <td className="p-2 text-red-600">{diff.file1_point || '(빈 값)'}</td>
                                <td className="p-2 text-blue-600">{diff.file2_point || '(빈 값)'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {result.differences.length > 20 && (
                          <p className="text-center text-sm text-muted-foreground mt-2">
                            ... 외 {result.differences.length - 20}개 더 있습니다
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3 justify-end">
              {result && (
                <>
                  <Button 
                    variant="outline"
                    onClick={handleReset}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    초기화
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    className="kepco-gradient"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV 다운로드
                  </Button>
                </>
              )}
              {!result && (
                <Button 
                  onClick={handleExecute}
                  disabled={!file1 || !file2 || processing}
                  className="kepco-gradient"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {processing ? '비교 중...' : '비교 시작'}
                </Button>
              )}
            </div>

            {/* 안내 사항 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">사용 안내</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Excel 파일(.xlsx, .xls)을 업로드하세요</li>
                    <li>포인트명 컬럼과 시트를 자동으로 감지합니다</li>
                    <li>'status', '감시', '제어' 시트를 우선 선택합니다</li>
                    <li>'포인트명', 'Point Name' 컬럼을 자동으로 찾습니다</li>
                    <li>최대 파일 크기: 20MB</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}