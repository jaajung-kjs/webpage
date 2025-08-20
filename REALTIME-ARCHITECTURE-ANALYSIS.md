# KEPCO AI Community 실시간 연결 시스템 계층구조 분석

## 1. 시스템 아키텍처 개요

실시간 연결 시스템은 4계층 구조로 구성되어 있습니다:

```
[Layer 4] Providers (CoreProvider, AuthProvider)
    ↓
[Layer 3] Subscription Managers (GlobalRealtimeManager, UserMessageSubscriptionManager)
    ↓
[Layer 2] RealtimeCore (채널 구독 관리)
    ↓
[Layer 1] ConnectionCore (WebSocket 연결 관리)
```

## 2. 각 계층의 역할과 책임

### Layer 1: ConnectionCore (기반 계층)
**파일**: `src/lib/core/connection-core.ts`

**주요 책임**:
- Supabase 클라이언트 생성 및 관리
- WebSocket 연결 상태 모니터링
- 네트워크 상태 변경 감지 (online/offline)
- 백그라운드/포그라운드 전환 처리
- 연결 재생성 로직

**핵심 특징**:
- ✅ Singleton 패턴으로 단일 인스턴스 보장
- ✅ 5초 간격 재생성 빈도 제한
- ✅ WebSocket readyState 직접 확인으로 stale connection 감지
- ✅ 클라이언트 변경 시 리스너 통지 메커니즘

**문제점**:
- 메모리 사용량 모니터링은 있지만 적극적인 정리는 부족
- TypeScript 무시 주석으로 내부 API 접근

### Layer 2: RealtimeCore (구독 관리 계층)
**파일**: `src/lib/core/realtime-core.ts`

**주요 책임**:
- 실시간 채널 구독/구독해제
- ConnectionCore 클라이언트 변경 감지
- 재연결 시 자동 재구독
- 채널 상태 관리

**핵심 특징**:
- ✅ ConnectionCore와 느슨한 결합
- ✅ 클라이언트 인스턴스 비교로 불필요한 재구독 방지
- ✅ 타임스탬프 기반 유니크 채널명 생성
- ✅ 5초 구독 타임아웃 설정

**문제점**:
- Map 기반 구독 정보 관리로 복잡성 증가
- 채널 정리 시 예외 처리 부족

### Layer 3: Subscription Managers (도메인 구독 관리)

#### GlobalRealtimeManager
**파일**: `src/lib/realtime/GlobalRealtimeManager.ts`

**주요 책임**:
- 전역 테이블 구독 (content_v2, users_v2, comments_v2, interactions_v2 등)
- QueryClient와의 연동
- 캐시 무효화 관리

**문제점**:
- QueryClient 참조 갱신 메커니즘이 복잡함
- 테이블별 구독을 개별적으로 관리하여 코드 중복

#### UserMessageSubscriptionManager
**파일**: `src/lib/realtime/UserMessageSubscriptionManager.ts`

**주요 책임**:
- 사용자별 메시지 구독 (messages_v2, message_read_status_v2, conversations_v2)
- 콜백 시스템 관리
- Toast 알림 처리

**문제점**:
- ⚠️ **QueryClient 참조 갱신 로직이 복잡하고 잠재적 버그 존재**
- 사용자 변경과 QueryClient 변경을 별도로 처리하여 혼란 가능성

### Layer 4: Providers (통합 관리 계층)

#### CoreProvider
**파일**: `src/providers/CoreProvider.tsx`

**문제점**:
- ⚠️ **QueryClient 참조 갱신이 재연결 시에만 수행됨**
- GlobalRealtimeManager와 UserMessageSubscriptionManager의 초기화 순서 불명확

#### AuthProvider
**파일**: `src/providers/AuthProvider.tsx`

**문제점**:
- ⚠️ **인증 상태 변경과 메시지 구독 관리가 복잡하게 얽혀있음**
- 중복 초기화 방지 로직이 있지만 여전히 복잡함

## 3. 초기화 순서와 의존성

