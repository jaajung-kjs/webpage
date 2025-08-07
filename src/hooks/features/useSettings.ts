/**
 * Settings Hook
 * 
 * 사용자 설정 관리를 위한 Hook
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import type { TablesUpdate } from '@/lib/database.types'

/**
 * 비밀번호 변경 Hook
 */
export function useChangePassword() {
  const { user } = useAuth()
  
  return useMutation<
    { success: boolean },
    Error,
    { currentPassword: string; newPassword: string }
  >({
    mutationFn: async ({ currentPassword, newPassword }) => {
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // 현재 비밀번호로 재인증
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      })
      
      if (signInError) {
        throw new Error('현재 비밀번호가 올바르지 않습니다.')
      }
      
      // 비밀번호 변경
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      return { success: true }
    },
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다.')
    },
    onError: (error) => {
      console.error('Error changing password:', error)
      toast.error(error.message || '비밀번호 변경에 실패했습니다.')
    }
  })
}

/**
 * 이메일 변경 Hook
 */
export function useChangeEmail() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<
    { success: boolean },
    Error,
    { newEmail: string; password: string }
  >({
    mutationFn: async ({ newEmail, password }) => {
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // 비밀번호로 재인증
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password
      })
      
      if (signInError) {
        throw new Error('비밀번호가 올바르지 않습니다.')
      }
      
      // 이메일 변경
      const { error: updateError } = await supabaseClient.auth.updateUser({
        email: newEmail
      })
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      return { success: true }
    },
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      toast.success('이메일 변경 확인 메일이 발송되었습니다. 새 이메일 주소에서 확인해주세요.')
    },
    onError: (error) => {
      console.error('Error changing email:', error)
      toast.error(error.message || '이메일 변경에 실패했습니다.')
    }
  })
}

/**
 * 알림 설정 업데이트 Hook
 */
export function useUpdateNotificationSettings() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<
    TablesUpdate<'users'>,
    Error,
    {
      emailNotifications?: boolean
      pushNotifications?: boolean
      commentNotifications?: boolean
      likeNotifications?: boolean
      followNotifications?: boolean
    }
  >({
    mutationFn: async (settings) => {
      if (!user || !profile) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // metadata 업데이트
      const currentMetadata = (profile.metadata || {}) as Record<string, any>
      const updatedMetadata = {
        ...currentMetadata,
        notifications: {
          email: settings.emailNotifications,
          push: settings.pushNotifications,
          comments: settings.commentNotifications,
          likes: settings.likeNotifications,
          follows: settings.followNotifications
        }
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      toast.success('알림 설정이 저장되었습니다.')
    },
    onError: (error) => {
      console.error('Error updating notification settings:', error)
      toast.error(error.message || '알림 설정 저장에 실패했습니다.')
    }
  })
}

/**
 * 개인정보 설정 업데이트 Hook
 */
export function useUpdatePrivacySettings() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<
    TablesUpdate<'users'>,
    Error,
    {
      profileVisibility?: 'public' | 'members' | 'private'
      showEmail?: boolean
      showPhone?: boolean
      showDepartment?: boolean
      allowMessages?: boolean
    }
  >({
    mutationFn: async (settings) => {
      if (!user || !profile) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // metadata 업데이트
      const currentMetadata = (profile.metadata || {}) as Record<string, any>
      const updatedMetadata = {
        ...currentMetadata,
        privacy: {
          profileVisibility: settings.profileVisibility,
          showEmail: settings.showEmail,
          showPhone: settings.showPhone,
          showDepartment: settings.showDepartment,
          allowMessages: settings.allowMessages
        }
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      toast.success('개인정보 설정이 저장되었습니다.')
    },
    onError: (error) => {
      console.error('Error updating privacy settings:', error)
      toast.error(error.message || '개인정보 설정 저장에 실패했습니다.')
    }
  })
}

/**
 * 계정 삭제 Hook
 */
export function useDeleteAccount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<
    { success: boolean },
    Error,
    { password: string; reason?: string }
  >({
    mutationFn: async ({ password, reason }) => {
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // 비밀번호로 재인증
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password
      })
      
      if (signInError) {
        throw new Error('비밀번호가 올바르지 않습니다.')
      }
      
      // 탈퇴 사유 저장 (선택사항 - 테이블 추가 필요)
      // TODO: account_deletions 테이블 생성 후 활성화
      // if (reason) {
      //   await supabaseClient
      //     .from('account_deletions')
      //     .insert({
      //       user_id: user.id,
      //       reason,
      //       deleted_at: new Date().toISOString()
      //     })
      // }
      
      // 사용자 데이터 삭제 (CASCADE로 관련 데이터도 삭제됨)
      const { error: deleteError } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', user.id)
      
      if (deleteError) throw deleteError
      
      // Auth 사용자 삭제는 Edge Function에서 처리해야 함
      // 여기서는 데이터베이스 레코드만 삭제
      
      // 로그아웃
      await supabaseClient.auth.signOut()
      
      return { success: true }
    },
    onSuccess: () => {
      // 캐시 전체 초기화
      queryClient.clear()
      
      toast.success('계정이 삭제되었습니다. 그동안 이용해주셔서 감사합니다.')
      
      // 홈페이지로 리다이렉트
      window.location.href = '/'
    },
    onError: (error) => {
      console.error('Error deleting account:', error)
      toast.error(error.message || '계정 삭제에 실패했습니다.')
    }
  })
}

/**
 * 세션 관리 Hook
 */
export function useManageSessions() {
  const { user } = useAuth()
  
  return useMutation<
    { success: boolean },
    Error,
    { action: 'signOutAll' | 'signOutOthers' }
  >({
    mutationFn: async ({ action }) => {
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }
      
      if (action === 'signOutAll') {
        // 모든 기기에서 로그아웃
        const { error } = await supabaseClient.auth.signOut({ scope: 'global' })
        if (error) throw error
      } else {
        // 다른 기기에서 로그아웃 (현재 세션 유지)
        const { error } = await supabaseClient.auth.signOut({ scope: 'others' })
        if (error) throw error
      }
      
      return { success: true }
    },
    onSuccess: (data, variables) => {
      if (variables.action === 'signOutAll') {
        toast.success('모든 기기에서 로그아웃되었습니다.')
        window.location.href = '/auth/login'
      } else {
        toast.success('다른 기기에서 로그아웃되었습니다.')
      }
    },
    onError: (error) => {
      console.error('Error managing sessions:', error)
      toast.error(error.message || '세션 관리에 실패했습니다.')
    }
  })
}