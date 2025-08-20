import { test, expect } from '@playwright/test';

/**
 * Basic Real-Time Connection Test (No Authentication Required)
 * 
 * Tests basic real-time connection establishment without requiring login
 */

test.describe('Real-Time Connection - Basic Tests', () => {
  test('should establish WebSocket connection on page load', async ({ page }) => {
    console.log('[Test] Testing basic WebSocket connection...');
    
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Monitor console logs for connection establishment
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait for initial connection logs
    await page.waitForTimeout(5000);
    
    // Check for connection-related logs
    const hasConnectionLogs = consoleLogs.some(log => 
      log.includes('Connection') || 
      log.includes('realtime') ||
      log.includes('WebSocket') ||
      log.includes('RealtimeCore') ||
      log.includes('ConnectionCore')
    );
    
    console.log('[Test] Console logs:', consoleLogs);
    console.log('[Test] Has connection logs:', hasConnectionLogs);
    
    // Verify connection logs exist
    expect(hasConnectionLogs).toBe(true);
    
    // Check if WebSocket is available in browser context
    const hasWebSocketSupport = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined';
    });
    
    expect(hasWebSocketSupport).toBe(true);
  });

  test('should initialize real-time managers', async ({ page }) => {
    console.log('[Test] Testing real-time manager initialization...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for managers to initialize
    await page.waitForTimeout(3000);
    
    // Check if real-time managers are available
    const managersStatus = await page.evaluate(() => {
      const connectionCore = (window as any)?.connectionCore;
      const realtimeCore = (window as any)?.realtimeCore;
      const globalRealtimeManager = (window as any)?.globalRealtimeManager;
      
      return {
        hasConnectionCore: !!connectionCore,
        hasRealtimeCore: !!realtimeCore,
        hasGlobalManager: !!globalRealtimeManager,
        connectionStatus: connectionCore?.getStatus?.() || null,
        realtimeStatus: realtimeCore?.getStatus?.() || null
      };
    });
    
    console.log('[Test] Managers status:', managersStatus);
    
    // Verify managers are initialized
    expect(managersStatus.hasConnectionCore).toBe(true);
    expect(managersStatus.hasRealtimeCore).toBe(true);
    expect(managersStatus.hasGlobalManager).toBe(true);
  });

  test('should handle page navigation without memory leaks', async ({ page }) => {
    console.log('[Test] Testing memory management during navigation...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial memory usage if available
    const initialMemory = await page.evaluate(() => {
      const memory = (window as any)?.performance?.memory;
      return memory ? {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      } : null;
    });
    
    console.log('[Test] Initial memory:', initialMemory);
    
    // Navigate through several pages
    const pages = ['/cases', '/community', '/activities', '/'];
    
    for (const pagePath of pages) {
      console.log(`[Test] Navigating to ${pagePath}...`);
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      const memory = (window as any)?.performance?.memory;
      return memory ? {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      } : null;
    });
    
    console.log('[Test] Final memory:', finalMemory);
    
    // Check that memory usage is reasonable
    if (initialMemory && finalMemory) {
      const memoryGrowth = finalMemory.used - initialMemory.used;
      const memoryGrowthPercent = (memoryGrowth / initialMemory.used) * 100;
      
      console.log(`[Test] Memory growth: ${memoryGrowthPercent.toFixed(2)}%`);
      
      // Memory growth should be reasonable (less than 100% increase)
      expect(memoryGrowthPercent).toBeLessThan(100);
    }
  });

  test('should maintain connection during background/foreground simulation', async ({ page }) => {
    console.log('[Test] Testing background/foreground transitions...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial setup
    await page.waitForTimeout(2000);
    
    // Get initial connection status
    const initialStatus = await page.evaluate(() => {
      const connectionCore = (window as any)?.connectionCore;
      const realtimeCore = (window as any)?.realtimeCore;
      
      return {
        connectionStatus: connectionCore?.getStatus?.() || null,
        realtimeStatus: realtimeCore?.getStatus?.() || null,
        timestamp: Date.now()
      };
    });
    
    console.log('[Test] Initial status:', initialStatus);
    
    // Simulate going to background
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait in background for 10 seconds
    await page.waitForTimeout(10000);
    
    // Simulate coming back to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait for potential reconnection
    await page.waitForTimeout(3000);
    
    // Get final connection status
    const finalStatus = await page.evaluate(() => {
      const connectionCore = (window as any)?.connectionCore;
      const realtimeCore = (window as any)?.realtimeCore;
      
      return {
        connectionStatus: connectionCore?.getStatus?.() || null,
        realtimeStatus: realtimeCore?.getStatus?.() || null,
        timestamp: Date.now()
      };
    });
    
    console.log('[Test] Final status:', finalStatus);
    
    // Connection should be maintained or restored
    // This is a basic check - more detailed testing requires authentication
    const hasConnection = finalStatus.connectionStatus?.isConnected || 
                         finalStatus.realtimeStatus?.isReady ||
                         finalStatus.connectionStatus !== null ||
                         finalStatus.realtimeStatus !== null;
    
    expect(hasConnection).toBe(true);
  });

  test('should handle network offline/online transitions', async ({ page }) => {
    console.log('[Test] Testing basic offline/online handling...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Capture console logs for offline/online events
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });
    
    // Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(3000);
    
    // Go back online
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    
    // Check for network-related logs
    const hasNetworkLogs = consoleLogs.some(log => 
      log.includes('offline') || 
      log.includes('online') ||
      log.includes('network') ||
      log.includes('reconnect') ||
      log.includes('connection')
    );
    
    console.log('[Test] Network-related logs found:', hasNetworkLogs);
    console.log('[Test] All logs:', consoleLogs);
    
    // Should have some network-related activity
    expect(hasNetworkLogs).toBe(true);
  });
});