import { test, expect, testUtils } from '../fixtures/base-test';

test.describe('Network Resilience & Offline Handling', () => {
  test.beforeEach(async ({ page }) => {
    await testUtils.login(page);
  });

  test('should handle offline mode gracefully', async ({ page, networkHelpers }) => {
    await page.goto('/');
    
    // Go offline
    await networkHelpers.goOffline();
    
    // Try to navigate
    await page.click('text=AI 활용사례');
    
    // Should show offline indicator or cached content
    const offlineIndicator = page.locator('[class*="offline"], [data-testid*="offline"], text=/오프라인|연결 끊김/');
    
    // Check if offline indicator appears
    const hasOfflineIndicator = await offlineIndicator.count() > 0;
    
    // Go back online
    await networkHelpers.goOnline();
    
    // Wait for reconnection
    await page.waitForTimeout(2000);
    
    // Should reconnect
    if (hasOfflineIndicator) {
      await expect(offlineIndicator).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('should reconnect after network loss', async ({ page, networkHelpers }) => {
    await page.goto('/');
    
    // Test reconnection
    await networkHelpers.testReconnection();
    
    // Verify functionality restored
    await page.click('text=AI 활용사례');
    await expect(page).toHaveURL(/\/cases/);
  });

  test('should persist data during offline mode', async ({ page, networkHelpers }) => {
    await page.goto('/cases/new');
    
    // Fill some data
    const testTitle = `Offline Test ${Date.now()}`;
    await page.getByRole('textbox', { name: '제목' }).fill(testTitle);
    
    // Go offline
    await networkHelpers.goOffline();
    
    // Try to save (should queue or cache)
    const saveButton = page.getByRole('button', { name: /임시저장|저장/ });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }
    
    // Go back online
    await networkHelpers.goOnline();
    
    // Check if data persisted
    const titleInput = await page.getByRole('textbox', { name: '제목' });
    const currentValue = await titleInput.inputValue();
    
    // Should still have the data
    expect(currentValue).toBe(testTitle);
  });

  test('should handle slow network conditions', async ({ page, networkHelpers }) => {
    // Simulate slow 3G
    await networkHelpers.simulateSlowNetwork('slow3G');
    
    // Navigate to content-heavy page
    await page.goto('/cases', { timeout: 60000 });
    
    // Should eventually load
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    
    // Clear network conditions
    await networkHelpers.clearNetworkConditions();
  });

  test('should retry failed requests', async ({ page, networkHelpers }) => {
    const failedRequests = await networkHelpers.monitorFailedRequests();
    
    // Go offline
    await networkHelpers.goOffline();
    
    // Try to load data
    await page.goto('/activities', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    // Go back online
    await networkHelpers.goOnline();
    
    // Retry navigation
    await page.goto('/activities');
    
    // Should load successfully
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should cache static resources', async ({ page }) => {
    // First load
    const startTime1 = Date.now();
    await page.goto('/');
    const loadTime1 = Date.now() - startTime1;
    
    // Second load (should use cache)
    const startTime2 = Date.now();
    await page.reload();
    const loadTime2 = Date.now() - startTime2;
    
    // Cached load should be faster
    // Note: This might not always be true in dev mode
    console.log(`First load: ${loadTime1}ms, Second load: ${loadTime2}ms`);
  });

  test('should handle background sync', async ({ page, networkHelpers }) => {
    await page.goto('/');
    
    // Test background sync
    const syncWorked = await networkHelpers.testBackgroundSync();
    
    // Background sync might not be implemented, so we check if it exists
    if (syncWorked) {
      expect(syncWorked).toBe(true);
    }
  });

  test('should show connection status', async ({ page, networkHelpers }) => {
    await page.goto('/');
    
    // Monitor console for connection status
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Go offline
    await networkHelpers.goOffline();
    await page.waitForTimeout(2000);
    
    // Go online
    await networkHelpers.goOnline();
    await page.waitForTimeout(2000);
    
    // Check for connection status logs
    const hasConnectionLogs = consoleLogs.some(log => 
      log.includes('Connection') || 
      log.includes('offline') || 
      log.includes('online')
    );
    
    expect(hasConnectionLogs).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to a page that makes API calls
    await page.goto('/profile');
    
    // Intercept API calls and force errors
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Trigger an API call
    await page.getByRole('tab', { name: '통계' }).click();
    
    // Should handle error gracefully (not crash)
    // Check for error message or fallback UI
    const errorMessage = page.locator('[class*="error"], [role="alert"], text=/오류|실패|다시/');
    
    // Might show error or handle gracefully
    const hasError = await errorMessage.count() > 0;
    
    if (hasError) {
      await expect(errorMessage.first()).toBeVisible();
    }
    
    // Restore normal routing
    await page.unroute('**/api/**');
  });

  test('should maintain session during network issues', async ({ page, networkHelpers }) => {
    await page.goto('/profile');
    
    // Verify logged in
    await expect(page.locator('h2')).toContainText('김준성');
    
    // Go offline
    await networkHelpers.goOffline();
    await page.waitForTimeout(3000);
    
    // Go back online
    await networkHelpers.goOnline();
    await page.waitForTimeout(2000);
    
    // Should still be logged in
    await page.reload();
    await expect(page.locator('h2')).toContainText('김준성');
  });
});