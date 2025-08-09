# Supabase DB Dump 상세 가이드

## 🚀 모든 데이터 한 번에 백업하기 (Quick Start)

### 완전 백업 명령어 (모든 스키마 + 모든 데이터)

```bash
# 🔥 이 명령어 하나로 모든 것을 백업합니다!
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  --schema vault \
  --schema extensions \
  --include-roles \
  --include-policies \
  -f backup_everything_$(date +%Y%m%d_%H%M%S).sql
```

### 더 간단한 버전 (핵심 3개 스키마)

```bash
# 가장 중요한 3개 스키마만 (대부분의 경우 충분)
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  -f backup_complete_$(date +%Y%m%d_%H%M%S).sql
```

### 포함되는 내용:
- ✅ **auth.users** - 모든 회원 정보 (이메일, 비밀번호 해시, 메타데이터)
- ✅ **auth.identities** - OAuth 연동 정보
- ✅ **auth.sessions** - 활성 세션
- ✅ **public 스키마** - 모든 앱 데이터 테이블
- ✅ **storage.buckets** - Storage 버킷 정보
- ✅ **storage.objects** - 파일 메타데이터
- ✅ **모든 함수, 트리거, 인덱스**
- ✅ **RLS 정책**
- ✅ **역할 및 권한**

### 실행 예시:

```bash
# 1. 프로젝트 디렉토리로 이동
cd /Users/jsk/webpage/kepco-ai-community

# 2. 백업 디렉토리 생성
mkdir -p backups

# 3. 완전 백업 실행
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  --schema vault \
  --schema extensions \
  --include-roles \
  --include-policies \
  -f backups/full_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. 백업 확인
ls -lh backups/
```

### 백업 후 검증:

```bash
# 백업 파일 크기 확인
du -h backups/full_backup_*.sql

# Auth 사용자 수 확인
grep -c "INSERT INTO auth.users" backups/full_backup_*.sql

# 포함된 테이블 수 확인
grep -c "CREATE TABLE" backups/full_backup_*.sql
```

## 🔄 백업 복원하기 (프로덕션에 다시 불러오기)

### ⚠️ 주의사항 (매우 중요!)
복원은 **기존 데이터를 모두 삭제**할 수 있으므로 매우 신중하게 진행해야 합니다!

### 방법 1: psql 직접 사용 (권장)

```bash
# 1. Connection String 가져오기
supabase db url
# 또는 Dashboard > Settings > Database > Connection string

# 2. 백업 파일을 프로덕션에 복원
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < backups/full_backup_20240115_143022.sql
```

### 방법 2: 환경변수 사용

```bash
# 1. 환경변수 설정
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 2. 복원 실행
psql $DATABASE_URL < backups/full_backup_20240115_143022.sql
```

### 방법 3: 단계별 복원 (안전한 방법)

```bash
# 1. 새로운 브랜치/테스트 DB에 먼저 복원
psql "postgresql://postgres:[PASSWORD]@db.[TEST-PROJECT].supabase.co:5432/postgres" < backups/full_backup.sql

# 2. 데이터 검증
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM auth.users;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM public.users;"

# 3. 문제없으면 프로덕션에 복원
psql $PRODUCTION_DATABASE_URL < backups/full_backup.sql
```

### 방법 4: 기존 데이터 보존하며 병합 (고급)

```bash
# 기존 데이터를 삭제하지 않고 새 데이터만 추가하려면
# 백업 파일을 수정해야 합니다

# 1. 백업 파일에서 CREATE TABLE 문 제거
grep -v "CREATE TABLE" backups/full_backup.sql > backups/data_only.sql

# 2. DROP 문 제거
grep -v "DROP" backups/data_only.sql > backups/inserts_only.sql

# 3. INSERT 문만 실행
psql $DATABASE_URL < backups/inserts_only.sql
```

### 방법 5: 특정 테이블만 복원

```bash
# Auth 사용자만 복원
psql $DATABASE_URL << EOF
-- 기존 Auth 데이터 백업 (안전을 위해)
CREATE TABLE auth.users_backup AS SELECT * FROM auth.users;

-- 기존 데이터 삭제
TRUNCATE auth.users CASCADE;

-- 백업에서 Auth 데이터만 복원
\i backups/full_backup.sql
EOF

# Public 데이터만 복원
psql $DATABASE_URL << EOF
-- Public 스키마만 초기화
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 백업에서 Public 데이터 복원
\i backups/full_backup.sql
EOF
```

### 방법 6: Supabase CLI를 통한 복원 (제한적)

