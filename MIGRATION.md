# KEPCO AI Community - 현재 아키텍처 구조

## 🎉 TanStack Query 마이그레이션 완료! (2025-01-06)

### ✅ 달성 사항
- **커스텀 QueryCache 제거** → **TanStack Query로 100% 전환**
- **모든 컴포넌트 마이그레이션 완료**
- **11개 Feature Hooks 생성 완료**
- **deprecated 파일 모두 삭제 완료** (-7,000+ lines)

---

## 🏗️ 현재 아키텍처 구조 (최종 버전)

### 1. 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
│                        (Pages & API)                         │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                     CoreProvider                            │
│              (TanStack Query + Auth Context)                │
└────────────────────────┬───────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┬──────────────┐
          │              │              │              │
┌─────────▼────┐ ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼─────┐
│Feature Hooks │ │ ConnectionCore│ │AuthManager│ │RealtimeCore│
│(11 modules)  │ │  (Singleton)  │ │ (Context) │ │(Subscriptions)│
└──────────────┘ └───────┬──────┘ └──────────┘ └─────────────┘
                         │
                ┌────────▼────────┐
                │ Supabase Client │
                │   (Database)     │
                └─────────────────┘
```

### 2. Core 시스템 계층 구조

#### 2.1 ConnectionCore (`/lib/core/connection-core.ts`)
```typescript
// Singleton 패턴으로 구현된 연결 관리자
class ConnectionCore {
  private static instance: ConnectionCore
  private supabase: SupabaseClient
  private connectionState: ConnectionState
  
  // 주요 기능:
  - 자동 재연결 로직
  - 연결 상태 모니터링
  - 에러 복구 메커니즘
  - 백그라운드 탭 복귀 시 자동 연결
}

// Export
export const supabaseClient = ConnectionCore.getInstance().getClient()
```

#### 2.2 AuthManager (`/lib/core/auth-manager.ts`)
```typescript
class AuthManager {
  // 인증 상태 관리
  - 세션 관리 및 자동 갱신
  - 역할 기반 접근 제어 (RBAC)
  - 이메일 인증 상태 추적
  - 자동 로그아웃 타이머
  
  // 역할 계층:
  - guest → pending → member → vice-leader → leader → admin
}
```

#### 2.3 RealtimeCore (`/lib/core/realtime-core.ts`)
```typescript
class RealtimeCore {
  private channels: Map<string, RealtimeChannel>
  
  // 실시간 기능:
  - 메시지 실시간 동기화
  - 댓글 실시간 업데이트
  - 온라인 사용자 presence
  - 자동 재구독 메커니즘
}
```

### 3. Provider 계층 구조

#### 3.1 CoreProvider (`/providers/CoreProvider.tsx`)
```typescript
export function CoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools />
      </AuthProvider>
    </QueryClientProvider>
  )
}

// QueryClient 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5분
      gcTime: 10 * 60 * 1000,         // 10분 (구 cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }
  }
})
```

#### 3.2 AuthProvider (`/providers/AuthProvider.tsx`)
```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Tables<'users'> | null>(null)
  
  // 제공 기능:
  - useAuth() hook
  - 인증 상태 실시간 동기화
  - 프로필 자동 로드
  - 권한 검증 헬퍼
}
```

### 4. Feature Hooks 구조 (11개 모듈)

#### 4.1 기본 패턴
```typescript
// 모든 Feature Hook의 공통 패턴
export function use[Feature]() {
  return useQuery({
    queryKey: ['feature-name', ...params],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('table')
        .select('*')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000
  })
}

