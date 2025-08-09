# 🚀 Supabase 스테이징 환경 구축 가이드

> **목적**: 프로덕션과 완전히 분리된 무료 개발/테스트 환경을 구축하여 안전하게 새로운 기능을 개발하고 테스트합니다.

## 📋 목차
1. [개요](#개요)
2. [Step 1: 새 Supabase 프로젝트 생성](#step-1-새-supabase-프로젝트-생성)
3. [Step 2: 환경 변수 설정](#step-2-환경-변수-설정)
4. [Step 3: npm 스크립트 설정](#step-3-npm-스크립트-설정)
5. [Step 4: 프로덕션 스키마 복사](#step-4-프로덕션-스키마-복사)
6. [Step 5: 연결 테스트](#step-5-연결-테스트)
7. [개발 워크플로우](#개발-워크플로우)
8. [주의사항](#주의사항)

## 개요

### 환경 구성
```
프로덕션 (Vercel + Supabase #1)
    ↓
[완전 분리]
    ↓
스테이징 (로컬 + Supabase #2 무료)
    ↓
[테스트 완료 후]
    ↓
프로덕션 적용
```

### 필요한 것
- Supabase 계정 (무료 프로젝트 2개 가능)
- 약 30분의 설정 시간

---

## Step 1: 새 Supabase 프로젝트 생성

### 1.1 프로젝트 생성
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. "New Project" 클릭
3. 다음 정보 입력:
   - **Project name**: `kepco-ai-staging` 또는 `kepco-ai-dev`
   - **Database Password**: 안전한 비밀번호 생성 (꼭 저장!)
   - **Region**: `Seoul (ap-northeast-2)` 선택
   - **Pricing Plan**: Free tier

### 1.2 프로젝트 정보 수집
프로젝트 생성 완료 후 Settings > API에서 다음 정보를 복사:

```
Project URL: https://[프로젝트ID].supabase.co
Anon (public) key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **중요**: Service role key는 절대 클라이언트 코드에 노출되면 안됩니다!

---

## Step 2: 환경 변수 설정

### 2.1 스테이징 환경 변수 파일 생성

`.env.local.staging` 파일을 프로젝트 루트에 생성:

```bash
# Supabase Staging Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[스테이징프로젝트ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...[스테이징 Anon Key]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...[스테이징 Service Role Key]

# Supabase CLI용 (선택사항)
SUPABASE_ACCESS_TOKEN=sbp_...[기존 토큰 유지]

# App Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=kepco-ai-community-nextauth-secret-2024-staging

# 환경 구분용 플래그
NEXT_PUBLIC_ENV_MODE=staging
```

### 2.2 .gitignore 확인
`.env.local.staging`이 gitignore에 포함되어 있는지 확인:

```gitignore
# 환경 변수 파일들
.env*.local
.env.local.staging
.env.local.production
.env.local.development
```

---

## Step 3: npm 스크립트 설정

### 3.1 package.json 수정

`package.json`의 scripts 섹션에 다음 스크립트 추가:

```json
{
  "scripts": {
    // ... 기존 스크립트들 ...
    
    // 환경 전환 스크립트
    "env:staging": "cp .env.local.staging .env.local && echo '🎭 Switched to STAGING environment'",
    "env:prod": "cp .env.local.production .env.local && echo '🚀 Switched to PRODUCTION environment'",
    "env:local": "cp .env.local.development .env.local && echo '💻 Switched to LOCAL development environment'",
    
    // 스테이징 개발 서버
    "dev:staging": "npm run env:staging && next dev",
    
    // 스테이징 타입 생성
    "db:staging:types": "npm run env:staging && supabase gen types typescript --project-id [스테이징프로젝트ID] > src/lib/database.types.ts",
    
    // 스테이징 연결 테스트
    "test:staging": "npm run env:staging && node scripts/test-staging-connection.js"
  }
}
```

> 📝 **참고**: `[스테이징프로젝트ID]`를 실제 프로젝트 ID로 교체하세요.

---

## Step 4: 프로덕션 스키마 복사

### 4.1 프로덕션 스키마 Export

#### 방법 1: Supabase Dashboard 사용 (권장)
1. 프로덕션 프로젝트 Dashboard 접속
2. SQL Editor 열기
3. 다음 쿼리 실행하여 스키마 정보 확인:

```sql
-- 모든 테이블 구조 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Custom Types 확인
SELECT typname, typtype 
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype IN ('e', 'c');
```

#### 방법 2: 마이그레이션 파일 사용
이미 있는 마이그레이션 파일이 있다면:
```bash
# supabase/migrations/ 폴더의 SQL 파일들을 순서대로 적용
```

### 4.2 스테이징 DB에 스키마 적용

스테이징 프로젝트의 SQL Editor에서:

```sql
-- 1. Extensions 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Types 생성
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'member', 'leader', 'vice-leader', 'guest', 'pending');
CREATE TYPE content_type AS ENUM ('post', 'case', 'announcement', 'resource', 'activity');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE activity_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE interaction_type AS ENUM ('like', 'bookmark', 'view', 'report', 'comment_like');

-- 3. 테이블 생성
-- (프로덕션에서 복사한 CREATE TABLE 문들 실행)

-- 4. 인덱스 생성
-- (프로덕션과 동일한 인덱스 생성)

-- 5. RLS 정책 설정
-- (필요한 경우 프로덕션과 동일한 RLS 정책 적용)
```

### 4.3 테스트 데이터 생성 (선택사항)

```sql
-- 테스트 사용자 생성
INSERT INTO users (id, email, name, role, department, bio) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@test.com', '테스트 관리자', 'admin', 'AI연구부', '관리자 계정입니다'),
('22222222-2222-2222-2222-222222222222', 'member@test.com', '테스트 회원', 'member', '개발팀', '일반 회원입니다'),
('33333333-3333-3333-3333-333333333333', 'guest@test.com', '테스트 게스트', 'guest', '미지정', '게스트 계정입니다');

-- 테스트 콘텐츠 생성
INSERT INTO content (type, title, content, author_id, category, status) 
VALUES 
('post', '스테이징 환경 테스트 게시글', '# 테스트\n\n스테이징 환경이 정상 작동합니다!', '11111111-1111-1111-1111-111111111111', '자유게시판', 'published'),
('announcement', '공지사항 테스트', '스테이징 환경 구축 완료', '11111111-1111-1111-1111-111111111111', '공지사항', 'published');

-- 확인
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as content_count FROM content;
```

---

## Step 5: 연결 테스트

### 5.1 테스트 스크립트 실행

```bash
# 스테이징 환경으로 전환
npm run env:staging

# 연결 테스트
npm run test:staging
```

예상 출력:
```
🎭 Switched to STAGING environment
🔍 Testing staging connection...
✅ Connected to staging DB!
📊 Found 3 test users
📝 Found 2 test posts
```

### 5.2 개발 서버 실행

```bash
# 스테이징 환경에서 개발 서버 실행
npm run dev:staging
```

브라우저에서 http://localhost:3000 접속하여 확인

---

## 개발 워크플로우

### 일일 개발 프로세스

```bash
# 1. 작업 시작 시 스테이징 환경으로 전환
npm run env:staging

# 2. 개발 서버 실행
npm run dev:staging

# 3. 작업 진행
# - 새로운 기능 개발
# - DB 스키마 변경 테스트
# - API 엔드포인트 테스트

# 4. 타입 업데이트 (스키마 변경 시)
npm run db:staging:types

# 5. 작업 완료 후 커밋
git add .
git commit -m "feat: 새 기능 추가 (staging 테스트 완료)"
```

### 환경별 사용 시나리오

| 환경 | 용도 | 명령어 |
|------|------|---------|
| **Local** | 오프라인 개발, 빠른 테스트 | `npm run dev:local` |
| **Staging** | 통합 테스트, DB 스키마 변경 | `npm run dev:staging` |
| **Production** | 실제 서비스 (로컬에서 직접 연결 자제) | `npm run dev:prod` |

### 브랜치 전략

```
main (프로덕션)
  ├── develop (스테이징)
  │   ├── feature/user-profile
  │   ├── feature/new-api
  │   └── fix/bug-123
  └── hotfix/urgent-fix
```

---

## 주의사항

### ⚠️ 중요 보안 사항
1. **절대 하지 말 것**:
   - Service Role Key를 클라이언트 코드에 포함
   - 환경 변수 파일을 Git에 커밋
   - 프로덕션 데이터를 스테이징에 복사

2. **항상 확인할 것**:
   - 현재 연결된 환경 (`echo $NEXT_PUBLIC_SUPABASE_URL`)
   - 배포 전 환경 변수 설정
   - DB 마이그레이션 전 백업

### 🔧 트러블슈팅

#### 연결 실패 시
```bash
# 환경 변수 확인
cat .env.local | grep SUPABASE

# 네트워크 확인
curl https://[프로젝트ID].supabase.co/rest/v1/
```

#### 타입 에러 발생 시
```bash
# 타입 재생성
npm run db:staging:types

# TypeScript 캐시 삭제
rm -rf .next
npm run dev:staging
```

#### 스키마 불일치 시
1. 프로덕션과 스테이징 스키마 비교
2. 누락된 테이블/컬럼 추가
3. 타입 재생성

---

## 다음 단계

환경 구축이 완료되면:

1. ✅ 새로운 기능을 스테이징에서 먼저 개발
2. ✅ DB 스키마 변경을 스테이징에서 테스트
3. ✅ 충분한 테스트 후 프로덕션 적용
4. ✅ 문제 발생 시 빠른 롤백 가능

---

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js 환경 변수 가이드](https://nextjs.org/docs/basic-features/environment-variables)
- [프로젝트 README](../README.md)

---

*Last Updated: 2025-02-07*