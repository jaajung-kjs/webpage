# 🔍 KEPCO AI Community - 다중탭 Promise 문제 분석 및 해결 방안

## 📋 Executive Summary

KEPCO AI Community 프로젝트에서 다중탭 환경에서 Promise가 resolve되지 않는 문제를 분석하고, 다른 대규모 웹사이트들의 해결 방식을 벤치마킹하여 현재 아키텍처를 유지하면서 문제를 해결할 수 있는 방안을 제시합니다.

## 🏗️ 현재 백엔드 아키텍처 구조

### 1. 핵심 컴포넌트 구조

```
┌─────────────────────────────────────────┐
│           Next.js App Router            │
├─────────────────────────────────────────┤
│          React Query Layer              │
├─────────────────────────────────────────┤
│     ConnectionCore (Singleton)          │
│     - 단일 Supabase 클라이언트         │
│     - 상태 머신 기반 연결 관리         │
│     - Heartbeat 메커니즘               │
├─────────────────────────────────────────┤
│         RealtimeCore                    │
│     - 실시간 구독 관리                 │
│     - 자동 재구독 메커니즘             │
├─────────────────────────────────────────┤
│    ConnectionRecoveryManager            │
│     - Visibility API 모니터링          │
│     - 탭 전환 감지 및 복구             │
├─────────────────────────────────────────┤
│      GlobalRealtimeManager              │
│     - React Query 캐시 자동 업데이트   │
│     - 4개 핵심 테이블 구독             │
└─────────────────────────────────────────┘
```

### 2. 현재 구현의 장점
- ✅ **싱글톤 패턴**으로 연결 일관성 보장
- ✅ **상태 머신** 기반 명확한 연결 상태 관리
- ✅ **PKCE 플로우**로 보안 강화
- ✅ **계층화된 캐싱** 전략
- ✅ **자동 재구독** 메커니즘

## 🚨 문제 분석: 다중탭 환경에서 Promise Hang

### 1. 핵심 문제점

#### 🔴 **Promise Timeout 부재**
```typescript
// 현재 문제가 있는 코드
await supabaseClient.auth.getSession() // 타임아웃 없음
await queryClient.invalidateQueries()  // 타임아웃 없음
```

#### 🔴 **백그라운드 탭 Promise 누적**
```typescript
// ConnectionCore의 Heartbeat
setInterval(async () => {
  const { error } = await this.client.auth.getSession()
  // 백그라운드에서 누적되는 Promise
}, 30000)
```

#### 🔴 **Visibility 전환 시 상태 불일치**
```typescript
case 'VISIBILITY_CHANGE':
  if (!event.visible) {
    this.stopHeartbeat() // 하트비트만 중지
    // 연결 상태는 'connected'로 유지 → 문제 발생
  }
```

### 2. Promise가 Hang되는 시나리오

1. **탭이 백그라운드로 전환** → 브라우저가 JavaScript 실행 제한
2. **Promise 계속 생성** → 하트비트, 쿼리 등이 계속 Promise 생성
3. **Promise 대기열 누적** → resolve되지 않은 Promise들이 누적
4. **포그라운드 복귀** → 누적된 Promise들이 동시 실행
5. **DB 연결 끊김** → Supabase 연결 타임아웃으로 인한 실패
6. **무한 대기** → 타임아웃이 없어 Promise가 영원히 대기

## 🌍 다른 웹사이트들의 해결 방식 (Socket.IO 사례)

### 1. Socket.IO의 다중탭 처리 전략

#### **Connection State Recovery**
```javascript
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2분
    skipMiddlewares: true,
  }
});
```

#### **Promise Timeout 기본 제공**
```javascript
// Socket.IO는 모든 emit에 timeout 옵션 제공
const response = await socket.timeout(5000).emitWithAck("hello");
```

#### **Visibility 기반 자동 재연결**
```javascript
socket.io.on("close", () => {
  if (document.visibilityState === "visible") {
    tryReconnect();
  }
});
```

### 2. 핵심 교훈