export function useCreate[Feature]() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => { /* ... */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-name'] })
    }
  })
}
```

#### 4.2 Feature Hooks 목록

| Hook 파일 | 주요 exports | 용도 |
|-----------|--------------|------|
| `useContent.ts` | useContentList, useContentDetail, useCreateContent, useUpdateContent, useDeleteContent | 콘텐츠 CRUD |
| `useProfile.ts` | useUserProfile, useUserStats, useUserActivities, useUpdateProfile, useUploadAvatar | 프로필 관리 |
| `useMembers.ts` | useMembers, useMemberDetail, useUpdateMemberRole | 회원 관리 |
| `useSearch.ts` | useSearch, useSearchSuggestions | 통합 검색 |
| `useBookmarks.ts` | useBookmarks, useToggleBookmark | 북마크 관리 |
| `useReports.ts` | useReports, useCreateReport, useUpdateReport | 신고 관리 |
| `useImageUpload.ts` | useUploadImage, useDeleteImage | 이미지 업로드 |
| `useActivities.ts` | useActivities, useCreateActivity, useJoinActivity | 활동 관리 |
| `useComments.ts` | useComments, useCreateComment, useUpdateComment, useDeleteComment | 댓글 관리 |
| `useMessages.ts` | useConversations, useMessages, useSendMessage, useMarkAsRead | 메시지 관리 |
| `useMembership.ts` | useMembershipApplications, useCreateMembershipApplication, useUpdateMembershipApplication | 가입 신청 |

### 5. 실시간 동기화 구조

#### 5.1 RealtimeSync (`/lib/cache/realtime-sync.ts`)
```typescript
export class RealtimeSync {
  // TanStack Query와 Realtime 통합
  subscribeToTable(table: string, queryKey: QueryKey) {
    RealtimeCore.subscribe(table, {
      onInsert: () => queryClient.invalidateQueries({ queryKey }),
      onUpdate: () => queryClient.invalidateQueries({ queryKey }),
      onDelete: () => queryClient.invalidateQueries({ queryKey })
    })
  }
}
```

#### 5.2 실시간 기능 적용 영역
- **메시지**: 새 메시지 즉시 표시
- **댓글**: 실시간 댓글 업데이트
- **좋아요**: 즉각적인 좋아요 반영
- **온라인 상태**: 사용자 presence

### 6. 데이터 흐름 아키텍처

```
User Action → Component → Feature Hook → TanStack Query
                                              ↓
                                        ConnectionCore
                                              ↓
                                        Supabase Client
                                              ↓
                                         PostgreSQL
                                              ↓
                                        Response Data
                                              ↓
                                     TanStack Query Cache
                                              ↓
                                     Component Re-render
```

### 7. 에러 처리 및 복구 전략

#### 7.1 계층별 에러 처리
```typescript
// Component Level
try {
  await createMutation.mutateAsync(data)
} catch (error) {
  toast.error('작업 실패')
}

// Hook Level
onError: (error) => {
  console.error('Hook error:', error)
  // 자동 재시도 로직
}

// ConnectionCore Level
private async handleConnectionError() {
  // 자동 재연결
  // 백오프 전략
  // 최대 재시도 제한
}
```

#### 7.2 복구 메커니즘
- **자동 재연결**: 네트워크 끊김 시 자동 복구
- **백그라운드 복귀**: 탭 전환 시 데이터 자동 갱신
- **옵티미스틱 업데이트**: 즉각적인 UI 반영 후 서버 동기화
- **롤백 메커니즘**: 실패 시 이전 상태로 자동 복구

### 8. 성능 최적화 전략

#### 8.1 캐싱 전략
```typescript
// 기본 캐싱 정책
staleTime: 5 * 60 * 1000      // 5분간 fresh
gcTime: 10 * 60 * 1000        // 10분간 메모리 보관

// 무한 스크롤
useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor
})

// 프리페칭
queryClient.prefetchQuery({
  queryKey: ['post', id],
  queryFn: () => fetchPost(id)
})
```

#### 8.2 번들 최적화
- Dynamic imports for 코드 스플리팅
- Tree shaking으로 불필요한 코드 제거
- Lazy loading for 컴포넌트

### 9. 보안 아키텍처

#### 9.1 인증 플로우
```
Login → Supabase Auth → JWT Token → Session Storage
         ↓                              ↓
    AuthManager ← ─────────────── Auto Refresh
         ↓
    Auth Context → useAuth() → Components
