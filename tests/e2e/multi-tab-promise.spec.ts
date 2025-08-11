import { test, expect, Page, BrowserContext } from '@playwright/test'

// 테스트 계정 정보
const TEST_USER = {
  email: 'jaajung@naver.com',
  password: 'kjs487956!@'
}

// 테스트 설정
test.use({
  // 실제 DB가 연결된 개발 서버 사용
  baseURL: 'http://localhost:3000',
  // 비디오 녹화로 디버깅 용이
  video: 'on-first-retry',
  // 스크린샷 캡처
  screenshot: 'only-on-failure'
})

// 로그인 헬퍼 함수
async function loginToApp(page: Page) {
  await page.goto('/auth')
  
  // 로그인 폼 대기
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  
  // 로그인 정보 입력
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  
  // 로그인 버튼 클릭
  await page.click('button[type="submit"]')
  
  // 로그인 성공 대기 (프로필 버튼이 나타날 때까지)
  await page.waitForSelector('[data-testid="profile-button"], button:has-text("프로필")', { 
    timeout: 15000,
    state: 'visible' 
  })
  
  console.log('✅ 로그인 성공')
}

// 콘솔 에러 수집 헬퍼
function setupConsoleMonitoring(page: Page) {
  const errors: string[] = []
  const warnings: string[] = []
  const logs: string[] = []
  
  page.on('console', msg => {
    const text = msg.text()
    
    if (msg.type() === 'error') {
      errors.push(text)
      // Promise 관련 에러 특별 체크
      if (text.includes('timeout') || text.includes('TimeoutError') || text.includes('AbortError')) {
        console.error('❌ Promise 에러 감지:', text)
      }
    } else if (msg.type() === 'warning') {
      warnings.push(text)
    } else if (text.includes('[ConnectionCore]') || 
               text.includes('[GlobalRealtime]') || 
               text.includes('[PromiseManager]') ||
               text.includes('[CircuitBreaker]')) {
      logs.push(text)
      console.log('📝', text)
    }
  })
  
  return { errors, warnings, logs }
}

