/**
 * Focus Manager
 * 
 * TanStack Query 스타일의 Focus Manager
 * 백그라운드 복귀 시 데이터 갱신을 위한 포커스 상태 관리
 */

type FocusListener = (isFocused: boolean) => void
type EventListener = (handleFocus: (isFocused?: boolean) => void) => (() => void) | undefined

export class FocusManager {
  private listeners = new Set<FocusListener>()
  private focused: boolean | undefined
  private cleanup?: () => void
  private eventListener?: EventListener

  constructor() {
    this.setup()
  }

  /**
   * 기본 이벤트 리스너 설정
   */
  private setup() {
    // 기본적으로 visibilitychange 이벤트 사용 (TanStack Query와 동일)
    this.setEventListener((handleFocus) => {
      if (typeof window !== 'undefined' && window.addEventListener) {
        const visibilitychangeHandler = () => {
          handleFocus(document.visibilityState === 'visible')
        }

        // visibilitychange 이벤트 리스너 등록
        window.addEventListener('visibilitychange', visibilitychangeHandler, false)
        
        // 초기 상태 설정
        handleFocus(document.visibilityState === 'visible')

        // cleanup 함수 반환
        return () => {
          window.removeEventListener('visibilitychange', visibilitychangeHandler)
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
    this.cleanup = listener((isFocused) => {
      this.setFocused(isFocused)
    })
  }

  /**
   * 포커스 상태 변경
   */
  setFocused(focused?: boolean) {
    const changed = this.focused !== focused
    this.focused = focused

    if (changed) {
      // 모든 리스너에 알림
      this.listeners.forEach((listener) => {
        listener(this.isFocused())
      })
    }
  }

  /**
   * 현재 포커스 상태 확인
   */
  isFocused(): boolean {
    if (typeof this.focused === 'boolean') {
      return this.focused
    }

    // undefined인 경우 기본값으로 확인
    if (typeof window !== 'undefined' && window.document) {
      return document.visibilityState === 'visible'
    }

    return true
  }

  /**
   * 포커스 상태 변경 구독
   */
  subscribe(listener: FocusListener): () => void {
    this.listeners.add(listener)

    // 즉시 현재 상태 전달
    listener(this.isFocused())

    // unsubscribe 함수 반환
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 강제로 포커스 이벤트 트리거 (디버깅용)
   */
  triggerFocus() {
    this.setFocused(true)
  }
}

// 싱글톤 인스턴스
export const focusManager = new FocusManager()

// 전역 접근을 위해 window 객체에 등록
if (typeof window !== 'undefined') {
  (window as any).focusManager = focusManager
}