```
1. ConnectionCore.getInstance() (앱 로드 시)
2. RealtimeCore.getInstance() (ConnectionCore 참조)
3. CoreProvider 초기화
   - QueryClient 생성
   - GlobalRealtimeManager.initialize()
   - ConnectionCore.onClientChange() 구독
4. AuthProvider 초기화 (사용자 로그인 시)
   - UserMessageSubscriptionManager.initialize()
```

## 4. WebSocket 재연결 시 각 계층의 동작

### 재연결 트리거 시나리오:
1. 네트워크 복구 (`handleOnline`)
2. 포그라운드 복귀 (`handleVisibilityChange`)
3. WebSocket readyState가 CLOSED/CLOSING 감지

### 재연결 흐름:
```
1. ConnectionCore.recreateClient()
   - 기존 클라이언트 정리
   - 새 Supabase 클라이언트 생성
   - 모든 listeners에게 newClient 통지

2. RealtimeCore.handleClientChange()
   - 클라이언트 인스턴스 비교
   - 기존 채널 정리
   - 모든 구독 재생성

3. CoreProvider listener
   - GlobalRealtimeManager QueryClient 참조 업데이트
   - 모든 쿼리 invalidate

4. AuthProvider listener
   - UserMessageSubscriptionManager QueryClient 참조 업데이트
```

## 5. 주요 문제점과 잠재적 이슈

### 🔴 Critical Issues

#### 5.1 QueryClient 참조 갱신 문제
**위치**: UserMessageSubscriptionManager, GlobalRealtimeManager

**문제**:
```typescript
// UserMessageSubscriptionManager.ts:38-49
if (this.isInitialized && this.userId === userId && this.queryClient !== queryClient) {
  console.log('[UserMessageSubscriptionManager] Updating QueryClient reference for existing user')
  this.queryClient = queryClient
  
  // 재연결 후 캐시 무효화
  queryClient.invalidateQueries({ queryKey: ['conversations-v2', userId] })
  queryClient.invalidateQueries({ queryKey: ['unread-count-v2', userId] })
  queryClient.invalidateQueries({ queryKey: ['conversation-messages-v2'] })
  
  return // QueryClient만 업데이트하고 구독은 유지
}
```

**잠재적 문제**:
- QueryClient 인스턴스는 재연결 시에도 동일한 객체여야 하는데 참조 비교가 필요한지 의문
- UI 업데이트가 안 되는 이슈가 이 부분과 연관될 가능성

#### 5.2 구독 중복 가능성
**위치**: RealtimeCore

**문제**:
- 동일한 key에 대해 중복 구독 방지 로직이 있지만, 타임스탬프 기반 채널명으로 인해 서버에서는 별개 채널로 인식
- 기존 채널이 완전히 정리되기 전에 새 구독이 생성될 가능성

#### 5.3 메모리 누수 가능성
**위치**: 전 계층

**문제**:
- 채널 정리 시 예외 발생 시 완전한 정리가 안 될 가능성
- 콜백 Map의 정리가 제대로 안 될 수 있음

### 🟡 Moderate Issues

#### 5.4 복잡한 초기화 순서
- Provider들 간의 초기화 순서 의존성이 복잡함
- 재연결 시 각 계층의 상태 동기화가 완벽하지 않을 수 있음

#### 5.5 에러 전파 및 처리
- 하위 계층의 오류가 상위 계층까지 제대로 전파되지 않을 수 있음
- Circuit Breaker나 Retry 로직이 각 계층에 분산되어 있음

## 6. UI 업데이트 문제 진단

**가능한 원인들**:

1. **QueryClient 참조 문제**: 재연결 후 QueryClient 참조가 제대로 갱신되지 않아 캐시 무효화가 실제 UI에 반영되지 않음

2. **구독 중복**: 이전 구독이 완전히 정리되지 않고 새 구독과 중첩되어 이벤트 처리가 제대로 안 됨

3. **타이밍 이슈**: 재연결 시 각 계층의 초기화가 비동기적으로 진행되어 순서가 꼬일 가능성

4. **캐시 무효화 범위**: `exact: false` 옵션이 있는 경우와 없는 경우가 혼재하여 일부 쿼리가 무효화되지 않을 수 있음

## 7. 권장 개선 방안

