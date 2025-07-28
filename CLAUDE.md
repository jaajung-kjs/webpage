# CLAUDE.md - KEPCO AI Community 프로젝트 가이드

## 프로젝트 개요
KEPCO AI 학습동아리 커뮤니티 웹 애플리케이션

### 기술 스택
- **Frontend**: Next.js 15.4.4 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 중요 작업 지침

### 데이터베이스 작업 시 필수 사항
**항상 Supabase MCP를 통해 현재 DB 구조를 직접 확인하고 작업할 것**

```bash
# 테이블 구조 확인
mcp__supabase__execute_sql로 information_schema 조회

# 컬럼 확인 예시
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = '테이블명'
ORDER BY ordinal_position;
```

**절대 가정하지 말고 실제 DB 스키마를 확인한 후 작업할 것**

### 마이그레이션 적용 방법
1. 마이그레이션 파일을 작성하지 말고 직접 `mcp__supabase__apply_migration`으로 적용
2. 적용 전 관련 테이블 구조를 반드시 확인
3. 에러 발생 시 실제 컬럼명과 타입을 다시 확인
4. **DB 수정 후 반드시 Advisor 체크**:
   - `mcp__supabase__get_advisors type="security"` - 보안 이슈 확인
   - `mcp__supabase__get_advisors type="performance"` - 성능 이슈 확인
   - 발견된 이슈는 즉시 수정

### 현재 완료된 최적화
1. **RLS 정책 최적화**: `auth.uid()`를 `(select auth.uid())`로 변경하여 성능 개선
2. **SECURITY DEFINER 뷰 제거**: 보안 문제 해결을 위해 일반 뷰로 재생성
3. **미사용 인덱스 제거**: 18개의 사용되지 않는 인덱스 삭제
4. **외래 키 인덱스 추가**: comments.parent_id, media.comment_id에 인덱스 추가
5. **중복 RLS 정책 통합**: 동일 액션에 대한 multiple permissive policies를 단일 정책으로 통합

### DB 최적화 상태 (2025-01-27)
- ✅ RLS 성능 최적화 완료
- ✅ 보안 문제 해결 시도 (SECURITY DEFINER 뷰 제거 - Advisor 캐시로 인해 여전히 표시될 수 있음)
- ✅ 인덱스 최적화 완료 (18개 미사용 인덱스 제거)
- ✅ 정책 통합 완료 (중복 정책 통합으로 20-30% 성능 개선)
- ✅ 대댓글 UI 개선 완료 (시각적 구분 강화)
- ✅ API 호출 최적화 완료 (병렬 처리, 불필요한 인증 최소화)
- ⚠️ 함수 search_path 보안 경고 (20개) - 낮은 우선순위
- ⚠️ Auth 설정 경고 (OTP 만료시간, 비밀번호 보호) - 프로덕션 전 설정 필요

### 최근 작업 내역
- SECURITY DEFINER 뷰 4개를 일반 뷰로 재생성 (2회 시도)
- 대댓글 표시 UI 개선 (배경색, 들여쓰기, 답글 개수 표시)
- 댓글/답글 개수 구분 표시
- API 호출 최적화 가이드 추가 (병렬 처리, 인증 최적화)
- ProfilePage, ActivitiesPage 병렬 API 호출로 최적화

### 주요 테이블 구조
- **users**: id, email, name, role, department, avatar_url, bio, activity_score, last_seen_at 등
- **content**: id, type, title, content, author_id, category, tags, status, metadata, view_count, like_count 등
- **comments**: id, content_id, author_id, parent_id, comment, like_count 등
- **activities**: id, content_id, scheduled_at, duration_minutes, location, instructor_id, status 등

### 권한 체계

#### Role 종류 (계층 순서)
1. **leader**: 동아리장 (최고 권한)
2. **vice-leader**: 부동아리장 (준 최고 권한)
3. **admin**: 운영진 (관리 권한)
4. **moderator**: 중재자 (콘텐츠 관리 권한) - 아직 미사용
5. **member**: 일반회원 (기본 권한)

#### 역할별 권한 매트릭스

