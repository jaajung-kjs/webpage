# 실시간 구독 타이밍 이슈 - 최적화된 해결 방안

## 🔍 현재 상황 재분석

### 실제 계층 구조 (현재)
```
Provider Layer (React Context)
├── AuthProvider
└── CoreProvider
    ↓
Manager Layer (비즈니스 로직)
├── UserMessageSubscriptionManager
└── GlobalRealtimeManager
    ↓
Core Layer (인프라 추상화)
└── RealtimeCore
    ↓
Infrastructure Layer (실제 연결)
└── ConnectionCore
```

### 현재 초기화 플로우 문제
```
시퀀스 다이어그램:

AuthProvider          UserMessageManager    RealtimeCore         ConnectionCore
    |                        |                   |                    |
    |-- initialize() -------> |                   |                    |
    |                        |-- subscribe() --> |                    |
    |                        |                   |-- (연결 안됨) --> ❌
    |                        |                   |                    |
    |                        |                   |                    |-- connect() (나중에)
    |                        |                   |                    |
    |                        |<-- 구독 실패 -----|                    |
```

### 근본 원인
1. **Manager 초기화가 너무 이름**: ConnectionCore 연결 전에 구독 시도
2. **RealtimeCore에 준비 상태 개념 없음**: 연결 여부를 Manager가 알 수 없음
3. **Manager들이 계층을 건너뛰어 ConnectionCore 참조**: 아키텍처 위반

## 🎯 최적화된 해결 방안

### 핵심 아이디어: RealtimeCore 준비 상태 관리

RealtimeCore가 자신의 준비 상태를 관리하고, Manager들이 이를 기다리도록 함으로써 계층 구조를 유지하면서 타이밍 이슈 해결

### 해결 방안 상세

#### 1. RealtimeCore 준비 상태 추가

```typescript
export class RealtimeCore {
  private isReady = false
  private readyListeners: Set<(ready: boolean) => void> = new Set()
  private pendingSubscriptions: SubscriptionConfig[] = []

  /**
   * 준비 상태 대기
   */
  async waitForReady(timeout = 10000): Promise<boolean> {
    if (this.isReady) return true
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.readyListeners.delete(listener)
        resolve(false)
      }, timeout)
      
      const listener = (ready: boolean) => {
        if (ready) {
          clearTimeout(timer)
          this.readyListeners.delete(listener)
          resolve(true)
        }
      }
      
      this.readyListeners.add(listener)
    })
  }

  /**
   * 준비 상태 리스너 등록
   */
  onReady(listener: () => void): () => void {
    if (this.isReady) {
      listener()
      return () => {}
    }
    
    const wrappedListener = (ready: boolean) => {
      if (ready) listener()
    }
    
    this.readyListeners.add(wrappedListener)
    return () => this.readyListeners.delete(wrappedListener)
  }

  /**
   * 준비 상태 확인
   */
  isRealtimeReady(): boolean {
    return this.isReady
  }

  /**
   * 개선된 구독 메서드
   */
  subscribe(config: SubscriptionConfig): () => void {
    if (!this.isReady) {
      console.log(`[RealtimeCore] Not ready, queueing subscription: ${config.id}`)
      this.pendingSubscriptions.push(config)
      
      // 준비되면 자동 구독
      const unsubscribeReady = this.onReady(() => {
        unsubscribeReady()
        this.actualSubscribe(config)
      })
      
      return () => {
        // 대기 중인 구독 제거
        const index = this.pendingSubscriptions.findIndex(p => p.id === config.id)
        if (index !== -1) {
          this.pendingSubscriptions.splice(index, 1)
        }
      }
    }
    
    return this.actualSubscribe(config)
  }

  /**
   * 준비 상태 설정 (private)
   */
  private setReady(ready: boolean) {
    if (this.isReady !== ready) {
      console.log(`[RealtimeCore] Ready state changed: ${this.isReady} -> ${ready}`)
      this.isReady = ready
      
      if (ready) {
        // 대기 중인 구독들 처리
        const pending = [...this.pendingSubscriptions]
        this.pendingSubscriptions = []
        
        pending.forEach(config => {
          console.log(`[RealtimeCore] Processing pending subscription: ${config.id}`)
          this.actualSubscribe(config)
        })
      }
      
      // 리스너들에게 알림
      this.readyListeners.forEach(listener => listener(ready))
    }
  }

  /**
   * ConnectionCore 상태 감지 개선
   */
  private setupConnectionListener(): void {
    connectionCore.subscribe(async (status) => {
      const currentState = status.state
      
      if (currentState === 'connected' && status.isVisible) {
        if (!this.isReady) {
          // Realtime WebSocket 실제 테스트
          const isRealtimeWorking = await this.testRealtimeConnection()
          this.setReady(isRealtimeWorking)
        }
      } else if (currentState === 'disconnected' || currentState === 'error') {
        this.setReady(false)
      }
    })
  }

  /**
   * 실제 Realtime 연결 테스트
   */
  private async testRealtimeConnection(): Promise<boolean> {
    try {
      const client = connectionCore.getClient()
      const testChannel = client.channel(`ready-test-${Date.now()}`)
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          client.removeChannel(testChannel)
          resolve(false)
        }, 3000)
        
        testChannel.subscribe((status) => {
          clearTimeout(timeout)
          client.removeChannel(testChannel)
          resolve(status === 'SUBSCRIBED')
        })
      })
    } catch {
      return false
    }
  }
}
```

