# Realtime Architecture Analysis & Refactoring Plan

## 현재 계층 구조 분석 (2025-08-16)

### 1. ConnectionCore (최하위 레벨)
**위치**: `src/lib/core/connection-core.ts`
**역할**: Supabase 클라이언트 연결 상태 관리

**현재 기능**:
- ✅ 연결 상태 관리 (disconnected, connecting, connected, error, suspended)
- ✅ 자동 재연결 (scheduleReconnect, exponential backoff)
- ✅ Circuit Breaker 패턴
- ✅ Heartbeat 모니터링
- ✅ 네트워크 상태 감지 (online/offline 이벤트)
- ✅ 백그라운드/포그라운드 전환 처리
- ✅ 상태 구독 메커니즘 (`subscribe` 메서드)

### 2. RealtimeCore (중간 레벨)
**위치**: `src/lib/core/realtime-core.ts`
**역할**: 실시간 채널 구독 관리

**현재 기능**:
- ✅ ConnectionCore 상태 구독 (`setupConnectionListener`)
- ✅ 연결 복구 시 자동 재구독 (`resubscribeAll`)
- ✅ 구독/구독해제 인터페이스
- ✅ 채널 상태 관리
- ❌ 재연결 로직 없음 (ConnectionCore에 의존)

**ConnectionCore 연동**:
```typescript
// RealtimeCore가 이미 ConnectionCore 상태를 구독 중
connectionCore.subscribe(async (status) => {
  if (currentState === 'connected' && status.isVisible) {
    await this.resubscribeAll() // 자동 재구독
  }
})
```

### 3. GlobalRealtimeManager (최상위 레벨)
**위치**: `src/lib/realtime/GlobalRealtimeManager.ts`
**역할**: 공용 테이블(content_v2, users_v2 등) 구독 관리

**현재 기능**:
- ✅ RealtimeCore를 통한 구독
- ❌ 자체 재연결 로직 (`subscribeWithRetry` - 중복!)
- ❌ 자체 Circuit Breaker (중복!)
- ❌ 자체 재연결 처리 (`handleReconnect` - 중복!)

### 4. UserMessageSubscriptionManager (최상위 레벨)
**위치**: `src/lib/realtime/UserMessageSubscriptionManager.ts`
**역할**: 사용자별 메시지 구독 관리

**현재 기능**:
- ✅ RealtimeCore를 통한 구독
- ❌ 자체 재연결 로직 (`handleSubscriptionError`, `reconnect` - 중복!)
- ❌ 네트워크 리스너 (`setupNetworkListeners` - 중복!)
- ❌ 재연결 타이머 관리 (중복!)

## 문제점 정리

### 1. 재연결 로직 중복
- **ConnectionCore**: ✅ 마스터 재연결 (올바름)
- **RealtimeCore**: ✅ ConnectionCore 이벤트 수신하여 재구독 (올바름)
- **GlobalRealtimeManager**: ❌ 자체 재연결 (중복!)
- **UserMessageSubscriptionManager**: ❌ 자체 재연결 (중복!)

### 2. 이벤트 흐름
현재:
```
네트워크 복구
├── ConnectionCore가 감지 ✅
├── GlobalRealtimeManager도 감지 ❌ (중복)
└── UserMessageSubscriptionManager도 감지 ❌ (중복)
```

올바른 흐름:
```
네트워크 복구
└── ConnectionCore가 감지
    └── RealtimeCore에 이벤트 전파
        ├── GlobalRealtimeManager 자동 재구독
        └── UserMessageSubscriptionManager 자동 재구독
```

## 리팩토링 계획

### Phase 1: GlobalRealtimeManager 정리
**제거할 것들**:
1. `subscribeWithRetry` 메서드
2. `waitForChannelReady` 메서드 
3. `circuitBreaker` Map
4. `isCircuitBreakerOpen`, `updateCircuitBreaker`, `resetCircuitBreaker` 메서드들
5. `reconnectAttempts`, `maxReconnectAttempts` 필드
6. `forceReconnect` 메서드

**수정할 것들**:
1. 각 구독 메서드에서 단순히 `realtimeCore.subscribe` 호출만
2. 에러 처리는 `onError` 콜백에서만

### Phase 2: UserMessageSubscriptionManager 정리
**제거할 것들**:
1. `reconnectTimer`, `reconnectAttempts`, `maxReconnectAttempts` 필드
2. `handleSubscriptionError` 메서드
3. `reconnect` 메서드
4. `setupNetworkListeners` 메서드
5. `hasNetworkListeners` 필드