test.describe('Multi-Tab Promise 문제 해결 통합 테스트', () => {
  
  test('기본 연결 및 Promise 타임아웃 동작 확인', async ({ page }) => {
    const { errors } = setupConsoleMonitoring(page)
    
    // 로그인
    await loginToApp(page)
    
    // 메인 페이지로 이동
    await page.goto('/')
    
    // 콘텐츠 로드 대기
    await page.waitForSelector('article, [data-testid="content-card"]', { 
      timeout: 10000 
    })
    
    // Promise 타임아웃 에러가 없어야 함
    const timeoutErrors = errors.filter(e => 
      e.includes('timeout') || e.includes('TimeoutError')
    )
    expect(timeoutErrors).toHaveLength(0)
    
    // 무한 루프 징후 체크 (같은 에러가 5번 이상 반복)
    const errorCounts = new Map<string, number>()
    errors.forEach(e => {
      errorCounts.set(e, (errorCounts.get(e) || 0) + 1)
    })
    
    const infiniteLoopErrors = Array.from(errorCounts.entries())
      .filter(([_, count]) => count >= 5)
    
    expect(infiniteLoopErrors).toHaveLength(0)
    
    console.log('✅ 기본 연결 테스트 통과')
  })
  
  test('다중 탭 시나리오 - 탭 전환 시 Promise 처리', async ({ browser }) => {
    const context = await browser.newContext()
    
    // 첫 번째 탭
    const page1 = await context.newPage()
    const monitor1 = setupConsoleMonitoring(page1)
    await loginToApp(page1)
    await page1.goto('/')
    
    // 두 번째 탭 열기
    const page2 = await context.newPage()
    const monitor2 = setupConsoleMonitoring(page2)
    await page2.goto('/')
    
    // 첫 번째 탭 백그라운드로 (visibility 변경 시뮬레이션)
    await page1.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    console.log('📱 Tab 1을 백그라운드로 전환')
    
    // 두 번째 탭에서 활동
    await page2.waitForSelector('article', { timeout: 10000 })
    await page2.click('article:first-child', { force: true }).catch(() => {})
    
    // 3초 대기 (백그라운드 처리 시간)
    await page2.waitForTimeout(3000)
    
    // 첫 번째 탭 다시 활성화
    await page1.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    console.log('📱 Tab 1을 포그라운드로 복귀')
    
    // 복구 대기
    await page1.waitForTimeout(2000)
    
    // 두 탭 모두에서 에러 체크
    const allErrors = [...monitor1.errors, ...monitor2.errors]
    const criticalErrors = allErrors.filter(e => 
      e.includes('Heartbeat check failed') && e.includes('100+')
    )
    
    expect(criticalErrors).toHaveLength(0)
    
    // 연결 상태 확인
    const connectionState1 = await page1.evaluate(() => {
      return window.localStorage.getItem('connection_state')
    })
    
    expect(connectionState1).not.toBe('error')
    
    await context.close()
    console.log('✅ 다중 탭 테스트 통과')
  })
  
  test('백그라운드 장시간 유지 후 복구', async ({ page }) => {
    const { errors, logs } = setupConsoleMonitoring(page)
    
    await loginToApp(page)
    await page.goto('/')
    
    // 초기 로드 확인
    await page.waitForSelector('article', { timeout: 10000 })
    
    console.log('⏰ 백그라운드 전환 시작 (10초)')
    
    // 백그라운드로 전환
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    // 10초 대기 (중간 시간 백그라운드)
    await page.waitForTimeout(10000)
    
    // 포그라운드로 복귀
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    console.log('⏰ 포그라운드 복귀')
    
    // 복구 확인 - suspended 상태에서 복구되는지
    const recoveryLogs = logs.filter(log => 
      log.includes('resumeConnection') || 
      log.includes('Recovery strategy: PARTIAL')
    )
    
    expect(recoveryLogs.length).toBeGreaterThan(0)
    
    // 새로운 콘텐츠 로드 가능한지 확인
    await page.reload()
    await page.waitForSelector('article', { timeout: 10000 })
    
    // 타임아웃 에러 없어야 함
    const timeoutErrors = errors.filter(e => 
      e.includes('timeout after') && !e.includes('handled')
    )
    
    expect(timeoutErrors).toHaveLength(0)
    
    console.log('✅ 백그라운드 복구 테스트 통과')
  })
  
  test('Circuit Breaker 동작 확인', async ({ page }) => {
    const { logs } = setupConsoleMonitoring(page)
    
    await loginToApp(page)
    
    // 네트워크를 일시적으로 차단하여 Circuit Breaker 트리거
    await page.route('**/api/**', route => route.abort())
    
    // 여러 번 요청 시도 (Circuit Breaker 트리거)
    for (let i = 0; i < 5; i++) {
      await page.goto('/').catch(() => {})
      await page.waitForTimeout(500)
    }
    
    // Circuit Breaker 열림 확인
    const circuitBreakerLogs = logs.filter(log => 
      log.includes('Circuit breaker opened') ||
      log.includes('Circuit breaker open')
    )
    
    expect(circuitBreakerLogs.length).toBeGreaterThan(0)
    
    // 네트워크 복구
    await page.unroute('**/api/**')
    
    // 30초 대기 (Circuit Breaker 복구 시간)
    console.log('⏳ Circuit Breaker 복구 대기 (5초)')
    await page.waitForTimeout(5000)
    
    // 다시 시도
    await page.goto('/')
    await page.waitForSelector('article', { timeout: 15000 })
    
    console.log('✅ Circuit Breaker 테스트 통과')
  })
  
  test('실시간 업데이트 중 탭 전환', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const { errors } = setupConsoleMonitoring(page)
    
    await loginToApp(page)
    await page.goto('/')
    
    // 댓글이 있는 콘텐츠 찾기
    const contentWithComments = await page.locator('article').first()
    await contentWithComments.click()
    
    // 댓글 섹션 대기
    await page.waitForSelector('[data-testid="comments-section"], section:has-text("댓글")', { 
      timeout: 10000 
    })
    
    // 백그라운드 전환
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    await page.waitForTimeout(3000)
    
    // 포그라운드 복귀
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    // 실시간 구독이 복구되었는지 확인
    const realtimeErrors = errors.filter(e => 
      e.includes('subscription') && e.includes('failed')
    )
    
    expect(realtimeErrors).toHaveLength(0)
    
    await context.close()
    console.log('✅ 실시간 업데이트 테스트 통과')
  })
})

test.describe('Promise Manager 성능 테스트', () => {
  
  test('동시 다발적 요청 처리', async ({ page }) => {
    const { errors } = setupConsoleMonitoring(page)
    
    await loginToApp(page)
    
    // 여러 페이지를 빠르게 전환하여 동시 요청 발생
    const pages = ['/', '/community', '/knowledge', '/cases', '/activities']
    
    for (const path of pages) {
      await page.goto(path)
      // 각 페이지 로드를 기다리지 않고 바로 다음으로
    }
    
    // 모든 Promise가 정리되었는지 확인
    await page.waitForTimeout(5000)
    
    // 메모리 누수 관련 에러 체크
    const memoryErrors = errors.filter(e => 
      e.includes('memory') || e.includes('leak')
    )
    
    expect(memoryErrors).toHaveLength(0)
    
    // 취소되지 않은 Promise 경고 체크
    const uncancelledPromises = errors.filter(e => 
      e.includes('pending') || e.includes('unhandled')
    )
    
    expect(uncancelledPromises).toHaveLength(0)
    
    console.log('✅ 동시 요청 처리 테스트 통과')
  })
})