```bash
# 현재 Supabase CLI는 직접적인 복원 명령을 제공하지 않습니다
# 하지만 다음과 같이 할 수 있습니다:

# 1. 로컬 개발 환경에 복원
supabase start
supabase db reset
psql "postgresql://postgres:postgres@localhost:54322/postgres" < backups/full_backup.sql

# 2. 로컬에서 프로덕션으로 마이그레이션
supabase db push
```

### 복원 전 체크리스트

```bash
#!/bin/bash
# restore_checklist.sh

echo "🔍 복원 전 체크리스트"
echo "====================="

# 1. 현재 데이터 백업
echo "1. 현재 프로덕션 백업하기"
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  -f backups/before_restore_$(date +%Y%m%d_%H%M%S).sql

# 2. 사용자 수 확인
echo "2. 현재 사용자 수:"
psql $DATABASE_URL -c "SELECT COUNT(*) as current_users FROM auth.users;"

# 3. 중요 테이블 레코드 수
echo "3. 주요 테이블 현황:"
psql $DATABASE_URL -c "
  SELECT 'users' as table_name, COUNT(*) as count FROM public.users
  UNION ALL
  SELECT 'content', COUNT(*) FROM public.content
  UNION ALL
  SELECT 'comments', COUNT(*) FROM public.comments;
"

# 4. 복원할 백업 파일 정보
echo "4. 복원할 백업 파일:"
ls -lh backups/full_backup_*.sql | tail -1

echo ""
echo "⚠️  위 정보를 확인하고 복원을 진행하세요!"
echo "복원 명령: psql \$DATABASE_URL < backups/full_backup_XXXXXX.sql"
```

### 복원 후 확인사항

```bash
#!/bin/bash
# verify_restore.sh

echo "✅ 복원 검증 중..."

# 1. Auth 사용자 확인
echo "1. Auth 사용자 수:"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM auth.users;"

# 2. 세션 정리
echo "2. 만료된 세션 정리:"
psql $DATABASE_URL -c "DELETE FROM auth.sessions WHERE not_after < NOW();"

# 3. RLS 정책 확인
echo "3. RLS 정책 상태:"
psql $DATABASE_URL -c "
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND rowsecurity = true;
"

# 4. 시퀀스 리셋 (필요한 경우)
echo "4. 시퀀스 값 조정:"
psql $DATABASE_URL -c "
  SELECT setval(pg_get_serial_sequence('public.users', 'id'), 
    COALESCE((SELECT MAX(id) FROM public.users), 1));
"

# 5. 인덱스 재구축
echo "5. 인덱스 재구축:"
psql $DATABASE_URL -c "REINDEX DATABASE postgres;"

echo "✅ 복원 완료!"
```

### 문제 해결

#### 1. 권한 오류
```bash
# ERROR: permission denied for schema auth
# 해결: Service Role 비밀번호 사용
psql "postgresql://postgres:[SERVICE_ROLE_PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

#### 2. 중복 키 오류
```bash
# ERROR: duplicate key value violates unique constraint
# 해결: 기존 데이터 삭제 후 복원
psql $DATABASE_URL -c "TRUNCATE TABLE auth.users CASCADE;"
psql $DATABASE_URL < backups/full_backup.sql
```

#### 3. 스키마 충돌
```bash
# ERROR: schema "public" already exists
# 해결: --clean 옵션으로 백업했거나, 수동으로 스키마 삭제
psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
```

#### 4. Auth 데이터 복원 실패
```bash
# Auth 스키마는 시스템 스키마라 제약이 있을 수 있음
# 해결: auth 테이블만 개별 복원
psql $DATABASE_URL << EOF
SET session_replication_role = 'replica';  -- 트리거 임시 비활성화
TRUNCATE auth.users CASCADE;
-- 백업 파일에서 auth.users INSERT 문만 실행
\i backups/auth_users_only.sql
SET session_replication_role = 'origin';  -- 트리거 재활성화
EOF
```

### 안전한 복원 절차 요약

1. **현재 상태 백업** (필수!)
2. **테스트 환경에서 먼저 복원**
3. **데이터 검증**
4. **프로덕션 복원**
5. **복원 후 검증**
6. **문제 시 롤백**

## 기본 동작 이해하기

### `supabase db dump` 기본 동작

```bash
# 이 명령은 기본적으로 public 스키마만 백업합니다!
supabase db dump -f backup.sql
```

**기본 포함 내용:**
- ✅ public 스키마의 모든 테이블
- ✅ public 스키마의 모든 데이터
- ✅ public 스키마의 함수, 트리거
- ❌ auth 스키마 (사용자 정보)
- ❌ storage 스키마
- ❌ realtime 스키마
- ❌ 기타 시스템 스키마

## Auth 정보 포함 백업 방법

### 방법 1: 모든 스키마 백업 (권장)

```bash
# 모든 관련 스키마를 한 번에 백업
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  -f backup_complete_$(date +%Y%m%d_%H%M%S).sql
```

### 방법 2: Auth 스키마 별도 백업

```bash
# 1. Public 스키마 백업
supabase db dump -f backup_public_$(date +%Y%m%d).sql