```

#### 9.2 권한 검증
```typescript
// RLS (Row Level Security) - Database Level
CREATE POLICY "Users can only see their own data"
ON messages FOR SELECT
USING (auth.uid() = user_id);

// Application Level
if (!isMember) {
  throw new Error('회원만 접근 가능')
}

// Component Level
<PermissionGate requiredRole="admin">
  <AdminPanel />
</PermissionGate>
```

### 10. 개발 가이드라인

#### 10.1 새로운 기능 추가 시
1. **Feature Hook 생성**: `/hooks/features/useNewFeature.ts`
2. **TanStack Query 패턴 적용**: useQuery, useMutation
3. **타입 안전성**: database.types.ts 활용
4. **에러 처리**: try-catch 및 onError 콜백
5. **실시간 필요 시**: RealtimeCore 활용

#### 10.2 코드 컨벤션
```typescript
// ✅ Good
const { data, isLoading } = useContentList('post')

// ❌ Bad  
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
useEffect(() => { fetchData() }, [])
```

#### 10.3 타입 관리
```typescript
// database.types.ts에서 자동 생성된 타입 사용
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

type User = Tables<'users'>
type NewUser = TablesInsert<'users'>
type UserUpdate = TablesUpdate<'users'>
```

### 11. 모니터링 및 디버깅

#### 11.1 React Query DevTools
```typescript
// 개발 환경에서 자동 활성화
if (process.env.NODE_ENV === 'development') {
  return <ReactQueryDevtools initialIsOpen={false} />
}
```

#### 11.2 Connection 모니터링
```typescript
// 브라우저 콘솔에서 실행
ConnectionCore.getInstance().getState()  // 연결 상태
ConnectionCore.getInstance().getMetrics() // 성능 메트릭
```

#### 11.3 로깅 시스템
```typescript
// 개발 환경 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('[ConnectionCore]', message)
  console.log('[AuthManager]', authState)
  console.log('[RealtimeCore]', subscription)
}
```

---

## 📊 마이그레이션 전후 비교

| 측면 | 이전 (커스텀 시스템) | 현재 (TanStack Query) |
|------|---------------------|---------------------|
| **코드량** | 7,500+ lines | 1,000 lines |
| **복잡도** | 높음 (자체 구현) | 낮음 (표준 라이브러리) |
| **유지보수** | 어려움 | 쉬움 |
| **성능** | 수동 최적화 필요 | 자동 최적화 |
| **개발 속도** | 느림 | 빠름 |
| **타입 안전성** | 부분적 | 완전한 타입 지원 |
| **실시간 동기화** | 복잡한 로직 | 간단한 통합 |
| **에러 처리** | 수동 처리 | 자동 재시도 |
| **DevTools** | 없음 | React Query DevTools |
| **커뮤니티** | 없음 | 활발한 커뮤니티 |

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with CoreProvider
│   └── [routes]/          # 각 페이지 라우트
│
├── components/            # UI 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   └── [features]/       # 기능별 컴포넌트
│
├── hooks/                # Custom Hooks
│   ├── core/            # 핵심 시스템 hooks
│   │   ├── useAuth.ts
│   │   ├── useConnection.ts
│   │   └── useRealtimeQuery.ts
│   └── features/        # 기능별 hooks (11개)
│       ├── useContent.ts
│       ├── useProfile.ts
│       ├── useMembers.ts
│       └── ...
│
├── lib/                  # 라이브러리 및 유틸리티
│   ├── core/            # 핵심 시스템
│   │   ├── connection-core.ts
│   │   ├── auth-manager.ts
│   │   └── realtime-core.ts
│   ├── cache/           # 캐싱 관련
│   │   └── realtime-sync.ts
│   └── utils/           # 유틸리티 함수
│
└── providers/           # React Context Providers
    ├── index.tsx       # Export 통합
    ├── CoreProvider.tsx
    └── AuthProvider.tsx
```

