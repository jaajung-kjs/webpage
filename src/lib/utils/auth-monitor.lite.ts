/**
 * Lightweight Auth Monitor - Production-safe monitoring
 * 가벼운 버전으로 프로덕션에서도 최소한의 모니터링 제공
 */

import { AUTH_CONSTANTS } from '../constants/auth'

export class AuthMonitorLite {
  private static loopCount = 0
  private static lastLoopDetection = 0
  
  /**
   * 간단한 루프 감지 (프로덕션 안전)
   */
  static checkLoop(eventCount: number): boolean {
    if (eventCount > AUTH_CONSTANTS.MAX_AUTH_UPDATES_PER_WINDOW) {
      const now = Date.now()
      if (now - this.lastLoopDetection > AUTH_CONSTANTS.LOOP_DETECTION_WINDOW_MS) {
        this.loopCount = 0
      }
      this.loopCount++
      this.lastLoopDetection = now
      
      if (this.loopCount > 2) {
        console.error('[Auth] Loop detected - please refresh the page')
        return true
      }
    }
    return false
  }
  
  /**
   * 간단한 로그 (개발 환경에서만)
   */
  static log(event: string, data?: any) {
    if (!AUTH_CONSTANTS.ENABLE_AUTH_MONITORING) return
    
    // 개발 환경에서만 상세 로그
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] ${event}`, data || '')
    }
  }
}