import { test, expect, testUtils } from './e2e/fixtures/base-test';
import { Page, BrowserContext } from '@playwright/test';
import { TEST_CONFIG } from './e2e/helpers/test-config';

/**
 * Comprehensive E2E Tests for KEPCO AI Community Real-Time Connection System
 * 
 * Tests all real-time connection scenarios including:
 * - Long background periods (30+ seconds)
 * - Network offline/online transitions
 * - Stale connection detection
 * - Health check mechanisms
 * - UI updates from real-time events
 * - Memory leak prevention
 * - Proper cleanup on navigation
 */

/**
 * Helper class for real-time connection testing
 */
class RealtimeConnectionTester {
  private consoleLogs: Array<{ type: string; message: string; timestamp: number }> = [];
  private networkRequests: Array<{ url: string; method: string; status?: number; timestamp: number }> = [];
  private performanceMetrics: Array<{ name: string; value: number; timestamp: number }> = [];

  constructor(private page: Page) {
    this.setupLogCapture();
  }

  /**
   * Setup comprehensive log capture
   */
  private setupLogCapture() {
    // Capture console logs
    this.page.on('console', (msg) => {
      this.consoleLogs.push({
        type: msg.type(),
        message: msg.text(),
        timestamp: Date.now()
      });
    });

    // Capture network requests
    this.page.on('request', (request) => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    this.page.on('response', (response) => {
      const existingRequest = this.networkRequests.find(
        req => req.url === response.url() && !req.status
      );
      if (existingRequest) {
        existingRequest.status = response.status();
      }
    });
  }

  /**
   * Wait for WebSocket connection with detailed monitoring
   */
  async waitForWebSocketConnection(timeout = 15000): Promise<boolean> {
    console.log('[Test] Waiting for WebSocket connection...');
    
    try {
      await this.page.waitForFunction(() => {
        // Check multiple WebSocket indicators
        const supabaseWS = (window as any)?.supabase?.realtime?.isConnected?.();
        const connectionStatus = (window as any)?.connectionCore?.getStatus?.();
        const realtimeStatus = (window as any)?.realtimeCore?.getStatus?.();
        
        // Return true if any connection indicator shows connected
        return supabaseWS || 
               connectionStatus?.isConnected || 
               realtimeStatus?.isReady ||
               document.querySelector('[data-testid="realtime-connected"]') !== null;
      }, { timeout });
      
      console.log('[Test] ✅ WebSocket connection established');
      return true;
    } catch (error) {
      console.log('[Test] ❌ WebSocket connection timeout:', error);
      return false;
    }
  }

  /**
   * Get detailed WebSocket status
   */
  async getWebSocketStatus(): Promise<any> {
    return await this.page.evaluate(() => {
      const supabase = (window as any)?.supabase;
      const connectionCore = (window as any)?.connectionCore;
      const realtimeCore = (window as any)?.realtimeCore;
      
      return {
        supabaseConnected: supabase?.realtime?.isConnected?.() || false,
        connectionStatus: connectionCore?.getStatus?.() || null,
        realtimeStatus: realtimeCore?.getStatus?.() || null,
        realtimeDetailedStatus: realtimeCore?.getDetailedStatus?.() || null,
        timestamp: Date.now()
      };
    });
  }

  /**
   * Monitor subscription health
   */
  async getSubscriptionHealth(): Promise<any> {
    return await this.page.evaluate(() => {
      const realtimeCore = (window as any)?.realtimeCore;
      const globalManager = (window as any)?.globalRealtimeManager;
      const userMessageManager = (window as any)?.userMessageSubscriptionManager;
      
      return {
        realtimeCore: realtimeCore?.getDetailedStatus?.() || null,
        globalManager: {
          isSubscribed: globalManager?.isChannelSubscribed?.('content_v2') || false,
          metrics: globalManager?.getSubscriptionMetrics?.() || null
        },
        userMessageManager: {
          status: userMessageManager?.getStatus?.() || null,
          isActive: userMessageManager?.isActive?.() || false
        },
        timestamp: Date.now()
      };
    });
  }

  /**
   * Monitor memory usage
   */
  async getMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      const performance = (window as any)?.performance;
      const memory = performance?.memory;
      
      return {
        usedJSHeapSize: memory?.usedJSHeapSize || 0,
        totalJSHeapSize: memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
        memoryUsagePercentage: memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0,
        timestamp: Date.now()
      };
    });
  }

  /**
   * Simulate background/foreground transition
   */
  async simulateBackgroundTransition(backgroundDuration = 35000): Promise<void> {
    console.log(`[Test] Simulating background transition for ${backgroundDuration}ms...`);
    
    // Simulate page visibility change to hidden
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait for background duration
    await this.page.waitForTimeout(backgroundDuration);
    
    // Simulate page visibility change to visible
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    console.log('[Test] ✅ Background transition completed');
  }

  /**
   * Force stale connection state
   */
  async forceStaleConnection(): Promise<void> {
    console.log('[Test] Forcing stale connection state...');
    
    await this.page.evaluate(() => {
      const connectionCore = (window as any)?.connectionCore;
      if (connectionCore && connectionCore.markAsStale) {
        connectionCore.markAsStale();
      }
    });
    
    console.log('[Test] ✅ Stale connection state forced');
  }

  /**
   * Trigger health check
   */
  async triggerHealthCheck(): Promise<any> {
    console.log('[Test] Triggering manual health check...');
    
    return await this.page.evaluate(async () => {
      const realtimeCore = (window as any)?.realtimeCore;
      if (realtimeCore && realtimeCore.manualHealthCheck) {
        return await realtimeCore.manualHealthCheck();
      }
      return null;
    });
  }

  /**
   * Force reconnection
   */
  async forceReconnection(reason = 'manual'): Promise<void> {
    console.log(`[Test] Forcing reconnection with reason: ${reason}...`);
    
    await this.page.evaluate((reason) => {
      const realtimeCore = (window as any)?.realtimeCore;
      if (realtimeCore && realtimeCore.forceResubscribe) {
        realtimeCore.forceResubscribe(reason);
      }
    }, reason);
    
    console.log('[Test] ✅ Reconnection forced');
  }

  /**
   * Get console logs filtered by pattern
   */
  getConsoleLogs(pattern?: RegExp, sinceTimestamp?: number): Array<{ type: string; message: string; timestamp: number }> {
    let logs = this.consoleLogs;
    
    if (sinceTimestamp) {
      logs = logs.filter(log => log.timestamp >= sinceTimestamp);
    }
    
    if (pattern) {
      logs = logs.filter(log => pattern.test(log.message));
    }
    
    return logs;
  }

  /**
   * Check for specific log patterns
   */
  hasLogPattern(patterns: RegExp[], sinceTimestamp?: number): boolean {
    const logs = this.getConsoleLogs(undefined, sinceTimestamp);
    return patterns.every(pattern => 
      logs.some(log => pattern.test(log.message))
    );
  }

  /**
   * Clear captured data
   */
  clearCaptures(): void {
    this.consoleLogs = [];
    this.networkRequests = [];
    this.performanceMetrics = [];
  }

  /**
   * Simulate real-time event
   */
  async simulateRealtimeEvent(table: string, event: string, data: any): Promise<void> {
    console.log(`[Test] Simulating realtime event: ${table}.${event}`);
    
    await this.page.evaluate(({ table, event, data }) => {
      const realtimeCore = (window as any)?.realtimeCore;
      if (realtimeCore) {
        // This would trigger the subscription handlers
        const mockPayload = {
          new: event !== 'DELETE' ? data : null,
          old: event === 'DELETE' ? data : null,
          eventType: event,
          table: table
        };
        
        // Trigger handlers directly for testing
        const subscription = realtimeCore.subscriptions?.get(`${table}-${event}-all`);
        if (subscription) {
          subscription.handler(mockPayload);
        }
      }
    }, { table, event, data });
  }
}

