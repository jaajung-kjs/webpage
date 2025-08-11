/**
 * Promise Manager for KEPCO AI Community
 * 
 * Handles Promise lifecycle management with timeout, cancellation, and deduplication
 * Specifically designed to solve multi-tab Promise hang issues
 */

/**
 * Configuration for withTimeout method
 */
export interface TimeoutOptions {
  /** Timeout duration in milliseconds (default: 5000) */
  timeout?: number;
  /** Unique key for promise deduplication and cancellation */
  key?: string;
  /** Custom error message when timeout occurs */
  errorMessage?: string;
}

/**
 * Promise status tracking
 */
interface ManagedPromise {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  timestamp: number;
  key: string;
}

/**
 * Promise Manager Class
 * 
 * Features:
 * - Promise timeout with custom duration
 * - Promise cancellation using AbortController
 * - Promise deduplication by key
 * - Automatic cleanup on background tab transitions
 */
export class PromiseManager {
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static readonly MAX_PENDING_PROMISES = 100;
  
  /** Map of pending promises by key */
  private static pendingPromises = new Map<string, ManagedPromise>();
  
  /** Auto-incrementing counter for anonymous promises */
  private static promiseCounter = 0;
  
  /** Flag to track if background cleanup is enabled */
  private static isBackgroundCleanupEnabled = false;
  
