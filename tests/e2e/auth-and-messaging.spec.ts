import { test, expect } from '@playwright/test';
import { AuthHelper, quickLogin } from './helpers/auth-helper';

/**
 * Authentication and Messaging E2E Tests for KEPCO AI Community
 * 
 * Tests authentication flow and real-time messaging functionality
 */

test.describe('Authentication and Messaging Tests', () => {
  const PRIMARY_USER = {
    email: 'jaajung@naver.com',
    password: 'kjs487956!@',
    name: '김준성'
  };

  const SECONDARY_USER = {
    email: 'savior_to@naver.com',
    password: '123123',
    name: '테스터'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should successfully login with primary user', async ({ page }) => {
    console.log('[Test] Testing login with primary user...');
    
    const authHelper = new AuthHelper(page);
    const loginSuccess = await authHelper.login(PRIMARY_USER.email, PRIMARY_USER.password);
    
    expect(loginSuccess).toBe(true);
    
    // Verify logged in state
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('should open and navigate message modal', async ({ page }) => {
    console.log('[Test] Testing message modal functionality...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Click message button
    const messageButton = page.getByRole('button', { name: '메시지' });
    await messageButton.click();
    
    // Wait for message modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    
    // Check if message list is visible
    const messageListTitle = page.locator('text=메시지함');
    await expect(messageListTitle).toBeVisible();
    
    // Look for new message button
    const newMessageButton = page.getByRole('button', { name: '새 메시지' });
    await expect(newMessageButton).toBeVisible();
  });

  test('should send a message to another user', async ({ page }) => {
    console.log('[Test] Testing message sending functionality...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Open message modal
    await page.getByRole('button', { name: '메시지' }).click();
    await page.waitForTimeout(1000);
    
    // Click new message button
    await page.getByRole('button', { name: '새 메시지' }).click();
    await page.waitForTimeout(1000);
    
    // Search for recipient
    const searchInput = page.getByPlaceholder('이름, 이메일 또는 부서로 검색...');
    await searchInput.fill(SECONDARY_USER.name);
    await page.waitForTimeout(1000);
    
    // Select recipient from dropdown
    const recipientOption = page.locator(`text="${SECONDARY_USER.name}"`).first();
    await recipientOption.click();
    
    // Type message
    const messageInput = page.getByPlaceholder('메시지를 입력하세요...');
    const testMessage = `테스트 메시지 - ${new Date().toLocaleTimeString()}`;
    await messageInput.fill(testMessage);
    
    // Send message
    const sendButton = page.getByRole('button', { name: '전송' });
    await sendButton.click();
    
    // Verify message sent notification
    await expect(page.locator('text=메시지를 전송했습니다')).toBeVisible({ timeout: 5000 });
  });

  test('should handle real-time connection during messaging', async ({ page }) => {
    console.log('[Test] Testing real-time connection during messaging...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Monitor console logs for real-time activity
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Open message modal
    await page.getByRole('button', { name: '메시지' }).click();
    await page.waitForTimeout(2000);
    
    // Check for real-time connection logs
    const hasRealtimeLogs = consoleLogs.some(log => 
      log.includes('RealtimeCore') || 
      log.includes('ConnectionCore') ||
      log.includes('WebSocket') ||
      log.includes('subscription')
    );
    
    expect(hasRealtimeLogs).toBe(true);
    console.log('[Test] Real-time connection active during messaging');
  });

  test('should maintain WebSocket connection health', async ({ page }) => {
    console.log('[Test] Testing WebSocket connection health...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Check WebSocket status
    const wsStatus = await page.evaluate(() => {
      const connectionCore = (window as any)?.connectionCore;
      const realtimeCore = (window as any)?.realtimeCore;
      
      return {
        connectionStatus: connectionCore?.getStatus?.() || null,
        realtimeStatus: realtimeCore?.getStatus?.() || null,
        timestamp: Date.now()
      };
    });
    
    console.log('[Test] WebSocket status:', wsStatus);
    
    // Verify connection is healthy
    expect(wsStatus.connectionStatus || wsStatus.realtimeStatus).toBeTruthy();
  });

  test('should handle background/foreground transitions', async ({ page }) => {
    console.log('[Test] Testing background/foreground transitions...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Get initial status
    const initialStatus = await getWebSocketStatus(page);
    console.log('[Test] Initial status:', initialStatus);
    
    // Simulate going to background
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait in background
    await page.waitForTimeout(5000);
    
    // Simulate coming back to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait for potential reconnection
    await page.waitForTimeout(3000);
    
    // Get final status
    const finalStatus = await getWebSocketStatus(page);
    console.log('[Test] Final status:', finalStatus);
    
    // Connection should be maintained or restored
    expect(finalStatus.isConnected).toBe(true);
  });

  test('should handle network offline/online transitions', async ({ page, context }) => {
    console.log('[Test] Testing network offline/online transitions...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Go offline
    await context.setOffline(true);
    console.log('[Test] Network offline');
    await page.waitForTimeout(3000);
    
    // Go back online
    await context.setOffline(false);
    console.log('[Test] Network online');
    await page.waitForTimeout(5000);
    
    // Check final connection status
    const finalStatus = await getWebSocketStatus(page);
    console.log('[Test] Final status after network recovery:', finalStatus);
    
    // Connection should be restored
    expect(finalStatus.isConnected).toBe(true);
  });

  test('should detect and handle stale connections', async ({ page }) => {
    console.log('[Test] Testing stale connection detection...');
    
    // Login first
    await loginWithUser(page, PRIMARY_USER);
    
    // Simulate long idle period (30 seconds)
    console.log('[Test] Simulating 30 second idle period...');
    await page.waitForTimeout(30000);
    
    // Trigger health check
    const healthCheckResult = await page.evaluate(async () => {
      const realtimeCore = (window as any)?.realtimeCore;
      if (realtimeCore && realtimeCore.manualHealthCheck) {
        return await realtimeCore.manualHealthCheck();
      }
      return null;
    });
    
    console.log('[Test] Health check result:', healthCheckResult);
    
    // Check connection status
    const status = await getWebSocketStatus(page);
    expect(status.isConnected).toBe(true);
  });

  test('should handle multiple tabs correctly', async ({ browser }) => {
    console.log('[Test] Testing multiple tab behavior...');
    
    // Create two contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Login in both tabs
      await page1.goto('/');
      await loginWithUser(page1, PRIMARY_USER);
      
      await page2.goto('/');
      await loginWithUser(page2, SECONDARY_USER);
      
      // Check both connections
      const status1 = await getWebSocketStatus(page1);
      const status2 = await getWebSocketStatus(page2);
      
      console.log('[Test] Tab 1 status:', status1);
      console.log('[Test] Tab 2 status:', status2);
      
      // Both should have active connections
      expect(status1.isConnected).toBe(true);
      expect(status2.isConnected).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// Helper function to login - now uses AuthHelper
async function loginWithUser(page: any, user: { email: string, password: string }) {
  const authHelper = new AuthHelper(page);
  const success = await authHelper.login(user.email, user.password);
  if (!success) {
    throw new Error(`Failed to login with ${user.email}`);
  }
  return success;
}

// Helper function to get WebSocket status
async function getWebSocketStatus(page: any) {
  return await page.evaluate(() => {
    const connectionCore = (window as any)?.connectionCore;
    const realtimeCore = (window as any)?.realtimeCore;
    const supabase = (window as any)?.supabase;
    
    const connectionStatus = connectionCore?.getStatus?.() || {};
    const realtimeStatus = realtimeCore?.getStatus?.() || {};
    const supabaseConnected = supabase?.realtime?.isConnected?.() || false;
    
    return {
      isConnected: connectionStatus.isConnected || realtimeStatus.isReady || supabaseConnected,
      connectionStatus,
      realtimeStatus,
      supabaseConnected,
      timestamp: Date.now()
    };
  });
}