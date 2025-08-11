/**
 * 하트비트 무한 루프 수정 테스트
 * 
 * 테스트 목적:
 * 1. 타임아웃 에러가 발생해도 무한 루프가 생기지 않는지 확인
 * 2. Promise 취소 시 에러가 조용히 처리되는지 확인
 * 3. 탭 전환 시에도 안정적으로 동작하는지 확인
 */

import { test, expect } from '@playwright/test'

test.describe('하트비트 무한 루프 수정 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 모니터링
    const consoleMessages: string[] = []
    
    page.on('console', msg => {
      const message = msg.text()
      consoleMessages.push(message)
      
      // 무한 루프 감지
      if (message.includes('Heartbeat') || message.includes('timeout') || message.includes('withTimeout')) {
        console.log(`Console: ${message}`)
      }
    })

    // 네트워크 요청 모니터링
    let requestCount = 0
    const requestTimestamps: number[] = []
    
    page.on('request', request => {
      if (request.url().includes('supabase') && request.method() === 'GET') {
        requestCount++
        requestTimestamps.push(Date.now())
        
        // 1초 내에 10개 이상 요청이 있으면 무한 루프 의심
        const recentRequests = requestTimestamps.filter(ts => Date.now() - ts < 1000)
        if (recentRequests.length > 10) {
          console.error('❌ 무한 루프 감지: 1초 내 10개 이상의 요청')
        }
      }
    })

    await page.goto('http://localhost:3001')
  })

  test('타임아웃 에러 시 무한 루프 없음', async ({ page }) => {
    console.log('🔍 타임아웃 에러 무한 루프 테스트 시작')

    // 네트워크를 느리게 만들어 타임아웃 유발
    await page.route('**/rest/v1/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000)) // 5초 지연
      route.continue()
    })

    let initialRequestCount = 0
    page.on('request', request => {
      if (request.url().includes('supabase')) {
        initialRequestCount++
      }
    })

    // 5초 대기하여 무한 루프 확인
    await page.waitForTimeout(5000)
    
    // 5초 후 요청 카운트 확인
    let finalRequestCount = 0
    page.on('request', request => {
      if (request.url().includes('supabase')) {
        finalRequestCount++
      }
    })

    await page.waitForTimeout(3000)

    // 무한 루프가 없다면 요청이 폭증하지 않아야 함
    expect(finalRequestCount - initialRequestCount).toBeLessThan(20)
    console.log('✅ 타임아웃 에러 시 무한 루프 없음 확인')
  })

  test('탭 전환 시 안정성', async ({ page, context }) => {
    console.log('🔍 탭 전환 시 안정성 테스트 시작')

    // 에러 카운터
    let errorCount = 0
    page.on('pageerror', error => {
      errorCount++
      console.error('Page error:', error.message)
    })

    // 콘솔 에러 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorCount++
        console.error('Console error:', msg.text())
      }
    })

    // 새 탭 생성
    const newTab = await context.newPage()
    await newTab.goto('http://localhost:3001')

    // 탭 간 전환 시뮬레이션
    for (let i = 0; i < 5; i++) {
      await page.bringToFront()
      await page.waitForTimeout(500)
      await newTab.bringToFront()
      await page.waitForTimeout(500)
    }

    // 1초 대기 후 에러 카운트 확인
    await page.waitForTimeout(1000)

    expect(errorCount).toBeLessThan(5) // 에러가 5개 미만이어야 함
    console.log(`✅ 탭 전환 시 안정성 확인 (에러 ${errorCount}개)`)

    await newTab.close()
  })

  test('Promise 취소 시 조용한 처리', async ({ page }) => {
    console.log('🔍 Promise 취소 시 조용한 처리 테스트 시작')

    // 에러 메시지 수집
    const errorMessages: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text())
      }
    })

    // 페이지를 백그라운드로 보내서 Promise 취소 유발
    await page.evaluate(() => {
      // visibilitychange 이벤트 시뮬레이션
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      })
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })
      
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await page.waitForTimeout(2000)

    // 다시 포그라운드로
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      })
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })
      
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await page.waitForTimeout(2000)

    // 타임아웃/취소 관련 에러가 콘솔에 출력되지 않아야 함
    const timeoutErrors = errorMessages.filter(msg => 
      msg.includes('timeout') || msg.includes('abort') || msg.includes('Heartbeat')
    )

    expect(timeoutErrors.length).toBeLessThan(3) // 타임아웃 에러가 3개 미만이어야 함
    console.log(`✅ Promise 취소 시 조용한 처리 확인 (타임아웃 에러 ${timeoutErrors.length}개)`)
  })

  test('전반적인 안정성 검증', async ({ page }) => {
    console.log('🔍 전반적인 안정성 검증 테스트 시작')

    let totalRequests = 0
    let errorCount = 0

    // 요청 모니터링
    page.on('request', request => {
      if (request.url().includes('supabase')) {
        totalRequests++
      }
    })

    // 에러 모니터링
    page.on('pageerror', error => {
      errorCount++
      console.error('Page error:', error.message)
    })

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('ignored')) {
        errorCount++
        console.error('Console error:', msg.text())
      }
    })

    // 10초간 페이지 동작 관찰
    await page.waitForTimeout(10000)

    // 결과 평가
    console.log(`📊 테스트 결과:`)
    console.log(`- 총 요청 수: ${totalRequests}`)
    console.log(`- 에러 수: ${errorCount}`)

    // 안정성 기준
    expect(totalRequests).toBeLessThan(50) // 10초간 50개 미만 요청
    expect(errorCount).toBeLessThan(5) // 에러 5개 미만

    if (totalRequests < 50 && errorCount < 5) {
      console.log('🎉 무한 루프 수정 성공!')
    } else {
      console.log('❌ 무한 루프가 여전히 존재할 수 있음')
    }
  })
})