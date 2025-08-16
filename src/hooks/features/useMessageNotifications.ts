/**
 * useMessageNotifications - 메시지 실시간 알림 시스템
 * 
 * 기능:
 * - 새 메시지 도착 시 브라우저 알림
 * - 토스트 알림 표시
 * - 사운드 알림 (옵션)
 * - 알림 권한 관리
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthV2 } from './useAuthV2'
import { supabaseClient } from '@/lib/core/connection-core'
import { userMessageSubscriptionManager } from '@/lib/realtime/UserMessageSubscriptionManager'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface MessageNotification {
  id: string
  senderName: string
  senderAvatar?: string | null
  content: string
  conversationId: string
  createdAt: string
}

interface NotificationSettings {
  browser: boolean
  toast: boolean
  sound: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  browser: true,
  toast: true,
  sound: false
}

export function useMessageNotifications() {
  const { user } = useAuthV2()
  const router = useRouter()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 알림 권한 요청
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  // 알림 권한 상태 확인
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // 사운드 초기화
  useEffect(() => {
    if (settings.sound) {
      // 무료 알림음 사용 - 브라우저 기본 소리
      audioRef.current = new Audio('/sounds/notification.mp3')
      audioRef.current.volume = 0.5
    }
  }, [settings.sound])

  // 브라우저 알림 표시
  const showBrowserNotification = (notification: MessageNotification) => {
    if (!settings.browser || permission !== 'granted') return

    const browserNotification = new Notification(`새 메시지: ${notification.senderName}`, {
      body: notification.content.length > 50 
        ? notification.content.substring(0, 50) + '...' 
        : notification.content,
      icon: notification.senderAvatar || '/images/default-avatar.png',
      tag: `message-${notification.conversationId}`, // 같은 대화방 알림은 덮어씀
      requireInteraction: false,
      silent: !settings.sound
    })

    // 클릭 시 메시지 모달 열기
    browserNotification.onclick = () => {
      window.focus()
      // 메시지 모달 열기 이벤트 발생
      window.dispatchEvent(new CustomEvent('openMessageModal', {
        detail: { conversationId: notification.conversationId }
      }))
      browserNotification.close()
    }

    // 5초 후 자동 닫기
    setTimeout(() => {
      browserNotification.close()
    }, 5000)
  }

  // 토스트 알림 표시
  const showToastNotification = (notification: MessageNotification) => {
    if (!settings.toast) return

    toast.info(`${notification.senderName}님이 메시지를 보냈습니다`, {
      description: notification.content.length > 80 
        ? notification.content.substring(0, 80) + '...' 
        : notification.content,
      action: {
        label: '확인',
        onClick: () => {
          // 메시지 모달 열기 이벤트 발생
          window.dispatchEvent(new CustomEvent('openMessageModal', {
            detail: { conversationId: notification.conversationId }
          }))
        }
      },
      duration: 4000
    })
  }

  // 사운드 알림 재생
  const playSound = () => {
    if (!settings.sound || !audioRef.current) return
    
    try {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(error => {
        console.warn('Failed to play notification sound:', error)
      })
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }

  // 실시간 메시지 구독 - UserMessageSubscriptionManager 사용
  useEffect(() => {
    if (!user) return

    const componentId = `notifications-${Date.now()}`
    
    // Manager에 새 메시지 콜백 등록
    userMessageSubscriptionManager.registerCallbacks(componentId, {
      onNewMessage: async (payload: any) => {
        const newMessage = payload.new

        // 내가 보낸 메시지는 알림 표시 안함
        if (newMessage.sender_id === user.id) return

        // 내가 참여한 대화방인지 확인
        const { data: conversation } = await supabaseClient
          .from('conversations_v2')
          .select('id')
          .eq('id', newMessage.conversation_id)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .single()

        if (!conversation) return

        // 발신자 정보 조회
        const { data: sender } = await supabaseClient
          .from('users_v2')
          .select('id, name, avatar_url')
          .eq('id', newMessage.sender_id)
          .single()

        if (!sender) return

        const notification: MessageNotification = {
          id: newMessage.id,
          senderName: sender.name || '알 수 없는 사용자',
          senderAvatar: sender.avatar_url,
          content: newMessage.content,
          conversationId: newMessage.conversation_id,
          createdAt: newMessage.created_at
        }

        // 페이지가 포커스되어 있지 않을 때만 알림 표시
        if (document.hidden) {
          showBrowserNotification(notification)
        }
        
        // 토스트는 항상 표시 (페이지 내에서 확인 가능)
        showToastNotification(notification)
        
        // 사운드 재생
        playSound()
      }
    })

    return () => {
      userMessageSubscriptionManager.unregisterCallbacks(componentId)
    }
  }, [user?.id]) // settings, permission 제거 - 콜백 내부에서 최신값 참조

  // 설정 업데이트
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
    
    // 로컬스토리지에 저장
    localStorage.setItem('messageNotificationSettings', JSON.stringify({
      ...settings,
      ...newSettings
    }))
  }

  // 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem('messageNotificationSettings')
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        setSettings(parsedSettings)
      } catch (error) {
        console.warn('Failed to parse notification settings:', error)
      }
    }
  }, [])

  return {
    // 상태
    permission,
    settings,
    
    // 액션
    requestPermission,
    updateSettings,
    
    // 수동 알림 트리거 (테스트용)
    showTestNotification: () => {
      const testNotification: MessageNotification = {
        id: 'test',
        senderName: '테스트 사용자',
        senderAvatar: null,
        content: '테스트 메시지입니다.',
        conversationId: 'test-conversation',
        createdAt: new Date().toISOString()
      }
      
      showBrowserNotification(testNotification)
      showToastNotification(testNotification)
      playSound()
    }
  }
}

// 알림 설정 컴포넌트를 위한 타입 export
export type { NotificationSettings, MessageNotification }