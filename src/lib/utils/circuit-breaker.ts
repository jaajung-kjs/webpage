/**
 * Circuit Breaker Pattern Implementation
 * 
 * 연쇄 실패를 방지하고 시스템 안정성을 높이기 위한 Circuit Breaker 패턴
 * - 실패 임계값 도달 시 Circuit Open (요청 차단)
 * - Open 상태에서 fallback 실행
 * - Timeout 후 Half-open 상태로 전환하여 복구 시도
 * - Half-open에서 성공 시 Closed로, 실패 시 다시 Open으로
 */

/**
 * Circuit Breaker 상태
 */
export type CircuitState = 'closed' | 'open' | 'half-open'

/**
 * Circuit Breaker 설정
 */
export interface CircuitBreakerConfig {
  /** 실패 임계값 (이 수치에 도달하면 Circuit이 Open됨) */
  failureThreshold: number
  /** Circuit이 Open된 후 Half-open으로 전환되기까지의 시간 (ms) */
  resetTimeout: number
  /** 모니터링 윈도우 시간 (이 시간 동안의 통계를 추적) */
  monitoringWindow: number
  /** Half-open 상태에서 성공해야 하는 요청 수 */
  successThreshold: number
  /** 메트릭 수집 활성화 여부 */
  enableMetrics: boolean
}

/**
 * Circuit Breaker 메트릭
 */
export interface CircuitBreakerMetrics {
  /** 총 요청 수 */
  totalRequests: number
  /** 성공한 요청 수 */
  successCount: number
  /** 실패한 요청 수 */
  failureCount: number
  /** 현재 연속 실패 수 */
  consecutiveFailures: number
  /** 마지막 실패 시간 */
  lastFailureTime: number | null
  /** 마지막 성공 시간 */
  lastSuccessTime: number | null
  /** Circuit이 Open된 시간 */
  circuitOpenedAt: number | null
  /** 실패율 (0.0 ~ 1.0) */
  failureRate: number
}

/**
 * Fallback 함수 타입
 */
export type FallbackFunction<T> = (error: Error) => T | Promise<T>

/**
 * Circuit Breaker 클래스
 */
