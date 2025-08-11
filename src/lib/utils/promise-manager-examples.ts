/**
 * Promise Manager Usage Examples for KEPCO AI Community
 * 
 * This file demonstrates how to integrate PromiseManager with the existing codebase
 * to solve multi-tab Promise hang issues.
 */

import { PromiseManager, withDatabaseTimeout, withApiTimeout, withRealtimeTimeout } from './promise-manager';
import { createClient } from '@supabase/supabase-js';

// Initialize the PromiseManager background cleanup
// This should be called once during app initialization
export function initializePromiseManager() {
  PromiseManager.initializeBackgroundCleanup();
  console.log('[PromiseManager] Background cleanup initialized');
}

/**
 * Example 1: Database operations with timeout
 */
export class DatabaseService {
  constructor(private supabaseClient: ReturnType<typeof createClient>) {}

  async getUserStats(userId: string) {
    // Wrap database calls with timeout
    return withDatabaseTimeout(
      this.supabaseClient
        .rpc('get_user_stats_v2', { p_user_id: userId })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      'get_user_stats'
    );
  }

  async getUserAchievements(userId: string) {
    return withDatabaseTimeout(
      this.supabaseClient
        .rpc('get_user_achievements_complete', { p_user_id: userId })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      'get_user_achievements'
    );
  }

  async getCommentTree(contentId: string) {
    return withDatabaseTimeout(
      this.supabaseClient
        .rpc('get_comment_tree_v2', { p_content_id: contentId })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      'get_comment_tree'
    );
  }
}

/**
 * Example 2: Connection Core integration
 */
export class ConnectionCoreWithTimeout {
  private heartbeatKey = 'connection_heartbeat';
  
  constructor(private supabaseClient: ReturnType<typeof createClient>) {}

  async performHeartbeat() {
    try {
      const session = await PromiseManager.withTimeout(
        this.supabaseClient.auth.getSession().then(({ data, error }) => {
          if (error) throw error;
          return data.session;
        }),
        {
          timeout: 3000,
          key: this.heartbeatKey,
          errorMessage: 'Heartbeat timeout - connection may be unstable'
        }
      );

      return session;
    } catch (error) {
      console.warn('[ConnectionCore] Heartbeat failed:', error);
      throw error;
    }
  }

  async establishConnection() {
    // Cancel any existing connection attempts
    PromiseManager.cancel('establish_connection');

    return PromiseManager.withTimeout(
      this.connectToSupabase(),
      {
        timeout: 10000,
        key: 'establish_connection',
        errorMessage: 'Failed to establish connection within 10 seconds'
      }
    );
  }

  private async connectToSupabase() {
    // Simulate connection logic
    const { data, error } = await this.supabaseClient.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  // Call this when tab goes to background
  onBackgroundTransition() {
    console.log('[ConnectionCore] Tab backgrounded - cancelling connection operations');
    PromiseManager.cancel(this.heartbeatKey);
    PromiseManager.cancel('establish_connection');
  }
}

/**
 * Example 3: React Query integration with timeout
 */
export class QueryService {
  async fetchUserProfile(userId: string) {
    return withApiTimeout(
      fetch(`/api/users/${userId}`).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      `user_profile_${userId}`
    );
  }

  async fetchUserActivities(userId: string, limit = 10) {
    return withApiTimeout(
      fetch(`/api/users/${userId}/activities?limit=${limit}`).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      `user_activities_${userId}`
    );
  }
}

/**
 * Example 4: Realtime subscriptions with timeout
 */
export class RealtimeManager {
  private channels = new Map<string, any>();

  constructor(private supabaseClient: ReturnType<typeof createClient>) {}

  async subscribeToTable(tableName: string) {
    const channelKey = `realtime_${tableName}`;
    
    // Cancel existing subscription for this table
    PromiseManager.cancel(channelKey);
    
    try {
      const channel = await withRealtimeTimeout(
        this.createSubscription(tableName),
        `subscribe_${tableName}`
      );
      
      this.channels.set(tableName, channel);
      return channel;
      
    } catch (error) {
      console.error(`[RealtimeManager] Failed to subscribe to ${tableName}:`, error);
      throw error;
    }
  }

