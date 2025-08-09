# Supabase CLI 백업 설정 가이드

## 1. Supabase Access Token 발급

### Access Token 받는 방법

1. **Supabase Dashboard 로그인**
   - https://app.supabase.com 접속
   - 계정 로그인

2. **Access Token 생성**
   ```
   1. 우측 상단 프로필 아이콘 클릭
   2. "Account Settings" 클릭
   3. 좌측 메뉴에서 "Access Tokens" 선택
   4. "Generate New Token" 버튼 클릭
   5. Token 이름 입력 (예: "CLI Backup Token")
   6. "Generate Token" 클릭
   7. ⚠️ 생성된 토큰 복사 (한 번만 표시됨!)
   ```

3. **토큰 안전하게 저장**
   ```bash
   # 환경 변수로 저장 (.env 파일)
   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## 2. Supabase CLI 설치 및 설정

### CLI 설치

```bash
# npm을 사용한 설치
npm install -g supabase

# 또는 Homebrew (Mac)
brew install supabase/tap/supabase

# 또는 Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 설치 확인
supabase --version
```

### CLI 로그인

```bash
# Access Token으로 로그인
supabase login

# 프롬프트가 나타나면 Access Token 붙여넣기
# Enter your access token: sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 또는 환경변수 사용
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 프로젝트 연결

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/your/project

# 프로젝트 Reference ID 확인
# Dashboard > Settings > General > Reference ID
# 예: ajwgnloatyuqwkqwrrzj

# 프로젝트 연결
supabase link --project-ref ajwgnloatyuqwkqwrrzj

# 연결 확인
supabase status
```

## 3. 실제 데이터 포함 백업

### 전체 백업 (스키마 + 데이터)

```bash
# 기본 백업 (스키마 + 데이터 모두 포함)
supabase db dump -f backup_full_$(date +%Y%m%d_%H%M%S).sql

# 데이터 포함 여부 명시적 지정
supabase db dump --data-only=false -f backup_with_schema_and_data.sql

# 대용량 데이터 백업 (압축)
supabase db dump | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 데이터만 백업

```bash
# 데이터만 백업 (스키마 제외)
supabase db dump --data-only -f backup_data_only_$(date +%Y%m%d).sql

# INSERT 문으로 생성 (복원 시 유용)
supabase db dump --data-only --inserts -f backup_data_inserts.sql
```

### 스키마만 백업

```bash
# 스키마만 백업 (데이터 제외)
supabase db dump --schema-only -f backup_schema_only.sql

# RLS 정책 포함
supabase db dump --schema-only --include-policies -f backup_schema_with_rls.sql
```

## 4. 특정 스키마/테이블 백업

### 특정 스키마 백업

```bash
# public 스키마만 백업 (데이터 포함)
supabase db dump --schema public -f public_backup.sql

# auth 스키마 백업 (사용자 데이터 포함)
supabase db dump --schema auth -f auth_backup.sql

# storage 스키마 백업
supabase db dump --schema storage -f storage_backup.sql

# 여러 스키마 동시 백업
supabase db dump --schema public --schema auth --schema storage -f multi_schema_backup.sql
```

### 특정 테이블 백업

```bash
# pg_dump 직접 사용 (더 세밀한 제어)
# Connection String 가져오기
supabase db url

# 특정 테이블만 백업
pg_dump $(supabase db url) \
  -t users \
  -t content \
  -t comments \
  --data-only \
  -f specific_tables_backup.sql
```

## 5. 백업 자동화 스크립트

### 전체 백업 스크립트

```bash
#!/bin/bash
# full_backup.sh

# 설정
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
PROJECT_REF="ajwgnloatyuqwkqwrrzj"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# 1. 전체 데이터베이스 백업 (스키마 + 데이터)
echo "Backing up full database..."
supabase db dump --project-ref $PROJECT_REF \
  -f $BACKUP_DIR/full_backup_$DATE.sql

# 2. Auth 스키마 별도 백업 (사용자 데이터)
echo "Backing up auth schema..."
supabase db dump --project-ref $PROJECT_REF \
  --schema auth \
  -f $BACKUP_DIR/auth_backup_$DATE.sql

# 3. Storage 메타데이터 백업
echo "Backing up storage metadata..."
supabase db dump --project-ref $PROJECT_REF \
  --schema storage \
  -f $BACKUP_DIR/storage_meta_$DATE.sql

# 4. RLS 정책 백업
echo "Backing up RLS policies..."
supabase db dump --project-ref $PROJECT_REF \
  --schema-only \
  --include-policies \
  -f $BACKUP_DIR/rls_policies_$DATE.sql

# 5. 압축
echo "Compressing backups..."
tar -czf $BACKUP_DIR/backup_complete_$DATE.tar.gz \
  $BACKUP_DIR/full_backup_$DATE.sql \
  $BACKUP_DIR/auth_backup_$DATE.sql \
  $BACKUP_DIR/storage_meta_$DATE.sql \
  $BACKUP_DIR/rls_policies_$DATE.sql

# 개별 SQL 파일 삭제 (압축 파일만 유지)
rm $BACKUP_DIR/*_$DATE.sql

echo "Backup completed: $BACKUP_DIR/backup_complete_$DATE.tar.gz"

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "backup_complete_*.tar.gz" -mtime +7 -delete
echo "Old backups cleaned up"
```

### Node.js 백업 스크립트

