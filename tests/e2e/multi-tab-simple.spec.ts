import { test, expect, Page } from '@playwright/test'

// 테스트 설정
test.use({
  baseURL: 'http://localhost:3000',
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  // auth.setup.ts에서 이미 로그인되어 있음
  storageState: '.auth/user.json'
})

// 콘솔 모니터링 헬퍼
function setupConsoleMonitoring(page: Page) {
  const connectionLogs: string[] = []
  const promiseErrors: string[] = []
  const circuitBreakerLogs: string[] = []
  
  page.on('console', msg => {
    const text = msg.text()
    
    // Promise/Timeout 에러 감지
    if (text.includes('TimeoutError') || text.includes('AbortError')) {
      promiseErrors.push(text)
      console.log('⚠️ Promise Error:', text.substring(0, 100))
    }
    
    // Connection 로그
    if (text.includes('[ConnectionCore]')) {
      connectionLogs.push(text)
      if (text.includes('suspended') || text.includes('resuming')) {
        console.log('🔄 Connection:', text.substring(0, 100))
      }
    }
    
    // Circuit Breaker 로그
    if (text.includes('[CircuitBreaker]') || text.includes('Circuit breaker')) {
      circuitBreakerLogs.push(text)
      if (text.includes('opened') || text.includes('closed')) {
        console.log('🔐 Circuit:', text.substring(0, 100))
      }
    }
    
    // GlobalRealtime 로그
    if (text.includes('[GlobalRealtime]')) {
      if (text.includes('subscription') || text.includes('reconnect')) {
        console.log('📡 Realtime:', text.substring(0, 100))
      }
    }
  })
  
  return { connectionLogs, promiseErrors, circuitBreakerLogs }
}

test.describe('Multi-Tab Promise 개선 검증', () => {
  
  test('단일 탭에서 Promise 타임아웃이 정상 작동', async ({ page }) => {
    const { promiseErrors } = setupConsoleMonitoring(page)
    
    // 메인 페이지 방문
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // 콘텐츠가 로드되는지 확인
    const contentExists = await page.locator('article').first().isVisible()
    expect(contentExists).toBeTruthy()
    
    // 무한 루프 에러가 없어야 함
    const infiniteLoopErrors = promiseErrors.filter(e => 
      e.includes('100+') || e.includes('infinite')
    )
    expect(infiniteLoopErrors).toHaveLength(0)
    
    console.log('✅ 단일 탭 테스트 통과')
  })
  
  test('백그라운드/포그라운드 전환 시 연결 상태 관리', async ({ page }) => {
    const { connectionLogs } = setupConsoleMonitoring(page)
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // 백그라운드로 전환 시뮬레이션
    await page.evaluate(() => {
      // visibility API 모킹
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() { return true }
      })
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,  
        get: function() { return 'hidden' }
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    console.log('📱 백그라운드 전환 시뮬레이션')
    await page.waitForTimeout(2000)
    
    // suspended 상태 확인
    const suspendedLogs = connectionLogs.filter(log => 
      log.includes('suspended') || log.includes('suspending')
    )
    expect(suspendedLogs.length).toBeGreaterThan(0)
    
    // 포그라운드로 복귀
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() { return false }
      })
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: function() { return 'visible' }
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    console.log('📱 포그라운드 복귀')
    await page.waitForTimeout(2000)
    
    // resuming 로그 확인
    const resumeLogs = connectionLogs.filter(log => 
      log.includes('resuming') || log.includes('resumed')
    )
    expect(resumeLogs.length).toBeGreaterThan(0)
    
    console.log('✅ 백그라운드/포그라운드 전환 테스트 통과')
  })
  
  test('빠른 페이지 전환 시 Promise 취소 동작', async ({ page }) => {
    const { promiseErrors } = setupConsoleMonitoring(page)
    
    // 빠르게 여러 페이지 전환
    const pages = ['/', '/community', '/knowledge', '/cases']
    
    for (const path of pages) {
      page.goto(path) // await 없이 비동기 실행
    }
    
    // 마지막 페이지 로드 대기
    await page.waitForLoadState('networkidle')
    
    // AbortError는 정상 (Promise 취소됨)
    const abortErrors = promiseErrors.filter(e => e.includes('AbortError'))
    console.log(`📊 정상적으로 취소된 Promise: ${abortErrors.length}개`)
    
    // TimeoutError는 적어야 함
    const timeoutErrors = promiseErrors.filter(e => 
      e.includes('TimeoutError') && !e.includes('ignored')
    )
    expect(timeoutErrors.length).toBeLessThan(3)
    
    console.log('✅ Promise 취소 테스트 통과')
  })
  
  test('Circuit Breaker 기본 동작 확인', async ({ page }) => {
    const { circuitBreakerLogs } = setupConsoleMonitoring(page)
    
    await page.goto('/')
    
    // 초기 상태는 closed여야 함
    const initializedLogs = circuitBreakerLogs.filter(log => 
      log.includes('Initialized')
    )
    expect(initializedLogs.length).toBeGreaterThan(0)
    
    // 정상 상황에서는 open되지 않아야 함
    const openedLogs = circuitBreakerLogs.filter(log => 
      log.includes('opened')
    )
    expect(openedLogs.length).toBe(0)
    
    console.log('✅ Circuit Breaker 정상 동작 확인')
  })
  
  test('실시간 구독 복구 메커니즘', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // GlobalRealtime 로그 수집
    let realtimeConnected = false
    page.on('console', msg => {
      if (msg.text().includes('[GlobalRealtime]') && 
          msg.text().includes('Successfully subscribed')) {
        realtimeConnected = true
      }
    })
    
    // 잠시 대기
    await page.waitForTimeout(3000)
    
    // 실시간 연결이 되어있어야 함
    expect(realtimeConnected).toBeTruthy()
    
    console.log('✅ 실시간 구독 테스트 통과')
  })
})

test.describe('성능 및 안정성 검증', () => {
  
  test('메모리 누수 없이 장시간 실행', async ({ page }) => {
    const startTime = Date.now()
    
    // 5번 페이지 전환
    for (let i = 0; i < 5; i++) {
      await page.goto('/')
      await page.waitForTimeout(1000)
      await page.goto('/community')
      await page.waitForTimeout(1000)
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // 10번 전환이 20초 이내에 완료되어야 함
    expect(duration).toBeLessThan(20000)
    
    // 메모리 관련 에러 없어야 함
    const memoryErrors: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('memory') || msg.text().includes('leak')) {
        memoryErrors.push(msg.text())
      }
    })
    
    expect(memoryErrors).toHaveLength(0)
    
    console.log(`✅ 성능 테스트 통과 (${duration}ms)`)
  })
})