  private async createSubscription(tableName: string) {
    return new Promise((resolve, reject) => {
      const channel = this.supabaseClient
        .channel(`public:${tableName}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: tableName 
          }, 
          (payload) => {
            console.log(`[RealtimeManager] Change received for ${tableName}:`, payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve(channel);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            reject(new Error(`Subscription failed with status: ${status}`));
          }
        });
    });
  }

  // Call this when tab goes to background
  onBackgroundTransition() {
    console.log('[RealtimeManager] Tab backgrounded - pausing subscriptions');
    // Don't cancel realtime subscriptions, just note the transition
    // Subscriptions will be handled by Supabase's built-in recovery
  }

  cleanup() {
    this.channels.forEach((channel, tableName) => {
      PromiseManager.cancel(`realtime_${tableName}`);
      channel.unsubscribe();
    });
    this.channels.clear();
  }
}

/**
 * Example 5: Recovery Manager with batch operations
 */
export class RecoveryManager {
  constructor(
    private supabaseClient: ReturnType<typeof createClient>,
    private queryClient: any // React Query client
  ) {}

  async triggerRecovery(fullRecovery = false) {
    const recoveryKey = 'system_recovery';
    
    try {
      // Cancel any existing recovery operation
      PromiseManager.cancel(recoveryKey);
      
      // Step 1: Reconnect to Supabase
      await PromiseManager.withTimeout(
        this.reconnectToSupabase(),
        {
          timeout: 10000,
          key: `${recoveryKey}_connect`,
          errorMessage: 'Connection recovery timeout'
        }
      );

      // Step 2: Invalidate queries in batches
      if (fullRecovery) {
        await this.invalidateQueriesInBatches();
      } else {
        await this.invalidateActiveQueries();
      }

      console.log('[RecoveryManager] Recovery completed successfully');
      
    } catch (error) {
      console.error('[RecoveryManager] Recovery failed:', error);
      throw error;
    }
  }

  private async reconnectToSupabase() {
    const { error } = await this.supabaseClient.auth.getSession();
    if (error) throw error;
  }

  private async invalidateQueriesInBatches() {
    const criticalQueries = ['contents-v2', 'users-v2', 'activities-v2', 'comments-v2'];
    const batchSize = 2;

    for (let i = 0; i < criticalQueries.length; i += batchSize) {
      const batch = criticalQueries.slice(i, i + batchSize);
      
      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled(
        batch.map(queryKey => 
          PromiseManager.withTimeout(
            this.queryClient.invalidateQueries({ queryKey: [queryKey] }),
            {
              timeout: 3000,
              key: `invalidate_${queryKey}`,
              errorMessage: `Query invalidation timeout: ${queryKey}`
            }
          )
        )
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[RecoveryManager] Failed to invalidate ${batch[index]}:`, result.reason);
        }
      });

      // Short delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async invalidateActiveQueries() {
    return PromiseManager.withTimeout(
      this.queryClient.invalidateQueries({ refetchType: 'active' }),
      {
        timeout: 5000,
        key: 'invalidate_active_queries',
        errorMessage: 'Active query invalidation timeout'
      }
    );
  }
}

/**
 * Example 6: Visibility change handler
 */
export function setupVisibilityHandler() {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[VisibilityHandler] Tab backgrounded - triggering cleanup');
      
      // Log current state for debugging
      const pendingCount = PromiseManager.getPendingCount();
      if (pendingCount > 0) {
        console.log(`[VisibilityHandler] Cancelling ${pendingCount} pending promises`);
        console.log('[VisibilityHandler] Pending keys:', PromiseManager.getPendingKeys());
      }
      
      // Cancel all pending promises
      PromiseManager.cancelAll('background_transition');
      
    } else {
      console.log('[VisibilityHandler] Tab foregrounded - ready for new operations');
      
      // Optionally trigger recovery here
      // recoveryManager.triggerRecovery(false);
    }
  });
}

/**
 * Example 7: Circuit breaker pattern integration
 */
export class CircuitBreakerService {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 3;
  private readonly resetTimeout = 60000; // 1 minute

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check circuit breaker state
    if (this.isCircuitOpen()) {
      throw new Error(`Circuit breaker is open for ${operationName}`);
    }

    try {
      const result = await PromiseManager.withTimeout(
        operation(),
        {
          timeout: 5000,
          key: `circuit_breaker_${operationName}`,
          errorMessage: `Circuit breaker timeout: ${operationName}`
        }
      );

      // Reset on success
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isCircuitOpen(): boolean {
    if (this.failures >= this.threshold) {
      const elapsed = Date.now() - this.lastFailureTime;
      return elapsed < this.resetTimeout;
    }
    return false;
  }

  private onSuccess() {
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

// All services are already exported individually above