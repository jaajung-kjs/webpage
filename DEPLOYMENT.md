# 🚀 KEPCO AI 커뮤니티 배포 가이드

이 문서는 KEPCO AI 학습동아리 웹사이트를 처음부터 배포하는 완전한 가이드입니다.

## 📋 사전 준비사항

### 1. 계정 생성
- [Supabase](https://supabase.com) 계정
- [Vercel](https://vercel.com) 계정 (또는 다른 호스팅 서비스)

### 2. 로컬 개발 환경
- Node.js 18+ 설치
- Git 설치

## 🗄️ 데이터베이스 설정 (Supabase)

### 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `kepco-ai-community`
   - **Database Password**: 안전한 비밀번호 설정
   - **Region**: `Northeast Asia (Seoul)` 선택
4. "Create new project" 클릭 (약 2-3분 소요)

### 2. 데이터베이스 마이그레이션 실행

프로젝트가 생성되면:

1. **SQL Editor**로 이동
2. 다음 순서대로 마이그레이션 파일들을 실행:

#### Step 1: 스키마 생성
```sql
-- supabase/migrations/001_initial_schema.sql 내용을 복사하여 실행
```

#### Step 2: 트리거 및 함수 생성
```sql
-- supabase/migrations/002_triggers_and_functions.sql 내용을 복사하여 실행
```

#### Step 3: 보안 정책 설정
```sql
-- supabase/migrations/003_row_level_security.sql 내용을 복사하여 실행
```

#### Step 4: 샘플 데이터 입력 (선택사항)
```sql
-- supabase/migrations/004_seed_data.sql 내용을 복사하여 실행
```

### 3. Storage 버킷 생성

**Storage** 섹션으로 이동하여 다음 버킷들을 생성:

#### avatars 버킷
- **Name**: `avatars`
- **Public**: ✅ 체크
- **File size limit**: 5MB
- **Allowed MIME types**: `image/*`

#### attachments 버킷  
- **Name**: `attachments`
- **Public**: ❌ 체크 해제
- **File size limit**: 50MB
- **Allowed MIME types**: 모든 타입 허용

#### resources 버킷
- **Name**: `resources`  
- **Public**: ❌ 체크 해제
- **File size limit**: 100MB
- **Allowed MIME types**: 모든 타입 허용

### 4. 인증 설정

**Authentication** > **Settings**로 이동:

1. **Site URL**: `http://localhost:3000` (개발), `https://your-domain.com` (프로덕션)
2. **Redirect URLs**: 
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

#### 이메일 인증 설정 (권장)
1. **Email** 탭으로 이동
2. **Enable email confirmations**: ✅ 체크
3. **Email Templates** 커스터마이징 (선택사항)

## 🌐 환경 변수 설정

### 1. Supabase 연결 정보 확인

Supabase Dashboard의 **Settings** > **API**에서:

- `Project URL`: `https://your-project-id.supabase.co`
- `anon/public key`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- `service_role key`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (주의: 서버에서만 사용)

### 2. 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
```

⚠️ **보안 주의사항**:
- `.env.local`은 절대 Git에 커밋하지 마세요
- `service_role_key`는 서버 사이드에서만 사용하세요
- 프로덕션에서는 각 환경 변수를 안전하게 설정하세요

## 🚀 로컬 개발 서버 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 데이터베이스 연결 테스트
```bash
npm run dev
```

### 3. 브라우저에서 확인
- `http://localhost:3000`으로 접속
- 회원가입/로그인 테스트
- 데이터베이스 연동 확인

## 📦 프로덕션 배포

### Vercel 배포 (권장)

#### 1. Vercel 프로젝트 생성
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
vercel

# 첫 배포 시 질문에 답변:
# ? Set up and deploy "~/kepco-ai-community"? [Y/n] y
# ? Which scope do you want to deploy to? [선택]
# ? Link to existing project? [N/y] n
# ? What's your project's name? kepco-ai-community
# ? In which directory is your code located? ./
# ? Want to modify these settings? [y/N] n
```

#### 2. 환경 변수 설정
```bash
# Vercel 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
```

#### 3. 도메인 설정
1. Vercel Dashboard에서 프로젝트 선택
2. **Settings** > **Domains**
3. 커스텀 도메인 추가 (예: `kepco-ai.example.com`)

### 기타 호스팅 서비스

#### Netlify
```bash
# 빌드 설정
Build command: npm run build
Publish directory: out
Environment variables: 위와 동일
```

#### AWS Amplify
```bash
# amplify.yml 파일 생성 후 배포
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

## 🔧 사후 설정

### 1. Supabase 프로덕션 설정 업데이트

**Authentication** > **Settings**에서:
- **Site URL**: 프로덕션 도메인으로 변경
- **Redirect URLs**: 프로덕션 콜백 URL 추가

### 2. 첫 관리자 계정 생성

1. 사이트에서 회원가입
2. Supabase Dashboard > **Table Editor** > **profiles**
3. 생성된 사용자의 `role`를 `leader`로 변경

### 3. 초기 데이터 설정

관리자 계정으로 로그인하여:
- 첫 공지사항 작성
- 첫 활동 일정 등록
- 학습 자료 업로드

## 🔍 트러블슈팅

### 자주 발생하는 문제들

#### 1. 데이터베이스 연결 오류
```
Error: Invalid URL
```
**해결방법**: `.env.local`의 Supabase URL과 키를 다시 확인

#### 2. 권한 오류
```
Row Level Security policy violation
```
**해결방법**: RLS 정책이 올바르게 설정되었는지 확인

#### 3. Storage 업로드 오류
```
Storage bucket not found
```
**해결방법**: Storage 버킷이 생성되었고 정책이 설정되었는지 확인

#### 4. 빌드 오류
```
Type error: Property does not exist
```
**해결방법**: TypeScript 타입 정의 확인 (`src/lib/database.types.ts`)

### 로그 확인 방법

#### Supabase 로그
- Dashboard > **Settings** > **Logs**
- API 로그, Auth 로그, Database 로그 확인

#### Next.js 로그
```bash
# 로컬 개발
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

#### Vercel 로그
- Vercel Dashboard > 프로젝트 > **Functions** 탭

## 📊 모니터링 및 유지보수

### 1. 정기 백업
- Supabase는 자동 백업 제공
- 필요시 수동 백업: Dashboard > **Settings** > **Database** > **Backups**

### 2. 성능 모니터링
- Supabase Dashboard에서 DB 성능 확인
- Vercel Analytics 활용

### 3. 보안 업데이트
- 정기적으로 dependencies 업데이트
- Supabase 보안 공지사항 확인

## 📞 지원

문제가 발생하면:

1. **GitHub Issues**: 버그 리포트 및 기능 요청
2. **Supabase Docs**: https://supabase.io/docs
3. **Next.js Docs**: https://nextjs.org/docs
4. **Vercel Docs**: https://vercel.com/docs

---

## ✅ 배포 체크리스트

배포 전 다음 항목들을 확인하세요:

- [ ] Supabase 프로젝트 생성 완료
- [ ] 모든 마이그레이션 실행 완료
- [ ] Storage 버킷 3개 생성 완료
- [ ] 환경 변수 설정 완료
- [ ] 로컬 개발 서버 정상 동작 확인
- [ ] 회원가입/로그인 테스트 완료
- [ ] 프로덕션 배포 완료
- [ ] 프로덕션 환경 변수 설정 완료
- [ ] 도메인 설정 완료 (선택사항)
- [ ] 첫 관리자 계정 생성 완료
- [ ] 기본 콘텐츠 작성 완료

🎉 **축하합니다! KEPCO AI 학습동아리 웹사이트가 성공적으로 배포되었습니다!**