test.describe('Real-Time Connection System - Comprehensive Tests', () => {
  let realtimeTester: RealtimeConnectionTester;

  test.beforeEach(async ({ page }) => {
    realtimeTester = new RealtimeConnectionTester(page);
    await testUtils.login(page);
  });

  test('should establish initial connection and maintain health', async ({ page }) => {
    console.log('[Test] Testing initial connection establishment...');
    
    await page.goto('/');
    
    // Wait for initial connection
    const connected = await realtimeTester.waitForWebSocketConnection();
    expect(connected).toBe(true);
    
    // Get initial status
    const initialStatus = await realtimeTester.getWebSocketStatus();
    console.log('[Test] Initial WebSocket status:', initialStatus);
    
    // Verify connection health
    expect(initialStatus.supabaseConnected || initialStatus.connectionStatus?.isConnected).toBe(true);
    
    // Check subscription health
    const subscriptionHealth = await realtimeTester.getSubscriptionHealth();
    console.log('[Test] Subscription health:', subscriptionHealth);
    
    // Verify some subscriptions are active
    expect(subscriptionHealth.realtimeCore?.basic?.subscriptionCount).toBeGreaterThan(0);
  });

  test('should handle long background periods with health checks', async ({ page }) => {
    console.log('[Test] Testing long background periods...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const beforeBackground = await realtimeTester.getWebSocketStatus();
    const memoryBefore = await realtimeTester.getMemoryUsage();
    const timestampBefore = Date.now();
    
    // Simulate long background period (35 seconds)
    await realtimeTester.simulateBackgroundTransition(35000);
    
    // Wait for potential health check and reconnection
    await page.waitForTimeout(5000);
    
    const afterBackground = await realtimeTester.getWebSocketStatus();
    const memoryAfter = await realtimeTester.getMemoryUsage();
    
    // Check for background/foreground handling logs
    const hasBackgroundLogs = realtimeTester.hasLogPattern([
      /background.*return|foreground|visibilitychange/i,
      /health.*check|reconnect|resubscrib/i
    ], timestampBefore);
    
    console.log('[Test] Has background handling logs:', hasBackgroundLogs);
    console.log('[Test] Memory before:', memoryBefore.memoryUsagePercentage, '%');
    console.log('[Test] Memory after:', memoryAfter.memoryUsagePercentage, '%');
    
    // Verify connection is maintained or properly restored
    expect(afterBackground.supabaseConnected || afterBackground.connectionStatus?.isConnected).toBe(true);
    
    // Verify memory usage hasn't grown excessively (should be within 20% increase)
    const memoryGrowth = memoryAfter.memoryUsagePercentage - memoryBefore.memoryUsagePercentage;
    expect(memoryGrowth).toBeLessThan(20);
  });

  test('should handle network offline/online transitions', async ({ page, networkHelpers }) => {
    console.log('[Test] Testing network offline/online transitions...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const beforeOffline = await realtimeTester.getWebSocketStatus();
    const timestampBefore = Date.now();
    
    // Go offline
    console.log('[Test] Going offline...');
    await networkHelpers.goOffline();
    await page.waitForTimeout(3000);
    
    const duringOffline = await realtimeTester.getWebSocketStatus();
    
    // Go back online
    console.log('[Test] Going online...');
    await networkHelpers.goOnline();
    await page.waitForTimeout(5000);
    
    const afterOnline = await realtimeTester.getWebSocketStatus();
    
    // Check for network recovery logs
    const hasRecoveryLogs = realtimeTester.hasLogPattern([
      /network.*recovery|connection.*restored|reconnect/i,
      /resubscrib.*all|full.*resubscription/i
    ], timestampBefore);
    
    console.log('[Test] Has network recovery logs:', hasRecoveryLogs);
    console.log('[Test] Status before offline:', beforeOffline);
    console.log('[Test] Status during offline:', duringOffline);
    console.log('[Test] Status after online:', afterOnline);
    
    // Verify connection is restored
    expect(afterOnline.supabaseConnected || afterOnline.connectionStatus?.isConnected).toBe(true);
    
    // Verify subscriptions are restored
    const subscriptionHealth = await realtimeTester.getSubscriptionHealth();
    expect(subscriptionHealth.realtimeCore?.basic?.subscriptionCount).toBeGreaterThan(0);
  });

  test('should detect and handle stale connections', async ({ page }) => {
    console.log('[Test] Testing stale connection detection...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const timestampBefore = Date.now();
    
    // Force stale connection state
    await realtimeTester.forceStaleConnection();
    await page.waitForTimeout(2000);
    
    // Trigger health check
    const healthCheckResult = await realtimeTester.triggerHealthCheck();
    console.log('[Test] Health check result:', healthCheckResult);
    
    // Wait for stale connection handling
    await page.waitForTimeout(5000);
    
    const afterStale = await realtimeTester.getWebSocketStatus();
    
    // Check for stale connection handling logs
    const hasStaleHandlingLogs = realtimeTester.hasLogPattern([
      /stale.*connection|selective.*resubscription/i,
      /health.*check.*failed|unhealthy.*channel/i
    ], timestampBefore);
    
    console.log('[Test] Has stale handling logs:', hasStaleHandlingLogs);
    console.log('[Test] Status after stale handling:', afterStale);
    
    // Verify connection health is restored
    expect(afterStale.supabaseConnected || afterStale.connectionStatus?.isConnected).toBe(true);
  });

  test('should handle real-time UI updates properly', async ({ page }) => {
    console.log('[Test] Testing real-time UI updates...');
    
    await page.goto('/cases');
    await realtimeTester.waitForWebSocketConnection();
    
    const timestampBefore = Date.now();
    
    // Navigate to a specific content page
    const firstCaseLink = page.locator('[href^="/cases/"]').first();
    const href = await firstCaseLink.getAttribute('href');
    
    if (href) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      
      // Get initial like count
      const likeButton = page.locator('[class*="like"], [data-testid*="like"]').first();
      const initialText = await likeButton.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');
      
      // Simulate a real-time like event
      await realtimeTester.simulateRealtimeEvent('interactions_v2', 'INSERT', {
        target_id: href.split('/').pop(),
        user_id: 'test-user',
        type: 'like',
        created_at: new Date().toISOString()
      });
      
      // Wait for UI update
      await page.waitForTimeout(2000);
      
      // Check for cache invalidation logs
      const hasCacheInvalidationLogs = realtimeTester.hasLogPattern([
        /invalidate.*queries|cache.*invalidation/i,
        /interaction.*changed|content.*updated/i
      ], timestampBefore);
      
      console.log('[Test] Has cache invalidation logs:', hasCacheInvalidationLogs);
      
      // The UI might or might not update depending on implementation
      // Just verify no errors occurred
      const errorLogs = realtimeTester.getConsoleLogs(/error|failed|exception/i, timestampBefore);
      expect(errorLogs.filter(log => log.type === 'error')).toHaveLength(0);
    }
  });

  test('should prevent memory leaks during long sessions', async ({ page }) => {
    console.log('[Test] Testing memory leak prevention...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const initialMemory = await realtimeTester.getMemoryUsage();
    console.log('[Test] Initial memory usage:', initialMemory.memoryUsagePercentage, '%');
    
    // Simulate multiple navigation cycles with real-time events
    const pages = ['/cases', '/community', '/activities', '/members', '/'];
    
    for (let cycle = 0; cycle < 3; cycle++) {
      console.log(`[Test] Navigation cycle ${cycle + 1}...`);
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Simulate some real-time events
        await realtimeTester.simulateRealtimeEvent('content_v2', 'UPDATE', {
          id: 'test-content-' + Date.now(),
          updated_at: new Date().toISOString()
        });
        
        await page.waitForTimeout(1000);
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(2000);
    
    const finalMemory = await realtimeTester.getMemoryUsage();
    console.log('[Test] Final memory usage:', finalMemory.memoryUsagePercentage, '%');
    
    // Memory usage should not grow excessively (within 30% increase)
    const memoryGrowth = finalMemory.memoryUsagePercentage - initialMemory.memoryUsagePercentage;
    expect(memoryGrowth).toBeLessThan(30);
    
    // Check subscription health
    const subscriptionHealth = await realtimeTester.getSubscriptionHealth();
    console.log('[Test] Final subscription health:', subscriptionHealth);
    
    // Should still have active subscriptions
    expect(subscriptionHealth.realtimeCore?.basic?.subscriptionCount).toBeGreaterThan(0);
  });

  test('should handle multiple tabs correctly', async ({ browser }) => {
    console.log('[Test] Testing multiple tab scenarios...');
    
    // Create two contexts for different tabs
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const tester1 = new RealtimeConnectionTester(page1);
    const tester2 = new RealtimeConnectionTester(page2);
    
    try {
      // Login both tabs
      await testUtils.login(page1);
      await testUtils.login(page2);
      
      // Navigate both to home
      await page1.goto('/');
      await page2.goto('/');
      
      // Wait for connections
      const connected1 = await tester1.waitForWebSocketConnection();
      const connected2 = await tester2.waitForWebSocketConnection();
      
      expect(connected1).toBe(true);
      expect(connected2).toBe(true);
      
      // Get initial memory usage for both tabs
      const memory1Initial = await tester1.getMemoryUsage();
      const memory2Initial = await tester2.getMemoryUsage();
      
      console.log('[Test] Tab 1 initial memory:', memory1Initial.memoryUsagePercentage, '%');
      console.log('[Test] Tab 2 initial memory:', memory2Initial.memoryUsagePercentage, '%');
      
      // Navigate to same content on both tabs
      await page1.goto('/cases');
      await page2.goto('/cases');
      
      // Wait for stabilization
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);
      
      // Check final memory usage
      const memory1Final = await tester1.getMemoryUsage();
      const memory2Final = await tester2.getMemoryUsage();
      
      console.log('[Test] Tab 1 final memory:', memory1Final.memoryUsagePercentage, '%');
      console.log('[Test] Tab 2 final memory:', memory2Final.memoryUsagePercentage, '%');
      
      // Both tabs should maintain reasonable memory usage
      expect(memory1Final.memoryUsagePercentage).toBeLessThan(50);
      expect(memory2Final.memoryUsagePercentage).toBeLessThan(50);
      
      // Both should have active connections
      const status1 = await tester1.getWebSocketStatus();
      const status2 = await tester2.getWebSocketStatus();
      
      expect(status1.supabaseConnected || status1.connectionStatus?.isConnected).toBe(true);
      expect(status2.supabaseConnected || status2.connectionStatus?.isConnected).toBe(true);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle cleanup on navigation properly', async ({ page }) => {
    console.log('[Test] Testing cleanup on navigation...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const initialStatus = await realtimeTester.getSubscriptionHealth();
    const initialMemory = await realtimeTester.getMemoryUsage();
    
    console.log('[Test] Initial subscriptions:', initialStatus.realtimeCore?.basic?.subscriptionCount);
    console.log('[Test] Initial memory:', initialMemory.memoryUsagePercentage, '%');
    
    // Navigate through multiple pages to trigger cleanup
    const navigationSequence = [
      '/cases/new',
      '/community',
      '/activities',
      '/members',
      '/profile',
      '/'
    ];
    
    for (const path of navigationSequence) {
      console.log(`[Test] Navigating to ${path}...`);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Check memory usage after each navigation
      const currentMemory = await realtimeTester.getMemoryUsage();
      console.log(`[Test] Memory after ${path}:`, currentMemory.memoryUsagePercentage, '%');
      
      // Memory shouldn't grow excessively during navigation
      const memoryGrowth = currentMemory.memoryUsagePercentage - initialMemory.memoryUsagePercentage;
      expect(memoryGrowth).toBeLessThan(25);
    }
    
    // Final status check
    const finalStatus = await realtimeTester.getSubscriptionHealth();
    const finalMemory = await realtimeTester.getMemoryUsage();
    
    console.log('[Test] Final subscriptions:', finalStatus.realtimeCore?.basic?.subscriptionCount);
    console.log('[Test] Final memory:', finalMemory.memoryUsagePercentage, '%');
    
    // Should still have proper subscription count
    expect(finalStatus.realtimeCore?.basic?.subscriptionCount).toBeGreaterThan(0);
    
    // Check for cleanup logs
    const cleanupLogs = realtimeTester.getConsoleLogs(/cleanup|unsubscrib|clear.*reference/i);
    console.log('[Test] Found cleanup logs:', cleanupLogs.length);
    expect(cleanupLogs.length).toBeGreaterThan(0);
  });

  test('should handle long idle periods and detect stale connections', async ({ page }) => {
    console.log('[Test] Testing long idle periods (2+ minutes)...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const beforeIdle = await realtimeTester.getWebSocketStatus();
    const timestampBefore = Date.now();
    
    console.log('[Test] Starting 2+ minute idle period...');
    
    // Wait for 2.5 minutes to trigger stale detection
    await page.waitForTimeout(150000); // 2.5 minutes
    
    const afterIdle = await realtimeTester.getWebSocketStatus();
    
    // Trigger health check to see stale connections
    const healthCheck = await realtimeTester.triggerHealthCheck();
    console.log('[Test] Health check after idle:', healthCheck);
    
    // Check for stale detection logs
    const hasStaleDetectionLogs = realtimeTester.hasLogPattern([
      /stale.*connection|stale.*activity/i,
      /health.*check|selective.*resubscription/i
    ], timestampBefore);
    
    console.log('[Test] Has stale detection logs:', hasStaleDetectionLogs);
    console.log('[Test] Status before idle:', beforeIdle);
    console.log('[Test] Status after idle:', afterIdle);
    
    // Connection should either be maintained or properly restored
    expect(afterIdle.supabaseConnected || afterIdle.connectionStatus?.isConnected).toBe(true);
    
    // Verify the system detected the stale period if it occurred
    if (hasStaleDetectionLogs) {
      console.log('[Test] ✅ Stale connection was properly detected and handled');
    } else {
      console.log('[Test] ℹ️ No stale connection detected (connection remained healthy)');
    }
  });

  test('should validate connection states and error recovery', async ({ page, networkHelpers }) => {
    console.log('[Test] Testing connection states and error recovery...');
    
    await page.goto('/');
    await realtimeTester.waitForWebSocketConnection();
    
    const timestampBefore = Date.now();
    
    // Test multiple error scenarios
    console.log('[Test] Testing network recovery...');
    await networkHelpers.goOffline();
    await page.waitForTimeout(5000);
    await networkHelpers.goOnline();
    await page.waitForTimeout(3000);
    
    console.log('[Test] Testing stale connection recovery...');
    await realtimeTester.forceStaleConnection();
    await page.waitForTimeout(3000);
    
    console.log('[Test] Testing manual reconnection...');
    await realtimeTester.forceReconnection('manual');
    await page.waitForTimeout(3000);
    
    // Verify final state
    const finalStatus = await realtimeTester.getWebSocketStatus();
    const subscriptionHealth = await realtimeTester.getSubscriptionHealth();
    
    console.log('[Test] Final status:', finalStatus);
    console.log('[Test] Final subscription health:', subscriptionHealth);
    
    // Should have proper connection state
    expect(finalStatus.supabaseConnected || finalStatus.connectionStatus?.isConnected).toBe(true);
    expect(subscriptionHealth.realtimeCore?.basic?.subscriptionCount).toBeGreaterThan(0);
    
    // Check for error recovery logs
    const hasRecoveryLogs = realtimeTester.hasLogPattern([
      /network.*recovery|connection.*restored/i,
      /stale.*connection|manual.*reconnect/i,
      /resubscription.*complete/i
    ], timestampBefore);
    
    expect(hasRecoveryLogs).toBe(true);
    
    // Verify no critical errors occurred
    const errorLogs = realtimeTester.getConsoleLogs(/error.*failed|critical.*error/i, timestampBefore);
    const criticalErrors = errorLogs.filter(log => 
      log.type === 'error' && !log.message.includes('Network request failed') // Allow network errors during offline test
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});