```javascript
// supabase_backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 환경 변수 설정
process.env.SUPABASE_ACCESS_TOKEN = 'sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const PROJECT_REF = 'ajwgnloatyuqwkqwrrzj';

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = './backups';
  
  // 백업 디렉토리 생성
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting backup at ${new Date().toISOString()}`);

  // 백업 명령어 목록
  const backupCommands = [
    {
      name: 'Full Database',
      file: `full_backup_${timestamp}.sql`,
      cmd: `supabase db dump --project-ref ${PROJECT_REF}`
    },
    {
      name: 'Auth Data',
      file: `auth_backup_${timestamp}.sql`,
      cmd: `supabase db dump --project-ref ${PROJECT_REF} --schema auth`
    },
    {
      name: 'Public Data Only',
      file: `public_data_${timestamp}.sql`,
      cmd: `supabase db dump --project-ref ${PROJECT_REF} --schema public --data-only`
    }
  ];

  // 각 백업 실행
  for (const backup of backupCommands) {
    console.log(`Backing up ${backup.name}...`);
    
    await new Promise((resolve, reject) => {
      exec(`${backup.cmd} -f ${path.join(backupDir, backup.file)}`, 
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error backing up ${backup.name}:`, error);
            reject(error);
          } else {
            console.log(`✓ ${backup.name} backed up successfully`);
            resolve();
          }
        }
      );
    });
  }

  console.log('All backups completed!');
}

// 실행
runBackup().catch(console.error);
```

## 6. 백업 검증

### 백업 파일 확인

```bash
# 백업 파일 크기 확인
ls -lh backups/

# SQL 파일 첫 부분 확인 (스키마 포함 여부)
head -n 50 backup_full.sql

# 데이터 포함 여부 확인 (INSERT 문 검색)
grep -c "INSERT INTO" backup_full.sql

# 테이블 목록 확인
grep "CREATE TABLE" backup_full.sql | cut -d' ' -f3
```

### 테스트 복원

```bash
# 로컬 PostgreSQL에 테스트 복원
createdb test_restore
psql test_restore < backup_full.sql

# 데이터 확인
psql test_restore -c "SELECT COUNT(*) FROM users;"
psql test_restore -c "SELECT COUNT(*) FROM content;"

# 테스트 DB 삭제
dropdb test_restore
```

## 7. Storage 파일 백업

Storage의 실제 파일들은 별도로 백업해야 합니다:

```javascript
// backup_storage_files.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://ajwgnloatyuqwkqwrrzj.supabase.co',
  'your-service-role-key' // Settings > API에서 확인
);

async function backupStorageFiles() {
  // 모든 버킷 목록
  const { data: buckets } = await supabase.storage.listBuckets();
  
  for (const bucket of buckets) {
    console.log(`Backing up bucket: ${bucket.name}`);
    
    // 버킷의 모든 파일 목록
    const { data: files } = await supabase.storage
      .from(bucket.name)
      .list('', { limit: 1000 });
    
    // 각 파일 다운로드
    for (const file of files) {
      const { data } = await supabase.storage
        .from(bucket.name)
        .download(file.name);
      
      // 로컬에 저장
      const filePath = path.join('storage_backup', bucket.name, file.name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      
      const arrayBuffer = await data.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      
      console.log(`✓ Backed up: ${file.name}`);
    }
  }
}

backupStorageFiles();
```

## 8. 주의사항 및 팁

### ⚠️ 중요 주의사항

1. **Access Token 보안**
   - 절대 코드에 하드코딩하지 마세요
   - 환경 변수나 시크릿 관리 도구 사용
   - Git에 커밋하지 마세요

2. **데이터 포함 확인**
   - `--data-only=false`가 기본값 (데이터 포함)
   - `--schema-only` 플래그 사용 시 데이터 제외
   - 백업 후 항상 파일 내용 확인

3. **대용량 데이터베이스**
   - 압축 사용: `| gzip > backup.sql.gz`
   - 백업 시간이 오래 걸릴 수 있음
   - 네트워크 안정성 확인

4. **Auth 데이터**
   - auth 스키마에는 사용자 비밀번호 해시 포함
   - 민감한 데이터이므로 암호화 권장
   - 복원 시 사용자는 비밀번호 재설정 필요

### 💡 유용한 팁

1. **정기 백업 자동화**
   ```bash
   # crontab 설정 (매일 새벽 2시)
   0 2 * * * /path/to/full_backup.sh
   ```

2. **백업 파일 암호화**
   ```bash
   # 백업 + 암호화
   supabase db dump | openssl enc -aes-256-cbc -salt -out backup.sql.enc
   
   # 복호화
   openssl enc -aes-256-cbc -d -in backup.sql.enc -out backup.sql
   ```

3. **클라우드 업로드**
   ```bash
   # AWS S3로 업로드
   aws s3 cp backup.tar.gz s3://my-backup-bucket/supabase/
   
   # Google Cloud Storage
   gsutil cp backup.tar.gz gs://my-backup-bucket/supabase/
   ```

4. **백업 상태 알림**
   ```bash
   # Slack 알림
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Supabase backup completed successfully"}' \
     YOUR_SLACK_WEBHOOK_URL
   ```

## 9. 복원 방법

```bash
# 새 프로젝트에 복원
psql $(supabase db url --project-ref new-project-ref) < backup_full.sql

# 기존 프로젝트에 복원 (주의!)
# 먼저 기존 데이터 삭제
psql $(supabase db url) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $(supabase db url) < backup_full.sql
```

## 요약

1. **Access Token 발급**: Dashboard > Account Settings > Access Tokens
2. **CLI 설치**: `npm install -g supabase`
3. **로그인**: `supabase login` 후 토큰 입력
4. **백업 실행**: `supabase db dump -f backup.sql` (데이터 포함)
5. **검증**: 백업 파일에 INSERT 문 확인

실제 데이터는 기본적으로 포함되며, `--schema-only` 플래그를 사용하지 않는 한 모든 데이터가 백업됩니다.