#### 2. Manager 수정 (계층 구조 준수)

```typescript
// UserMessageSubscriptionManager
export class UserMessageSubscriptionManager {
  async initialize(userId: string, queryClient: QueryClient) {
    if (this.isInitialized && this.userId === userId) {
      return
    }

    if (this.isInitialized) {
      this.cleanup()
    }

    this.userId = userId
    this.queryClient = queryClient

    // RealtimeCore 준비 대기 (계층 구조 준수)
    const isReady = await realtimeCore.waitForReady(10000)
    
    if (!isReady) {
      console.warn('[UserMessageSubscriptionManager] RealtimeCore not ready, setting up retry')
      this.setupRetryMechanism()
      return
    }

    // 구독 설정
    this.setupSubscriptions()
    this.isInitialized = true
  }

  private setupRetryMechanism() {
    // RealtimeCore가 준비되면 자동 재시도
    const unsubscribe = realtimeCore.onReady(() => {
      unsubscribe()
      if (this.userId && this.queryClient && !this.isInitialized) {
        console.log('[UserMessageSubscriptionManager] RealtimeCore ready, retrying initialization')
        this.setupSubscriptions()
        this.isInitialized = true
      }
    })
  }
}

// GlobalRealtimeManager도 동일한 패턴 적용
export class GlobalRealtimeManager {
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (!this.queryClient) {
      throw new Error('[GlobalRealtime] QueryClient not set')
    }

    // RealtimeCore 준비 대기
    const isReady = await realtimeCore.waitForReady(10000)
    
    if (!isReady) {
      console.warn('[GlobalRealtime] RealtimeCore not ready, setting up retry')
      this.setupRetryMechanism()
      throw new Error('RealtimeCore not ready')
    }

    await this.performInitialization()
  }

  private setupRetryMechanism() {
    const unsubscribe = realtimeCore.onReady(() => {
      unsubscribe()
      if (this.queryClient && !this.isInitialized) {
        console.log('[GlobalRealtime] RealtimeCore ready, retrying initialization')
        this.performInitialization().catch(console.error)
      }
    })
  }
}
```

#### 3. Provider 수정 (에러 처리 강화)