  /**
   * Initialize background cleanup for visibility changes
   * Should be called once during app initialization
   */
  static initializeBackgroundCleanup(): void {
    if (this.isBackgroundCleanupEnabled || typeof window === 'undefined') {
      return;
    }
    
    this.isBackgroundCleanupEnabled = true;
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('[PromiseManager] Tab backgrounded - cancelling non-recovery promises');
        // Connection Recovery 관련 Promise는 취소하지 않음
        this.cancelAll('background_transition', [
          'recovery-',           // Connection Recovery 관련
          'batch-invalidation-', // Batch invalidation 관련
          'recovery_'            // Recovery 관련 일반
        ]);
      }
    });
    
    // Listen for beforeunload to cleanup
    window.addEventListener('beforeunload', () => {
      this.cancelAll('page_unload');
    });
    
    // Periodic cleanup of old promises (every 30 seconds)
    setInterval(() => {
      this.cleanupOldPromises();
    }, 30000);
  }
  
  /**
   * Wraps a promise with timeout and cancellation capabilities
   * 
   * @param promise - The promise to wrap
   * @param options - Configuration options
   * @returns Promise that resolves/rejects with timeout and cancellation support
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    options: TimeoutOptions = {}
  ): Promise<T> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      key = this.generateKey(),
      errorMessage = `Operation timeout after ${timeout}ms`
    } = options;
    
    // Cancel existing promise with the same key
    if (key && this.pendingPromises.has(key)) {
      const existing = this.pendingPromises.get(key)!;
      existing.controller.abort();
      clearTimeout(existing.timeoutId);
      this.pendingPromises.delete(key);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PromiseManager] Cancelled existing promise with key: ${key}`);
      }
    }
    
    // Check if we're approaching the limit
    if (this.pendingPromises.size >= this.MAX_PENDING_PROMISES) {
      console.warn('[PromiseManager] Too many pending promises, cleaning up old ones');
      this.cleanupOldPromises(true);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    const managedPromise: ManagedPromise = {
      controller,
      timeoutId,
      timestamp: Date.now(),
      key
    };
    
    this.pendingPromises.set(key, managedPromise);
    
    try {
      // Race between the original promise and timeout
      const result = await Promise.race([
        promise,
        this.createTimeoutPromise<T>(controller.signal, errorMessage)
      ]);
      
      // Clean up on success
      this.cleanup(key);
      return result as T;
      
    } catch (error) {
      // Clean up on error
      this.cleanup(key);
      
      // 무한 루프 방지: 잠재적으로 문제가 되는 에러는 undefined로 반환
      if (error instanceof Error) {
        const isTimeoutError = error.name === 'TimeoutError' || error.message.includes('timeout')
        const isAbortError = error.name === 'AbortError' || error.message.includes('abort')
        
        // 타임아웃이나 취소된 Promise는 에러 대신 undefined 반환 옵션 제공
        if (isTimeoutError || isAbortError) {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[PromiseManager] ${error.name} for key: ${key} (ignored to prevent infinite loops)`)
          }
          // 무한 루프를 유발할 수 있는 에러는 오히려 throw 하지 않고 디버그 로그만 남김
          // 호출자가 필요시 catch에서 처리할 수 있도록 에러는 그대로 throw
        }
      }
      
      // Re-throw the original error
      throw error;
    }
  }
  
  /**
   * Cancel a specific promise by key
   * 
   * @param key - The key of the promise to cancel
   * @returns true if promise was found and cancelled, false otherwise
   */
  static cancel(key: string): boolean {
    const managedPromise = this.pendingPromises.get(key);
    if (!managedPromise) {
      return false;
    }
    
    managedPromise.controller.abort();
    this.cleanup(key);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PromiseManager] Cancelled promise: ${key}`);
    }
    
    return true;
  }
  
  /**
   * Cancel all pending promises
   * 
   * @param reason - Reason for cancellation (for logging)
   * @param excludePatterns - Array of key patterns to exclude from cancellation
   */
  static cancelAll(reason = 'manual', excludePatterns: string[] = []): void {
    const count = this.pendingPromises.size;
    
    if (count === 0) {
      return;
    }
    
    let cancelledCount = 0;
    const toDelete: string[] = [];
    
    this.pendingPromises.forEach((managedPromise, key) => {
      // Check if this key should be excluded
      const shouldExclude = excludePatterns.some(pattern => key.includes(pattern));
      
      if (!shouldExclude) {
        managedPromise.controller.abort();
        clearTimeout(managedPromise.timeoutId);
        toDelete.push(key);
        cancelledCount++;
      }
    });
    
    // Remove cancelled promises
    toDelete.forEach(key => this.pendingPromises.delete(key));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PromiseManager] Cancelled ${cancelledCount}/${count} promises (reason: ${reason})`);
    }
  }
  
  /**
   * Get the number of pending promises
   */
  static getPendingCount(): number {
    return this.pendingPromises.size;
  }
  
  /**
   * Get all pending promise keys (for debugging)
   */
  static getPendingKeys(): string[] {
    return Array.from(this.pendingPromises.keys());
  }
  
  /**
   * Check if a specific promise is pending
   */
  static isPending(key: string): boolean {
    return this.pendingPromises.has(key);
  }
  
  /**
   * Create a timeout promise that rejects when aborted
   * 무한 루프 방지: AbortError와 TimeoutError 구분하여 잘못된 에러 발생 방지
   */
  private static createTimeoutPromise<T>(
    signal: AbortSignal, 
    errorMessage: string
  ): Promise<T> {
    return new Promise<T>((_, reject) => {
      signal.addEventListener('abort', () => {
        // AbortError 와 TimeoutError 구분
        const error = new Error(errorMessage)
        
        // 타임아웃인지 아브로인지 구분
        if (errorMessage.includes('timeout')) {
          error.name = 'TimeoutError'
        } else {
          error.name = 'AbortError'
        }
        
        reject(error);
      });
    });
  }
  
  /**
   * Generate a unique key for anonymous promises
   */
  private static generateKey(): string {
    return `promise_${++this.promiseCounter}_${Date.now()}`;
  }
  
  /**
   * Clean up a specific managed promise
   */
  private static cleanup(key: string): void {
    const managedPromise = this.pendingPromises.get(key);
    if (managedPromise) {
      clearTimeout(managedPromise.timeoutId);
      this.pendingPromises.delete(key);
    }
  }
  
  /**
   * Clean up old promises that have been pending too long
   */
  private static cleanupOldPromises(force = false): void {
    const now = Date.now();
    const maxAge = force ? 5000 : 60000; // 1 minute normally, 5 seconds when forced
    let cleanedCount = 0;
    
    for (const [key, managedPromise] of this.pendingPromises.entries()) {
      if (now - managedPromise.timestamp > maxAge) {
        managedPromise.controller.abort();
        clearTimeout(managedPromise.timeoutId);
        this.pendingPromises.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[PromiseManager] Cleaned up ${cleanedCount} old promises`);
    }
  }
}

/**
 * Utility function for common database operations with timeout
 */
export async function withDatabaseTimeout<T>(
  promise: Promise<T>,
  operation = 'database_operation'
): Promise<T> {
  return PromiseManager.withTimeout(promise, {
    timeout: 10000, // 10 seconds for DB operations
    key: `db_${operation}_${Date.now()}`,
    errorMessage: `Database operation '${operation}' timed out after 10 seconds`
  });
}

/**
 * Utility function for API calls with timeout
 */
export async function withApiTimeout<T>(
  promise: Promise<T>,
  endpoint = 'api_call'
): Promise<T> {
  return PromiseManager.withTimeout(promise, {
    timeout: 8000, // 8 seconds for API calls
    key: `api_${endpoint}_${Date.now()}`,
    errorMessage: `API call to '${endpoint}' timed out after 8 seconds`
  });
}

/**
 * Utility function for realtime operations with timeout
 */
export async function withRealtimeTimeout<T>(
  promise: Promise<T>,
  operation = 'realtime_operation'
): Promise<T> {
  return PromiseManager.withTimeout(promise, {
    timeout: 5000, // 5 seconds for realtime operations
    key: `realtime_${operation}`,
    errorMessage: `Realtime operation '${operation}' timed out after 5 seconds`
  });
}

// Default export
export default PromiseManager;