export class CircuitBreaker<T = any> {
  private state: CircuitState = 'closed'
  private metrics: CircuitBreakerMetrics
  private config: CircuitBreakerConfig
  private resetTimer: NodeJS.Timeout | null = null
  private fallbackFunction: FallbackFunction<T> | null = null
  private requests: Array<{ timestamp: number; success: boolean }> = []
  
  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1분
    monitoringWindow: 60000, // 1분
    successThreshold: 2,
    enableMetrics: true
  }

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      circuitOpenedAt: null,
      failureRate: 0
    }
    
    console.log(`[CircuitBreaker] Initialized with config:`, this.config)
  }

  /**
   * Fallback 함수 설정
   */
  fallback(fn: FallbackFunction<T>): this {
    this.fallbackFunction = fn
    return this
  }

  /**
   * Promise 실행
   */
  async execute<R = T>(promise: () => Promise<R>): Promise<R> {
    // Circuit이 Open 상태인 경우
    if (this.state === 'open') {
      const canAttemptReset = this.canAttemptReset()
      
      if (canAttemptReset) {
        // Half-open 상태로 전환
        this.transitionToHalfOpen()
      } else {
        // Fallback 실행 또는 에러 발생
        const error = new Error(`Circuit breaker is OPEN. Last failure: ${this.metrics.lastFailureTime}`)
        error.name = 'CircuitBreakerOpenError'
        
        if (this.fallbackFunction) {
          console.log('[CircuitBreaker] Executing fallback due to open circuit')
          return this.fallbackFunction(error) as R
        }
        
        throw error
      }
    }

    try {
      // 요청 실행
      const result = await promise()
      this.onSuccess()
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      this.onFailure(errorObj)
      
      // Half-open 상태에서 실패하면 다시 Open으로
      if (this.state === 'half-open') {
        this.transitionToOpen()
      }
      
      // Fallback이 있으면 실행, 없으면 에러 re-throw
      if (this.fallbackFunction) {
        console.log('[CircuitBreaker] Executing fallback due to execution failure')
        return this.fallbackFunction(errorObj) as R
      }
      
      throw errorObj
    }
  }

  /**
   * 성공 처리
   */
  private onSuccess(): void {
    const now = Date.now()
    
    // 메트릭 업데이트
    this.metrics.totalRequests++
    this.metrics.successCount++
    this.metrics.consecutiveFailures = 0
    this.metrics.lastSuccessTime = now
    
    // 요청 기록 추가
    if (this.config.enableMetrics) {
      this.addRequest(now, true)
      this.updateFailureRate()
    }
    
    // Half-open 상태에서 성공하면 Closed로 전환
    if (this.state === 'half-open') {
      // 연속 성공이 임계값에 도달하면 Closed로
      const recentSuccesses = this.getRecentSuccesses()
      if (recentSuccesses >= this.config.successThreshold) {
        this.transitionToClosed()
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[CircuitBreaker] Success recorded. State: ${this.state}`)
    }
  }

  /**
   * 실패 처리
   */
  private onFailure(error: Error): void {
    const now = Date.now()
    
    // 메트릭 업데이트
    this.metrics.totalRequests++
    this.metrics.failureCount++
    this.metrics.consecutiveFailures++
    this.metrics.lastFailureTime = now
    
    // 요청 기록 추가
    if (this.config.enableMetrics) {
      this.addRequest(now, false)
      this.updateFailureRate()
    }
    
    console.warn(`[CircuitBreaker] Failure recorded: ${error.message}. Consecutive failures: ${this.metrics.consecutiveFailures}`)
    
    // 실패 임계값 도달 시 Open으로 전환
    if (this.state === 'closed' && this.metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionToOpen()
    }
  }

  /**
   * Closed 상태로 전환
   */
  private transitionToClosed(): void {
    const prevState = this.state
    this.state = 'closed'
    this.metrics.consecutiveFailures = 0
    this.metrics.circuitOpenedAt = null
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    
    console.log(`[CircuitBreaker] State transition: ${prevState} → closed`)
  }

  /**
   * Open 상태로 전환
   */
  private transitionToOpen(): void {
    const prevState = this.state
    this.state = 'open'
    this.metrics.circuitOpenedAt = Date.now()
    
    // Reset 타이머 설정
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
    }
    
    this.resetTimer = setTimeout(() => {
      if (this.state === 'open') {
        this.transitionToHalfOpen()
      }
    }, this.config.resetTimeout)
    
    console.warn(`[CircuitBreaker] State transition: ${prevState} → open (failures: ${this.metrics.consecutiveFailures}/${this.config.failureThreshold})`)
  }

  /**
   * Half-open 상태로 전환
   */
  private transitionToHalfOpen(): void {
    const prevState = this.state
    this.state = 'half-open'
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    
    console.log(`[CircuitBreaker] State transition: ${prevState} → half-open (attempting recovery)`)
  }

  /**
   * Reset 시도 가능한지 확인
   */
  private canAttemptReset(): boolean {
    if (!this.metrics.circuitOpenedAt) return false
    
    const timeSinceOpened = Date.now() - this.metrics.circuitOpenedAt
    return timeSinceOpened >= this.config.resetTimeout
  }

  /**
   * 요청 기록 추가 및 윈도우 관리
   */
  private addRequest(timestamp: number, success: boolean): void {
    this.requests.push({ timestamp, success })
    
    // 윈도우를 벗어난 오래된 요청 제거
    const windowStart = timestamp - this.config.monitoringWindow
    this.requests = this.requests.filter(req => req.timestamp > windowStart)
  }

  /**
   * 실패율 업데이트
   */
  private updateFailureRate(): void {
    if (this.requests.length === 0) {
      this.metrics.failureRate = 0
      return
    }
    
    const failures = this.requests.filter(req => !req.success).length
    this.metrics.failureRate = failures / this.requests.length
  }

  /**
   * 최근 성공 횟수 가져오기 (Half-open 상태에서 사용)
   */
  private getRecentSuccesses(): number {
    if (this.state !== 'half-open') return 0
    
    const now = Date.now()
    const recentWindow = 10000 // 최근 10초
    
    // Half-open 상태에서만 연속 성공 카운트
    let consecutiveSuccesses = 0
    for (let i = this.requests.length - 1; i >= 0; i--) {
      const req = this.requests[i]
      if ((now - req.timestamp) > recentWindow) break
      
      if (req.success) {
        consecutiveSuccesses++
      } else {
        break // 실패가 있으면 연속 성공 중단
      }
    }
    
    return consecutiveSuccesses
  }

  /**
   * 현재 상태 조회
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * 메트릭 조회
   */
  getMetrics(): Readonly<CircuitBreakerMetrics> {
    // 실시간 실패율 업데이트
    if (this.config.enableMetrics) {
      this.updateFailureRate()
    }
    
    return { ...this.metrics }
  }

  /**
   * Circuit이 요청을 허용하는지 확인
   */
  isRequestAllowed(): boolean {
    if (this.state === 'closed' || this.state === 'half-open') {
      return true
    }
    
    if (this.state === 'open') {
      return this.canAttemptReset()
    }
    
    return false
  }

  /**
   * 강제 상태 변경 (테스트 용도)
   */
  forceState(state: CircuitState): void {
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      throw new Error('forceState is only available in development/test environments')
    }
    
    const prevState = this.state
    this.state = state
    
    if (state === 'closed') {
      this.metrics.consecutiveFailures = 0
      this.metrics.circuitOpenedAt = null
    } else if (state === 'open') {
      this.metrics.circuitOpenedAt = Date.now()
    }
    
    console.log(`[CircuitBreaker] Force state transition: ${prevState} → ${state}`)
  }

  /**
   * 메트릭 리셋
   */
  reset(): void {
    this.state = 'closed'
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      circuitOpenedAt: null,
      failureRate: 0
    }
    this.requests = []
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    
    console.log('[CircuitBreaker] Circuit breaker reset')
  }

  /**
   * 정리 (리소스 해제)
   */
  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    
    this.requests = []
    this.fallbackFunction = null
    
    console.log('[CircuitBreaker] Circuit breaker destroyed')
  }
}

/**
 * Circuit Breaker 팩토리 함수
 */
export function createCircuitBreaker<T = any>(
  config: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker<T> {
  return new CircuitBreaker<T>(config)
}

/**
 * 미리 정의된 Circuit Breaker 설정들
 */
export const CircuitBreakerPresets = {
  /** 빠른 실패용 (API 호출 등) */
  fastFail: {
    failureThreshold: 3,
    resetTimeout: 30000,
    monitoringWindow: 30000,
    successThreshold: 1,
    enableMetrics: true
  } as CircuitBreakerConfig,
  
  /** 표준 설정 */
  standard: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringWindow: 60000,
    successThreshold: 2,
    enableMetrics: true
  } as CircuitBreakerConfig,
  
  /** 관대한 설정 (중요한 작업용) */
  tolerant: {
    failureThreshold: 10,
    resetTimeout: 120000,
    monitoringWindow: 120000,
    successThreshold: 3,
    enableMetrics: true
  } as CircuitBreakerConfig,
  
  /** 네트워크 연결용 */
  network: {
    failureThreshold: 3,
    resetTimeout: 15000,
    monitoringWindow: 30000,
    successThreshold: 1,
    enableMetrics: true
  } as CircuitBreakerConfig
} as const

export default CircuitBreaker