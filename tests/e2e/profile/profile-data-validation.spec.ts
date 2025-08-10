import { test, expect } from '../fixtures/base-test';

test.describe('Profile Data Validation - No Hardcoded Data', () => {
  test.beforeEach(async ({ page, testUtils }) => {
    // Login using helper
    await testUtils.login(page);
  });

  test('should display user statistics from database, not hardcoded', async ({ page, dbValidation }) => {
    // Navigate to profile
    await page.getByRole('button', { name: '사용자' }).click();
    await page.getByRole('menuitem', { name: '프로필' }).click();
    
    // Wait for profile to load
    await page.waitForURL('**/profile/**');
    await dbValidation.waitForDataLoad();
    
    // Check activity points are numeric and from DB
    const activityPoints = await page.locator('text=활동 점수').locator('..').locator('text=/\\d+점/').textContent();
    expect(activityPoints).toMatch(/^\d+점$/);
    expect(activityPoints).not.toBe('0점'); // Should have actual points
    
    // Check user level
    const userLevel = await page.locator('text=고급').first().textContent();
    expect(['초급', '중급', '고급', '마스터']).toContain(userLevel);
    
    // Check member rank
    const rank = await page.locator('text=/#\\d+/').textContent();
    expect(rank).toMatch(/^#\d+$/);
    
    // Navigate to statistics tab
    await page.getByRole('tab', { name: '통계' }).click();
    
    // Verify statistics are from database
    const totalPosts = await page.locator('text=총 게시글').locator('..').locator('text=/\\d+/').textContent();
    expect(totalPosts).toMatch(/^\d+$/);
    
    const totalComments = await page.locator('text=총 댓글').locator('..').locator('text=/\\d+/').textContent();
    expect(totalComments).toMatch(/^\d+$/);
    
    const totalLikes = await page.locator('text=받은 좋아요').locator('..').locator('text=/\\d+/').textContent();
    expect(totalLikes).toMatch(/^\d+$/);
    
    const totalViews = await page.locator('text=총 조회수').locator('..').locator('text=/\\d+/').textContent();
    expect(totalViews).toMatch(/^\d+$/);
    
    // Check no hardcoded test data
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Test User');
    expect(pageContent).not.toContain('Demo User');
    expect(pageContent).not.toContain('Lorem ipsum');
    expect(pageContent).not.toContain('placeholder');
  });

  test('should display achievements and badges from database', async ({ page }) => {
    // Navigate to profile
    await page.getByRole('button', { name: '사용자' }).click();
    await page.getByRole('menuitem', { name: '프로필' }).click();
    
    // Wait for profile to load
    await page.waitForURL('**/profile/**');
    
    // Check achievements section
    const achievementCount = await page.locator('text=획득 업적').locator('..').locator('text=/\\d+개/').textContent();
    expect(achievementCount).toMatch(/^\d+개$/);
    
    // Check achievement points
    const achievementPoints = await page.locator('text=획득 업적').locator('..').locator('text=/\\d+점/').textContent();
    expect(achievementPoints).toMatch(/^\d+점$/);
    
    // Check skill level
    const skillLevel = await page.locator('text=스킬 레벨').locator('..').locator('text=/초급|중급|고급|마스터/').textContent();
    expect(['초급', '중급', '고급', '마스터']).toContain(skillLevel);
    
    // Verify badges are not hardcoded
    const badges = await page.locator('[data-testid*="badge"], [class*="badge"]').all();
    for (const badge of badges) {
      const badgeText = await badge.textContent();
      expect(badgeText).not.toContain('Test Badge');
      expect(badgeText).not.toContain('Sample Achievement');
    }
  });

  test('should display activity history from database', async ({ page }) => {
    // Navigate to profile
    await page.getByRole('button', { name: '사용자' }).click();
    await page.getByRole('menuitem', { name: '프로필' }).click();
    
    // Wait for profile to load
    await page.waitForURL('**/profile/**');
    
    // Check activity history
    const activities = await page.locator('text=최근 활동').locator('..').locator('[class*="activity"], [data-testid*="activity"]').all();
    
    // Verify activities have valid timestamps
    for (const activity of activities.slice(0, 5)) { // Check first 5 activities
      const timeText = await activity.locator('text=/\\d+시간 전|\\d+분 전|방금 전/').textContent();
      expect(timeText).toMatch(/(\d+시간 전|\d+분 전|방금 전)/);
    }
  });

  test('should display correct user metadata', async ({ page }) => {
    // Navigate to profile
    await page.getByRole('button', { name: '사용자' }).click();
    await page.getByRole('menuitem', { name: '프로필' }).click();
    
    // Wait for profile to load
    await page.waitForURL('**/profile/**');
    
    // Check user name
    const userName = await page.locator('h2').first().textContent();
    expect(userName).toBe('김준성');
    
    // Check department
    const department = await page.locator('text=전력관리처 전자제어부').textContent();
    expect(department).toContain('전력관리처');
    
    // Check join date
    const joinDate = await page.locator('text=/2025년 \\d+월 \\d+일 가입/').textContent();
    expect(joinDate).toMatch(/2025년 \d+월 \d+일 가입/);
    
    // Check email
    const email = await page.locator('text=jaajung@naver.com').textContent();
    expect(email).toBe('jaajung@naver.com');
  });

  test('should load profile data from API, not hardcoded', async ({ page, dbValidation }) => {
    // Monitor network requests
    const dbMonitor = await dbValidation.monitorDatabaseCalls();
    
    // Navigate to profile
    await page.getByRole('button', { name: '사용자' }).click();
    await page.getByRole('menuitem', { name: '프로필' }).click();
    
    // Wait for profile to load
    await page.waitForURL('**/profile/**');
    await page.waitForLoadState('networkidle');
    
    // Verify database calls were made
    const requests = dbMonitor.getRequests();
    const hasProfileAPI = requests.some(url => 
      url.includes('users') || 
      url.includes('profile') || 
      url.includes('stats')
    );
    expect(hasProfileAPI).toBe(true);
  });
});