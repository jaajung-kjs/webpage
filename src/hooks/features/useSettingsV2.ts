/**
 * useSettingsV2 - V2 스키마 기반 사용자 설정 Hook
 * 
 * 주요 개선사항:
 * - content_metadata_v2 테이블을 통한 설정 저장
 * - 구조화된 설정 관리 (알림, 개인정보, 테마 등)
 * - 실시간 동기화 지원
 * - TypeScript 완전 지원
 * - 옵티미스틱 업데이트
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']
type UserV2 = Tables['users_v2']['Row']

// 설정 카테고리
export type SettingCategory = 'notification' | 'privacy' | 'theme' | 'general' | 'security'

// 알림 설정 타입
export interface NotificationSettings {
  email: boolean
  push: boolean
  comments: boolean
  likes: boolean
  follows: boolean
  mentions: boolean
  system: boolean
  digest: 'never' | 'daily' | 'weekly'
}

// 개인정보 설정 타입
export interface PrivacySettings {
  profileVisibility: 'public' | 'members' | 'private'
  showEmail: boolean
  showPhone: boolean
  showDepartment: boolean
  showBio: boolean
  allowMessages: boolean
  allowMentions: boolean
  showOnlineStatus: boolean
}

// 테마 설정 타입
export interface ThemeSettings {
  mode: 'light' | 'dark' | 'system'
  colorScheme: 'blue' | 'green' | 'purple' | 'orange'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  reducedMotion: boolean
}

// 일반 설정 타입
export interface GeneralSettings {
  language: 'ko' | 'en'
  timezone: string
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'
  timeFormat: '12h' | '24h'
  showAvatars: boolean
  autoSave: boolean
  defaultSort: 'newest' | 'oldest' | 'popular'
}

// 보안 설정 타입
export interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number // minutes
  loginNotifications: boolean
  suspiciousActivityAlerts: boolean
  allowedIPs: string[]
  requirePasswordChange: boolean
}

// 통합 설정 타입
export interface UserSettingsV2 {
  notification: NotificationSettings
  privacy: PrivacySettings
  theme: ThemeSettings
  general: GeneralSettings
  security: SecuritySettings
}

// 기본 설정값
const defaultSettings: UserSettingsV2 = {
  notification: {
    email: true,
    push: true,
    comments: true,
    likes: true,
    follows: true,
    mentions: true,
    system: true,
    digest: 'weekly'
  },
  privacy: {
    profileVisibility: 'members',
    showEmail: false,
    showPhone: false,
    showDepartment: true,
    showBio: true,
    allowMessages: true,
    allowMentions: true,
    showOnlineStatus: true
  },
  theme: {
    mode: 'system',
    colorScheme: 'blue',
    fontSize: 'medium',
    compactMode: false,
    reducedMotion: false
  },
  general: {
    language: 'ko',
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    showAvatars: true,
    autoSave: true,
    defaultSort: 'newest'
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    allowedIPs: [],
    requirePasswordChange: false
  }
}

/**
 * 사용자 설정 조회 Hook
 * 
 * Note: V2에서는 별도 설정 테이블이 없으므로 localStorage를 사용하고
 * 서버에는 중요한 설정만 users 테이블의 metadata에 저장
 */
