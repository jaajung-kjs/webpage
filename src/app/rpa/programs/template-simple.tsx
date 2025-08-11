'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Download, Play, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers'

/**
 * RPA 프로그램 페이지 템플릿 (간단 버전)
 * 
 * 사용법:
 * 1. 이 파일을 복사하여 /src/app/rpa/programs/[프로그램명]/page.tsx 로 생성
 * 2. TemplatePage를 원하는 이름으로 변경 (예: ExcelComparePage)
 * 3. 제목, 설명, API 엔드포인트 수정
 * 4. 필요한 입력 필드 추가/수정
 */

export default function TemplatePage() {
  const router = useRouter()
  const { user, profile, loading, isMember } = useAuth()
  
  // 상태 관리
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)

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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (uploadedFile) {
      // 파일 타입 검증 (필요에 따라 수정)
      if (!uploadedFile.name.match(/\.(xlsx|xls|csv)$/)) {
        toast.error('지원되는 파일 형식이 아닙니다.')
        return
      }

      // 파일 크기 검증 (10MB)
      if (uploadedFile.size > 10 * 1024 * 1024) {
        toast.error('파일 크기는 10MB를 초과할 수 없습니다.')
        return
      }

      setFile(uploadedFile)
    }
  }

  // RPA 실행 핸들러
  const handleExecute = async () => {
    if (!file) {
      toast.error('처리할 파일을 선택해주세요.')
      return
    }

    setProcessing(true)
    setProgress(0)

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
      formData.append('file', file)

      // TODO: 실제 API 엔드포인트로 변경
      // const response = await fetch('/api/rpa/your-program', {
      //   method: 'POST',
      //   body: formData
      // })
      // const data = await response.json()
      
      // 임시 시뮬레이션 (3초 대기)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      clearInterval(progressInterval)
      setProgress(100)

      // 결과 설정
      setResult({
        url: '/temp/result.xlsx',
        message: '처리가 완료되었습니다.'
      })

      toast.success('파일 처리가 성공적으로 완료되었습니다.')
    } catch (error) {
      toast.error('파일 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  // 결과 다운로드 핸들러
  const handleDownload = () => {
    if (!result?.url) return
    
    // TODO: 실제 다운로드 구현
    toast.success('결과 파일 다운로드를 시작합니다.')
  }

  // 초기화 핸들러
  const handleReset = () => {
    setFile(null)
    setResult(null)
    setProgress(0)
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            <CardTitle className="text-2xl">RPA 프로그램 제목</CardTitle>
            <CardDescription>
              이 RPA 프로그램에 대한 설명을 작성하세요
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 파일 업로드 섹션 */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">파일 선택</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={processing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        클릭하여 파일 선택
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* 진행 상태 */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>처리 중...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* 결과 섹션 */}
            {result && !processing && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-medium">{result.message}</div>
                </AlertDescription>
              </Alert>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3 justify-end">
              {result && (
                <>
                  <Button 
                    variant="outline"
                    onClick={handleReset}
                  >
                    초기화
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    className="kepco-gradient"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    결과 다운로드
                  </Button>
                </>
              )}
              {!result && (
                <Button 
                  onClick={handleExecute}
                  disabled={!file || processing}
                  className="kepco-gradient"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {processing ? '처리 중...' : '실행'}
                </Button>
              )}
            </div>

            {/* 안내 사항 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>지원 파일 형식: Excel (.xlsx, .xls), CSV (.csv)</li>
                  <li>최대 파일 크기: 10MB</li>
                  <li>처리 시간은 파일 크기에 따라 달라질 수 있습니다</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}