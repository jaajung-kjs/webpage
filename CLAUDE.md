# CLAUDE.md - KEPCO AI Community 프로젝트 가이드

## 프로젝트 개요
KEPCO AI 학습동아리 커뮤니티 웹 애플리케이션

### 기술 스택
- **Frontend**: Next.js 15.4.4 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 권한 시스템 (2025-01-28 업데이트)

### 역할 계층 구조
1. **guest** (게스트): 이메일 인증 완료했지만 동아리 가입 전
2. **pending** (대기중): 가입 신청 후 승인 대기
3. **member** (회원): 정식 동아리 회원
4. **vice-leader** (운영진): 동아리 운영진
5. **leader** (동아리장): 동아리장
6. **admin** (관리자): 시스템 관리자

### 권한별 접근 가능 기능
- **guest/pending**: 미리보기, 회원목록 보기, 가입 신청
- **member 이상**: 모든 기능 (상세페이지, 다운로드, 메시지, 좋아요, 댓글, 신고, 회원목록 프로필보기)
- **vice-leader/leader/admin**: 관리자 대시보드, 가입 승인/거절
- **admin only**: 시스템 설정

### 회원가입 프로세스
1. 이메일 회원가입 → 자동으로 'guest' 역할 부여
2. 가입 신청 페이지(/membership/apply)에서 신청서 작성
3. 신청 시 'pending' 상태로 변경
4. 관리자가 승인 → 'member' 역할 부여
5. 관리자가 거절 → 'guest' 상태로 복귀

## 중요 작업 지침

### 개발 서버 관련 주의사항
**개발 서버는 항상 실행 중임 - npm run dev 실행하지 말 것**
- 개발 서버는 이미 백그라운드에서 실행 중
- http://localhost:3000 에서 접근 가능
- 서버 재시작이 필요한 경우 사용자에게 요청할 것

### 파일 작업 시 필수 사항
**반드시 Read → Write/Edit 순서로 작업할 것**
- Write 또는 Edit 전에 반드시 Read로 파일을 먼저 읽어야 함
- Read 없이 Write/Edit 시도 시 오류 발생
- 오류 발생 시 반드시 해결하고 넘어갈 것 (무시하고 진행 금지)

### 데이터베이스 작업 시 필수 사항

#### 🚨 절대 원칙 (NEVER BREAK THESE RULES)
1. **절대 수동으로 TypeScript 인터페이스를 만들지 마세요**
2. **절대 마이그레이션 파일을 생성하지 마세요** - 항상 MCP로 직접 적용
3. **절대 DB 스키마를 가정하지 마세요** - 항상 실제 스키마 확인
4. **절대 코드에서 타입 에러를 해결하지 마세요** - DB 스키마를 수정하세요

#### DB 설계 원칙 (초기 설계 시 완벽하게)
1. **NOT NULL + DEFAULT 원칙**
   - 모든 필수 필드는 NOT NULL로 설정
   - 기본값이 있는 필드는 DEFAULT 값 설정
   - created_at, updated_at은 항상 NOT NULL + DEFAULT NOW()

2. **타입 선택 가이드**
   - boolean 필드: NOT NULL + DEFAULT false/true
   - status/state 필드: NOT NULL + DEFAULT '초기상태'
   - 카운터 필드: NOT NULL + DEFAULT 0
   - JSON 필드: 가능한 사용 자제, 정규화 우선

3. **관계 설계**
   - 외래 키는 항상 ON DELETE CASCADE/SET NULL 명시
   - 다대다 관계는 중간 테이블 사용
   - 순환 참조 방지

#### 작업 순서 (항상 이 순서로)
1. **DB 스키마 확인**
   ```sql
   -- 테이블 구조 확인
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = '테이블명'
   ORDER BY ordinal_position;
   ```

2. **DB 스키마 설계 및 적용**
   ```bash
   mcp__supabase__apply_migration name="feature_name" query="SQL"
   ```

3. **타입 자동 생성**
   ```bash
   mcp__supabase__generate_typescript_types
   ```

4. **생성된 타입만 사용하여 코드 작성**

5. **Advisor 체크 실행**
   ```bash
   mcp__supabase__get_advisors type="security"
   mcp__supabase__get_advisors type="performance"
   ```

## TypeScript 타입 관리 지침 (중요!)

### 🚨 절대 원칙 - Type Assertions 사용 금지!
- **NEVER** use type assertions (as any, as const, as Type, etc.) to fix type errors
- 타입 에러는 **반드시** DB 스키마를 직접 수정해서 해결
- NULL 허용 여부는 기능에 맞게 판단해서 DB에서 직접 수정
- 수정 후 반드시 타입 재생성: `npx supabase gen types typescript --project-id ajwgnloatyuqwkqwrrzj > src/lib/database.types.ts`