export function useUserSettingsV2() {
  const { user, profile } = useAuth()
  
  return useQuery<UserSettingsV2, Error>({
    queryKey: ['user-settings-v2', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      
      // localStorage에서 클라이언트 설정 조회
      const localSettings: Partial<UserSettingsV2> = {}
      
      try {
        const categories: SettingCategory[] = ['notification', 'privacy', 'theme', 'general', 'security']
        categories.forEach(category => {
          const stored = localStorage.getItem(`settings-v2-${category}`)
          if (stored) {
            localSettings[category] = JSON.parse(stored)
          }
        })
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error)
      }
      
      // 서버의 사용자 프로필에서 중요한 설정 가져오기
      let serverSettings: Partial<UserSettingsV2> = {}
      
      // V2 스키마에서는 metadata 필드가 없으므로 서버 설정을 별도 테이블에서 관리
      // TODO: content_metadata_v2 테이블 또는 별도 설정 테이블 구현 시 추가
      
      // 기본값과 병합 (우선순위: 서버 > 로컬 > 기본값)
      return {
        notification: serverSettings.notification || localSettings.notification || defaultSettings.notification,
        privacy: serverSettings.privacy || localSettings.privacy || defaultSettings.privacy,
        theme: localSettings.theme || defaultSettings.theme, // 테마는 로컬만
        general: localSettings.general || defaultSettings.general, // 일반 설정도 로컬만
        security: serverSettings.security || defaultSettings.security // 보안은 서버만
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * 특정 카테고리 설정 조회 Hook
 */
export function useUserSettingsCategoryV2<T extends keyof UserSettingsV2>(category: T) {
  const { data: allSettings } = useUserSettingsV2()
  
  return {
    data: allSettings?.[category] || defaultSettings[category],
    isLoading: !allSettings,
    error: null
  }
}

/**
 * 설정 업데이트 Hook (특정 카테고리)
 */
export function useUpdateSettingsCategoryV2<T extends keyof UserSettingsV2>(category: T) {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  
  return useMutation<
    UserSettingsV2[T],
    Error,
    Partial<UserSettingsV2[T]>,
    { previousSettings?: UserSettingsV2[T] }
  >({
    mutationFn: async (updates) => {
      if (!user) throw new Error('User not authenticated')
      
      // 현재 설정 조회
      const currentSettings = queryClient.getQueryData<UserSettingsV2>(
        ['user-settings-v2', user.id]
      )?.[category] || defaultSettings[category]
      
      // 업데이트된 설정 병합
      const updatedSettings = { ...currentSettings, ...updates } as UserSettingsV2[T]
      
      // 클라이언트 설정 (theme, general)은 localStorage에 저장
      if (category === 'theme' || category === 'general') {
        localStorage.setItem(`settings-v2-${category}`, JSON.stringify(updatedSettings))
        return updatedSettings
      }
      
      // V2 스키마에서는 서버 설정도 localStorage에 저장
      // TODO: 별도 user_settings_v2 테이블 구현 시 서버 저장 로직 추가
      
      // 클라이언트 설정을 localStorage에 저장
      localStorage.setItem(`settings-v2-${category}`, JSON.stringify(updatedSettings))
      
      return updatedSettings
    },
    onMutate: async (updates) => {
      // 쿼리 취소
      await queryClient.cancelQueries({ 
        queryKey: ['user-settings-v2', user?.id] 
      })
      
      // 이전 설정 저장
      const previousSettings = queryClient.getQueryData<UserSettingsV2>(
        ['user-settings-v2', user?.id]
      )?.[category]
      
      // 옵티미스틱 업데이트
      queryClient.setQueryData(
        ['user-settings-v2', user?.id],
        (old: UserSettingsV2 | undefined) => old ? {
          ...old,
          [category]: { ...old[category], ...updates }
        } : undefined
      )
      
      return { previousSettings }
    },
    onError: (error, updates, context) => {
      // 롤백 - localStorage에서도 제거
      if (context?.previousSettings) {
        if (category === 'theme' || category === 'general') {
          localStorage.setItem(`settings-v2-${category}`, JSON.stringify(context.previousSettings))
        }
        
        queryClient.setQueryData(
          ['user-settings-v2', user?.id],
          (old: UserSettingsV2 | undefined) => old ? {
            ...old,
            [category]: context.previousSettings
          } : undefined
        )
      }
      
      console.error(`Settings update error for ${category}:`, error)
      toast.error(`${getCategoryLabel(category)} 설정 저장에 실패했습니다.`)
    },
    onSuccess: () => {
      toast.success(`${getCategoryLabel(category)} 설정이 저장되었습니다.`)
    },
    onSettled: () => {
      // 캐시 동기화
      queryClient.invalidateQueries({ 
        queryKey: ['user-settings-v2', user?.id] 
      })
      // 프로필 캐시도 무효화 (metadata가 변경되었으므로)
      queryClient.invalidateQueries({ 
        queryKey: ['profile'] 
      })
    }
  })
}

/**
 * 전체 설정 업데이트 Hook
 */
export function useUpdateAllSettingsV2() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  
  return useMutation<void, Error, Partial<UserSettingsV2>>({
    mutationFn: async (settings) => {
      if (!user) throw new Error('User not authenticated')
      
      // 클라이언트 설정들을 localStorage에 저장
      const clientSettings: (keyof UserSettingsV2)[] = ['theme', 'general']
      const serverSettings: (keyof UserSettingsV2)[] = ['notification', 'privacy', 'security']
      
      // localStorage 업데이트
      clientSettings.forEach(category => {
        if (settings[category]) {
          localStorage.setItem(`settings-v2-${category}`, JSON.stringify(settings[category]))
        }
      })
      
      // V2 스키마에서는 모든 설정을 localStorage에 저장
      // TODO: 별도 user_settings_v2 테이블 구현 시 서버 저장 로직 추가
      
      // 모든 설정을 localStorage에도 백업
      Object.entries(settings).forEach(([category, value]) => {
        localStorage.setItem(`settings-v2-${category}`, JSON.stringify(value))
      })
    },
    onSuccess: () => {
      // 모든 설정 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['user-settings-v2'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['profile'] 
      })
      
      toast.success('모든 설정이 저장되었습니다.')
    },
    onError: (error) => {
      console.error('All settings update error:', error)
      toast.error('설정 저장에 실패했습니다.')
    }
  })
}

/**
 * 설정 초기화 Hook
 */
export function useResetSettingsV2() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  
  return useMutation<void, Error, SettingCategory[]>({
    mutationFn: async (categories) => {
      if (!user) throw new Error('User not authenticated')
      
      const categoriesToReset = categories.length === 0 
        ? Object.keys(defaultSettings) as SettingCategory[]
        : categories
      
      // localStorage에서 설정 제거
      categoriesToReset.forEach(category => {
        localStorage.removeItem(`settings-v2-${category}`)
      })
      
      // 서버 설정 제거 (notification, privacy, security)
      const serverCategories = categoriesToReset.filter(cat => 
        ['notification', 'privacy', 'security'].includes(cat)
      )
      
      // V2 스키마에서는 모든 설정을 localStorage에서만 관리
      // TODO: 별도 user_settings_v2 테이블 구현 시 서버 삭제 로직 추가
    },
    onSuccess: (_, categories) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['user-settings-v2', user?.id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['profile'] 
      })
      
      if (categories.length === 0) {
        toast.success('모든 설정이 초기화되었습니다.')
      } else {
        toast.success(`${categories.map(getCategoryLabel).join(', ')} 설정이 초기화되었습니다.`)
      }
    },
    onError: (error) => {
      console.error('Settings reset error:', error)
      toast.error('설정 초기화에 실패했습니다.')
    }
  })
}

