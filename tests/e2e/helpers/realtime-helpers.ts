import { Page, expect } from '@playwright/test';

/**
 * Helper functions for testing realtime features
 */

export class RealtimeHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for realtime connection to be established
   */
  async waitForRealtimeConnection(timeout = 10000) {
    // Check for realtime connection indicators
    await this.page.waitForFunction(
      () => {
        // Check if Supabase realtime client is connected
        return (window as any)['supabase']?.realtime?.isConnected?.() || 
               document.querySelector('[data-testid="realtime-connected"]') !== null;
      },
      { timeout }
    );
  }

  /**
   * Test realtime message delivery
   */
  async testRealtimeMessage(senderPage: Page, receiverPage: Page, message: string) {
    // Send message from sender
    await senderPage.fill('[data-testid="message-input"]', message);
    await senderPage.click('[data-testid="send-message"]');
    
    // Wait for message to appear on receiver
    await receiverPage.waitForSelector(`text="${message}"`, { timeout: 5000 });
    
    // Verify message appears on both sides
    await expect(senderPage.locator(`text="${message}"`)).toBeVisible();
    await expect(receiverPage.locator(`text="${message}"`)).toBeVisible();
  }

  /**
   * Test realtime notifications
   */
  async testRealtimeNotification(triggerPage: Page, receiverPage: Page, action: string) {
    // Perform action that triggers notification
    switch (action) {
      case 'like':
        await triggerPage.click('[data-testid="like-button"]');
        break;
      case 'comment':
        await triggerPage.fill('[data-testid="comment-input"]', 'Test comment');
        await triggerPage.click('[data-testid="submit-comment"]');
        break;
      case 'follow':
        await triggerPage.click('[data-testid="follow-button"]');
        break;
    }
    
    // Wait for notification to appear on receiver
    await receiverPage.waitForSelector('[data-testid="notification-badge"]', { timeout: 5000 });
    
    // Check notification count increased
    const notificationCount = await receiverPage.locator('[data-testid="notification-count"]').textContent();
    expect(parseInt(notificationCount || '0')).toBeGreaterThan(0);
  }

  /**
   * Test activity participation updates
   */
  async testActivityParticipation(page: Page) {
    // Get initial participant count
    const initialCount = await page.locator('[data-testid="participant-count"]').textContent();
    const initial = parseInt(initialCount?.match(/\d+/)?.[0] || '0');
    
    // Click participate button
    await page.click('[data-testid="participate-button"]');
    
    // Wait for count to update
    await page.waitForFunction(
      (expected) => {
        const count = document.querySelector('[data-testid="participant-count"]')?.textContent;
        const current = parseInt(count?.match(/\d+/)?.[0] || '0');
        return current === expected;
      },
      initial + 1,
      { timeout: 5000 }
    );
    
    // Verify button changed to cancel
    await expect(page.locator('[data-testid="cancel-participation-button"]')).toBeVisible();
    
    // Test cancellation
    await page.click('[data-testid="cancel-participation-button"]');
    
    // Wait for count to decrease
    await page.waitForFunction(
      (expected) => {
        const count = document.querySelector('[data-testid="participant-count"]')?.textContent;
        const current = parseInt(count?.match(/\d+/)?.[0] || '0');
        return current === expected;
      },
      initial,
      { timeout: 5000 }
    );
    
    // Verify button changed back to participate
    await expect(page.locator('[data-testid="participate-button"]')).toBeVisible();
  }

  /**
   * Test presence indicators (online status)
   */
  async testPresenceIndicators(page1: Page, page2: Page) {
    // Both users should see each other as online
    await page1.waitForSelector('[data-testid="online-indicator"]', { timeout: 5000 });
    await page2.waitForSelector('[data-testid="online-indicator"]', { timeout: 5000 });
    
    // Get online user count
    const onlineCount1 = await page1.locator('[data-testid="online-count"]').textContent();
    const onlineCount2 = await page2.locator('[data-testid="online-count"]').textContent();
    
    expect(parseInt(onlineCount1 || '0')).toBeGreaterThanOrEqual(2);
    expect(onlineCount1).toBe(onlineCount2);
  }

  /**
   * Test typing indicators in chat
   */
  async testTypingIndicators(senderPage: Page, receiverPage: Page) {
    // Start typing on sender
    await senderPage.fill('[data-testid="message-input"]', 'Typing...');
    
    // Check typing indicator appears on receiver
    await receiverPage.waitForSelector('[data-testid="typing-indicator"]', { timeout: 3000 });
    
    // Clear input
    await senderPage.fill('[data-testid="message-input"]', '');
    
    // Check typing indicator disappears
    await receiverPage.waitForSelector('[data-testid="typing-indicator"]', { 
      state: 'hidden',
      timeout: 3000 
    });
  }

  /**
   * Test realtime content updates
   */
  async testContentUpdate(editorPage: Page, viewerPage: Page) {
    const newTitle = `Updated Title ${Date.now()}`;
    
    // Update content on editor page
    await editorPage.click('[data-testid="edit-button"]');
    await editorPage.fill('[data-testid="title-input"]', newTitle);
    await editorPage.click('[data-testid="save-button"]');
    
    // Wait for update on viewer page
    await viewerPage.waitForSelector(`text="${newTitle}"`, { timeout: 5000 });
    
    // Verify both pages show updated content
    await expect(editorPage.locator(`text="${newTitle}"`)).toBeVisible();
    await expect(viewerPage.locator(`text="${newTitle}"`)).toBeVisible();
  }
}