### 7.1 즉시 개선 (Quick Fixes)

#### 1. QueryClient 참조 검증 로직 강화
```typescript
// 개선안: QueryClient 참조 비교 대신 인스턴스 ID 사용
class UserMessageSubscriptionManager {
  private queryClientId?: string
  
  async initialize(userId: string, queryClient: QueryClient) {
    const clientId = queryClient.getQueryCache().getAll()[0]?.queryHash // 또는 별도 ID 생성
    
    if (this.isInitialized && this.userId === userId && this.queryClientId === clientId) {
      return // 동일한 QueryClient, 재구독 불필요
    }
    
    // QueryClient가 변경된 경우만 참조 업데이트
    if (this.queryClientId !== clientId) {
      this.queryClient = queryClient
      this.queryClientId = clientId
    }
  }
}
```

#### 2. 구독 중복 방지 메커니즘 개선
```typescript
// 개선안: 채널 정리 완료 보장
class RealtimeCore {
  private async cleanupChannel(key: string): Promise<void> {
    const channel = this.subscriptions.get(key)?.channel
    if (channel) {
      try {
        await channel.unsubscribe()
        // 정리 완료까지 대기
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to cleanup channel ${key}:`, error)
      } finally {
        this.subscriptions.delete(key)
      }
    }
  }
}
```

#### 3. 에러 로깅 및 모니터링 강화
```typescript
// 개선안: 통합 로깅 시스템
class RealtimeLogger {
  static log(level: 'info' | 'warn' | 'error', layer: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      layer,
      message,
      data,
      stack: new Error().stack
    }
    
    console.log(`[${level.toUpperCase()}] [${layer}] ${message}`, data || '')
    
    // 중요 이벤트는 서버로 전송
    if (level === 'error') {
      // Send to monitoring service
    }
  }
}
```

### 7.2 구조적 개선 (Long-term)

#### 1. 계층 간 의존성 단순화
- 각 계층의 책임을 명확히 정의
- 양방향 의존성 제거
- 이벤트 기반 통신으로 전환

#### 2. 통합된 상태 관리 시스템 도입
```typescript
// 개선안: 중앙화된 연결 상태 관리
interface RealtimeState {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  subscriptions: Map<string, SubscriptionInfo>
  lastReconnectAt?: Date
  reconnectCount: number
}

class RealtimeStateManager {
  private state: RealtimeState
  private listeners: Set<(state: RealtimeState) => void>
  
  updateState(updates: Partial<RealtimeState>) {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }
}
```

#### 3. 재연결 로직 중앙화
```typescript
// 개선안: 통합 재연결 관리자
class ReconnectionManager {
  async handleReconnection() {
    // 1. 연결 재생성
    await ConnectionCore.recreateClient()
    
    // 2. 모든 계층 순차적 초기화
    await this.reinitializeLayers()
    
    // 3. 구독 복구
    await this.restoreSubscriptions()
    
    // 4. 캐시 무효화
    await this.invalidateCaches()
    
    // 5. UI 통지
    this.notifyUI()
  }
}
```

## 8. 테스트 계획

### 8.1 단위 테스트
- 각 계층의 독립적 테스트
- 재연결 시나리오 시뮬레이션
- 에러 처리 검증

### 8.2 통합 테스트
- 전체 계층 통합 시나리오
- 네트워크 불안정 상황 시뮬레이션
- 메모리 누수 검증

### 8.3 E2E 테스트
- 실제 사용자 시나리오
- UI 업데이트 검증
- 성능 모니터링

## 9. 결론

현재 실시간 연결 시스템은 기본적인 기능은 잘 동작하지만, 다음과 같은 개선이 필요합니다:

1. **QueryClient 참조 관리 개선** - UI 업데이트 문제의 근본 원인
2. **구독 중복 방지 강화** - 메모리 누수 및 성능 문제 방지
3. **계층 간 의존성 단순화** - 유지보수성 향상
4. **통합 로깅 및 모니터링** - 문제 진단 용이성 향상

이러한 개선을 통해 더 안정적이고 예측 가능한 실시간 연결 시스템을 구축할 수 있을 것입니다.