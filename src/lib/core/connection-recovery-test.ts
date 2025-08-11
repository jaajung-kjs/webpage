/**
 * ConnectionRecoveryManager 배치 처리 기능 테스트 예시
 * 
 * 이 파일은 새로운 배치 처리 기능의 사용법을 보여줍니다.
 * 실제 사용시에는 이 파일을 삭제하고 필요한 곳에서 import해서 사용하세요.
 */

import { connectionRecovery, QueryPriority, RecoveryStrategy, BatchResult } from './connection-recovery'

/**
 * 배치 처리 기능 사용 예시
 */
export class ConnectionRecoveryTestExample {
  
  /**
   * 1. 프로그레시브 복구 전략 사용
   */
  static async testProgressiveRecovery() {
    console.log('=== Progressive Recovery Test ===')
    
    // 가벼운 복구 (CRITICAL 쿼리만)
    await connectionRecovery.manualRecovery(RecoveryStrategy.LIGHT)
    
    // 부분 복구 (CRITICAL + HIGH 쿼리)
    await connectionRecovery.manualRecovery(RecoveryStrategy.PARTIAL)
    
    // 전체 복구 (모든 우선순위 쿼리)
    await connectionRecovery.manualRecovery(RecoveryStrategy.FULL)
  }

  /**
   * 2. 수동 배치 무효화
   */
  static async testManualBatchInvalidation() {
    console.log('=== Manual Batch Invalidation Test ===')
    
    try {
      // 특정 전략으로 배치 무효화
      const results: BatchResult[] = await connectionRecovery.invalidateWithStrategy(
        RecoveryStrategy.PARTIAL,
        'active'
      )
      
      // 결과 분석
      results.forEach(result => {
        console.log(`Priority ${result.priority}:`, {
          success: result.successCount,
          errors: result.errorCount,
          duration: `${result.duration}ms`
        })
      })
      
    } catch (error) {
      console.error('Manual batch invalidation failed:', error)
    }
  }

  /**
   * 3. 메트릭 모니터링
   */
  static monitorBatchMetrics() {
    console.log('=== Batch Metrics Monitoring ===')
    
    const metrics = connectionRecovery.getBatchMetrics()
    console.log('Current metrics:', metrics)
    
    // 실패한 쿼리 확인
    const failedQueries = connectionRecovery.getFailedQueries()
    if (failedQueries.length > 0) {
      console.log('Failed queries:', failedQueries)
      
      // 실패한 쿼리 재시도
      connectionRecovery.retryFailedQueries()
    }
  }

  /**
   * 4. Circuit Breaker 상태 모니터링
   */
  static monitorCircuitBreaker() {
    console.log('=== Circuit Breaker Status ===')
    
    const status = connectionRecovery.getCircuitBreakerStatus()
    if (status) {
      console.log('Circuit Breaker:', status)
      
      // 필요시 수동 리셋
      if (status.state === 'OPEN') {
        console.log('Circuit breaker is open, resetting...')
        connectionRecovery.resetCircuitBreaker()
      }
    }
  }

  /**
   * 5. 복합 테스트 시나리오
   */
  static async testCompleteScenario() {
    console.log('=== Complete Test Scenario ===')
    
    try {
      // 1. 메트릭 리셋
      connectionRecovery.resetMetrics()
      
      // 2. 다양한 복구 전략 테스트
      console.log('Testing Light recovery...')
      await connectionRecovery.manualRecovery(RecoveryStrategy.LIGHT)
      
      console.log('Testing Partial recovery...')
      await connectionRecovery.manualRecovery(RecoveryStrategy.PARTIAL)
      
      console.log('Testing Full recovery...')
      await connectionRecovery.manualRecovery(RecoveryStrategy.FULL)
      
      // 3. 결과 분석
      const finalMetrics = connectionRecovery.getBatchMetrics()
      console.log('Final metrics:', finalMetrics)
      
      // 4. Circuit Breaker 상태 확인
      const circuitStatus = connectionRecovery.getCircuitBreakerStatus()
      console.log('Circuit Breaker status:', circuitStatus)
      
    } catch (error) {
      console.error('Complete scenario test failed:', error)
    }
  }

  /**
   * 6. 사용자 액션 기반 테스트
   */
  static setupUserActionTests() {
    console.log('=== User Action Based Tests ===')
    
    // 탭 전환 시뮬레이션
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('Tab became visible - automatic progressive recovery triggered')
        this.monitorBatchMetrics()
      }
    })
    
    // 윈도우 포커스 시뮬레이션
    window.addEventListener('focus', () => {
      console.log('Window focused - light recovery triggered')
      setTimeout(() => this.monitorBatchMetrics(), 1000)
    })
    
    // 네트워크 상태 변경 시뮬레이션
    window.addEventListener('online', () => {
      console.log('Network online - full recovery triggered')
      setTimeout(() => this.monitorBatchMetrics(), 2000)
    })
  }
}

/**
 * 사용법 예시
 */
export const runConnectionRecoveryTests = async () => {
  console.log('Starting Connection Recovery Batch Processing Tests...')
  
  // 기본 테스트들
  await ConnectionRecoveryTestExample.testProgressiveRecovery()
  await ConnectionRecoveryTestExample.testManualBatchInvalidation()
  
  ConnectionRecoveryTestExample.monitorBatchMetrics()
  ConnectionRecoveryTestExample.monitorCircuitBreaker()
  
  // 복합 시나리오 테스트
  await ConnectionRecoveryTestExample.testCompleteScenario()
  
  // 사용자 액션 기반 테스트 설정
  ConnectionRecoveryTestExample.setupUserActionTests()
  
  console.log('Connection Recovery tests setup completed!')
}

/**
 * 쿼리 우선순위별 예상 분류 예시
 */
export const queryPriorityExamples = {
  [QueryPriority.CRITICAL]: [
    ['auth', 'user'],
    ['user', 'profile'],
    ['user', 'current'],
    ['auth', 'me'],
    ['profile', 'me']
  ],
  [QueryPriority.HIGH]: [
    ['comments', 'list'],
    ['likes', 'user'],
    ['bookmarks', 'user'],
    ['activities', 'recent'],
    ['notifications', 'unread'],
    ['messages', 'inbox']
  ],
  [QueryPriority.NORMAL]: [
    ['contents', 'list'],
    ['posts', 'feed'],
    ['search', 'results'],
    ['contents', 'details'],
    ['posts', 'popular']
  ],
  [QueryPriority.LOW]: [
    ['stats', 'global'],
    ['metadata', 'app'],
    ['config', 'system'],
    ['analytics', 'weekly']
  ]
}

// 개발 모드에서만 자동 실행
if (process.env.NODE_ENV === 'development') {
  // 5초 후 테스트 실행 (앱 로딩 완료 후)
  setTimeout(() => {
    runConnectionRecoveryTests().catch(console.error)
  }, 5000)
}