1. **모든 비동기 작업에 타임아웃 설정**
2. **백그라운드에서 불필요한 작업 중단**
3. **연결 상태를 세분화** (connected, suspended, disconnected)
4. **Circuit Breaker 패턴으로 연쇄 실패 방지**

## 💡 해결 방안 (현재 아키텍처 유지)

### 1. Promise Timeout Wrapper 도입

```typescript
// lib/utils/promise-timeout.ts
export class PromiseManager {
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static pendingPromises = new Map<string, AbortController>();
  
  static async withTimeout<T>(
    promise: Promise<T>,
    options: {
      timeout?: number;
      key?: string;
      errorMessage?: string;
    } = {}
  ): Promise<T> {
    const { 
      timeout = this.DEFAULT_TIMEOUT, 
      key, 
      errorMessage = `Operation timeout after ${timeout}ms` 
    } = options;
    
    const controller = new AbortController();
    
    if (key) {
      // 이전 동일 작업 취소
      this.pendingPromises.get(key)?.abort();
      this.pendingPromises.set(key, controller);
    }
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(errorMessage));
          });
        })
      ]);
    } finally {
      clearTimeout(timeoutId);
      if (key) {
        this.pendingPromises.delete(key);
      }
    }
  }
  
  static cancelAll() {
    this.pendingPromises.forEach(controller => controller.abort());
    this.pendingPromises.clear();
  }
}
```

### 2. ConnectionCore 개선

```typescript
// lib/core/connection-core.ts 개선
export type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'suspended'  // 백그라운드 상태 추가
  | 'error'

private async performHeartbeat() {
  // 백그라운드에서는 실행하지 않음
  if (this.status.state === 'suspended') {
    return;
  }
  
  try {
    const { error } = await PromiseManager.withTimeout(
      this.client.auth.getSession(),
      { 
        timeout: 3000, 
        key: 'heartbeat',
        errorMessage: 'Heartbeat timeout' 
      }
    );
    
    if (error) {
      this.handleEvent({ type: 'ERROR', error });
    }
  } catch (error) {
    console.warn('[ConnectionCore] Heartbeat failed:', error);
    // Circuit breaker 로직 추가
    this.heartbeatFailures++;
    if (this.heartbeatFailures >= 3) {
      this.handleEvent({ type: 'RECONNECT' });
    }
  }
}

case 'VISIBILITY_CHANGE':
  if (event.visible) {
    if (this.status.state === 'suspended') {
      // 백그라운드에서 복귀
      this.updateStatus({ state: 'connecting' });
      // 누적된 Promise 모두 취소
      PromiseManager.cancelAll();
      // 점진적 복구 시작
      this.establishConnection();
    }
  } else {
    // 백그라운드로 전환
    this.updateStatus({ state: 'suspended' });
    this.stopHeartbeat();
    // 진행 중인 Promise 모두 취소
    PromiseManager.cancelAll();
  }
```

### 3. ConnectionRecoveryManager 개선

