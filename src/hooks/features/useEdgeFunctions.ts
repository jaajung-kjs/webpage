/**
 * Edge Functions Hook
 * 
 * Supabase Edge Functions 호출을 위한 통합 Hook
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

/**
 * 사용자 완전 삭제 Hook (Admin 전용)
 * 
 * RPC 함수를 통해 Database에서 사용자를 완전히 삭제
 */
export function useDeleteUserCompletely() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  
  return useMutation<
    { success: boolean; message: string },
    Error,
    { userId: string; userName?: string }
  >({
    mutationFn: async ({ userId }) => {
      // 권한 체크
      if (profile?.role !== 'admin') {
        throw new Error('관리자만 사용자를 완전히 삭제할 수 있습니다.')
      }
      
      // RPC 함수 호출 (Database 삭제)
      const { data, error } = await supabaseClient()
        .rpc('admin_delete_user', { 
          target_user_id: userId 
        })
      
      if (error) {
        throw new Error(`Database 삭제 실패: ${error.message}`)
      }
      
      const result = data as any
      if (!result?.success) {
        throw new Error(result?.error || '사용자 삭제에 실패했습니다.')
      }
      
      // Service Role을 사용해 Auth에서도 삭제 (별도 처리 필요)
      try {
        const authResponse = await fetch('/api/auth/admin-delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
        
        if (!authResponse.ok) {
          console.warn('Auth 삭제 실패했지만 DB는 삭제됨:', userId)
        }
      } catch (authError) {
        console.warn('Auth 삭제 중 오류 (DB는 삭제됨):', authError)
      }
      
      return {
        success: true,
        message: result?.message || '사용자가 성공적으로 삭제되었습니다.'
      }
    },
    onSuccess: (data, variables) => {
      // 캐시 무효화 - V2 스키마 키 사용
      queryClient.invalidateQueries({ queryKey: ['members-v2'] })
      queryClient.invalidateQueries({ queryKey: ['members-v2-stats'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      
      toast.success(
        variables.userName 
          ? `${variables.userName} 님의 계정이 완전히 삭제되었습니다.`
          : '사용자 계정이 완전히 삭제되었습니다.'
      )
    },
    onError: (error) => {
      console.error('Error deleting user completely:', error)
      toast.error(error.message || '사용자 삭제에 실패했습니다.')
    }
  })
}

/**
 * 이메일 발송 Hook
 * 
 * Edge Function을 통해 이메일 발송
 */
export function useSendEmail() {
  return useMutation<
    { success: boolean; messageId?: string },
    Error,
    {
      to: string | string[]
      subject: string
      html?: string
      text?: string
      from?: string
      replyTo?: string
    }
  >({
    mutationFn: async (emailData) => {
      // 세션 가져오기
      const { data: { session } } = await supabaseClient().auth.getSession()
      if (!session) {
        throw new Error('인증이 필요합니다.')
      }
      
      // Edge Function 호출
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(emailData)
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '이메일 발송에 실패했습니다.')
      }
      
      return result
    },
    onSuccess: () => {
      toast.success('이메일이 발송되었습니다.')
    },
    onError: (error) => {
      console.error('Error sending email:', error)
      toast.error(error.message || '이메일 발송에 실패했습니다.')
    }
  })
}

/**
 * 파일 최적화 Hook
 * 
 * Edge Function을 통해 이미지 리사이징 및 최적화
 */
export function useOptimizeImage() {
  return useMutation<
    { url: string; size: number; width: number; height: number },
    Error,
    {
      imageUrl: string
      width?: number
      height?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
    }
  >({
    mutationFn: async (options) => {
      // 세션 가져오기
      const { data: { session } } = await supabaseClient().auth.getSession()
      if (!session) {
        throw new Error('인증이 필요합니다.')
      }
      
      // Edge Function 호출
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/optimize-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(options)
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '이미지 최적화에 실패했습니다.')
      }
      
      return result
    },
    onError: (error) => {
      console.error('Error optimizing image:', error)
      toast.error(error.message || '이미지 최적화에 실패했습니다.')
    }
  })
}

/**
 * AI 텍스트 생성 Hook
 * 
 * Edge Function을 통해 AI 텍스트 생성 (OpenAI API)
 */
export function useGenerateText() {
  return useMutation<
    { text: string; tokens: number },
    Error,
    {
      prompt: string
      maxTokens?: number
      temperature?: number
      model?: string
    }
  >({
    mutationFn: async (options) => {
      // 세션 가져오기
      const { data: { session } } = await supabaseClient().auth.getSession()
      if (!session) {
        throw new Error('인증이 필요합니다.')
      }
      
      // Edge Function 호출
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(options)
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '텍스트 생성에 실패했습니다.')
      }
      
      return result
    },
    onError: (error) => {
      console.error('Error generating text:', error)
      toast.error(error.message || '텍스트 생성에 실패했습니다.')
    }
  })
}

/**
 * 데이터 내보내기 Hook
 * 
 * Edge Function을 통해 데이터를 CSV/Excel로 내보내기
 */
export function useExportData() {
  return useMutation<
    { url: string; fileName: string },
    Error,
    {
      table: string
      format: 'csv' | 'xlsx'
      filters?: Record<string, any>
      columns?: string[]
    }
  >({
    mutationFn: async (options) => {
      // 세션 가져오기
      const { data: { session } } = await supabaseClient().auth.getSession()
      if (!session) {
        throw new Error('인증이 필요합니다.')
      }
      
      // Edge Function 호출
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(options)
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '데이터 내보내기에 실패했습니다.')
      }
      
      return result
    },
    onSuccess: (data) => {
      // 다운로드 링크 생성
      const link = document.createElement('a')
      link.href = data.url
      link.download = data.fileName
      link.click()
      
      toast.success('데이터를 내보냈습니다.')
    },
    onError: (error) => {
      console.error('Error exporting data:', error)
      toast.error(error.message || '데이터 내보내기에 실패했습니다.')
    }
  })
}

/**
 * 배치 작업 실행 Hook
 * 
 * Edge Function을 통해 대량 작업 실행
 */
export function useRunBatchJob() {
  return useMutation<
    { jobId: string; status: string; processedCount: number },
    Error,
    {
      jobType: 'cleanup' | 'migration' | 'backup' | 'notification'
      params?: Record<string, any>
    }
  >({
    mutationFn: async (options) => {
      // 세션 가져오기
      const { data: { session } } = await supabaseClient().auth.getSession()
      if (!session) {
        throw new Error('인증이 필요합니다.')
      }
      
      // Edge Function 호출
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/batch-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(options)
        }
      )
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '배치 작업 실행에 실패했습니다.')
      }
      
      return result
    },
    onSuccess: (data) => {
      toast.success(`배치 작업이 시작되었습니다. (작업 ID: ${data.jobId})`)
    },
    onError: (error) => {
      console.error('Error running batch job:', error)
      toast.error(error.message || '배치 작업 실행에 실패했습니다.')
    }
  })
}