# PromiseManager - 다중탭 Promise 문제 해결 솔루션

KEPCO AI Community 프로젝트의 다중탭 환경에서 발생하는 Promise hang 문제를 해결하기 위한 Promise 관리자입니다.

## 🚨 문제 상황

- **백그라운드 탭에서 Promise가 resolve되지 않음**
- **탭 전환 시 누적된 Promise들이 동시 실행**
- **DB 연결 타임아웃으로 인한 무한 대기**
- **메모리 누수 및 성능 저하**

## ✅ 해결 방법

PromiseManager는 다음 기능을 제공합니다:

1. **Promise Timeout**: 모든 Promise에 타임아웃 적용
2. **Promise Cancellation**: AbortController를 통한 Promise 취소
3. **Promise Deduplication**: 동일한 key의 Promise 중복 방지
4. **Background Cleanup**: 백그라운드 전환 시 자동 정리

## 📦 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 앱 초기화 시 설정

```typescript
// src/app/layout.tsx 또는 app initialization
import { PromiseManager } from '@/lib/utils/promise-manager';

// 앱 시작 시 한 번만 호출
PromiseManager.initializeBackgroundCleanup();
```

## 🔧 사용법

### 기본 사용법

```typescript
import { PromiseManager } from '@/lib/utils/promise-manager';

// 기본 timeout (5초)
const result = await PromiseManager.withTimeout(
  fetch('/api/data').then(res => res.json())
);

// 커스텀 timeout과 key 설정
const userProfile = await PromiseManager.withTimeout(
  supabase.from('profiles').select('*').eq('id', userId),
  {
    timeout: 10000, // 10초
    key: 'user_profile_' + userId, // 중복 방지
    errorMessage: 'User profile fetch timeout'
  }
);
```

### 유틸리티 함수 사용

```typescript
import { 
  withDatabaseTimeout, 
  withApiTimeout, 
  withRealtimeTimeout 
} from '@/lib/utils/promise-manager';

// 데이터베이스 작업 (10초 timeout)
const stats = await withDatabaseTimeout(
  supabase.rpc('get_user_stats_v2', { p_user_id: userId }),
  'get_user_stats'
);

// API 호출 (8초 timeout)
const data = await withApiTimeout(
  fetch('/api/users/' + userId).then(res => res.json()),
  'user_api'
);

// 실시간 구독 (5초 timeout)
const channel = await withRealtimeTimeout(
  supabase.channel('public:contents').subscribe(),
  'contents_subscription'
);
```

## 🔄 기존 코드 통합

### 1. ConnectionCore 개선

```typescript
// Before - 문제가 있는 코드
await supabaseClient.auth.getSession() // 타임아웃 없음

// After - PromiseManager 적용
await PromiseManager.withTimeout(
  supabaseClient.auth.getSession(),
  { 
    timeout: 3000, 
    key: 'heartbeat',
    errorMessage: 'Heartbeat timeout' 
  }
);
```

### 2. React Query와 통합

```typescript
// hooks/features/useAuthV2.ts
const queryFn = async () => {
  return withDatabaseTimeout(
    supabase.auth.getUser(),
    'get_current_user'
  );
};

const { data: user } = useQuery({
  queryKey: ['auth', 'user'],
  queryFn,
  staleTime: 5 * 60 * 1000,
});
```

### 3. Realtime 구독 관리

```typescript
// lib/realtime/GlobalRealtimeManager.ts
private async subscribeToTable(tableName: string) {
  try {
    const channel = await withRealtimeTimeout(
      this.createChannelForTable(tableName),
      `subscribe_${tableName}`
    );
    
    this.channels.set(tableName, channel);
  } catch (error) {
    console.error(`Realtime subscription failed for ${tableName}:`, error);
    // 재시도 로직
    this.scheduleRetry(tableName);
  }
}
```

## 🎯 핵심 메서드

### PromiseManager.withTimeout()

Promise에 타임아웃과 취소 기능을 추가합니다.

```typescript
static async withTimeout<T>(
  promise: Promise<T>,
  options?: {
    timeout?: number;     // 타임아웃 (기본: 5000ms)
    key?: string;         // 중복 방지 키
    errorMessage?: string; // 커스텀 에러 메시지
  }
): Promise<T>
```

### PromiseManager.cancel()

특정 키의 Promise를 취소합니다.

