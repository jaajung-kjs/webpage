import { Page, BrowserContext } from '@playwright/test';

/**
 * Helper functions for testing network conditions and offline behavior
 */

export class NetworkHelpers {
  constructor(private page: Page) {}

  /**
   * Simulate network offline
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Restore network connection
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }

  /**
   * Simulate slow network conditions
   */
  async simulateSlowNetwork(type: 'slow3G' | 'fast3G' = 'slow3G') {
    const conditions = {
      slow3G: {
        offline: false,
        downloadThroughput: 50 * 1024 / 8,
        uploadThroughput: 50 * 1024 / 8,
        latency: 400,
      },
      fast3G: {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 150,
      },
    };

    // Note: Playwright doesn't have built-in network throttling for all browsers
    // This is primarily supported in Chromium
    if (this.page.context().browser()?.browserType().name() === 'chromium') {
      const client = await this.page.context().newCDPSession(this.page);
      await client.send('Network.emulateNetworkConditions', conditions[type]);
    }
  }

  /**
   * Clear network conditions
   */
  async clearNetworkConditions() {
    await this.page.context().setOffline(false);
    
    if (this.page.context().browser()?.browserType().name() === 'chromium') {
      const client = await this.page.context().newCDPSession(this.page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
    }
  }

  /**
   * Test offline data persistence
   */
  async testOfflineDataPersistence() {
    // Fill out a form
    await this.page.fill('[data-testid="title-input"]', 'Offline Test Title');
    await this.page.fill('[data-testid="content-input"]', 'Offline Test Content');
    
    // Go offline
    await this.goOffline();
    
    // Try to submit (should be queued or saved locally)
    await this.page.click('[data-testid="submit-button"]');
    
    // Check for offline indicator
    const offlineIndicator = await this.page.locator('[data-testid="offline-indicator"]');
    if (await offlineIndicator.count() > 0) {
      await offlineIndicator.waitFor({ state: 'visible' });
    }
    
    // Go back online
    await this.goOnline();
    
    // Wait for sync to complete
    await this.page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
    
    // Verify data was saved
    await this.page.reload();
    const savedTitle = await this.page.locator('[data-testid="saved-title"]').textContent();
    return savedTitle === 'Offline Test Title';
  }

  /**
   * Test reconnection behavior
   */
  async testReconnection() {
    // Go offline
    await this.goOffline();
    
    // Wait a moment
    await this.page.waitForTimeout(2000);
    
    // Go back online
    await this.goOnline();
    
    // Check for reconnection indicator
    await this.page.waitForSelector('[data-testid="connection-restored"]', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    // Verify realtime connection is restored
    await this.page.waitForFunction(
      () => {
        return (window as any)['supabase']?.realtime?.isConnected?.() || 
               document.querySelector('[data-testid="realtime-connected"]') !== null;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Test background sync
   */
  async testBackgroundSync() {
    // Create some data while online
    await this.page.fill('[data-testid="input"]', 'Background sync test');
    
    // Go offline
    await this.goOffline();
    
    // Make changes
    await this.page.fill('[data-testid="input"]', 'Updated while offline');
    await this.page.click('[data-testid="save-button"]');
    
    // Check for pending sync indicator
    const pendingSync = await this.page.locator('[data-testid="pending-sync"]');
    if (await pendingSync.count() > 0) {
      await pendingSync.waitFor({ state: 'visible' });
    }
    
    // Go back online
    await this.goOnline();
    
    // Wait for background sync to complete
    await this.page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
    
    // Verify data was synced
    await this.page.reload();
    const syncedData = await this.page.locator('[data-testid="synced-data"]').textContent();
    return syncedData === 'Updated while offline';
  }

  /**
   * Monitor failed requests
   */
  async monitorFailedRequests() {
    const failedRequests: string[] = [];
    
    this.page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || 'Unknown error',
      } as any);
    });
    
    return {
      getFailedRequests: () => failedRequests,
      hasFailures: () => failedRequests.length > 0,
      clear: () => failedRequests.length = 0,
    };
  }

  /**
   * Test request retry logic
   */
  async testRequestRetry() {
    const failedRequestMonitor = await this.monitorFailedRequests();
    
    // Go offline
    await this.goOffline();
    
    // Attempt an action that requires network
    await this.page.click('[data-testid="network-action"]');
    
    // Wait a moment for retry attempts
    await this.page.waitForTimeout(3000);
    
    // Go back online
    await this.goOnline();
    
    // Wait for successful retry
    await this.page.waitForSelector('[data-testid="action-success"]', { timeout: 10000 });
    
    // Check that there were failed attempts
    const failures = failedRequestMonitor.getFailedRequests();
    return failures.length > 0;
  }

  /**
   * Test cache behavior
   */
  async testCaching() {
    // Load a page to populate cache
    await this.page.goto('/cached-content');
    await this.page.waitForLoadState('networkidle');
    
    // Record initial load time
    const startTime = Date.now();
    
    // Reload page (should use cache)
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Cached load should be faster
    return loadTime < 1000; // Less than 1 second for cached content
  }

  /**
   * Test service worker functionality
   */
  async testServiceWorker() {
    // Check if service worker is registered
    const hasServiceWorker = await this.page.evaluate(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
    });
    
    if (hasServiceWorker) {
      // Test offline page loading with service worker
      await this.goOffline();
      
      // Navigate to a cached page
      await this.page.goto('/offline-page');
      
      // Check if offline page is displayed
      const offlinePage = await this.page.locator('[data-testid="offline-page"]');
      return await offlinePage.count() > 0;
    }
    
    return false;
  }
}