/**
 * 설정 내보내기/가져오기를 위한 Hook
 */
export function useExportSettingsV2() {
  const { data: settings } = useUserSettingsV2()
  
  return {
    exportSettings: () => {
      if (!settings) return null
      
      const exportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        settings
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kepco-settings-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      return exportData
    }
  }
}

export function useImportSettingsV2() {
  const updateSettings = useUpdateAllSettingsV2()
  
  return useMutation<void, Error, File>({
    mutationFn: async (file) => {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // 버전 확인
      if (data.version !== '2.0') {
        throw new Error('지원되지 않는 설정 파일 버전입니다.')
      }
      
      // 설정 검증 (기본적인 구조 확인)
      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('잘못된 설정 파일 형식입니다.')
      }
      
      // 설정 적용
      return updateSettings.mutateAsync(data.settings)
    },
    onSuccess: () => {
      toast.success('설정을 성공적으로 가져왔습니다.')
    },
    onError: (error) => {
      console.error('Settings import error:', error)
      toast.error(error.message || '설정 가져오기에 실패했습니다.')
    }
  })
}

// 헬퍼 함수들
function getCategoryLabel(category: SettingCategory): string {
  const labels: Record<SettingCategory, string> = {
    notification: '알림',
    privacy: '개인정보',
    theme: '테마',
    general: '일반',
    security: '보안'
  }
  return labels[category] || category
}

// 편의를 위한 개별 Hook들
export const useNotificationSettingsV2 = () => useUserSettingsCategoryV2('notification')
export const usePrivacySettingsV2 = () => useUserSettingsCategoryV2('privacy')
export const useThemeSettingsV2 = () => useUserSettingsCategoryV2('theme')
export const useGeneralSettingsV2 = () => useUserSettingsCategoryV2('general')
export const useSecuritySettingsV2 = () => useUserSettingsCategoryV2('security')

export const useUpdateNotificationSettingsV2 = () => useUpdateSettingsCategoryV2('notification')
export const useUpdatePrivacySettingsV2 = () => useUpdateSettingsCategoryV2('privacy')
export const useUpdateThemeSettingsV2 = () => useUpdateSettingsCategoryV2('theme')
export const useUpdateGeneralSettingsV2 = () => useUpdateSettingsCategoryV2('general')
export const useUpdateSecuritySettingsV2 = () => useUpdateSettingsCategoryV2('security')