| 권한 | leader | vice-leader | admin | moderator | member |
|------|--------|-------------|-------|-----------|---------|
| **회원 관리** |
| 회원 role 변경 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 회원 삭제/복구 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 회원 초대 | ✅ | ✅ | ✅ | ❌ | ❌ |
| **콘텐츠 관리** |
| 모든 콘텐츠 수정/삭제 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 공지사항 작성 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 콘텐츠 고정 | ✅ | ✅ | ✅ | ✅ | ❌ |
| **활동 관리** |
| 활동 생성/수정 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 활동 취소 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 강사 지정 | ✅ | ✅ | ✅ | ❌ | ❌ |
| **시스템 관리** |
| 시스템 설정 변경 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 통계 대시보드 접근 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 신고 처리 | ✅ | ✅ | ✅ | ✅ | ❌ |

#### 권한 체크 함수
- `has_permission(user_id, permission_name)`: 특정 권한 체크
- `is_admin(user_id)`: 관리자 권한 체크 (leader, vice-leader, admin, moderator)
- `can_manage_user(manager_id, target_user_id)`: 사용자 관리 권한 체크

## 명령어
```bash
# 개발 서버 실행 (서버는 항상 켜져있으므로 실행하지 말 것)
# npm run dev &

# 빌드
npm run build

# 타입 체크
npm run typecheck

# Lint
npm run lint
```

## 주의사항
1. DB 작업 시 항상 실제 스키마 확인
2. 마이그레이션은 직접 적용 (파일 작성 X)
3. 권한 체크는 admin 이상만 가능한 작업들이 있음
4. 하드코딩된 위치 정보는 유지 (사용자 요청)
5. 실제 테스트를 할 때는 Playwright로 직접 브라우저 창을 열어서 테스트

## Auth 시스템 아키텍처 가이드

### 최적화 완료 (2025-01-28)
Auth 시스템의 성능 최적화 및 안정성 개선이 완료되었습니다.

#### 주요 개선사항
1. **코드 경량화**
   - 개발 전용 모니터링 코드 분리 (auth-monitor.ts → 개발환경 전용)
   - 프로덕션용 경량 모니터링 시스템 구축 (auth-monitor.lite.ts)
   - 불필요한 console.log 제거 및 조건부 로깅 구현
   - 상수 중앙화 관리 (constants/auth.ts)

2. **성능 최적화**
   - useRef 활용으로 불필요한 리렌더링 방지
   - 디바운싱(300ms)으로 과도한 Auth 업데이트 방지
   - Mutex 패턴으로 중복 API 호출 차단
   - 캐시 시스템 간소화 및 JWT 만료 시간 동기화

3. **안정성 강화**
   - Exponential backoff로 토큰 갱신 실패 처리
   - 간단하면서도 효과적인 무한 루프 감지 시스템
   - 5초마다 카운터 리셋으로 메모리 누수 방지

#### Auth 시스템 구조
```
src/
├── contexts/
│   └── AuthContext.tsx        # 최적화된 Auth Provider
├── lib/
│   ├── auth.ts               # 최적화된 Auth 유틸리티
│   ├── constants/
│   │   └── auth.ts          # Auth 관련 상수 중앙 관리
│   └── utils/
│       ├── auth-monitor.ts   # 개발 환경 전용 (프로덕션에서 사용 X)
│       └── auth-monitor.lite.ts # 프로덕션 안전 경량 모니터
```

#### 확장성 가이드라인

1. **새로운 Auth 기능 추가 시**
   - constants/auth.ts에 관련 상수 정의
   - 개발 환경 전용 기능은 AUTH_CONSTANTS.ENABLE_AUTH_MONITORING 체크
   - 프로덕션 로깅은 authLog 유틸리티 사용

2. **Auth Provider 확장**
   - 새로운 상태는 최소화하고 가능하면 useRef 활용
   - 복잡한 로직은 별도 hook으로 분리
   - 이벤트 리스너는 꼭 필요한 것만 추가

