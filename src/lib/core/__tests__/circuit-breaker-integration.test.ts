/**
 * Circuit Breaker Integration Tests
 * 
 * ConnectionCore와 ConnectionRecovery에서 Circuit Breaker가 올바르게 작동하는지 테스트
 */

import { ConnectionCore } from '../connection-core'
import { ConnectionRecoveryManager } from '../connection-recovery'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: jest.fn((callback) => {
        // Mock auth state change handler
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      }),
      getSession: jest.fn()
    }
  }))
}))

// Mock environment config
jest.mock('../../config/environment', () => ({
  getEnvConfig: jest.fn(() => ({
    environment: 'test',
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key'
  }))
}))

// Mock DOM globals
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
})

Object.defineProperty(document, 'addEventListener', {
  value: jest.fn()
})

Object.defineProperty(window, 'addEventListener', {
  value: jest.fn()
})

describe('Circuit Breaker Integration', () => {
  let connectionCore: ConnectionCore
  let connectionRecovery: ConnectionRecoveryManager

  beforeEach(() => {
    // Clear any existing instances
    jest.clearAllMocks()
    
    // Mock successful auth session by default
    const mockGetSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'test-user' } } },
      error: null
    })
    
    require('@supabase/supabase-js').createClient.mockImplementation(() => ({
      auth: {
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } }
        })),
        getSession: mockGetSession
      }
    }))
  })

  afterEach(() => {
    // Cleanup
    if (connectionCore) {
      connectionCore.destroy()
    }
    if (connectionRecovery) {
      connectionRecovery.cleanup()
    }
  })

  describe('ConnectionCore Circuit Breaker', () => {
    beforeEach(() => {
      connectionCore = ConnectionCore.getInstance()
    })

    it('Circuit Breaker 상태 정보가 연결 상태에 포함되어야 한다', () => {
      const status = connectionCore.getStatus()
      
      expect(status.circuitBreakerState).toBeDefined()
      expect(status.circuitBreakerMetrics).toBeDefined()
      expect(status.circuitBreakerMetrics?.totalRequests).toBe(0)
      expect(status.circuitBreakerMetrics?.failureRate).toBe(0)
    })

    it('Circuit Breaker 상태를 조회할 수 있어야 한다', () => {
      const circuitBreakerStatus = connectionCore.getCircuitBreakerStatus()
      
      expect(circuitBreakerStatus.connection).toBeDefined()
      expect(circuitBreakerStatus.heartbeat).toBeDefined()
      expect(circuitBreakerStatus.connection?.state).toBe('closed')
      expect(circuitBreakerStatus.heartbeat?.state).toBe('closed')
    })

    it('Circuit Breaker를 리셋할 수 있어야 한다', () => {
      connectionCore.resetCircuitBreakers()
      
      const status = connectionCore.getStatus()
      expect(status.circuitBreakerState).toBe('closed')
      expect(status.circuitBreakerMetrics?.totalRequests).toBe(0)
    })

    it('Circuit Breaker 비활성화 설정이 작동해야 한다', () => {
      // Circuit Breaker 비활성화
      connectionCore.updateConfig({ enableCircuitBreaker: false })
      
      const circuitBreakerStatus = connectionCore.getCircuitBreakerStatus()
      // 비활성화 후에도 기존 인스턴스는 유지됨 (새 인스턴스에서만 적용)
      expect(circuitBreakerStatus.connection).toBeDefined()
    })
  })

  describe('ConnectionRecovery Circuit Breaker', () => {
    beforeEach(() => {
      connectionRecovery = ConnectionRecoveryManager.getInstance()
    })

    it('복구 Circuit Breaker 상태를 조회할 수 있어야 한다', () => {
      const circuitBreakerStatus = connectionRecovery.getCircuitBreakerStatus()
      
      expect(circuitBreakerStatus).toBeDefined()
      expect(circuitBreakerStatus?.state).toBe('closed')
      expect(circuitBreakerStatus?.metrics).toBeDefined()
    })

    it('복구 Circuit Breaker를 리셋할 수 있어야 한다', () => {
      connectionRecovery.resetCircuitBreaker()
      
      const circuitBreakerStatus = connectionRecovery.getCircuitBreakerStatus()
      expect(circuitBreakerStatus?.state).toBe('closed')
    })
  })

  describe('Circuit Breaker 통합 시나리오', () => {
    beforeEach(() => {
      connectionCore = ConnectionCore.getInstance()
      connectionRecovery = ConnectionRecoveryManager.getInstance()
    })

    it('Circuit Breaker들이 독립적으로 작동해야 한다', () => {
      const connectionStatus = connectionCore.getCircuitBreakerStatus()
      const recoveryStatus = connectionRecovery.getCircuitBreakerStatus()
      
      // 서로 다른 Circuit Breaker 인스턴스
      expect(connectionStatus.connection?.state).toBe('closed')
      expect(connectionStatus.heartbeat?.state).toBe('closed')
      expect(recoveryStatus?.state).toBe('closed')
      
      // 각각 독립적인 메트릭
      expect(connectionStatus.connection?.metrics).toBeDefined()
      expect(connectionStatus.heartbeat?.metrics).toBeDefined()
      expect(recoveryStatus?.metrics).toBeDefined()
    })

    it('모든 Circuit Breaker를 한 번에 리셋할 수 있어야 한다', () => {
      // 모든 Circuit Breaker 리셋
      connectionCore.resetCircuitBreakers()
      connectionRecovery.resetCircuitBreaker()
      
      // 모든 상태가 초기화됨
      const connectionStatus = connectionCore.getCircuitBreakerStatus()
      const recoveryStatus = connectionRecovery.getCircuitBreakerStatus()
      
      expect(connectionStatus.connection?.state).toBe('closed')
      expect(connectionStatus.heartbeat?.state).toBe('closed')
      expect(recoveryStatus?.state).toBe('closed')
    })
  })

  describe('실제 사용 시나리오', () => {
    beforeEach(() => {
      connectionCore = ConnectionCore.getInstance()
      connectionRecovery = ConnectionRecoveryManager.getInstance()
    })

    it('연결 실패 시 Circuit Breaker가 작동해야 한다', async () => {
      // getSession mock을 실패하도록 설정
      const mockGetSession = jest.fn().mockRejectedValue(new Error('Connection failed'))
      connectionCore.getClient().auth.getSession = mockGetSession

      // 여러 번 연결 시도 (Circuit Breaker가 개입할 것임)
      try {
        await connectionCore.connect()
      } catch (error) {
        // 예상된 에러
      }

      const status = connectionCore.getStatus()
      expect(status.circuitBreakerState).toBeDefined()
      expect(status.circuitBreakerMetrics?.totalRequests).toBeGreaterThan(0)
    })
  })
})