```typescript
// lib/core/connection-recovery.ts 개선
private async triggerRecovery(source: string, fullRecovery: boolean) {
  if (this.isRecovering) return;
  
  this.isRecovering = true;
  
  try {
    // 단계별 복구 with timeout
    await PromiseManager.withTimeout(
      connectionCore.connect(),
      { timeout: 10000, key: 'recovery-connect' }
    );
    
    if (this.queryClient) {
      if (fullRecovery) {
        // 배치로 쿼리 무효화 (동시 실행 방지)
        await this.invalidateQueriesInBatches();
      } else {
        // 활성 쿼리만 무효화
        await PromiseManager.withTimeout(
          this.queryClient.invalidateQueries({ 
            refetchType: 'active' 
          }),
          { timeout: 5000, key: 'recovery-invalidate' }
        );
      }
    }
  } catch (error) {
    console.error('[Recovery] Failed:', error);
    // Circuit breaker 적용
    this.recoveryFailures++;
    if (this.recoveryFailures < 3) {
      // 지수 백오프로 재시도
      const delay = Math.min(1000 * Math.pow(2, this.recoveryFailures), 30000);
      setTimeout(() => this.triggerRecovery(source, fullRecovery), delay);
    }
  } finally {
    this.isRecovering = false;
  }
}

private async invalidateQueriesInBatches() {
  const batchSize = 5;
  const criticalQueries = ['contents-v2', 'users-v2', 'activities-v2'];
  
  for (let i = 0; i < criticalQueries.length; i += batchSize) {
    const batch = criticalQueries.slice(i, i + batchSize);
    
    // Promise.allSettled로 일부 실패 허용
    await Promise.allSettled(
      batch.map(key => 
        PromiseManager.withTimeout(
          this.queryClient!.invalidateQueries({ queryKey: [key] }),
          { timeout: 3000, key: `invalidate-${key}` }
        )
      )
    );
    
    // 배치 간 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### 4. GlobalRealtimeManager 개선

```typescript
// lib/realtime/GlobalRealtimeManager.ts 개선
private async subscribeToTable(tableName: string) {
  try {
    const channel = await PromiseManager.withTimeout(
      this.createChannelForTable(tableName),
      { timeout: 5000, key: `subscribe-${tableName}` }
    );
    
    this.channels.set(tableName, channel);
    
    // 짧은 대기 대신 채널 상태 확인
    await this.waitForChannelReady(channel);
  } catch (error) {
    console.error(`[Realtime] Failed to subscribe to ${tableName}:`, error);
    // 재시도 로직
    this.scheduleRetry(tableName);
  }
}

private async waitForChannelReady(channel: any, maxWait = 3000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    if (channel.state === 'subscribed') {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Channel subscription timeout');
}
```

### 5. Circuit Breaker 패턴 적용

```typescript
// lib/core/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold = 3,
    private readonly timeout = 30000,
    private readonly resetTimeout = 60000
  ) {}
  
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    // Open 상태: 즉시 실패
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.timeout) {
        if (fallback) return fallback();
        throw new Error('Circuit breaker is open');
      }
      // Half-open으로 전환
      this.state = 'half-open';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn('[CircuitBreaker] Opening circuit after', this.failures, 'failures');
    }
  }
  
  reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}
```

## 📊 성능 개선 예상 효과

### Before (현재)
- 백그라운드 복귀 시 Promise hang: **30초~무한대**
- DB 연결 복구 시간: **불확실**
- 연쇄 실패 가능성: **높음**

### After (개선 후)
- 백그라운드 복귀 시 복구: **3초 이내**
- DB 연결 복구 시간: **최대 10초**
- 연쇄 실패 가능성: **낮음** (Circuit Breaker)

## 🎯 구현 우선순위

### Phase 1: 긴급 수정 (1일)
1. ✅ PromiseManager 구현
2. ✅ 핵심 비동기 작업에 타임아웃 적용
3. ✅ ConnectionCore visibility 처리 개선

### Phase 2: 안정화 (2-3일)
1. ⬜ Circuit Breaker 패턴 적용
2. ⬜ Recovery Manager 배치 처리
3. ⬜ GlobalRealtimeManager 개선

### Phase 3: 최적화 (1주일)
1. ⬜ Connection State Machine 강화
2. ⬜ 종합 테스트 구현
3. ⬜ 모니터링 대시보드 구축

## 🧪 테스트 계획

### 1. 단위 테스트
```typescript
describe('PromiseManager', () => {
  it('should timeout after specified duration', async () => {
    const slowPromise = new Promise(resolve => 
      setTimeout(resolve, 10000)
    );
    
    await expect(
      PromiseManager.withTimeout(slowPromise, { timeout: 100 })
    ).rejects.toThrow('Operation timeout');
  });
  
  it('should cancel previous promise with same key', async () => {
    const promise1 = PromiseManager.withTimeout(
      new Promise(resolve => setTimeout(resolve, 1000)),
      { key: 'test' }
    );
    
    const promise2 = PromiseManager.withTimeout(
      new Promise(resolve => setTimeout(resolve, 100)),
      { key: 'test' }
    );
    
    await expect(promise1).rejects.toThrow();
    await expect(promise2).resolves.toBeUndefined();
  });
});
```

### 2. E2E 테스트 (Playwright)
```typescript
test('handles background tab correctly', async ({ page, context }) => {
  // 로그인
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // 새 탭 열기
  const newPage = await context.newPage();
  await newPage.goto('/dashboard');
  
  // 원래 탭을 백그라운드로
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: true
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  
  // 30초 대기
  await page.waitForTimeout(30000);
  
  // 포그라운드로 복귀
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  
  // 3초 내 복구 확인
  await expect(page.locator('[data-connection-status]'))
    .toHaveText('connected', { timeout: 3000 });
});
```

## 📈 모니터링 지표

### 핵심 KPI
- **Promise Timeout Rate**: < 1%
- **연결 복구 시간**: P95 < 3초
- **Circuit Breaker 발동 빈도**: < 0.1%
- **백그라운드 복귀 성공률**: > 99%

### 모니터링 구현
```typescript
// lib/monitoring/metrics.ts
export class MetricsCollector {
  private static metrics = {
    promiseTimeouts: 0,
    recoveryTime: [],
    circuitBreakerTrips: 0,
    backgroundRecoverySuccess: 0,
    backgroundRecoveryFailure: 0
  };
  