## 🚦 마이그레이션 체크포인트

### 새 기능 추가 시 체크리스트
- [ ] Feature Hook 생성 (`/hooks/features/`)
- [ ] TanStack Query 패턴 사용 (useQuery/useMutation)
- [ ] database.types.ts 타입 활용
- [ ] 에러 처리 구현
- [ ] 실시간 필요 시 RealtimeCore 연동
- [ ] 로딩/에러 상태 UI 처리

### 코드 리뷰 체크리스트
- [ ] useState/useEffect 대신 useQuery 사용
- [ ] 직접 supabaseClient 호출 대신 Feature Hook 사용
- [ ] 타입 assertion (as any) 최소화
- [ ] 적절한 staleTime/gcTime 설정
- [ ] 옵티미스틱 업데이트 고려

## 🔧 트러블슈팅 가이드

### 일반적인 문제 해결

#### 1. 데이터가 업데이트되지 않음
```typescript
// 문제: mutation 후 데이터 갱신 안됨
// 해결: invalidateQueries 추가
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['posts'] })
}
```

#### 2. 실시간 동기화 안됨
```typescript
// 문제: 다른 사용자의 변경사항이 보이지 않음
// 해결: RealtimeCore 구독 확인
useEffect(() => {
  const subscription = RealtimeCore.subscribe('messages', {
    onUpdate: () => refetch()
  })
  return () => subscription.unsubscribe()
}, [])
```

#### 3. 타입 에러
```typescript
// 문제: database.types.ts와 불일치
// 해결: 타입 재생성
npm run db:types
```

#### 4. 인증 에러
```typescript
// 문제: 로그인 후에도 권한 없음
// 해결: profile 로드 확인
const { user, profile, isLoading } = useAuth()
if (isLoading) return <Loading />
if (!profile) return <ProfileSetup />
```

## 📈 성능 모니터링

### 메트릭 수집
```typescript
// ConnectionCore 메트릭
const metrics = ConnectionCore.getInstance().getMetrics()
console.log('Query count:', metrics.queryCount)
console.log('Cache hit rate:', metrics.cacheHitRate)
console.log('Average response time:', metrics.avgResponseTime)
```

### 성능 최적화 팁
1. **적절한 staleTime 설정**: 자주 변경되지 않는 데이터는 긴 staleTime
2. **선택적 필드 조회**: select() 사용하여 필요한 필드만 가져오기
3. **페이지네이션**: 대량 데이터는 useInfiniteQuery 사용
4. **프리페칭**: 예측 가능한 네비게이션에서 prefetchQuery
5. **메모이제이션**: useMemo로 expensive 계산 캐싱

## 🔄 마이그레이션 회고

### 주요 교훈
1. **표준 라이브러리의 힘**: 커스텀보다 검증된 솔루션이 효율적
2. **점진적 마이그레이션**: 한 번에 모든 것을 바꾸지 말고 단계적으로
3. **타입 안전성 우선**: any 타입 사용 최소화
4. **테스트의 중요성**: 각 단계마다 빌드 테스트 필수
5. **문서화**: 아키텍처 변경사항 즉시 문서화

### 향후 개선 계획
- [ ] 서버 사이드 렌더링 최적화
- [ ] Suspense 경계 추가
- [ ] 에러 바운더리 강화
- [ ] 성능 모니터링 대시보드
- [ ] E2E 테스트 추가

---

## 📚 참고 자료

- [TanStack Query 공식 문서](https://tanstack.com/query/latest)
- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)

---

**마지막 업데이트**: 2025-01-06
**작성자**: KEPCO AI Community Development Team
**버전**: 2.0.0 (TanStack Query Migration)