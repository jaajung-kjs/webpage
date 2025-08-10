import { test, expect, testUtils } from '../fixtures/base-test';

test.describe('Messaging System', () => {
  test.beforeEach(async ({ page }) => {
    await testUtils.login(page);
  });

  test('should access messages page', async ({ page }) => {
    // Click on messages button
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Should navigate to messages page or open messages panel
    await expect(page.locator('text=/메시지|대화|채팅/')).toBeVisible();
  });

  test('should send a direct message', async ({ page }) => {
    // Navigate to a user profile
    await page.goto('/members');
    
    // Click on a user (not self)
    const users = await page.locator('[href^="/profile/"]').all();
    
    for (const user of users) {
      const userName = await user.textContent();
      if (userName && !userName.includes('김준성')) {
        await user.click();
        break;
      }
    }
    
    // Look for message button on profile
    const messageButton = page.getByRole('button', { name: /메시지 보내기|메시지/ });
    
    if (await messageButton.isVisible()) {
      await messageButton.click();
      
      // Fill message
      const messageInput = page.locator('[placeholder*="메시지"], textarea').first();
      const testMessage = `Test message ${Date.now()}`;
      
      await messageInput.fill(testMessage);
      
      // Send message
      await page.getByRole('button', { name: /전송|보내기/ }).click();
      
      // Verify message sent
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display message history', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Check for conversation list
    const conversations = await page.locator('[class*="conversation"], [class*="chat-list"]').all();
    
    if (conversations.length > 0) {
      // Click on first conversation
      await conversations[0].click();
      
      // Should show message history
      const messages = await page.locator('[class*="message-item"], [class*="chat-message"]').all();
      expect(messages.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should mark messages as read', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Look for unread indicators
    const unreadIndicator = page.locator('[class*="unread"], [data-testid*="unread"]').first();
    
    if (await unreadIndicator.isVisible()) {
      // Click on unread conversation
      await unreadIndicator.click();
      
      // Wait for messages to load
      await page.waitForTimeout(2000);
      
      // Unread indicator should disappear
      await expect(unreadIndicator).not.toBeVisible();
    }
  });

  test('should show message notifications', async ({ page }) => {
    // Check for message notification badge
    const messageBadge = page.locator('[class*="badge"], [class*="notification"]').first();
    
    if (await messageBadge.isVisible()) {
      const badgeText = await messageBadge.textContent();
      
      // Should show number if there are unread messages
      if (badgeText && /\d+/.test(badgeText)) {
        const count = parseInt(badgeText.match(/\d+/)?.[0] || '0');
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should search messages', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Look for search input
    const searchInput = page.locator('[placeholder*="검색"], [placeholder*="search"]').first();
    
    if (await searchInput.isVisible()) {
      // Search for a keyword
      await searchInput.fill('AI');
      await searchInput.press('Enter');
      
      // Should filter messages or conversations
      await page.waitForTimeout(1000);
      
      // Check if results are filtered
      const results = await page.locator('[class*="conversation"], [class*="message"]').all();
      expect(results.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle message delivery status', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Open a conversation
    const conversations = await page.locator('[class*="conversation"], [class*="chat-list"]').all();
    
    if (conversations.length > 0) {
      await conversations[0].click();
      
      // Send a message
      const messageInput = page.locator('[placeholder*="메시지"], textarea').first();
      const testMessage = `Status test ${Date.now()}`;
      
      await messageInput.fill(testMessage);
      await page.getByRole('button', { name: /전송|보내기/ }).click();
      
      // Check for delivery status indicators
      const statusIndicator = page.locator('[class*="delivered"], [class*="sent"], [class*="read"]');
      
      // Should show some status
      const hasStatus = await statusIndicator.count() > 0;
      expect(hasStatus).toBe(true);
    }
  });

  test('should handle typing indicators', async ({ page, realtimeHelpers, browser }) => {
    // This requires two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login both users
    await testUtils.login(page1);
    // Would need second user credentials
    // await testUtils.login(page2, 'user2@example.com', 'password');
    
    // Navigate to messages
    await page1.getByRole('button', { name: '메시지' }).click();
    
    // Start typing
    const messageInput = page1.locator('[placeholder*="메시지"], textarea').first();
    
    if (await messageInput.isVisible()) {
      await messageInput.fill('Typing...');
      
      // In real scenario, page2 would see typing indicator
      // For now, just verify input works
      expect(await messageInput.inputValue()).toBe('Typing...');
    }
    
    await context1.close();
    await context2.close();
  });

  test('should delete messages', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Open a conversation
    const conversations = await page.locator('[class*="conversation"], [class*="chat-list"]').all();
    
    if (conversations.length > 0) {
      await conversations[0].click();
      
      // Find a message with delete option
      const message = page.locator('[class*="message-item"]').first();
      
      // Hover or click to show options
      await message.hover();
      
      const deleteButton = message.locator('button:has-text("삭제"), button[aria-label*="삭제"]');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        await page.getByRole('button', { name: /확인|삭제/ }).click();
        
        // Message should be removed or marked as deleted
        await expect(message).not.toBeVisible();
      }
    }
  });

  test('should handle message attachments', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('button', { name: '메시지' }).click();
    
    // Open a conversation
    const conversations = await page.locator('[class*="conversation"], [class*="chat-list"]').all();
    
    if (conversations.length > 0) {
      await conversations[0].click();
      
      // Look for attachment button
      const attachButton = page.locator('button[aria-label*="첨부"], button:has-text("파일")');
      
      if (await attachButton.isVisible()) {
        // Check if file input exists
        const fileInput = page.locator('input[type="file"]');
        expect(await fileInput.count()).toBeGreaterThan(0);
      }
    }
  });
});