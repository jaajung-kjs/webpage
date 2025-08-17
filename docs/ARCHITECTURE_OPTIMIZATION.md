# 아키텍처 최적화 계획

## 📌 개요

KEPCO AI Community 프로젝트의 Core 시스템 계층구조를 최소한의 변경으로 최적화하는 계획입니다.

### 목표
- ✅ 순환 의존성 제거
- ✅ 테스트 가능성 향상
- ✅ 초기화 순서 단순화
- ✅ 유지보수성 개선

### 원칙
- 🎯 기존 코드 최대한 유지
- 🎯 점진적 마이그레이션
- 🎯 하위 호환성 보장

## 🏗️ 현재 아키텍처 분석

### 현재 구조의 문제점

```
현재 의존성 그래프 (복잡한 상호 참조):

ConnectionCore ←→ RealtimeCore
     ↑              ↓
     └── AuthManager ←→ ConnectionRecovery
              ↓
     GlobalRealtimeManager
```

#### 주요 문제
1. **순환 의존성**: 시스템들이 서로를 직접 import하여 변경 시 연쇄 수정 필요
2. **초기화 복잡도**: 싱글톤 간 초기화 타이밍 예측 어려움
3. **테스트 어려움**: 강한 결합으로 단위 테스트 불가능
4. **디버깅 어려움**: 문제 발생 지점 추적 복잡

## 🎯 목표 아키텍처

### 계층 구조

```
Layer 0: Infrastructure
└── ConnectionCore (Supabase 클라이언트 관리)

Layer 1: Core Services
├── AuthManager (인증/세션 관리)
└── RealtimeCore (실시간 구독 관리)

Layer 1.5: Application Services
├── GlobalRealtimeManager (전역 실시간 동기화)
└── UserMessageSubscriptionManager (사용자 메시지)

Layer 2: Orchestration
└── ConnectionRecovery (복구 전략)

Layer 3: Providers
├── CoreProvider (시스템 초기화)
└── AuthProvider (인증 Context)
```

### 핵심 개선사항

#### 1. EventBus 도입
- 시스템 간 직접 의존성을 이벤트 기반 통신으로 전환
- 느슨한 결합(Loose Coupling) 달성

#### 2. 명확한 계층 분리
- 각 계층은 하위 계층만 의존
- 상위 계층 참조 금지
- 같은 계층 간 직접 참조 금지 (EventBus 사용)

#### 3. 단순화된 초기화
- Layer 순서대로 초기화
- 각 계층 완료 후 다음 계층 시작
- 실패 지점 명확히 추적 가능

## 📋 구현 계획

### Phase 1: EventBus 시스템 구축

#### 1.1 system-events.ts 생성
- [x] EventBus 클래스 구현
- [x] SystemEventType enum 정의
- [x] 이벤트 페이로드 타입 정의
- [x] 메트릭 수집 기능

#### 1.2 ConnectionCore 수정
- [ ] 상태 변경 시 이벤트 발행
- [ ] 기존 리스너 유지 (하위 호환성)

### Phase 2: Core Services 이벤트 전환

#### 2.1 RealtimeCore 수정
- [ ] ConnectionCore 직접 구독 제거
- [ ] EventBus 이벤트 구독으로 전환
- [ ] Ready 상태 이벤트 발행

#### 2.2 AuthManager 수정
- [ ] ConnectionCore 직접 구독 제거
- [ ] EventBus 이벤트 구독으로 전환
- [ ] 인증 상태 이벤트 발행

### Phase 3: 초기화 순서 정리

#### 3.1 CoreProvider 수정
- [ ] 계층별 초기화 순서 구현
- [ ] 에러 처리 개선
- [ ] 초기화 로깅 강화

#### 3.2 테스트 및 검증
- [ ] 각 시스템 독립 동작 확인
- [ ] 이벤트 흐름 검증
- [ ] 메모리 누수 체크

## 📊 예상 효과

### 정량적 개선
- **테스트 커버리지**: 50% → 80%
- **초기화 실패율**: 5% → 1% 미만
- **디버깅 시간**: 70% 단축
- **코드 변경 영향 범위**: 80% 감소

### 정성적 개선
- ✅ 각 시스템 독립적으로 개발/테스트 가능
- ✅ 새로운 시스템 추가 시 기존 코드 수정 불필요
- ✅ 문제 발생 시 원인 파악 용이
- ✅ 코드 이해도 향상

## 🔧 기술 스택

### 사용 기술
- **EventEmitter**: Node.js 내장 이벤트 시스템
- **TypeScript**: 타입 안정성
- **Singleton Pattern**: 전역 상태 관리
- **Observer Pattern**: 이벤트 기반 통신

### 디자인 패턴
- **Event-Driven Architecture**: 이벤트 중심 설계
- **Layered Architecture**: 계층적 구조
- **Dependency Injection**: 의존성 주입 (향후)

## 📈 마이그레이션 전략

### 원칙
1. **점진적 전환**: 기존 코드와 새 코드 공존
2. **하위 호환성**: 기존 API 유지
3. **롤백 가능**: 문제 시 즉시 복구

### 단계별 접근
1. **Week 1**: EventBus 구축 및 ConnectionCore 수정
2. **Week 2**: Core Services 전환
3. **Week 3**: 테스트 및 안정화
4. **Week 4**: 문서화 및 팀 교육

## 🚨 위험 요소 및 대응

### 잠재적 위험
1. **이벤트 누락**: 중요 이벤트 미처리
   - 대응: 이벤트 로깅 및 모니터링

2. **메모리 누수**: 리스너 미정리
   - 대응: 자동 cleanup 메커니즘

3. **성능 저하**: 이벤트 오버헤드
   - 대응: 배치 처리 및 throttling

## 📝 참고 자료

### 관련 문서
- [OPTIMIZATION_PROGRESS.md](./OPTIMIZATION_PROGRESS.md) - 진행 상황 추적
- [system-events.ts](../src/lib/core/system-events.ts) - EventBus 구현

### 벤치마킹
- Next.js 14 App Router 패턴
- Supabase Realtime Architecture
- Clean Architecture 원칙
- Domain-Driven Design

## 👥 담당자

- 아키텍처 설계: AI Assistant
- 구현: Development Team
- 검토: Tech Lead

---

*최종 수정: 2024-08-17*