### 🔴 금지 사항 (ABSOLUTELY FORBIDDEN)
```typescript
// ❌ 절대 금지 - 수동 인터페이스 생성
interface User {
  id: string
  name: string
  email: string
}

// ❌ 절대 금지 - 타입 재정의
type CustomPost = {
  id: number
  title: string
  content: string
}

// ❌ 절대 금지 - Partial 타입으로 DB 불일치 해결
type UserUpdate = Partial<User>

// ❌ 절대 금지 - 수동으로 nullable 처리
interface Post {
  title: string | null  // DB와 불일치 가능성
}
```

### 🟢 필수 사항 (ALWAYS DO THIS)
```typescript
// ✅ DB 타입 직접 사용
import { Tables } from '@/lib/database.types'
type User = Tables<'users'>
type Post = Tables<'posts'>

// ✅ Insert/Update 타입 사용
import { TablesInsert, TablesUpdate } from '@/lib/database.types'
type UserInsert = TablesInsert<'users'>
type UserUpdate = TablesUpdate<'users'>

// ✅ JOIN 데이터는 확장으로 표현
type PostWithAuthor = Tables<'posts'> & {
  author: Tables<'users'>
}

// ✅ 관계 데이터 타입
type MembershipApplicationWithUser = Tables<'membership_applications'> & {
  user: Pick<Tables<'users'>, 'id' | 'email' | 'name' | 'department' | 'avatar_url'>
  reviewer?: Pick<Tables<'users'>, 'name'>
}
```

### 타입 에러 해결 방법
1. **타입 에러 발생 시 절대 코드 수정 금지**
2. **DB 스키마 확인 및 수정**
3. **타입 재생성**
4. **코드는 그대로 유지**

### 예시: nullable 문제 해결
```typescript
// ❌ 잘못된 해결: 코드에서 null 체크
if (user.department) { 
  // department가 nullable이라 매번 체크 필요
}

// ❌ 잘못된 해결: 타입 assertion
const dept = user.department!  // 위험한 방법
```

```sql
-- ✅ 올바른 해결: DB 스키마 수정
ALTER TABLE users 
ALTER COLUMN department SET NOT NULL,
ALTER COLUMN department SET DEFAULT '미지정';
```

### 타입 생성 및 업데이트

#### 🚨 절대 규칙: database.types.ts 직접 수정 금지!
```bash
# ✅ 올바른 방법: DB 스키마 변경 후 자동 생성
npm run db:types

# ❌ 절대 금지 사항:
# - database.types.ts 파일을 직접 열어서 수정
# - 타입 에러를 해결하기 위해 database.types.ts에 코드 추가
# - database.types.ts에 수동으로 타입 정의 추가
```

#### 타입 생성 워크플로우
1. **DB 스키마 변경**: MCP 명령으로 스키마 수정
2. **타입 자동 생성**: `npm run db:types` 실행
3. **코드 수정**: 새로운 타입에 맞춰 코드 업데이트

#### 중요 사항
- `database.types.ts`는 **100% 자동 생성** 파일
- 수동 수정 시 다음 생성 때 **모든 변경사항 손실**
- 타입 불일치는 **항상 DB 스키마에서 해결**

### 왜 이렇게 해야 하는가?
1. **단일 진실 공급원(Single Source of Truth)**: DB가 타입의 원천
2. **자동 동기화**: DB 변경 시 타입 자동 업데이트
3. **타입 안전성**: 컴파일 타임에 오류 방지
4. **유지보수성**: 코드 수정 없이 DB만 변경하면 됨
5. **일관성**: 프로젝트 전체에서 동일한 타입 사용

## DB 중심 개발 워크플로우

### 1단계: DB 설계 (완벽하게)
- 모든 테이블, 컬럼, 관계 정의
- NOT NULL, DEFAULT, CHECK 제약조건 설정
- RLS 정책 설계
- 인덱스 설계

### 2단계: DB 적용
```bash
# 마이그레이션 직접 적용
mcp__supabase__apply_migration name="feature_name" query="
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"
```

### 3단계: 타입 생성
```bash
mcp__supabase__generate_typescript_types
```

### 4단계: 코드 작성
- 생성된 타입만 사용
- 타입 에러 시 1단계로 돌아가서 DB 수정

### 5단계: 검증
```bash
# 보안 검증
mcp__supabase__get_advisors type="security"

# 성능 검증
mcp__supabase__get_advisors type="performance"
```

### 유지보수 시나리오

#### 필드 추가 필요
1. DB에 컬럼 추가 (NOT NULL + DEFAULT 고려)
2. 타입 재생성
3. 코드는 자동으로 새 필드 사용 가능

#### 필드 타입 변경
1. DB 컬럼 타입 변경
2. 타입 재생성
3. 타입 에러 발생 부분만 수정

#### 새 기능 추가
1. DB 테이블/관계 추가
2. RLS 정책 추가
3. 타입 재생성
4. 새 타입으로 기능 구현

#### 성능 최적화
1. DB 인덱스 추가
2. 쿼리 최적화
3. 코드 변경 불필요