```typescript
// 특정 Promise 취소
PromiseManager.cancel('user_profile_123');

// 모든 Promise 취소 (탭 배경화 시)
PromiseManager.cancelAll('background_transition');
```

### 상태 확인 메서드

```typescript
// 대기 중인 Promise 개수
const count = PromiseManager.getPendingCount();

// 대기 중인 Promise 키 목록
const keys = PromiseManager.getPendingKeys();

// 특정 Promise 대기 상태 확인
const isPending = PromiseManager.isPending('my_operation');
```

## 🧪 테스트

### 단위 테스트 실행

```bash
# 전체 테스트
npm test

# PromiseManager 테스트만
npm test promise-manager

# 커버리지와 함께
npm run test:coverage
```

### 테스트 작성 예시

```typescript
import { PromiseManager } from '../promise-manager';

describe('PromiseManager', () => {
  it('should timeout after specified duration', async () => {
    const slowPromise = new Promise(resolve => 
      setTimeout(resolve, 10000)
    );
    
    await expect(
      PromiseManager.withTimeout(slowPromise, { timeout: 100 })
    ).rejects.toThrow('Operation timeout');
  });
});
```

## 📊 성능 효과

### Before (개선 전)
- 백그라운드 복귀 시: **30초~무한대 대기**
- 메모리 사용량: **점진적 증가**
- DB 연결 복구: **불확실**

### After (개선 후)
- 백그라운드 복귀 시: **3초 이내 복구**
- 메모리 사용량: **안정적**
- DB 연결 복구: **최대 10초**

## 🚨 주의사항

### 1. 초기화 필수

```typescript
// 앱 시작 시 반드시 호출
PromiseManager.initializeBackgroundCleanup();
```

### 2. Key 네이밍 규칙

```typescript
// Good - 구체적이고 유니크한 키
const key = `user_profile_${userId}_${timestamp}`;

// Bad - 너무 일반적인 키
const key = 'data';
```

### 3. 타임아웃 설정

```typescript
// 작업 유형별 권장 타임아웃
const timeouts = {
  database: 10000,    // DB 작업: 10초
  api: 8000,          // API 호출: 8초
  realtime: 5000,     // 실시간 구독: 5초
  heartbeat: 3000,    // 하트비트: 3초
};
```

## 🔧 트러블슈팅

### 1. Promise가 여전히 hang되는 경우

```typescript
// 더 짧은 타임아웃 적용
await PromiseManager.withTimeout(promise, { timeout: 3000 });

// 디버깅 정보 확인
console.log('Pending:', PromiseManager.getPendingKeys());
```

### 2. 메모리 누수 의심 시

```typescript
// 정기적으로 상태 확인
setInterval(() => {
  const count = PromiseManager.getPendingCount();
  if (count > 50) {
    console.warn('Too many pending promises:', count);
  }
}, 10000);
```

### 3. 개발 환경에서 디버깅

```typescript
// 개발 환경에서만 상세 로그
if (process.env.NODE_ENV === 'development') {
  console.log('[PromiseManager] Operation:', operationName);
  console.log('[PromiseManager] Pending count:', PromiseManager.getPendingCount());
}
```

## 🔄 마이그레이션 가이드

### 기존 코드를 점진적으로 개선하는 방법:

1. **1단계: 핵심 영역부터**
   - ConnectionCore heartbeat
   - 사용자 인증 관련
   - 데이터베이스 쿼리

2. **2단계: 사용자 상호작용**
   - 폼 제출
   - 파일 업로드
   - 검색 기능

3. **3단계: 실시간 기능**
   - Realtime 구독
   - 알림 시스템
   - 라이브 업데이트

### 마이그레이션 체크리스트

- [ ] PromiseManager 초기화 코드 추가
- [ ] 핵심 DB 쿼리에 withDatabaseTimeout 적용
- [ ] API 호출에 withApiTimeout 적용
- [ ] Realtime 구독에 withRealtimeTimeout 적용
- [ ] 기존 테스트 업데이트
- [ ] 새 테스트 케이스 추가
- [ ] 성능 모니터링 설정

## 📚 참고 자료

- [MULTI_TAB_PROMISE_ANALYSIS.md](../../../docs/MULTI_TAB_PROMISE_ANALYSIS.md) - 문제 분석 문서
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Promise.race() MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

## 🤝 기여하기

버그 리포트, 기능 요청, Pull Request는 언제나 환영입니다!

---

*Last Updated: 2025-08-11*  
*Version: 1.0.0*