# 2. Auth 스키마 별도 백업
supabase db dump --schema auth -f backup_auth_$(date +%Y%m%d).sql

# 3. Storage 스키마 백업
supabase db dump --schema storage -f backup_storage_$(date +%Y%m%d).sql
```

### 방법 3: 전체 백업 스크립트 (최적)

```bash
#!/bin/bash
# complete_backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

echo "🔄 Starting complete Supabase backup..."

# 1. 모든 중요 스키마를 하나의 파일로 백업
echo "📦 Backing up all schemas (public + auth + storage)..."
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  --schema extensions \
  -f $BACKUP_DIR/complete_backup_$DATE.sql

# 2. RLS 정책도 포함되었는지 확인
echo "🔒 Verifying RLS policies..."
supabase db dump \
  --schema public \
  --include-policies \
  -f $BACKUP_DIR/rls_policies_$DATE.sql

echo "✅ Backup completed!"
echo "📍 Location: $BACKUP_DIR/complete_backup_$DATE.sql"

# 백업 내용 검증
echo ""
echo "📊 Backup Statistics:"
echo "- Total size: $(du -h $BACKUP_DIR/complete_backup_$DATE.sql | cut -f1)"
echo "- Tables backed up: $(grep -c "CREATE TABLE" $BACKUP_DIR/complete_backup_$DATE.sql)"
echo "- Auth users included: $(grep -c "auth.users" $BACKUP_DIR/complete_backup_$DATE.sql)"
echo "- Insert statements: $(grep -c "INSERT INTO" $BACKUP_DIR/complete_backup_$DATE.sql)"
```

## 백업 내용 확인 방법

### Auth 데이터 포함 여부 확인

```bash
# Auth 테이블이 포함되었는지 확인
grep "auth.users" backup.sql

# Auth 데이터가 있는지 확인
grep "INSERT INTO auth.users" backup.sql

# 포함된 스키마 목록 확인
grep "CREATE SCHEMA" backup.sql

# 포함된 모든 테이블 확인
grep "CREATE TABLE" backup.sql | awk '{print $3}' | sort | uniq
```

## 스키마별 백업 내용

### 1. Public 스키마
```sql
-- 포함되는 내용:
-- • users 테이블 (앱 프로필)
-- • content 테이블
-- • comments 테이블
-- • 기타 애플리케이션 테이블
-- • 사용자 정의 함수
-- • 트리거
-- • RLS 정책
```

### 2. Auth 스키마
```sql
-- 포함되는 내용:
-- • auth.users (인증 사용자)
-- • auth.identities (OAuth 정보)
-- • auth.sessions (세션)
-- • auth.refresh_tokens
-- • auth.audit_log_entries
-- • auth.schema_migrations
-- • auth.flow_state
```

### 3. Storage 스키마
```sql
-- 포함되는 내용:
-- • storage.buckets (버킷 정보)
-- • storage.objects (파일 메타데이터)
-- • storage.migrations
-- 주의: 실제 파일은 별도 백업 필요!
```

## 완전한 백업을 위한 체크리스트

```bash
#!/bin/bash
# full_backup_checklist.sh

echo "🔍 Supabase 완전 백업 체크리스트"
echo "================================"

# 1. 데이터베이스 백업
echo ""
echo "1️⃣ Database Backup:"
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  --schema extensions \
  -f backup_db_$(date +%Y%m%d).sql
echo "✅ Database backed up"

# 2. Auth 사용자 수 확인
echo ""
echo "2️⃣ Auth Users Count:"
psql $(supabase db url) -c "SELECT COUNT(*) as user_count FROM auth.users;"

# 3. Storage 파일 목록
echo ""
echo "3️⃣ Storage Files:"
psql $(supabase db url) -c "SELECT bucket_id, COUNT(*) as file_count FROM storage.objects GROUP BY bucket_id;"

# 4. RLS 정책 수
echo ""
echo "4️⃣ RLS Policies:"
psql $(supabase db url) -c "SELECT schemaname, tablename, COUNT(*) as policy_count FROM pg_policies GROUP BY schemaname, tablename;"

