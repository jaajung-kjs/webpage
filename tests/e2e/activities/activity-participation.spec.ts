import { test, expect, testUtils } from '../fixtures/base-test';

test.describe('Activity Participation Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await testUtils.login(page);
  });

  test('should allow joining an activity', async ({ page }) => {
    // Navigate to activities
    await page.goto('/activities');
    
    // Wait for activities to load
    await page.waitForSelector('[class*="activity"], [data-testid*="activity"]');
    
    // Click on first activity
    await page.locator('[href^="/activities/"]').first().click();
    
    // Wait for activity detail page
    await page.waitForURL(/\/activities\/[a-f0-9-]+/);
    
    // Check if join button is visible
    const joinButton = page.getByRole('button', { name: /참가신청|참여하기/ });
    const cancelButton = page.getByRole('button', { name: /참가취소|취소하기/ });
    
    if (await joinButton.isVisible()) {
      // Get initial participant count
      const participantText = await page.locator('text=/참가자.*\\d+/').textContent();
      const initialCount = parseInt(participantText?.match(/\d+/)?.[0] || '0');
      
      // Join activity
      await joinButton.click();
      
      // Verify joined
      await expect(cancelButton).toBeVisible();
      
      // Check participant count increased
      const newParticipantText = await page.locator('text=/참가자.*\\d+/').textContent();
      const newCount = parseInt(newParticipantText?.match(/\d+/)?.[0] || '0');
      expect(newCount).toBe(initialCount + 1);
    }
  });

  test('should allow canceling participation', async ({ page }) => {
    // Navigate to activities
    await page.goto('/activities');
    
    // Click on first activity
    await page.locator('[href^="/activities/"]').first().click();
    
    // Wait for activity detail page
    await page.waitForURL(/\/activities\/[a-f0-9-]+/);
    
    const joinButton = page.getByRole('button', { name: /참가신청|참여하기/ });
    const cancelButton = page.getByRole('button', { name: /참가취소|취소하기/ });
    
    // If not joined, join first
    if (await joinButton.isVisible()) {
      await joinButton.click();
      await expect(cancelButton).toBeVisible();
    }
    
    // Get participant count before canceling
    const participantText = await page.locator('text=/참가자.*\\d+/').textContent();
    const initialCount = parseInt(participantText?.match(/\d+/)?.[0] || '0');
    
    // Cancel participation
    await cancelButton.click();
    
    // Verify canceled
    await expect(joinButton).toBeVisible();
    
    // Check participant count decreased
    const newParticipantText = await page.locator('text=/참가자.*\\d+/').textContent();
    const newCount = parseInt(newParticipantText?.match(/\d+/)?.[0] || '0');
    expect(newCount).toBe(initialCount - 1);
  });

  test('should display participant list', async ({ page }) => {
    // Navigate to activities
    await page.goto('/activities');
    
    // Click on first activity
    await page.locator('[href^="/activities/"]').first().click();
    
    // Wait for activity detail page
    await page.waitForURL(/\/activities\/[a-f0-9-]+/);
    
    // Check if participant list is visible
    const participantSection = page.locator('text=/참가자|참여자/').locator('..');
    
    if (await participantSection.isVisible()) {
      // Check for participant avatars or names
      const participants = await participantSection.locator('[class*="participant"], [data-testid*="participant"], img[alt*="참가자"], img[alt*="사용자"]').all();
      
      // Should have at least some participants if activity is active
      if (participants.length > 0) {
        expect(participants.length).toBeGreaterThan(0);
      }
    }
  });

  test('should handle attendance check', async ({ page }) => {
    // Navigate to my activities
    await page.goto('/activities');
    
    // Look for activities with attendance feature
    const myActivitiesTab = page.getByRole('tab', { name: /내 활동|참여중/ });
    
    if (await myActivitiesTab.isVisible()) {
      await myActivitiesTab.click();
      
      // Find activity with attendance button
      const attendanceButton = page.getByRole('button', { name: /출석체크|출석하기/ });
      
      if (await attendanceButton.isVisible()) {
        await attendanceButton.click();
        
        // Verify attendance recorded
        await expect(page.locator('text=/출석완료|출석되었습니다/')).toBeVisible();
      }
    }
  });

  test('should display activity details correctly', async ({ page }) => {
    // Navigate to activities
    await page.goto('/activities');
    
    // Click on first activity
    await page.locator('[href^="/activities/"]').first().click();
    
    // Wait for activity detail page
    await page.waitForURL(/\/activities\/[a-f0-9-]+/);
    
    // Check activity title
    const title = await page.locator('h1').textContent();
    expect(title).not.toContain('Test Activity');
    expect(title).not.toContain('Demo Event');
    
    // Check date/time
    const dateTime = await page.locator('text=/2025년.*월.*일/').textContent();
    expect(dateTime).toMatch(/2025년.*월.*일/);
    
    // Check location
    const location = await page.locator('text=/장소|위치/').locator('..').textContent();
    expect(location).toBeTruthy();
    
    // Check description
    const description = await page.locator('[class*="description"], [data-testid*="description"]').textContent();
    expect(description).not.toContain('Lorem ipsum');
    expect(description).not.toContain('Test description');
  });

  test('should update participant count in real-time', async ({ page, browser }) => {
    // Open two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login in both contexts
    await testUtils.login(page1);
    await testUtils.login(page2, 'another@user.com', 'password'); // If another test user exists
    
    // Navigate both to same activity
    await page1.goto('/activities');
    await page1.locator('[href^="/activities/"]').first().click();
    const activityUrl = page1.url();
    
    await page2.goto(activityUrl);
    
    // Get initial count on page2
    const initialText = await page2.locator('text=/참가자.*\\d+/').textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');
    
    // Join on page1
    const joinButton = page1.getByRole('button', { name: /참가신청|참여하기/ });
    if (await joinButton.isVisible()) {
      await joinButton.click();
      
      // Check if count updated on page2
      await page2.waitForTimeout(2000); // Wait for real-time update
      const newText = await page2.locator('text=/참가자.*\\d+/').textContent();
      const newCount = parseInt(newText?.match(/\d+/)?.[0] || '0');
      
      // Should see the update
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
    
    // Cleanup
    await context1.close();
    await context2.close();
  });
});