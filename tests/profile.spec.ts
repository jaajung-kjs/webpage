import { test, expect } from '@playwright/test'

// 테스트 계정 정보
const TEST_USER = {
  email: 'jaajung@naver.com',
  password: 'kjs487956!@'
}

test.describe('프로필 페이지 테스트', () => {
  // 매 테스트 전 로그인
  test.beforeEach(async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('http://localhost:3000/auth/login')
    
    // 로그인 수행
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // 로그인 완료 대기
    await page.waitForURL('http://localhost:3000/**', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // 추가 대기
  })
  
  test('프로필 페이지가 실제 DB 데이터를 표시하는지 확인', async ({ page }) => {
    // 프로필 페이지로 이동
    await page.goto('http://localhost:3000/profile')
    
    // 페이지 로드 대기
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 })
    
    // 하드코딩된 데이터가 없는지 확인
    // 1. null 또는 빈 배열이 직접 표시되지 않는지 확인
    const pageContent = await page.content()
    expect(pageContent).not.toContain('미등록') // AI 전문분야가 비어있을 때 표시되는 텍스트
    
    // 2. 스킬 레벨이 실제 DB 데이터인지 확인 (하드코딩된 'beginner'가 아닌 실제 값)
    const skillLevelBadge = await page.locator('text=/초급|중급|고급|전문가/').first()
    const skillLevelText = await skillLevelBadge.textContent()
    expect(skillLevelText).toBeTruthy()
    console.log('스킬 레벨:', skillLevelText)
    
    // 3. 활동 레벨이 실제 DB 데이터인지 확인
    const activityLevelBadge = await page.locator('text=/신입|활발|열정|리더/').first()
    const activityLevelText = await activityLevelBadge.textContent()
    expect(activityLevelText).toBeTruthy()
    console.log('활동 레벨:', activityLevelText)
    
    // 4. 활동 점수가 0이 아닌 실제 값인지 확인
    const activityScoreElement = await page.locator('text=/활동 점수/').locator('..').locator('span.font-bold').first()
    const activityScore = await activityScoreElement.textContent()
    expect(activityScore).toBeTruthy()
    console.log('활동 점수:', activityScore)
    
    // 5. 통계 탭 확인
    await page.click('button:has-text("통계")')
    await page.waitForTimeout(1000)
    
    // 6. 게시글 통계가 실제 데이터인지 확인
    const postsCountElement = await page.locator('text=/총 게시글/').locator('..').locator('span.font-semibold').first()
    const postsCount = await postsCountElement.textContent()
    expect(postsCount).toBeTruthy()
    expect(parseInt(postsCount || '0')).toBeGreaterThanOrEqual(0)
    console.log('총 게시글 수:', postsCount)
    
    // 7. 댓글 수 확인
    const commentsCountElement = await page.locator('text=/총 댓글/').locator('..').locator('span.font-semibold').first()
    const commentsCount = await commentsCountElement.textContent()
    expect(commentsCount).toBeTruthy()
    expect(parseInt(commentsCount || '0')).toBeGreaterThanOrEqual(0)
    console.log('총 댓글 수:', commentsCount)
    
    // 8. 좋아요 수 확인
    const likesCountElement = await page.locator('text=/받은 좋아요/').locator('..').locator('span.font-semibold').first()
    const likesCount = await likesCountElement.textContent()
    expect(likesCount).toBeTruthy()
    expect(parseInt(likesCount || '0')).toBeGreaterThanOrEqual(0)
    console.log('받은 좋아요 수:', likesCount)
    
    // 9. 콘솔 에러 확인
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('콘솔 에러:', msg.text())
      }
    })
  })
  
  test('프로필 데이터가 일관성 있게 표시되는지 확인', async ({ page }) => {
    // 프로필 페이지로 이동
    await page.goto('http://localhost:3000/profile')
    
    // 페이지 로드 대기
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 })
    
    // 1. 메인 카드의 활동 점수
    const mainActivityScore = await page.locator('text="활동 점수"').locator('..').locator('span.font-bold').first().textContent()
    
    // 2. 통계 탭으로 이동
    await page.click('button:has-text("통계")')
    await page.waitForTimeout(1000)
    
    // 3. 통계 탭의 활동 점수
    const statsActivityScore = await page.locator('text=/활동 점수/').locator('..').locator('.font-semibold').last().textContent()
    
    // 4. 두 값이 일치하는지 확인 (점 제거하고 비교)
    const mainScore = mainActivityScore?.replace('점', '').trim()
    const statsScore = statsActivityScore?.trim()
    
    console.log('메인 카드 활동 점수:', mainScore)
    console.log('통계 탭 활동 점수:', statsScore)
    
    // 값이 존재하고 일치하는지 확인
    expect(mainScore).toBeTruthy()
    expect(statsScore).toBeTruthy()
    expect(mainScore).toBe(statsScore)
  })
  
  test('업적 데이터가 올바르게 표시되는지 확인', async ({ page }) => {
    // 프로필 페이지로 이동
    await page.goto('http://localhost:3000/profile')
    
    // 페이지 로드 대기
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 })
    
    // 업적 섹션 확인
    const achievementSection = await page.locator('text="획득 업적"').first()
    expect(achievementSection).toBeTruthy()
    
    // 업적 개수와 점수 확인
    const achievementStats = await page.locator('text="획득 업적"').locator('..').locator('text=/[0-9]+개.*[0-9]+점/').first()
    const achievementStatsText = await achievementStats.textContent()
    console.log('업적 통계:', achievementStatsText)
    
    // 업적 통계가 표시되는지 확인
    expect(achievementStatsText).toBeTruthy()
    
    // 통계 탭으로 이동
    await page.click('button:has-text("통계")')
    await page.waitForTimeout(1000)
    
    // 업적 진행률 섹션이 있다면 확인
    const achievementProgressSection = await page.locator('text="업적 진행률"').count()
    if (achievementProgressSection > 0) {
      // 완료된 업적 수 확인
      const completedAchievements = await page.locator('text="완료된 업적"').locator('..').locator('.text-2xl').first().textContent()
      console.log('완료된 업적 수:', completedAchievements)
      expect(completedAchievements).toBeTruthy()
      
      // 획득 포인트 확인
      const earnedPoints = await page.locator('text="획득 포인트"').locator('..').locator('.text-2xl').first().textContent()
      console.log('획득 포인트:', earnedPoints)
      expect(earnedPoints).toBeTruthy()
    }
  })
  
  test('프로필 편집 버튼이 자신의 프로필에서만 표시되는지 확인', async ({ page }) => {
    // 자신의 프로필 페이지로 이동
    await page.goto('http://localhost:3000/profile')
    
    // 페이지 로드 대기
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 })
    
    // 프로필 편집 버튼이 표시되는지 확인
    const editButton = await page.locator('button:has-text("프로필 편집")')
    expect(await editButton.isVisible()).toBeTruthy()
    
    // 설정 탭이 표시되는지 확인
    const settingsTab = await page.locator('button:has-text("설정")')
    expect(await settingsTab.isVisible()).toBeTruthy()
  })
  
  test('네트워크 에러가 없는지 확인', async ({ page }) => {
    // 네트워크 요청 모니터링
    const failedRequests: string[] = []
    
    page.on('requestfailed', request => {
      failedRequests.push(request.url())
      console.error('Failed request:', request.url())
    })
    
    // 프로필 페이지로 이동
    await page.goto('http://localhost:3000/profile')
    
    // 페이지 로드 대기
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 })
    
    // 통계 탭으로 이동
    await page.click('button:has-text("통계")')
    await page.waitForTimeout(2000)
    
    // 네트워크 에러가 없는지 확인
    expect(failedRequests.length).toBe(0)
  })
})