# 5. Edge Functions (별도 백업 필요)
echo ""
echo "5️⃣ Edge Functions:"
echo "⚠️  Edge Functions는 별도로 소스 코드를 백업해야 합니다"
echo "   Location: ./supabase/functions/"

# 6. 환경 설정
echo ""
echo "6️⃣ Environment Config:"
echo "⚠️  .env 파일과 supabase/config.toml도 백업하세요"
```

## 복원 시 주의사항

### Auth 데이터 복원 시

```bash
# 1. 새 프로젝트에 복원하는 경우
psql $(supabase db url --project-ref new-project) < backup_complete.sql

# 2. 기존 프로젝트에 복원하는 경우 (위험!)
# Auth 데이터 충돌 가능성 있음
# 먼저 기존 auth 데이터 삭제 필요

# Auth 데이터만 선택적 복원
psql $(supabase db url) << EOF
-- 기존 auth 데이터 삭제 (주의!)
TRUNCATE auth.users CASCADE;

-- 백업에서 auth 데이터만 복원
\i backup_auth.sql
EOF
```

### 복원 후 확인사항

```bash
# 사용자 수 확인
psql $(supabase db url) -c "SELECT COUNT(*) FROM auth.users;"

# 세션 정리 (복원 후 필요)
psql $(supabase db url) -c "DELETE FROM auth.sessions WHERE not_after < NOW();"

# RLS 정책 활성화 확인
psql $(supabase db url) -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

## 자동화 스크립트 (Auth 포함)

```javascript
// complete_backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class SupabaseBackup {
  constructor(projectRef) {
    this.projectRef = projectRef;
    this.backupDir = './backups';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async run() {
    console.log('🚀 Starting Supabase complete backup...');
    
    // 백업 디렉토리 생성
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    try {
      // 1. 전체 DB 백업 (auth 포함)
      await this.backupDatabase();
      
      // 2. 백업 검증
      await this.verifyBackup();
      
      // 3. 압축
      await this.compressBackup();
      
      console.log('✅ Backup completed successfully!');
    } catch (error) {
      console.error('❌ Backup failed:', error);
      process.exit(1);
    }
  }

  backupDatabase() {
    return new Promise((resolve, reject) => {
      const backupFile = path.join(this.backupDir, `complete_${this.timestamp}.sql`);
      
      // Auth 스키마 포함 백업
      const command = `supabase db dump \
        --project-ref ${this.projectRef} \
        --schema public \
        --schema auth \
        --schema storage \
        --schema extensions \
        -f ${backupFile}`;

      console.log('📦 Backing up database with auth data...');
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          console.log(`✅ Database backed up to: ${backupFile}`);
          this.backupFile = backupFile;
          resolve();
        }
      });
    });
  }

  verifyBackup() {
    return new Promise((resolve, reject) => {
      const stats = fs.statSync(this.backupFile);
      const sizeInMB = stats.size / (1024 * 1024);
      
      console.log(`📊 Backup size: ${sizeInMB.toFixed(2)} MB`);
      
      // Auth 데이터 포함 확인
      exec(`grep -c "auth.users" ${this.backupFile}`, (error, stdout) => {
        const authMentions = parseInt(stdout) || 0;
        if (authMentions > 0) {
          console.log(`✅ Auth data included (${authMentions} references)`);
          resolve();
        } else {
          console.warn('⚠️  Warning: No auth data found in backup');
          resolve(); // 경고만 하고 계속 진행
        }
      });
    });
  }

  compressBackup() {
    return new Promise((resolve, reject) => {
      const compressedFile = `${this.backupFile}.gz`;
      
      console.log('🗜️  Compressing backup...');
      
      exec(`gzip -k ${this.backupFile}`, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`✅ Compressed to: ${compressedFile}`);
          resolve();
        }
      });
    });
  }
}

// 실행
const backup = new SupabaseBackup('your-project-ref');
backup.run();
```

## 요약

### ❌ 기본 명령어는 Auth 백업 안 됨
```bash
supabase db dump -f backup.sql  # public 스키마만!
```

### ✅ Auth 포함 백업
```bash
supabase db dump \
  --schema public \
  --schema auth \
  --schema storage \
  -f backup_complete.sql
```

### 📋 완전한 백업 체크리스트
1. **Database**: public + auth + storage 스키마
2. **Storage Files**: 별도 다운로드 필요
3. **Edge Functions**: 소스 코드 백업
4. **Environment**: .env 및 config 파일
5. **Secrets**: API 키 및 시크릿 별도 보관

Auth 데이터는 민감한 정보(비밀번호 해시, 세션 등)를 포함하므로 백업 파일을 안전하게 보관하고, 복원 시에는 특히 주의해야 합니다.