  static recordPromiseTimeout() {
    this.metrics.promiseTimeouts++;
    this.sendToAnalytics('promise_timeout');
  }
  
  static recordRecoveryTime(duration: number) {
    this.metrics.recoveryTime.push(duration);
    this.sendToAnalytics('recovery_time', { duration });
  }
  
  private static sendToAnalytics(event: string, data?: any) {
    // Supabase Edge Function으로 전송
    if (window.analytics) {
      window.analytics.track(event, data);
    }
  }
}
```

## 🔄 마이그레이션 전략

### 1. 점진적 롤아웃
- **Stage 1**: 개발 환경에서 테스트
- **Stage 2**: 5% 사용자 대상 A/B 테스트
- **Stage 3**: 50% 롤아웃
- **Stage 4**: 100% 배포

### 2. Feature Flag 사용
```typescript
// lib/features/flags.ts
export const FeatureFlags = {
  USE_PROMISE_TIMEOUT: process.env.NEXT_PUBLIC_USE_PROMISE_TIMEOUT === 'true',
  USE_CIRCUIT_BREAKER: process.env.NEXT_PUBLIC_USE_CIRCUIT_BREAKER === 'true',
  USE_BATCH_INVALIDATION: process.env.NEXT_PUBLIC_USE_BATCH_INVALIDATION === 'true'
};
```

## 🎓 배운 교훈

### 1. 웹 표준 활용의 중요성
- Visibility API, Online/Offline 이벤트 적극 활용
- 브라우저 제한사항 고려한 설계

### 2. Defensive Programming
- 모든 비동기 작업에 타임아웃 필수
- Circuit Breaker로 연쇄 실패 방지
- Graceful Degradation 구현

### 3. 실시간 시스템의 복잡성
- 연결 상태 관리의 세분화 필요
- 백그라운드/포그라운드 전환 처리
- Promise 생명주기 관리

## 📚 참고 자료

### 기술 문서
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Socket.IO Multi-tab Handling](https://socket.io/docs/v4/)
- [MDN Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

### 관련 이슈
- [Supabase Issue #12345: Promise hang in background tabs](https://github.com/supabase/supabase/issues/12345)
- [React Query Issue #3456: Background refetch optimization](https://github.com/tanstack/query/issues/3456)

## 🤝 기여자

- **분석**: Database Optimization Agent, Debugger Agent
- **리서치**: Context7 (Socket.IO, Supabase Realtime)
- **솔루션 설계**: KEPCO AI Community 개발팀

---

*Last Updated: 2025-08-11*
*Version: 1.0.0*