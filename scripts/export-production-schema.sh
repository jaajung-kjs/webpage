#!/bin/bash

# Production Schema Export Script
# This script helps you export the production schema using Supabase CLI
# Usage: ./scripts/export-production-schema.sh

echo "🔧 Production Schema Export Tool"
echo "================================"
echo ""
echo "This script will help you export your production database schema."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed!${NC}"
    echo "Please install it first: npm install -g supabase"
    exit 1
fi

# Production project ID
PROD_PROJECT_ID="ajwgnloatyuqwkqwrrzj"
STAGING_PROJECT_ID="jvqqsekguajyxmgnsztn"

echo "📋 Instructions:"
echo "----------------"
echo ""
echo "Option 1: Export Schema Only (Recommended)"
echo "==========================================="
echo "1. Login to Supabase CLI (if not already):"
echo "   ${GREEN}supabase login${NC}"
echo ""
echo "2. Link to production project:"
echo "   ${GREEN}supabase link --project-ref ${PROD_PROJECT_ID}${NC}"
echo ""
echo "3. Export production schema:"
echo "   ${GREEN}supabase db dump --schema-only -f production-schema.sql${NC}"
echo ""
echo "4. Switch to staging project:"
echo "   ${GREEN}supabase link --project-ref ${STAGING_PROJECT_ID}${NC}"
echo ""
echo "5. Apply schema to staging:"
echo "   ${GREEN}supabase db reset${NC}"
echo "   ${GREEN}supabase db push production-schema.sql${NC}"
echo ""
echo "Option 2: Export Schema + Data"
echo "==============================="
echo "1. Export with data (specific tables):"
echo "   ${GREEN}supabase db dump --data-only -t users -t content -t comments -t likes -f production-data.sql${NC}"
echo ""
echo "2. Apply to staging:"
echo "   ${GREEN}supabase db push production-data.sql${NC}"
echo ""
echo "Option 3: Use Supabase Dashboard (Easiest)"
echo "==========================================="
echo "1. Go to: https://supabase.com/dashboard/project/${PROD_PROJECT_ID}/editor"
echo "2. Run this query to get schema:"
echo ""
echo "${YELLOW}-- Get all table definitions${NC}"
cat << 'EOF'
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ', '
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
EOF
echo ""
echo "3. Copy the output and run it in staging:"
echo "   https://supabase.com/dashboard/project/${STAGING_PROJECT_ID}/editor"
echo ""
echo "================================"
echo ""
echo "📝 Quick Copy Data Script"
echo "After schema is set up, run: ${GREEN}node scripts/copy-production-to-staging.js${NC}"
echo ""
echo "⚠️  Remember:"
echo "  - Schema must exist in staging before copying data"
echo "  - Storage files are not copied automatically"
echo "  - Auth users need separate handling"
echo ""