#!/usr/bin/env node

/**
 * Production to Staging Data Copy Script
 * 
 * Usage: node scripts/copy-production-to-staging.js
 * 
 * This script copies schema and selected data from production to staging.
 * It preserves user information and posts while allowing for safe testing.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Production environment configuration
const PRODUCTION_CONFIG = {
  url: 'https://ajwgnloatyuqwkqwrrzj.supabase.co',
  // You need to provide these - they're in your .env.local.production
  anonKey: process.env.PROD_SUPABASE_ANON_KEY || '',
  serviceKey: process.env.PROD_SUPABASE_SERVICE_KEY || ''
};

// Staging environment configuration
const STAGING_CONFIG = {
  url: 'https://jvqqsekguajyxmgnsztn.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

async function copyProductionToStaging() {
  print('\n🚀 Production to Staging Copy Tool', 'bright');
  print('=' .repeat(50), 'cyan');
  
  // Load production environment variables first
  const prodEnv = require('dotenv').config({ path: path.join(__dirname, '..', '.env.local.production') });
  if (prodEnv.parsed) {
    PRODUCTION_CONFIG.anonKey = prodEnv.parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    PRODUCTION_CONFIG.serviceKey = prodEnv.parsed.SUPABASE_SERVICE_ROLE_KEY;
  }
  
  // Load staging environment variables
  const stagingEnv = require('dotenv').config({ path: path.join(__dirname, '..', '.env.local.staging') });
  if (stagingEnv.parsed) {
    STAGING_CONFIG.anonKey = stagingEnv.parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    STAGING_CONFIG.serviceKey = stagingEnv.parsed.SUPABASE_SERVICE_ROLE_KEY;
  }
  
  if (!PRODUCTION_CONFIG.serviceKey || !STAGING_CONFIG.serviceKey) {
    print('\n❌ Missing service role keys!', 'red');
    print('Please ensure both .env.local.production and .env.local.staging have:', 'yellow');
    print('  - SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    process.exit(1);
  }
  
  // Create clients
  const prodSupabase = createClient(
    PRODUCTION_CONFIG.url,
    PRODUCTION_CONFIG.serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  
  const stagingSupabase = createClient(
    STAGING_CONFIG.url,
    STAGING_CONFIG.serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  
  try {
    // Step 1: Copy Users
    print('\n👥 Copying Users...', 'yellow');
    const { data: users, error: usersError } = await prodSupabase
      .from('users')
      .select('*');
    
    if (usersError) {
      print(`❌ Failed to fetch users: ${usersError.message}`, 'red');
    } else if (users && users.length > 0) {
      // Clean existing users in staging (optional - comment out if you want to keep)
      await stagingSupabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert users to staging
      const { error: insertError } = await stagingSupabase
        .from('users')
        .insert(users);
      
      if (insertError) {
        print(`⚠️  Error inserting users: ${insertError.message}`, 'yellow');
        print('   You might need to create the users table first', 'yellow');
      } else {
        print(`✅ Copied ${users.length} users`, 'green');
      }
    }
    
    // Step 2: Copy Content (posts)
    print('\n📝 Copying Content (posts)...', 'yellow');
    const { data: content, error: contentError } = await prodSupabase
      .from('content')
      .select('*')
      .in('type', ['free', 'community', 'news', 'resource', 'case']); // Main content types
    
    if (contentError) {
      print(`❌ Failed to fetch content: ${contentError.message}`, 'red');
    } else if (content && content.length > 0) {
      // Clean existing content in staging
      await stagingSupabase.from('content').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert content to staging
      const { error: insertError } = await stagingSupabase
        .from('content')
        .insert(content);
      
      if (insertError) {
        print(`⚠️  Error inserting content: ${insertError.message}`, 'yellow');
        print('   You might need to create the content table first', 'yellow');
      } else {
        print(`✅ Copied ${content.length} content items`, 'green');
      }
    }
    
    // Step 3: Copy Comments
    print('\n💬 Copying Comments...', 'yellow');
    const { data: comments, error: commentsError } = await prodSupabase
      .from('comments')
      .select('*');
    
    if (commentsError) {
      print(`⚠️  Comments table might not exist: ${commentsError.message}`, 'yellow');
    } else if (comments && comments.length > 0) {
      await stagingSupabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      const { error: insertError } = await stagingSupabase
        .from('comments')
        .insert(comments);
      
      if (!insertError) {
        print(`✅ Copied ${comments.length} comments`, 'green');
      }
    }
    
    // Step 4: Copy Likes
    print('\n❤️  Copying Likes...', 'yellow');
    const { data: likes, error: likesError } = await prodSupabase
      .from('likes')
      .select('*');
    
    if (likesError) {
      print(`⚠️  Likes table might not exist: ${likesError.message}`, 'yellow');
    } else if (likes && likes.length > 0) {
      await stagingSupabase.from('likes').delete().neq('content_id', '00000000-0000-0000-0000-000000000000');
      
      const { error: insertError } = await stagingSupabase
        .from('likes')
        .insert(likes);
      
      if (!insertError) {
        print(`✅ Copied ${likes.length} likes`, 'green');
      }
    }
    
    // Step 5: Copy membership applications (if needed)
    print('\n📋 Copying Membership Applications...', 'yellow');
    const { data: applications, error: appError } = await prodSupabase
      .from('membership_applications')
      .select('*')
      .eq('status', 'pending'); // Only copy pending applications
    
    if (appError) {
      print(`⚠️  Membership applications table might not exist: ${appError.message}`, 'yellow');
    } else if (applications && applications.length > 0) {
      const { error: insertError } = await stagingSupabase
        .from('membership_applications')
        .insert(applications);
      
      if (!insertError) {
        print(`✅ Copied ${applications.length} pending membership applications`, 'green');
      }
    }
    
    // Summary
    print('\n' + '=' .repeat(50), 'cyan');
    print('✨ Data copy complete!', 'bright');
    print('\n📊 Summary:', 'green');
    print('  - Users copied', 'green');
    print('  - Content/Posts copied', 'green');
    print('  - Comments copied (if exists)', 'green');
    print('  - Likes copied (if exists)', 'green');
    print('  - Pending applications copied (if exists)', 'green');
    
    print('\n⚠️  Important Notes:', 'yellow');
    print('  1. Storage files (images) are NOT copied', 'yellow');
    print('  2. Auth users are NOT copied (use separate auth)', 'yellow');
    print('  3. You may need to adjust RLS policies', 'yellow');
    print('  4. Test with: npm run test:staging', 'yellow');
    
  } catch (error) {
    print(`\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Check if production config file exists
const prodEnvPath = path.join(__dirname, '..', '.env.local.production');
if (!fs.existsSync(prodEnvPath)) {
  print('\n❌ .env.local.production file not found!', 'red');
  print('Please create it with your production credentials', 'yellow');
  process.exit(1);
}

// Run the copy process
copyProductionToStaging().catch(error => {
  print(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});