**수정할 것들**:
1. `setupSubscriptions`에서 `onError` 시 재연결 로직 제거
2. `initialize`에서 `setupNetworkListeners` 호출 제거

### Phase 3: 테스트 및 검증
1. 네트워크 끊김/복구 테스트
2. 백그라운드/포그라운드 전환 테스트
3. 로그인/로그아웃 시 구독 관리 테스트

## 예상 결과

### Before (현재)
- 3개 레이어에서 각자 재연결 시도
- 중복된 네트워크 이벤트 리스너
- 일관성 없는 재연결 전략
- 복잡한 코드

### After (개선 후)
- ConnectionCore만 재연결 관리
- RealtimeCore가 자동 재구독
- Manager들은 비즈니스 로직만
- 단순하고 명확한 코드

## 진행 상황 추적

### ✅ 완료된 작업
- [x] 현재 아키텍처 분석
- [x] 문제점 파악
- [x] 리팩토링 계획 수립
- [x] MD 파일 작성 (REALTIME_ARCHITECTURE_ANALYSIS.md)
- [x] GlobalRealtimeManager 재연결 로직 제거
  - [x] circuitBreaker Map 필드 제거
  - [x] CircuitBreakerState 인터페이스 제거
  - [x] Circuit Breaker 관련 메서드 제거 (cleanup에서 제거)
  - [x] forceReconnect 메서드를 forceReinitialize로 변경 (재연결 로직 제거)
  - [x] 타입 export에서 CircuitBreakerState 제거
- [x] UserMessageSubscriptionManager 재연결 로직 제거
  - [x] reconnectTimer, reconnectAttempts, maxReconnectAttempts 필드 제거
  - [x] hasNetworkListeners 필드 제거
  - [x] handleSubscriptionError 메서드 제거
  - [x] reconnect 메서드 제거
  - [x] setupNetworkListeners 메서드 제거
  - [x] onError 핸들러에서 재연결 로직 제거
  - [x] cleanup에서 reconnectTimer 관련 코드 제거

### 🔄 진행 중
- [ ] 테스트 및 검증
  - [x] 빌드 테스트 통과
  - [ ] 네트워크 끊김/복구 테스트 필요
  - [ ] 백그라운드/포그라운드 전환 테스트 필요
  - [ ] 로그인/로그아웃 시 구독 관리 테스트 필요

## 리팩토링 결과

### 제거된 중복 코드
1. **GlobalRealtimeManager**:
   - Circuit Breaker 로직 제거 (ConnectionCore에 이미 있음)
   - 재연결 시도 로직 제거 (RealtimeCore가 처리)
   - forceReconnect를 단순한 forceReinitialize로 변경

2. **UserMessageSubscriptionManager**:
   - 네트워크 상태 리스너 제거 (ConnectionCore가 처리)
   - 재연결 타이머 및 로직 제거 (RealtimeCore가 처리)
   - 에러 시 재시도 로직 제거 (RealtimeCore가 처리)

### 현재 아키텍처 (개선 후)
```
네트워크 이벤트 (online/offline, focus/blur)
└── ConnectionCore가 감지 및 처리
    └── RealtimeCore가 상태 변경 감지하여 자동 재구독
        ├── GlobalRealtimeManager는 비즈니스 로직만 처리
        └── UserMessageSubscriptionManager는 비즈니스 로직만 처리
```

### 주요 개선사항
1. **단일 책임 원칙**: 각 레이어가 하나의 책임만 가짐
2. **중복 제거**: 재연결 로직이 ConnectionCore 한 곳에만 존재
3. **자동화**: RealtimeCore가 ConnectionCore 상태를 감지하여 자동 재구독
4. **단순화**: Manager 레이어는 비즈니스 로직에만 집중

## 참고 사항

### RealtimeCore의 현재 재구독 로직
```typescript
// ConnectionCore 상태 변경 감지
if (currentState === 'connected' && status.isVisible) {
  if (previousState === 'disconnected' || previousState === 'error') {
    await this.resubscribeAll() // 모든 구독 재설정
  }
}
```

이미 RealtimeCore가 ConnectionCore의 상태를 감지하여 자동으로 재구독하고 있으므로,
Manager 레벨에서 추가 재연결 로직은 불필요합니다.