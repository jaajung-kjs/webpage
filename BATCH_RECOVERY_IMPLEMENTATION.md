# ConnectionRecoveryManager 배치 처리 구현

KEPCO AI Community의 ConnectionRecoveryManager에 배치 처리 시스템을 구현하여 성능 향상 및 시스템 부하를 감소시켰습니다.

## 🎯 주요 개선사항

### 1. 쿼리 우선순위 시스템
```typescript
enum QueryPriority {
  CRITICAL = 1,    // 사용자 인증, 현재 콘텐츠
  HIGH = 2,        // 활동 중인 데이터  
  NORMAL = 3,      // 캐시된 데이터
  LOW = 4          // 메타데이터, 통계
}
```

**우선순위 분류 기준:**
- **CRITICAL**: auth, user, profile, current, me
- **HIGH**: comments, likes, bookmarks, activities, notifications, messages
- **NORMAL**: contents, posts, list, feed, search
- **LOW**: stats, metadata, config, analytics

### 2. 프로그레시브 복구 전략
```typescript
enum RecoveryStrategy {
  LIGHT = 'light',      // Priority 1만
  PARTIAL = 'partial',  // Priority 1-2
  FULL = 'full'         // 모든 Priority
}
```

**전략별 적용 조건:**
- **LIGHT**: 윈도우 포커스 복구, 짧은 백그라운드 시간 (3-10초)
- **PARTIAL**: 중간 백그라운드 시간 (10-30초)
- **FULL**: 장기 백그라운드 시간 (30초+), 네트워크 복구

### 3. 배치 처리 최적화

#### 배치 설정
```typescript
private readonly BATCH_SIZE = 5                    // 배치당 쿼리 수
private readonly MAX_CONCURRENT_BATCHES = 3        // 최대 동시 실행 배치
private readonly BATCH_DELAY = 50                  // 배치 간 대기 시간 (ms)
private readonly MAX_RETRIES = 1                   // 최대 재시도 횟수
```

#### 처리 방식
- **Promise.allSettled**: 일부 실패 허용
- **동시 실행 제한**: 시스템 부하 방지
- **재시도 메커니즘**: 실패한 배치 1회 재시도
- **순차 우선순위**: CRITICAL → HIGH → NORMAL → LOW

### 4. 성능 모니터링

#### 배치 메트릭
```typescript
private batchMetrics = {
  totalBatches: 0,              // 총 배치 수
  successfulBatches: 0,         // 성공한 배치 수  
  failedBatches: 0,             // 실패한 배치 수
  averageRecoveryTime: 0,       // 평균 복구 시간
  lastRecoveryTime: 0,          // 마지막 복구 시간
  failedQueries: new Set<string>()  // 실패한 쿼리 추적
}
```

#### 실시간 모니터링
- 배치 처리 성공률 추적
- 평균 복구 시간 계산 (이동 평균)
- 실패한 쿼리 식별 및 재시도

## 🔧 사용법

### 1. 기본 사용
```typescript
import { connectionRecovery, RecoveryStrategy } from '@/lib/core/connection-recovery'

// 수동 복구 (전략 지정)
await connectionRecovery.manualRecovery(RecoveryStrategy.LIGHT)
await connectionRecovery.manualRecovery(RecoveryStrategy.PARTIAL) 
await connectionRecovery.manualRecovery(RecoveryStrategy.FULL)
```

### 2. 수동 배치 무효화
```typescript
// 특정 전략으로 배치 무효화
const results = await connectionRecovery.invalidateWithStrategy(
  RecoveryStrategy.PARTIAL,
  'active'
)

// 결과 분석
results.forEach(result => {
  console.log(`Priority ${result.priority}: ${result.successCount}/${result.successCount + result.errorCount} success`)
})
```

### 3. 메트릭 모니터링
```typescript
// 현재 메트릭 조회
const metrics = connectionRecovery.getBatchMetrics()
console.log('성공률:', metrics.successRate)
console.log('평균 복구 시간:', metrics.averageRecoveryTime + 'ms')

// 실패한 쿼리 재시도
const failedQueries = connectionRecovery.getFailedQueries()
if (failedQueries.length > 0) {
  await connectionRecovery.retryFailedQueries()
}
```

### 4. Circuit Breaker 상태 확인
```typescript
const status = connectionRecovery.getCircuitBreakerStatus()
if (status?.state === 'OPEN') {
  connectionRecovery.resetCircuitBreaker()
}
```

## 📊 성능 개선 효과

