/**
 * Online Manager
 * 
 * TanStack Query 스타일의 Online Manager
 * 네트워크 연결 상태 관리 및 재연결 시 데이터 갱신
 */

type OnlineListener = (isOnline: boolean) => void
type EventListener = (setOnline: (online?: boolean) => void) => (() => void) | undefined

export class OnlineManager {
  private listeners = new Set<OnlineListener>()
  private online: boolean | undefined
  private cleanup?: () => void
  private eventListener?: EventListener

  constructor() {
    this.setup()
  }

  /**
   * 기본 이벤트 리스너 설정
   */
  private setup() {
    this.setEventListener((setOnline) => {
      if (typeof window !== 'undefined' && window.addEventListener) {
        const onlineHandler = () => setOnline(true)
        const offlineHandler = () => setOnline(false)

        // online/offline 이벤트 리스너 등록
        window.addEventListener('online', onlineHandler, false)
        window.addEventListener('offline', offlineHandler, false)
        
        // 초기 상태 설정
        setOnline(window.navigator.onLine)

        // cleanup 함수 반환
        return () => {
          window.removeEventListener('online', onlineHandler)
          window.removeEventListener('offline', offlineHandler)
        }
      }
    })
  }

  /**
   * 커스텀 이벤트 리스너 설정
   */
  setEventListener(listener: EventListener) {
    // 기존 리스너 정리
    if (this.cleanup) {
      this.cleanup()
      this.cleanup = undefined
    }

    this.eventListener = listener

    // 새 리스너 설정
    this.cleanup = listener((online) => {
      this.setOnline(online)
    })
  }

  /**
   * 온라인 상태 변경
   */
  setOnline(online?: boolean) {
    const changed = this.online !== online
    this.online = online

    if (changed) {
      // 모든 리스너에 알림
      this.listeners.forEach((listener) => {
        listener(this.isOnline())
      })
    }
  }

  /**
   * 현재 온라인 상태 확인
   */
  isOnline(): boolean {
    if (typeof this.online === 'boolean') {
      return this.online
    }

    // undefined인 경우 기본값으로 확인
    if (typeof window !== 'undefined' && window.navigator.onLine !== undefined) {
      return window.navigator.onLine
    }

    return true
  }

  /**
   * 온라인 상태 변경 구독
   */
  subscribe(listener: OnlineListener): () => void {
    this.listeners.add(listener)

    // 즉시 현재 상태 전달
    listener(this.isOnline())

    // unsubscribe 함수 반환
    return () => {
      this.listeners.delete(listener)
    }
  }
}

// 싱글톤 인스턴스
export const onlineManager = new OnlineManager()

// 전역 접근을 위해 window 객체에 등록
if (typeof window !== 'undefined') {
  (window as any).onlineManager = onlineManager
}