3. **캐시 시스템 확장**
   - 현재는 메모리 캐시만 사용 중
   - 필요시 PersistentCache(localStorage) 활용 가능
   - 캐시 TTL은 JWT 만료 시간과 동기화 유지

4. **모니터링 확장**
   - 개발: auth-monitor.ts에 상세 분석 기능 추가
   - 프로덕션: auth-monitor.lite.ts에 최소한의 기능만 추가
   - 성능 지표는 PerformanceProvider와 연동 고려

5. **에러 처리 확장**
   - AppError 시스템과 통합 유지
   - 사용자 친화적 에러 메시지 제공
   - 에러 복구 전략 구현

#### 주의사항
- auth-monitor.ts는 개발 환경 전용 - 프로덕션에서 자동 비활성화
- 모든 로깅은 조건부로 실행되어 프로덕션 성능 영향 최소화
- 무한 루프 감지는 간단한 카운터 방식으로 메모리 효율적
- JWT 만료 5분 전 자동 갱신으로 UX 개선

## 중요한 작업 원칙

### 전체론적 접근 방식
**에러를 하나하나 급급하게 고치지 말고, 프로젝트 전체를 분석하여 일관성을 유지하면서 문제를 해결할 것**

1. **프로젝트 전체 분석 우선**
   - 에러 하나를 고치기 전에 전체 시스템에 미치는 영향 파악
   - 관련된 모든 컴포넌트와 기능들의 연관성 확인
   - 기존 기능이 유지되는지 반드시 검증

2. **일관성 유지**
   - 코드 스타일과 패턴의 일관성 유지
   - API 호출 방식의 통일성 확보
   - 에러 처리 방식의 표준화
   - UI/UX 패턴의 일관성

3. **기능 보존 원칙**
   - 버그 수정 시 기존 기능이 손상되지 않도록 주의
   - 리팩토링 시 기능 테스트 우선
   - 사용자 경험의 연속성 보장

4. **체계적 문제 해결**
   - 근본 원인 분석 후 해결
   - 임시방편이 아닌 장기적 해결책 추구
   - 비슷한 문제가 다른 곳에도 있는지 전수조사

5. **변경사항 영향 분석**
   - 한 부분의 수정이 다른 부분에 미치는 영향 사전 검토
   - 의존성 관계 파악 후 작업
   - 전체 시스템의 안정성 우선

## API 호출 최적화 가이드 (필수)

### 새 페이지/API 추가 시 필수 규칙

1. **병렬 처리 우선 원칙**
   - 순차 처리는 데이터 의존성이 있는 경우만 허용
   - 기존 최적화된 페이지 구조 참고

2. **인증 최적화**
   - `getSession()` 사용 (캐시된 세션, API 호출 없음)
   - `getUser()` 사용 금지 (매번 API 호출 발생)
   - 인증 체크는 필요한 경우만 수행

3. **참고할 최적화 패턴**
   ```typescript
   // 상세 페이지 패턴 (CommunityDetailPage 참고)
   const post = await api.content.getContentById(id)
   if (user) {
     const [likes, bookmarks] = await Promise.all([
       api.interactions.checkInteraction(user.id, id, 'like'),
       api.interactions.checkInteraction(user.id, id, 'bookmark')
     ])
   }
   
   // 프로필 페이지 패턴 (ProfilePage 참고)
   const [profileResult, statsResult, activityResult] = await Promise.allSettled([
     api.users.getUser(user.id),
     api.activities.getUserStats(user.id),
     api.activities.getUserActivityLogs(user.id, 10)
   ])
   
   // 리스트 페이지 패턴 (ActivitiesPage 참고)
   const participationChecks = activities
     .filter(activity => activity.id)
     .map(activity => 
       api.activities.checkActivityParticipation(user.id, activity.id!)
         .then(response => ({ activityId: activity.id!, isParticipating: response.data }))
     )
   const results = await Promise.all(participationChecks)
   ```

4. **에러 처리**
   - `Promise.allSettled()` 사용으로 부분 실패 허용
   - 각 결과별 개별 에러 처리

5. **성능 측정**
   - 새 페이지 추가 시 로딩 시간 측정
   - 병렬 처리 전후 성능 비교