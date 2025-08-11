/**
 * Promise Manager Tests
 * 
 * Comprehensive test suite for PromiseManager functionality
 */

import { PromiseManager, withDatabaseTimeout, withApiTimeout, withRealtimeTimeout } from '../promise-manager';

// Mock timers for testing
jest.useFakeTimers();

describe('PromiseManager', () => {
  beforeEach(() => {
    // Clear all pending promises before each test
    PromiseManager.cancelAll('test_cleanup');
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Clean up after each test
    PromiseManager.cancelAll('test_cleanup');
    jest.clearAllTimers();
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const testValue = 'success';
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(testValue), 100);
      });

      const resultPromise = PromiseManager.withTimeout(promise, { 
        timeout: 1000 
      });

      // Fast-forward time
      jest.advanceTimersByTime(100);

      const result = await resultPromise;
      expect(result).toBe(testValue);
    });

    it('should reject with timeout error when promise takes too long', async () => {
      const slowPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('too_late'), 2000);
      });

      const resultPromise = PromiseManager.withTimeout(slowPromise, { 
        timeout: 1000,
        errorMessage: 'Custom timeout message'
      });

      // Fast-forward past timeout
      jest.advanceTimersByTime(1001);

      await expect(resultPromise).rejects.toThrow('Custom timeout message');
    });

    it('should use default timeout when not specified', async () => {
      const slowPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('too_late'), 6000);
      });

      const resultPromise = PromiseManager.withTimeout(slowPromise);

      // Fast-forward past default timeout (5000ms)
      jest.advanceTimersByTime(5001);

      await expect(resultPromise).rejects.toThrow('Operation timeout after 5000ms');
    });

    it('should cancel previous promise with same key', async () => {
      const promise1 = new Promise<string>((resolve) => {
        setTimeout(() => resolve('first'), 100);
      });

      const promise2 = new Promise<string>((resolve) => {
        setTimeout(() => resolve('second'), 200);
      });

      const result1Promise = PromiseManager.withTimeout(promise1, { 
        key: 'test_key',
        timeout: 1000
      });

      // Start second promise with same key immediately
      const result2Promise = PromiseManager.withTimeout(promise2, { 
        key: 'test_key',
        timeout: 1000
      });

      // Advance timers
      jest.advanceTimersByTime(100);

      // First promise should be cancelled
      await expect(result1Promise).rejects.toThrow();

      jest.advanceTimersByTime(200);

      // Second promise should succeed
      const result = await result2Promise;
      expect(result).toBe('second');
    });

    it('should handle promise rejection properly', async () => {
      const errorMessage = 'Test error';
      const rejectingPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), 100);
      });

      const resultPromise = PromiseManager.withTimeout(rejectingPromise, { 
        timeout: 1000 
      });

      jest.advanceTimersByTime(100);

      await expect(resultPromise).rejects.toThrow(errorMessage);
    });

    it('should clean up after promise completion', async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 100);
      });

      const key = 'cleanup_test';
      expect(PromiseManager.isPending(key)).toBe(false);

      const resultPromise = PromiseManager.withTimeout(promise, { 
        key,
        timeout: 1000 
      });

      // Promise should be pending
      expect(PromiseManager.isPending(key)).toBe(true);

      jest.advanceTimersByTime(100);
      await resultPromise;

      // Promise should be cleaned up
      expect(PromiseManager.isPending(key)).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should cancel specific promise by key', async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('should_not_resolve'), 1000);
      });

      const key = 'cancel_test';
      const resultPromise = PromiseManager.withTimeout(promise, { 
        key,
        timeout: 2000 
      });

      expect(PromiseManager.isPending(key)).toBe(true);

      // Cancel the promise
      const cancelled = PromiseManager.cancel(key);
      expect(cancelled).toBe(true);
      expect(PromiseManager.isPending(key)).toBe(false);

      // Promise should reject
      await expect(resultPromise).rejects.toThrow();
    });

    it('should return false when cancelling non-existent promise', () => {
      const cancelled = PromiseManager.cancel('non_existent_key');
      expect(cancelled).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('should cancel all pending promises', async () => {
      const promise1 = new Promise<string>((resolve) => {
        setTimeout(() => resolve('first'), 1000);
      });

      const promise2 = new Promise<string>((resolve) => {
        setTimeout(() => resolve('second'), 1000);
      });

      const promise3 = new Promise<string>((resolve) => {
        setTimeout(() => resolve('third'), 1000);
      });

      const results = [
        PromiseManager.withTimeout(promise1, { key: 'p1', timeout: 2000 }),
        PromiseManager.withTimeout(promise2, { key: 'p2', timeout: 2000 }),
        PromiseManager.withTimeout(promise3, { key: 'p3', timeout: 2000 })
      ];

      expect(PromiseManager.getPendingCount()).toBe(3);

      // Cancel all
      PromiseManager.cancelAll('test');

      expect(PromiseManager.getPendingCount()).toBe(0);

      // All promises should reject
      await Promise.all(
        results.map(promise => 
          expect(promise).rejects.toThrow()
        )
      );
    });

    it('should handle cancelAll when no promises are pending', () => {
      expect(PromiseManager.getPendingCount()).toBe(0);
      
      // Should not throw
      expect(() => PromiseManager.cancelAll()).not.toThrow();
      
      expect(PromiseManager.getPendingCount()).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should track pending count correctly', async () => {
      expect(PromiseManager.getPendingCount()).toBe(0);

      const promises = Array.from({ length: 5 }, (_, i) => {
        const promise = new Promise<string>((resolve) => {
          setTimeout(() => resolve(`result_${i}`), 100);
        });
        return PromiseManager.withTimeout(promise, { 
          key: `test_${i}`,
          timeout: 1000 
        });
      });

      expect(PromiseManager.getPendingCount()).toBe(5);

      jest.advanceTimersByTime(100);
      await Promise.all(promises);

      expect(PromiseManager.getPendingCount()).toBe(0);
    });

    it('should return correct pending keys', () => {
      const keys = ['key1', 'key2', 'key3'];
      
      keys.forEach(key => {
        const promise = new Promise<string>((resolve) => {
          setTimeout(() => resolve('done'), 1000);
        });
        PromiseManager.withTimeout(promise, { key, timeout: 2000 });
      });

      const pendingKeys = PromiseManager.getPendingKeys();
      expect(pendingKeys).toHaveLength(3);
      keys.forEach(key => {
        expect(pendingKeys).toContain(key);
      });
    });

    it('should correctly identify pending promises', () => {
      const key = 'pending_test';
      expect(PromiseManager.isPending(key)).toBe(false);

      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 1000);
      });
      PromiseManager.withTimeout(promise, { key, timeout: 2000 });

      expect(PromiseManager.isPending(key)).toBe(true);

      PromiseManager.cancel(key);
      expect(PromiseManager.isPending(key)).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should apply correct timeout for database operations', async () => {
      const dbPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('db_result'), 5000);
      });

      const resultPromise = withDatabaseTimeout(dbPromise, 'test_query');

      // Should timeout after 10 seconds (database timeout)
      jest.advanceTimersByTime(10001);

      await expect(resultPromise).rejects.toThrow('Database operation \'test_query\' timed out after 10 seconds');
    });

    it('should apply correct timeout for API operations', async () => {
      const apiPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('api_result'), 5000);
      });

      const resultPromise = withApiTimeout(apiPromise, 'test_endpoint');

      // Should timeout after 8 seconds (API timeout)
      jest.advanceTimersByTime(8001);

      await expect(resultPromise).rejects.toThrow('API call to \'test_endpoint\' timed out after 8 seconds');
    });

    it('should apply correct timeout for realtime operations', async () => {
      const realtimePromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('realtime_result'), 3000);
      });

      const resultPromise = withRealtimeTimeout(realtimePromise, 'test_subscription');

      // Should timeout after 5 seconds (realtime timeout)
      jest.advanceTimersByTime(5001);

      await expect(resultPromise).rejects.toThrow('Realtime operation \'test_subscription\' timed out after 5 seconds');
    });
  });

  describe('background cleanup', () => {
    it('should handle multiple initialization calls gracefully', () => {
      // Mock DOM APIs
      Object.defineProperty(document, 'addEventListener', {
        value: jest.fn(),
        writable: true
      });
      Object.defineProperty(window, 'addEventListener', {
        value: jest.fn(),
        writable: true
      });

      // Should not throw when called multiple times
      expect(() => {
        PromiseManager.initializeBackgroundCleanup();
        PromiseManager.initializeBackgroundCleanup();
        PromiseManager.initializeBackgroundCleanup();
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should preserve original error when promise rejects before timeout', async () => {
      const originalError = new Error('Original error message');
      const rejectingPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(originalError), 100);
      });

      const resultPromise = PromiseManager.withTimeout(rejectingPromise, { 
        timeout: 1000 
      });

      jest.advanceTimersByTime(100);

      try {
        await resultPromise;
        fail('Promise should have rejected');
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });

    it('should handle cleanup when max pending promises exceeded', async () => {
      // Create promises that exceed the limit
      const promises = Array.from({ length: 110 }, (_, i) => {
        const promise = new Promise<string>((resolve) => {
          setTimeout(() => resolve(`result_${i}`), 1000);
        });
        return PromiseManager.withTimeout(promise, { 
          key: `overflow_${i}`,
          timeout: 2000 
        });
      });

      // Should not exceed reasonable limits due to cleanup
      expect(PromiseManager.getPendingCount()).toBeLessThan(110);
    });
  });
});