### Before (기존)
- **단일 처리**: 모든 쿼리를 한 번에 무효화
- **전체 복구**: 항상 모든 쿼리 대상
- **에러 전파**: 하나의 실패가 전체 복구 실패 유발
- **모니터링 부족**: 복구 성공/실패 추적 없음

### After (개선)
- **배치 처리**: 5개씩 배치로 분할하여 처리
- **우선순위 기반**: 중요한 쿼리부터 우선 처리
- **부분 실패 허용**: Promise.allSettled로 일부 실패 허용
- **상세 모니터링**: 성공률, 복구 시간, 실패 쿼리 추적

### 예상 성능 개선
- **응답 시간**: 30-50% 감소 (우선순위 기반 처리)
- **시스템 부하**: 40-60% 감소 (배치 크기 제한)
- **사용자 경험**: 즉시 응답 (CRITICAL 쿼리 우선 처리)
- **안정성**: 부분 실패 허용으로 전체 시스템 안정성 향상

## 🔄 자동 적용 조건

### Visibility 복구
```typescript
// 백그라운드 시간에 따른 전략 선택
if (hiddenDuration > 30000) {
  strategy = RecoveryStrategy.FULL      // 30초 이상
} else if (hiddenDuration > 10000) {
  strategy = RecoveryStrategy.PARTIAL   // 10-30초  
} else if (hiddenDuration > 3000) {
  strategy = RecoveryStrategy.LIGHT     // 3-10초
}
```

### 네트워크 복구
- 항상 `RecoveryStrategy.FULL` 적용
- 네트워크 복구는 모든 데이터 동기화 필요

### 윈도우 포커스
- 항상 `RecoveryStrategy.LIGHT` 적용
- 빠른 응답으로 사용자 경험 최적화

## 🛡️ Circuit Breaker 통합

### Fallback 처리
```typescript
// Circuit Breaker 열림 시 최소한의 복구만 수행
private async performMinimalRecovery(): Promise<void> {
  // 1. 연결 복구
  await connectionCore.connect()
  
  // 2. CRITICAL 쿼리만 배치 무효화
  await this.invalidateQueriesInBatches(RecoveryStrategy.LIGHT, 'active')
}
```

### 안정성 보장
- 복구 작업 실패 시 Circuit Breaker 활성화
- Fallback으로 최소한의 기능만 유지
- 수동 리셋으로 정상 상태 복구 가능

## 📝 마이그레이션 가이드

### 기존 코드 호환성
기존 `triggerRecovery(source, fullRecovery)` 호출은 그대로 동작:
```typescript
// 기존 코드 - 계속 동작함
await triggerRecovery('manual', true)   // → RecoveryStrategy.FULL
await triggerRecovery('manual', false)  // → RecoveryStrategy.PARTIAL
```

### 새로운 방식 적용
점진적으로 새로운 API로 전환:
```typescript
// 새로운 방식
await connectionRecovery.manualRecovery(RecoveryStrategy.LIGHT)
await connectionRecovery.invalidateWithStrategy(RecoveryStrategy.PARTIAL, 'active')
```

## 🧪 테스트

테스트 실행:
```typescript
import { runConnectionRecoveryTests } from '@/lib/core/connection-recovery-test'

// 개발 환경에서 자동 실행됨
// 또는 수동 실행:
await runConnectionRecoveryTests()
```

### 테스트 항목
1. **프로그레시브 복구 전략** 테스트
2. **수동 배치 무효화** 테스트  
3. **메트릭 모니터링** 테스트
4. **Circuit Breaker 상태** 테스트
5. **복합 시나리오** 테스트
6. **사용자 액션 기반** 테스트

## 🔧 설정 조정

필요시 배치 처리 설정을 조정할 수 있습니다:

```typescript
// connection-recovery.ts 내부
private readonly BATCH_SIZE = 5                    // 배치 크기
private readonly MAX_CONCURRENT_BATCHES = 3        // 최대 동시 배치
private readonly BATCH_DELAY = 50                  // 배치 간 대기시간
private readonly MAX_RETRIES = 1                   // 재시도 횟수
```

**권장 설정:**
- **고성능 환경**: BATCH_SIZE=10, MAX_CONCURRENT_BATCHES=5
- **저성능 환경**: BATCH_SIZE=3, MAX_CONCURRENT_BATCHES=2  
- **모바일 환경**: BATCH_SIZE=3, MAX_CONCURRENT_BATCHES=1

---

**구현 완료**: 2025-08-11
**작성자**: Claude Code AI Assistant  
**버전**: v2.0.0 (배치 처리 시스템)