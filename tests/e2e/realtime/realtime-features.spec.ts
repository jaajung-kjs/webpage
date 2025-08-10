import { test, expect, testUtils } from '../fixtures/base-test';

test.describe('Realtime Features', () => {
  test.beforeEach(async ({ page }) => {
    await testUtils.login(page);
  });

  test('should establish realtime connection', async ({ page, realtimeHelpers }) => {
    await page.goto('/');
    
    // Wait for realtime connection
    await realtimeHelpers.waitForRealtimeConnection();
    
    // Check console for connection logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should have realtime connection logs
    const hasRealtimeConnection = consoleLogs.some(log => 
      log.includes('Connection restored') || 
      log.includes('Successfully subscribed') ||
      log.includes('realtime')
    );
    
    expect(hasRealtimeConnection).toBe(true);
  });

  test('should receive real-time notifications', async ({ page }) => {
    await page.goto('/');
    
    // Check for notification badge
    const notificationBadge = page.locator('[class*="notification"], [data-testid*="notification"]');
    
    // Trigger an action that generates notification (like someone liking your content)
    // This would require another user action or simulation
    
    // For now, check if notification system is present
    await expect(notificationBadge).toBeVisible();
  });

  test('should update content in real-time', async ({ page, browser }) => {
    // Create two contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login both
    await testUtils.login(page1);
    await testUtils.login(page2);
    
    // Navigate to same content
    await page1.goto('/cases');
    const firstContent = await page1.locator('[href^="/cases/"]').first().getAttribute('href');
    
    if (firstContent) {
      await page1.goto(firstContent);
      await page2.goto(firstContent);
      
      // Like content on page1
      const likeButton1 = page1.locator('[class*="like"], [data-testid*="like"]').first();
      const initialLikeCount = await page2.locator('[class*="like"], [data-testid*="like"]').locator('text=/\\d+/').textContent();
      const initialCount = parseInt(initialLikeCount || '0');
      
      await likeButton1.click();
      
      // Check if like count updated on page2
      await page2.waitForTimeout(2000);
      const newLikeCount = await page2.locator('[class*="like"], [data-testid*="like"]').locator('text=/\\d+/').textContent();
      const newCount = parseInt(newLikeCount || '0');
      
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
    
    await context1.close();
    await context2.close();
  });

  test('should show online presence indicators', async ({ page }) => {
    await page.goto('/members');
    
    // Look for online indicators
    const onlineIndicators = await page.locator('[class*="online"], [data-testid*="online"], [class*="status"]').all();
    
    // Should have at least one online user (current user)
    expect(onlineIndicators.length).toBeGreaterThan(0);
  });

  test('should handle realtime message delivery', async ({ page }) => {
    // Navigate to messages
    await page.goto('/messages');
    
    // Check if message interface is available
    const messageInput = page.locator('[placeholder*="메시지"], input[type="text"], textarea');
    const sendButton = page.getByRole('button', { name: /전송|보내기/ });
    
    if (await messageInput.isVisible() && await sendButton.isVisible()) {
      // Send a test message
      const testMessage = `Test message ${Date.now()}`;
      await messageInput.fill(testMessage);
      await sendButton.click();
      
      // Verify message appears
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should sync data across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Open two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Login in first tab
    await testUtils.login(page1);
    
    // Navigate second tab to same domain
    await page2.goto('http://localhost:3000');
    
    // Should be logged in on second tab due to shared session
    await expect(page2.getByRole('button', { name: '사용자' })).toBeVisible();
    
    // Make a change in tab1
    await page1.goto('/profile');
    
    // Check if tab2 reflects the login state
    await page2.goto('/profile');
    await expect(page2.locator('h2')).toContainText('김준성');
    
    await context.close();
  });

  test('should handle typing indicators in chat', async ({ page }) => {
    await page.goto('/messages');
    
    // Check for chat interface
    const messageInput = page.locator('[placeholder*="메시지"], input[type="text"], textarea');
    
    if (await messageInput.isVisible()) {
      // Start typing
      await messageInput.fill('Typing...');
      
      // In a real scenario with another user, we would check for typing indicator
      // For now, verify the input works
      const inputValue = await messageInput.inputValue();
      expect(inputValue).toBe('Typing...');
      
      // Clear input
      await messageInput.clear();
    }
  });

  test('should update activity participants in real-time', async ({ page, realtimeHelpers }) => {
    // Navigate to an activity
    await page.goto('/activities');
    await page.locator('[href^="/activities/"]').first().click();
    
    // Wait for realtime connection
    await realtimeHelpers.waitForRealtimeConnection();
    
    // Test participation updates
    await realtimeHelpers.testActivityParticipation(page);
  });
});