#!/bin/bash

# 로컬 Supabase DB 헬퍼 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로컬 DB 연결 정보
LOCAL_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# 함수: SQL 실행
execute_sql() {
    local sql="$1"
    echo -e "${YELLOW}Executing SQL on local database...${NC}"
    psql "$LOCAL_DB_URL" -c "$sql"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SQL executed successfully${NC}"
    else
        echo -e "${RED}✗ SQL execution failed${NC}"
        return 1
    fi
}

# 함수: 마이그레이션 생성 및 실행
create_migration() {
    local name="$1"
    local sql="$2"
    
    echo -e "${YELLOW}Creating migration: $name${NC}"
    
    # 마이그레이션 파일 생성
    npx supabase migration new "$name"
    
    # 최신 마이그레이션 파일 찾기
    migration_file=$(ls -t supabase/migrations/*.sql | head -1)
    
    # SQL 내용 추가
    echo "$sql" > "$migration_file"
    
    echo -e "${GREEN}✓ Migration created: $migration_file${NC}"
    echo -e "${YELLOW}Running migration...${NC}"
    
    # 마이그레이션 실행
    npx supabase migration up
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration applied successfully${NC}"
    else
        echo -e "${RED}✗ Migration failed${NC}"
        return 1
    fi
}

# 함수: 스키마 덤프
dump_schema() {
    echo -e "${YELLOW}Dumping local schema...${NC}"
    pg_dump "$LOCAL_DB_URL" --schema-only > supabase/schema_dump.sql
    echo -e "${GREEN}✓ Schema dumped to supabase/schema_dump.sql${NC}"
}

# 함수: 타입 생성
generate_types() {
    echo -e "${YELLOW}Generating TypeScript types...${NC}"
    npx supabase gen types typescript --local > src/lib/database.types.ts
    echo -e "${GREEN}✓ Types generated${NC}"
}

# 메인 명령 처리
case "$1" in
    exec)
        execute_sql "$2"
        ;;
    migrate)
        create_migration "$2" "$3"
        ;;
    dump)
        dump_schema
        ;;
    types)
        generate_types
        ;;
    *)
        echo "Usage:"
        echo "  $0 exec \"SQL_STATEMENT\""
        echo "  $0 migrate \"migration_name\" \"SQL_STATEMENT\""
        echo "  $0 dump"
        echo "  $0 types"
        ;;
esac