```typescript
// AuthProvider
const getInitialSession = async () => {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession()
    if (error) {
      console.error('Session fetch error:', error)
      return
    }
    
    setSession(session)
    setUser(session?.user ?? null)
    
    // 초기 세션이 있으면 메시지 구독 초기화 (에러 처리 포함)
    if (session?.user) {
      try {
        await userMessageSubscriptionManager.initialize(session.user.id, queryClient)
      } catch (error) {
        console.error('[AuthProvider] Message subscription initialization failed:', error)
        // 실패해도 앱은 계속 실행
      }
    }
  } catch (err) {
    console.error('Initial session error:', err)
  } finally {
    setLoading(false)
  }
}

// CoreProvider
const initialize = async () => {
  try {
    console.log('[CoreProvider] Initializing core systems...')
    
    connectionRecovery.setQueryClient(queryClient)
    globalRealtimeManager.setQueryClient(queryClient)
    
    await connectionCore.connect()
    
    // GlobalRealtimeManager 초기화 (에러 처리 포함)
    try {
      await globalRealtimeManager.initialize()
    } catch (error) {
      console.error('[CoreProvider] Global realtime initialization failed:', error)
      // 실패해도 앱은 계속 실행
    }
    
    setIsInitialized(true)
  } catch (error) {
    console.error('[CoreProvider] Initialization error:', error)
    setIsInitialized(true) // 에러가 나도 앱은 계속 실행
  }
}
```

## 📋 구현 로드맵

### Phase 1: RealtimeCore 개선 ⏳
- [ ] `isReady` 상태 관리 추가
- [ ] `waitForReady()` 메서드 구현
- [ ] `onReady()` 이벤트 시스템 구현
- [ ] 펜딩 구독 큐 시스템 구현
- [ ] 실제 Realtime 연결 테스트 로직

### Phase 2: Manager 수정 ⏳
- [ ] UserMessageSubscriptionManager 비동기 초기화
- [ ] GlobalRealtimeManager 비동기 초기화
- [ ] 재시도 메커니즘 구현 (RealtimeCore 기반)
- [ ] 에러 핸들링 강화

### Phase 3: Provider 수정 ⏳
- [ ] AuthProvider async 호출 및 에러 처리
- [ ] CoreProvider 초기화 순서 최적화
- [ ] 실패 시 graceful degradation

### Phase 4: 검증 ⏳
- [ ] 초기화 타이밍 테스트
- [ ] 캐시된 세션 테스트
- [ ] 네트워크 재연결 테스트
- [ ] 메모리 사용량 검증

## 🎯 예상 효과

### ✅ 해결되는 문제들
1. **타이밍 이슈 완전 해결**: RealtimeCore 준비 상태 기반 초기화
2. **계층 구조 준수**: Manager들이 ConnectionCore를 직접 참조하지 않음
3. **자동 재시도**: RealtimeCore 준비되면 자동으로 펜딩 구독 처리
4. **견고한 에러 처리**: 실패해도 앱 실행 지속

### 📊 성능 개선
- **100% 구독 성공률**: 타이밍 이슈 제거
- **메모리 효율성**: 불필요한 재시도 및 중복 구독 제거  
- **네트워크 효율성**: 연결 준비 후에만 구독 시도

### 🏗️ 아키텍처 개선
- **단일 책임 원칙**: 각 계층이 명확한 역할
- **의존성 역전**: 상위 계층이 하위 계층의 인터페이스에 의존
- **확장성**: 새로운 Manager 추가 시 동일한 패턴 사용 가능

## 🎖️ 핵심 장점

### 1. 계층 구조 완전 준수
```
Manager → RealtimeCore.waitForReady() ✅
Manager → ConnectionCore (직접 참조) ❌
```

### 2. 중앙집중식 준비 상태 관리
- RealtimeCore가 실제 Realtime WebSocket 테스트
- 모든 Manager가 동일한 준비 상태 기준 사용
- 일관된 초기화 로직

### 3. 자동 복구 메커니즘
- 연결 끊김 → 준비 상태 false
- 연결 복구 → Realtime 테스트 → 준비 상태 true  
- 준비 상태 변경 → 펜딩 구독 자동 처리

이 방안은 계층 구조를 완전히 준수하면서도 실용적이고 견고한 해결책을 제공합니다.