// Integration tests with more complex scenarios
describe('PromiseManager Integration Tests', () => {
  beforeEach(() => {
    PromiseManager.cancelAll('integration_test_cleanup');
    jest.clearAllTimers();
  });

  it('should handle rapid promise creation and cancellation', async () => {
    const keys = Array.from({ length: 20 }, (_, i) => `rapid_${i}`);
    
    // Create promises rapidly
    const promises = keys.map(key => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(key), Math.random() * 500);
      });
      return PromiseManager.withTimeout(promise, { key, timeout: 1000 });
    });

    expect(PromiseManager.getPendingCount()).toBe(20);

    // Cancel half of them
    keys.slice(0, 10).forEach(key => {
      PromiseManager.cancel(key);
    });

    expect(PromiseManager.getPendingCount()).toBe(10);

    // Let the remaining ones complete
    jest.advanceTimersByTime(500);

    const settledPromises = await Promise.allSettled(promises);
    
    // First 10 should be rejected (cancelled)
    settledPromises.slice(0, 10).forEach(result => {
      expect(result.status).toBe('rejected');
    });

    // Last 10 should be fulfilled
    settledPromises.slice(10).forEach(result => {
      expect(result.status).toBe('fulfilled');
    });

    expect(PromiseManager.getPendingCount()).toBe(0);
  });

  it('should handle mixed success and failure scenarios', async () => {
    const createPromise = (delay: number, shouldSucceed: boolean, key: string) => {
      const promise = new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (shouldSucceed) {
            resolve(`success_${key}`);
          } else {
            reject(new Error(`error_${key}`));
          }
        }, delay);
      });

      return PromiseManager.withTimeout(promise, { key, timeout: 1000 });
    };

    const promises = [
      createPromise(100, true, 'p1'),   // Success
      createPromise(200, false, 'p2'),  // Error
      createPromise(300, true, 'p3'),   // Success
      createPromise(1500, true, 'p4'),  // Timeout
    ];

    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(200);
    jest.advanceTimersByTime(300);
    jest.advanceTimersByTime(1000); // Trigger timeout for p4

    const results = await Promise.allSettled(promises);

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'success_p1' });
    expect(results[1]).toEqual({ status: 'rejected', reason: expect.any(Error) });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'success_p3' });
    expect(results[3]).toEqual({ status: 'rejected', reason: expect.any(Error) });

    // Verify cleanup
    expect(PromiseManager.getPendingCount()).toBe(0);
  });
});