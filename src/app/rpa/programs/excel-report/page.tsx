'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Download, Play, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers'

export default function ExcelReportPage() {
  const router = useRouter()
  const { user, profile, loading, isMember } = useAuth()
  
  // 상태 관리
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    file: string
    filename: string
    recordCount: number
    message: string
  } | null>(null)

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
      // 파일 타입 검증 (Excel 파일)
      if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Excel 파일(.xls, .xlsx)만 업로드 가능합니다.')
        return
      }

      // 파일 크기 검증 (10MB)
      if (uploadedFile.size > 10 * 1024 * 1024) {
        toast.error('파일 크기는 10MB를 초과할 수 없습니다.')
        return
      }

      setFile(uploadedFile)
      setResult(null) // 이전 결과 초기화
    }
  }

  // 파일을 Base64로 변환하는 함수
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result as string
        // data:application/vnd.ms-excel;base64, 부분 제거
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = error => reject(error)
    })
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
      }, 200)

      // 파일을 Base64로 변환
      const base64File = await fileToBase64(file)

      // Vercel Function 호출
      const response = await fetch('/api/excel-transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64File,
          filename: file.name
        })
      })
      
      clearInterval(progressInterval)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '파일 처리 중 오류가 발생했습니다.')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '파일 처리에 실패했습니다.')
      }

      setProgress(100)

      // 결과 설정
      setResult({
        file: data.file,
        filename: data.filename,
        recordCount: data.recordCount,
        message: data.message
      })

      toast.success('Excel 파일이 성공적으로 변환되었습니다.')
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  // 결과 다운로드 핸들러
  const handleDownload = () => {
    if (!result?.file || !result?.filename) return
    
    try {
      // Base64를 Blob으로 변환
      const byteCharacters = atob(result.file)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // 다운로드 링크 생성
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('파일 다운로드가 시작되었습니다.')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('파일 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 초기화 핸들러
  const handleReset = () => {
    setFile(null)
    setResult(null)
    setProgress(0)
    // 파일 input 초기화
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
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
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              휴전계획 보고서 변환
            </CardTitle>
            <CardDescription>
              HTML 형식의 휴전일람표를 정형화된 Excel 보고서로 변환합니다.
              직할, 강릉, 동해, 원주, 태백 사업소 데이터만 포함됩니다.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 파일 업로드 섹션 */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Excel 파일 선택 (.xls, .xlsx)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={processing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="mx-auto h-8 w-8 text-primary" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        클릭하여 Excel 파일 선택
                      </p>
                      <p className="text-xs text-muted-foreground">
                        HTML 형식의 .xls 파일 지원
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
                  <span>파일 변환 중...</span>
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
                  <div className="text-sm mt-1">
                    변환된 레코드 수: {result.recordCount}개
                  </div>
                  <div className="text-sm">
                    출력 파일: {result.filename}
                  </div>
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
                    보고서 다운로드
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
                  {processing ? '변환 중...' : '변환 실행'}
                </Button>
              )}
            </div>

            {/* 안내 사항 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">사용 안내</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>HTML 형식으로 저장된 Excel 파일(.xls)을 업로드하세요</li>
                  <li>직할, 강릉, 동해, 원주, 태백 사업소 데이터만 포함됩니다</li>
                  <li>활선 작업은 노란색으로 표시됩니다</li>
                  <li>순번은 자동으로 재정렬됩니다</li>
                  <li>최대 파일 크기: 10MB</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}