# Supabase 완전 백업 가이드

## 목차
1. [개요](#개요)
2. [Supabase Auth 백업](#supabase-auth-백업)
3. [데이터베이스 백업](#데이터베이스-백업)
4. [백업 자동화](#백업-자동화)
5. [복원 방법](#복원-방법)
6. [검증 및 테스트](#검증-및-테스트)
7. [트러블슈팅](#트러블슈팅)

## 개요

Supabase는 Auth와 Database를 분리하여 관리하므로, 완전한 백업을 위해서는 두 가지 모두를 백업해야 합니다.

### 백업 체크리스트
- [ ] Auth 사용자 데이터
- [ ] Auth 설정 및 정책
- [ ] 데이터베이스 스키마
- [ ] 데이터베이스 데이터
- [ ] RLS 정책
- [ ] 트리거 및 함수
- [ ] Storage 버킷 및 파일
- [ ] Edge Functions

## Supabase Auth 백업

### 1. Auth 사용자 데이터 백업

#### 방법 1: Supabase Dashboard (수동)
```
1. Supabase Dashboard 접속
2. Authentication > Users 탭
3. Export users 버튼 클릭
4. CSV 형식으로 다운로드
```

#### 방법 2: SQL을 통한 백업
```sql
-- Auth 스키마의 사용자 데이터 백업
-- 주의: Service Role Key 필요

-- 사용자 기본 정보
SELECT 
    id,
    email,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    confirmed_at,
    last_sign_in_at,
    role,
    created_at,
    updated_at,
    is_sso_user,
    deleted_at
FROM auth.users
ORDER BY created_at;

-- 사용자 메타데이터
SELECT 
    id,
    raw_user_meta_data,
    raw_app_meta_data
FROM auth.users;

-- 사용자 식별자 (OAuth 연동 정보)
SELECT 
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
FROM auth.identities;

-- 세션 정보 (선택적)
SELECT 
    id,
    user_id,
    created_at,
    updated_at,
    factor_id,
    aal,
    not_after
FROM auth.sessions
WHERE not_after > NOW(); -- 유효한 세션만
```

#### 방법 3: Supabase CLI를 통한 백업
```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 연결
supabase link --project-ref your-project-ref

# Auth 설정 내보내기
supabase db dump --schema auth > auth_backup.sql

# 특정 테이블만 백업
supabase db dump --schema auth --data-only > auth_data_backup.sql
```

#### 방법 4: API를 통한 백업 (Node.js)
```javascript
const { createClient } = require('@supabase/supabase-js');

// Service Role Key 사용 (관리자 권한)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupAuthUsers() {
  // 모든 사용자 가져오기
  const { data: users, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  // JSON 파일로 저장
  const fs = require('fs');
  const backup = {
    timestamp: new Date().toISOString(),
    users: users,
    total: users.length
  };

  fs.writeFileSync(
    `auth_backup_${Date.now()}.json`,
    JSON.stringify(backup, null, 2)
  );

  console.log(`Backed up ${users.length} users`);
}

backupAuthUsers();
```

### 2. Auth 설정 백업

```bash
# Auth 설정 백업 (정책, 트리거 등)
supabase db dump --schema auth --no-data > auth_schema_backup.sql

# Auth 설정 포함 항목:
# - Email 템플릿
# - SMS 템플릿
# - 리디렉트 URL
# - JWT 설정
# - OAuth 프로바이더 설정
```

## 데이터베이스 백업

### 1. 전체 데이터베이스 백업

#### 방법 1: Supabase Dashboard
```
1. Settings > Database
2. Backups 탭
3. Download backup 클릭
4. 원하는 백업 시점 선택
```

#### 방법 2: pg_dump 사용 (권장)
```bash
# 연결 정보 가져오기
# Supabase Dashboard > Settings > Database > Connection string

# 전체 백업 (스키마 + 데이터)
pg_dump \
  -h db.xxxxxxxxxxxx.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --verbose \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-unlogged-table-data \
  -f backup_full_$(date +%Y%m%d_%H%M%S).sql

# 스키마만 백업
pg_dump \
  -h db.xxxxxxxxxxxx.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --schema-only \
  --verbose \
  -f backup_schema_$(date +%Y%m%d_%H%M%S).sql

# 데이터만 백업
pg_dump \
  -h db.xxxxxxxxxxxx.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --data-only \
  --verbose \
  -f backup_data_$(date +%Y%m%d_%H%M%S).sql

# 특정 테이블만 백업
pg_dump \
  -h db.xxxxxxxxxxxx.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t users \
  -t content \
  -t comments \
  --verbose \
  -f backup_tables_$(date +%Y%m%d_%H%M%S).sql
```

#### 방법 3: Supabase CLI 사용
```bash
# 전체 데이터베이스 백업
supabase db dump -f backup_$(date +%Y%m%d).sql

# 특정 스키마만 백업
supabase db dump --schema public -f public_backup.sql

# RLS 정책 포함 백업
supabase db dump --include-policies -f backup_with_rls.sql

# 역할 및 권한 포함
supabase db dump --include-roles -f backup_with_roles.sql
```

### 2. 증분 백업 (Incremental Backup)

```bash
#!/bin/bash
# incremental_backup.sh

# 설정
DB_HOST="db.xxxxxxxxxxxx.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 마지막 백업 이후 변경된 데이터만 백업
pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --data-only \
  --inserts \
  --column-inserts \
  --where="updated_at > '$(cat $BACKUP_DIR/last_backup_time.txt)'" \
  -f "$BACKUP_DIR/incremental_$DATE.sql"

# 백업 시간 기록
echo $(date -u +"%Y-%m-%d %H:%M:%S") > $BACKUP_DIR/last_backup_time.txt
```

### 3. RLS 정책 백업

```sql
-- RLS 정책 추출
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- SQL 형식으로 저장
\o rls_policies_backup.sql
SELECT 
    'CREATE POLICY ' || policyname || 
    ' ON ' || schemaname || '.' || tablename ||
    ' AS ' || permissive ||
    ' FOR ' || cmd ||
    ' TO ' || array_to_string(roles, ', ') ||
    CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';'
FROM pg_policies
WHERE schemaname = 'public';
\o
```

### 4. 트리거 및 함수 백업

```sql
-- 함수 백업
SELECT 
    proname,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- 트리거 백업
SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    action_statement,
    action_orientation,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## Storage 백업

### Storage 버킷 및 파일 백업

```javascript
// storage_backup.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupStorage() {
  // 모든 버킷 목록 가져오기
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    return;
  }

  for (const bucket of buckets) {
    console.log(`Backing up bucket: ${bucket.name}`);
    
    // 버킷의 모든 파일 목록
    const { data: files, error: filesError } = await supabase
      .storage
      .from(bucket.name)
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (filesError) {
      console.error(`Error listing files in ${bucket.name}:`, filesError);
      continue;
    }

    // 각 파일 다운로드
    for (const file of files) {
      const { data, error } = await supabase
        .storage
        .from(bucket.name)
        .download(file.name);

      if (error) {
        console.error(`Error downloading ${file.name}:`, error);
        continue;
      }

      // 로컬에 저장
      const backupPath = path.join('storage_backup', bucket.name, file.name);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, data);
      
      console.log(`Backed up: ${file.name}`);
    }
  }
}

backupStorage();
```

## 백업 자동화

### 1. Cron Job 설정 (Linux/Mac)

```bash
# crontab -e
# 매일 새벽 2시에 백업
0 2 * * * /path/to/backup_script.sh

# backup_script.sh
#!/bin/bash

# 설정
export PGPASSWORD="your_password"
BACKUP_DIR="/backup/supabase"
DATE=$(date +%Y%m%d)
DB_HOST="db.xxxxxxxxxxxx.supabase.co"

# 디렉토리 생성
mkdir -p $BACKUP_DIR/$DATE

# 데이터베이스 백업
pg_dump -h $DB_HOST -U postgres -d postgres \
  -f $BACKUP_DIR/$DATE/database.sql

# Auth 백업
pg_dump -h $DB_HOST -U postgres -d postgres \
  --schema auth \
  -f $BACKUP_DIR/$DATE/auth.sql

# 압축
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/$DATE

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

# S3나 다른 저장소로 업로드 (선택적)
aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz s3://my-backup-bucket/supabase/
```

### 2. GitHub Actions 자동 백업

```yaml
# .github/workflows/backup.yml
name: Supabase Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 매일 새벽 2시
  workflow_dispatch:  # 수동 실행 가능

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Install PostgreSQL client
      run: |
        sudo apt-get update
        sudo apt-get install -y postgresql-client
    
    - name: Backup Database
      env:
        PGPASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      run: |
        pg_dump \
          -h ${{ secrets.SUPABASE_DB_HOST }} \
          -U postgres \
          -d postgres \
          -f backup_$(date +%Y%m%d).sql
    
    - name: Upload to S3
      uses: jakejarvis/s3-sync-action@v0.5.1
      with:
        args: --acl private
      env:
        AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        SOURCE_DIR: '.'
        DEST_DIR: 'supabase-backups/'
```

### 3. Node.js 자동 백업 스크립트

```javascript
// automated_backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const config = {
  host: process.env.SUPABASE_DB_HOST,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  backupDir: './backups'
};

function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(config.backupDir, `backup_${timestamp}.sql`);
  
  // 백업 디렉토리 생성
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }

  // pg_dump 명령 실행
  const command = `PGPASSWORD=${config.password} pg_dump -h ${config.host} -U ${config.user} -d ${config.database} -f ${backupFile}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`백업 실패: ${error}`);
      return;
    }
    
    console.log(`백업 완료: ${backupFile}`);
    
    // 압축
    exec(`gzip ${backupFile}`, (gzipError) => {
      if (gzipError) {
        console.error(`압축 실패: ${gzipError}`);
        return;
      }
      console.log(`압축 완료: ${backupFile}.gz`);
    });
  });
}

// 매일 새벽 2시에 백업
cron.schedule('0 2 * * *', () => {
  console.log('자동 백업 시작...');
  performBackup();
});

// 즉시 실행 (테스트용)
performBackup();
```

## 복원 방법

### 1. 전체 복원

```bash
# 새로운 Supabase 프로젝트에 복원
psql \
  -h db.new-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup_full.sql

# 기존 프로젝트에 복원 (주의: 기존 데이터 삭제)
psql \
  -h db.xxxxxxxxxxxx.supabase.co \
  -U postgres \
  -d postgres \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
  -f backup_full.sql
```

### 2. 부분 복원

```bash
# 특정 테이블만 복원
psql \
  -h db.xxxxxxxxxxxx.supabase.co \
  -U postgres \
  -d postgres \
  -c "TRUNCATE TABLE users CASCADE;" \
  -f users_backup.sql

# 특정 데이터만 복원 (INSERT 문 사용)
psql \
  -h db.xxxxxxxxxxxx.supabase.co \
  -U postgres \
  -d postgres \
  -f incremental_backup.sql
```

### 3. Auth 데이터 복원

```javascript
// restore_auth.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreAuthUsers() {
  // 백업 파일 읽기
  const backupData = JSON.parse(
    fs.readFileSync('auth_backup.json', 'utf8')
  );

  for (const user of backupData.users) {
    try {
      // 사용자 생성
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        phone: user.phone,
        password: 'temporary_password_123', // 임시 비밀번호
        email_confirm: true,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata
      });

      if (error) {
        console.error(`Failed to restore user ${user.email}:`, error);
        continue;
      }

      console.log(`Restored user: ${user.email}`);
      
      // 비밀번호 리셋 이메일 발송
      await supabase.auth.resetPasswordForEmail(user.email);
      
    } catch (err) {
      console.error(`Error restoring user ${user.email}:`, err);
    }
  }
}

restoreAuthUsers();
```

### 4. Point-in-Time Recovery (PITR)

```bash
# Supabase Pro 이상 플랜에서 가능
# Dashboard에서 특정 시점으로 복원

# 또는 API 사용
curl -X POST https://api.supabase.com/v1/projects/{project-ref}/database/pitr \
  -H "Authorization: Bearer {api-key}" \
  -H "Content-Type: application/json" \
  -d '{
    "recovery_time": "2024-01-15T10:30:00Z"
  }'
```

## 검증 및 테스트

### 1. 백업 무결성 검증

```bash
#!/bin/bash
# verify_backup.sh

# 백업 파일 체크섬 생성
md5sum backup_full.sql > backup_full.md5

# 복원 후 체크섬 검증
md5sum -c backup_full.md5

# 테스트 데이터베이스에 복원
createdb test_restore
psql -d test_restore -f backup_full.sql

# 데이터 수 비교
echo "원본 데이터베이스:"
psql -h production.supabase.co -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM users;"

echo "복원된 데이터베이스:"
psql -d test_restore \
  -c "SELECT COUNT(*) FROM users;"

# 테스트 데이터베이스 삭제
dropdb test_restore
```

### 2. 자동 검증 스크립트

```javascript
// verify_backup.js
const { Client } = require('pg');

async function verifyBackup() {
  // 원본 DB 연결
  const sourceClient = new Client({
    host: process.env.SOURCE_DB_HOST,
    user: 'postgres',
    password: process.env.SOURCE_DB_PASSWORD,
    database: 'postgres'
  });

  // 백업 DB 연결
  const backupClient = new Client({
    host: process.env.BACKUP_DB_HOST,
    user: 'postgres',
    password: process.env.BACKUP_DB_PASSWORD,
    database: 'postgres'
  });

  await sourceClient.connect();
  await backupClient.connect();

  // 테이블 목록 비교
  const sourceTables = await sourceClient.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const backupTables = await backupClient.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  // 각 테이블의 레코드 수 비교
  for (const table of sourceTables.rows) {
    const sourceCount = await sourceClient.query(
      `SELECT COUNT(*) FROM ${table.tablename}`
    );
    const backupCount = await backupClient.query(
      `SELECT COUNT(*) FROM ${table.tablename}`
    );

    if (sourceCount.rows[0].count !== backupCount.rows[0].count) {
      console.error(`Mismatch in ${table.tablename}: 
        Source: ${sourceCount.rows[0].count}, 
        Backup: ${backupCount.rows[0].count}`);
    } else {
      console.log(`✓ ${table.tablename}: ${sourceCount.rows[0].count} records`);
    }
  }

  await sourceClient.end();
  await backupClient.end();
}

verifyBackup();
```

## 백업 전략 권장사항

### 3-2-1 백업 규칙
- **3개**의 백업 복사본 유지
- **2개**의 다른 미디어/위치에 저장
- **1개**는 오프사이트/클라우드에 저장

### 백업 주기
| 데이터 유형 | 백업 주기 | 보관 기간 |
|------------|----------|-----------|
| 전체 백업 | 주 1회 | 4주 |
| 증분 백업 | 일 1회 | 7일 |
| 트랜잭션 로그 | 1시간마다 | 24시간 |
| 중요 테이블 | 실시간 복제 | - |

### 백업 저장소
1. **로컬**: 빠른 복원용
2. **클라우드 (S3, GCS)**: 재해 복구용
3. **다른 리전 Supabase**: 실시간 복제

## 트러블슈팅

### 일반적인 문제 해결

#### 1. pg_dump 권한 오류
```bash
# 해결: Service Role Key 사용
export PGPASSWORD="your-service-role-password"
```

#### 2. 백업 파일 크기 문제
```bash
# 압축 사용
pg_dump ... | gzip > backup.sql.gz

# 병렬 처리
pg_dump -j 4 ... # 4개 프로세스 사용
```

#### 3. 네트워크 타임아웃
```bash
# 연결 타임아웃 증가
pg_dump --no-password \
  --set statement_timeout=0 \
  --set lock_timeout=0 \
  --set idle_in_transaction_session_timeout=0 \
  ...
```

#### 4. 대용량 데이터베이스 백업
```bash
# pg_dump 대신 pg_basebackup 사용
pg_basebackup \
  -h db.xxxxxxxxxxxx.supabase.co \
  -U postgres \
  -D /backup/directory \
  -Ft \
  -z \
  -P
```

#### 5. RLS 정책 복원 실패
```sql
-- RLS 임시 비활성화
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- 데이터 복원
-- ...
-- RLS 재활성화
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

## 모니터링 및 알림

### 백업 상태 모니터링

```javascript
// monitor_backups.js
const nodemailer = require('nodemailer');

async function checkBackupStatus() {
  const backupDir = './backups';
  const fs = require('fs');
  
  // 최신 백업 파일 찾기
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    await sendAlert('No backup files found!');
    return;
  }

  const latestBackup = files[0];
  const hoursSinceBackup = (Date.now() - latestBackup.time) / (1000 * 60 * 60);

  if (hoursSinceBackup > 25) { // 25시간 이상 백업 없음
    await sendAlert(`Last backup was ${hoursSinceBackup.toFixed(1)} hours ago!`);
  }

  // 백업 파일 크기 확인
  const stats = fs.statSync(path.join(backupDir, latestBackup.name));
  const sizeInMB = stats.size / (1024 * 1024);
  
  if (sizeInMB < 1) { // 1MB 미만이면 문제 가능성
    await sendAlert(`Backup file too small: ${sizeInMB.toFixed(2)} MB`);
  }

  console.log(`Latest backup: ${latestBackup.name} (${sizeInMB.toFixed(2)} MB)`);
}

async function sendAlert(message) {
  // 이메일, Slack, Discord 등으로 알림 발송
  console.error(`ALERT: ${message}`);
  
  // 이메일 예시
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: 'Supabase Backup Alert',
    text: message
  });
}

