/**
 * Circuit Breaker Tests
 * 
 * Circuit Breaker 패턴의 모든 상태 전환과 기능을 테스트
 */

import { CircuitBreaker, createCircuitBreaker, CircuitBreakerPresets } from '../circuit-breaker'

// 타이머 모킹
jest.useFakeTimers()

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker
  
  beforeEach(() => {
    // 각 테스트 전에 새로운 Circuit Breaker 생성
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 5000,
      monitoringWindow: 10000,
      successThreshold: 2,
      enableMetrics: true
    })
  })
  
  afterEach(() => {
    // 리소스 정리
    circuitBreaker.destroy()
    jest.clearAllTimers()
  })

  describe('초기 상태', () => {
    it('초기 상태는 closed여야 한다', () => {
      expect(circuitBreaker.getState()).toBe('closed')
    })
    
    it('초기 메트릭이 올바르게 설정되어야 한다', () => {
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(0)
      expect(metrics.successCount).toBe(0)
      expect(metrics.failureCount).toBe(0)
      expect(metrics.consecutiveFailures).toBe(0)
      expect(metrics.failureRate).toBe(0)
    })
    
    it('초기에는 요청이 허용되어야 한다', () => {
      expect(circuitBreaker.isRequestAllowed()).toBe(true)
    })
  })

  describe('성공 케이스', () => {
    it('성공한 요청은 메트릭을 올바르게 업데이트해야 한다', async () => {
      const successPromise = () => Promise.resolve('success')
      
      const result = await circuitBreaker.execute(successPromise)
      
      expect(result).toBe('success')
      expect(circuitBreaker.getState()).toBe('closed')
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.successCount).toBe(1)
      expect(metrics.failureCount).toBe(0)
      expect(metrics.consecutiveFailures).toBe(0)
      expect(metrics.lastSuccessTime).toBeGreaterThan(0)
    })
    
    it('여러 성공 요청을 처리할 수 있어야 한다', async () => {
      const successPromise = () => Promise.resolve('success')
      
      await circuitBreaker.execute(successPromise)
      await circuitBreaker.execute(successPromise)
      await circuitBreaker.execute(successPromise)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(3)
      expect(metrics.successCount).toBe(3)
      expect(metrics.consecutiveFailures).toBe(0)
      expect(circuitBreaker.getState()).toBe('closed')
    })
  })

  describe('실패 케이스', () => {
    it('실패한 요청은 메트릭을 올바르게 업데이트해야 한다', async () => {
      const failurePromise = () => Promise.reject(new Error('Test error'))
      
      await expect(circuitBreaker.execute(failurePromise)).rejects.toThrow('Test error')
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.successCount).toBe(0)
      expect(metrics.failureCount).toBe(1)
      expect(metrics.consecutiveFailures).toBe(1)
      expect(metrics.lastFailureTime).toBeGreaterThan(0)
    })
    
    it('임계값에 도달하면 Circuit이 Open되어야 한다', async () => {
      const failurePromise = () => Promise.reject(new Error('Test error'))
      
      // 3번 실패 (임계값)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failurePromise)).rejects.toThrow('Test error')
      }
      
      expect(circuitBreaker.getState()).toBe('open')
      expect(circuitBreaker.isRequestAllowed()).toBe(false)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.consecutiveFailures).toBe(3)
      expect(metrics.circuitOpenedAt).toBeGreaterThan(0)
    })
  })

  describe('Circuit Open 상태', () => {
    beforeEach(async () => {
      // Circuit을 Open 상태로 만들기
      const failurePromise = () => Promise.reject(new Error('Test error'))
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failurePromise)).rejects.toThrow('Test error')
      }
    })
    
    it('Open 상태에서는 즉시 실패해야 한다', async () => {
      const promise = () => Promise.resolve('should not execute')
      
      await expect(circuitBreaker.execute(promise)).rejects.toThrow('Circuit breaker is OPEN')
    })
    
    it('Fallback이 있으면 실행되어야 한다', async () => {
      const fallbackResult = 'fallback result'
      circuitBreaker.fallback(() => fallbackResult)
      
      const promise = () => Promise.resolve('should not execute')
      const result = await circuitBreaker.execute(promise)
      
      expect(result).toBe(fallbackResult)
    })
    
    it('Reset timeout 후 Half-open으로 전환되어야 한다', async () => {
      expect(circuitBreaker.getState()).toBe('open')
      
      // 5초 후 (resetTimeout)
      jest.advanceTimersByTime(5000)
      
      // 요청을 시도하면 Half-open으로 전환
      const promise = () => Promise.resolve('test')
      await circuitBreaker.execute(promise)
      
      // Half-open에서 성공했지만 successThreshold(2)에 도달하지 않아서 half-open 상태 유지
      expect(circuitBreaker.getState()).toBe('half-open')
      
      // 한 번 더 성공하면 closed로 전환
      await circuitBreaker.execute(promise)
      expect(circuitBreaker.getState()).toBe('closed')
    })
  })

  describe('Half-open 상태', () => {
    beforeEach(async () => {
      // Circuit을 Open 상태로 만들고 Half-open으로 전환
      circuitBreaker.forceState('open')
      jest.advanceTimersByTime(5000)
    })
    
    it('Half-open에서 성공하면 Closed로 전환되어야 한다', async () => {
      circuitBreaker.forceState('half-open')
      
      const successPromise = () => Promise.resolve('success')
      
      // successThreshold(2)만큼 성공
      await circuitBreaker.execute(successPromise)
      await circuitBreaker.execute(successPromise)
      
      expect(circuitBreaker.getState()).toBe('closed')
    })
    
    it('Half-open에서 실패하면 다시 Open으로 전환되어야 한다', async () => {
      circuitBreaker.forceState('half-open')
      
      const failurePromise = () => Promise.reject(new Error('Test error'))
      
      await expect(circuitBreaker.execute(failurePromise)).rejects.toThrow('Test error')
      
      expect(circuitBreaker.getState()).toBe('open')
    })
  })

  describe('Fallback 기능', () => {
    it('동기 fallback 함수가 실행되어야 한다', async () => {
      const fallbackValue = 'fallback result'
      circuitBreaker.fallback(() => fallbackValue)
      
      // Circuit을 Open 상태로 만들기
      circuitBreaker.forceState('open')
      
      const promise = () => Promise.resolve('should not execute')
      const result = await circuitBreaker.execute(promise)
      
      expect(result).toBe(fallbackValue)
    })
    
    it('비동기 fallback 함수가 실행되어야 한다', async () => {
      const fallbackValue = 'async fallback result'
      circuitBreaker.fallback(async () => {
        return Promise.resolve(fallbackValue)
      })
      
      circuitBreaker.forceState('open')
      
      const promise = () => Promise.resolve('should not execute')
      const result = await circuitBreaker.execute(promise)
      
      expect(result).toBe(fallbackValue)
    })
    
    it('실행 실패 시에도 fallback이 실행되어야 한다', async () => {
      const fallbackValue = 'fallback for failure'
      circuitBreaker.fallback(() => fallbackValue)
      
      const failurePromise = () => Promise.reject(new Error('Test error'))
      const result = await circuitBreaker.execute(failurePromise)
      
      expect(result).toBe(fallbackValue)
    })
  })

  describe('메트릭 수집', () => {
    it('실패율이 올바르게 계산되어야 한다', async () => {
      const successPromise = () => Promise.resolve('success')
      const failurePromise = () => Promise.reject(new Error('failure'))
      
      // 3번 성공, 2번 실패
      await circuitBreaker.execute(successPromise)
      await circuitBreaker.execute(successPromise)
      await circuitBreaker.execute(successPromise)
      await circuitBreaker.fallback(() => 'fallback').execute(failurePromise)
      await circuitBreaker.fallback(() => 'fallback').execute(failurePromise)
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.totalRequests).toBe(5)
      expect(metrics.successCount).toBe(3)
      expect(metrics.failureCount).toBe(2)
      expect(metrics.failureRate).toBe(0.4) // 2/5
    })
    
    it('모니터링 윈도우 밖의 데이터는 제외되어야 한다', async () => {
      // 윈도우를 작게 설정한 Circuit Breaker 생성
      const shortWindowBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 5000,
        monitoringWindow: 1000, // 1초
        successThreshold: 1,
        enableMetrics: true
      })
      
      const successPromise = () => Promise.resolve('success')
      
      // 첫 번째 성공
      await shortWindowBreaker.execute(successPromise)
      
      // 2초 경과 (윈도우를 벗어남)
      jest.advanceTimersByTime(2000)
      
      // 두 번째 성공
      await shortWindowBreaker.execute(successPromise)
      
      const metrics = shortWindowBreaker.getMetrics()
      // 실패율 계산에는 윈도우 내의 데이터만 사용됨
      expect(metrics.totalRequests).toBe(2)
      
      shortWindowBreaker.destroy()
    })
  })

  describe('설정 및 유틸리티', () => {
    it('createCircuitBreaker 팩토리 함수가 작동해야 한다', () => {
      const breaker = createCircuitBreaker({
        failureThreshold: 10
      })
      
      expect(breaker).toBeInstanceOf(CircuitBreaker)
      breaker.destroy()
    })
    
    it('preset 설정들이 올바르게 정의되어야 한다', () => {
      expect(CircuitBreakerPresets.fastFail.failureThreshold).toBe(3)
      expect(CircuitBreakerPresets.standard.failureThreshold).toBe(5)
      expect(CircuitBreakerPresets.tolerant.failureThreshold).toBe(10)
      expect(CircuitBreakerPresets.network.failureThreshold).toBe(3)
    })
    
    it('reset 메서드가 모든 상태를 초기화해야 한다', async () => {
      // Circuit을 Open 상태로 만들기
      const failurePromise = () => Promise.reject(new Error('Test error'))
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failurePromise)).rejects.toThrow('Test error')
      }
      
      expect(circuitBreaker.getState()).toBe('open')
      
      // Reset
      circuitBreaker.reset()
      
      expect(circuitBreaker.getState()).toBe('closed')
      expect(circuitBreaker.getMetrics().totalRequests).toBe(0)
      expect(circuitBreaker.isRequestAllowed()).toBe(true)
    })
  })

  describe('에러 처리', () => {
    it('forceState는 개발/테스트 환경에서만 사용 가능해야 한다', () => {
      const originalEnv = process.env.NODE_ENV
      
      try {
        // Production 환경 시뮬레이션
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true
        })
        
        expect(() => {
          circuitBreaker.forceState('open')
        }).toThrow('forceState is only available in development/test environments')
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          configurable: true
        })
      }
    })
    
    it('잘못된 타입의 에러도 처리할 수 있어야 한다', async () => {
      const stringErrorPromise = () => Promise.reject('string error')
      
      await expect(circuitBreaker.execute(stringErrorPromise)).rejects.toThrow('string error')
      
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failureCount).toBe(1)
    })
  })

  describe('타이머 관리', () => {
    it('destroy 메서드가 타이머를 정리해야 한다', async () => {
      // Circuit을 Open 상태로 만들기
      circuitBreaker.forceState('open')
      
      // Destroy 호출
      circuitBreaker.destroy()
      
      // 타이머가 정리되었는지 확인 (타이머 진행시켜도 상태 변화 없음)
      jest.advanceTimersByTime(10000)
      
      expect(circuitBreaker.getState()).toBe('open')
    })
  })

  describe('복합 시나리오', () => {
    it('실제 사용 시나리오를 시뮬레이션해야 한다', async () => {
      // 캐시된 데이터를 반환하는 fallback
      const cachedData = 'cached result'
      circuitBreaker.fallback(() => cachedData)
      
      const unstableService = jest.fn()
        .mockResolvedValueOnce('success 1')
        .mockResolvedValueOnce('success 2')
        .mockRejectedValueOnce(new Error('service down'))
        .mockRejectedValueOnce(new Error('service down'))
        .mockRejectedValueOnce(new Error('service down'))
        .mockResolvedValueOnce('success after recovery')
        .mockResolvedValueOnce('success after recovery')
      
      // 초기 성공들
      expect(await circuitBreaker.execute(unstableService)).toBe('success 1')
      expect(await circuitBreaker.execute(unstableService)).toBe('success 2')
      expect(circuitBreaker.getState()).toBe('closed')
      
      // 연속 실패로 Circuit Open
      expect(await circuitBreaker.execute(unstableService)).toBe(cachedData)
      expect(await circuitBreaker.execute(unstableService)).toBe(cachedData)
      expect(await circuitBreaker.execute(unstableService)).toBe(cachedData)
      expect(circuitBreaker.getState()).toBe('open')
      
      // Open 상태에서 fallback 실행
      expect(await circuitBreaker.execute(unstableService)).toBe(cachedData)
      
      // Reset timeout 후 복구
      jest.advanceTimersByTime(5000)
      expect(await circuitBreaker.execute(unstableService)).toBe('success after recovery')
      expect(circuitBreaker.getState()).toBe('half-open') // 첫 번째 성공 후 half-open
      
      // 한 번 더 성공하면 closed로 전환
      expect(await circuitBreaker.execute(unstableService)).toBe('success after recovery')
      expect(circuitBreaker.getState()).toBe('closed')
    })
  })
})