// 1시간마다 체크
setInterval(checkBackupStatus, 60 * 60 * 1000);
```

## 베스트 프랙티스

### DO's ✅
1. **정기적인 백업 테스트**: 월 1회 복원 테스트
2. **다중 백업**: 여러 위치에 백업 저장
3. **암호화**: 백업 파일 암호화
4. **문서화**: 백업/복원 절차 문서화
5. **자동화**: 수동 작업 최소화
6. **모니터링**: 백업 상태 지속 확인
7. **버전 관리**: 백업 파일 버전 관리

### DON'Ts ❌
1. **단일 백업 의존**: 하나의 백업만 유지
2. **테스트 없는 백업**: 복원 테스트 생략
3. **평문 저장**: 암호화 없이 저장
4. **접근 제어 미비**: 백업 파일 공개 접근
5. **오래된 백업**: 유효기간 지난 백업 유지
6. **수동 의존**: 자동화 없이 수동 백업만

## 긴급 복구 계획

### 재해 발생 시 복구 순서
1. **영향 평가** (5분)
   - 데이터 손실 범위 확인
   - 서비스 중단 시간 예측

2. **백업 확인** (10분)
   - 최신 백업 위치 확인
   - 백업 무결성 검증

3. **복원 환경 준비** (15분)
   - 새 Supabase 프로젝트 생성 또는
   - 기존 프로젝트 초기화

4. **데이터 복원** (30분-2시간)
   - 스키마 복원
   - 데이터 복원
   - RLS 정책 복원

5. **검증** (30분)
   - 데이터 무결성 확인
   - 주요 기능 테스트

6. **서비스 재개** (10분)
   - DNS 변경 또는
   - 환경 변수 업데이트
   - 서비스 재시작

### 연락처 및 리소스
- Supabase Support: support@supabase.io
- 긴급 연락처: [팀 리더 연락처]
- 백업 위치: [S3 버킷 URL]
- 복구 스크립트: [GitHub 저장소]

## 요약

완전한 Supabase 백업을 위해서는:
1. **Auth 데이터**와 **Database** 모두 백업
2. **자동화**된 정기 백업 구성
3. **다중 위치**에 백업 저장
4. **정기적인 복원 테스트** 수행
5. **모니터링 및 알림** 설정

이 가이드를 따라 구성하면 데이터 손실 위험을 최소화하고, 재해 발생 시 빠른 복구가 가능합니다.