#!/usr/bin/env node

/**
 * Staging Environment Connection Test Script
 * 
 * Usage: npm run test:staging
 * 
 * This script tests the connection to your staging Supabase database
 * and provides diagnostic information about the environment setup.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

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

// Helper function to print colored output
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main test function
async function testStagingConnection() {
  print('\n🔍 Testing Staging Environment Connection...', 'bright');
  print('=' .repeat(50), 'cyan');

  // 1. Check environment variables
  print('\n📋 Checking environment variables...', 'yellow');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE;

  if (!supabaseUrl || !supabaseAnonKey) {
    print('❌ Missing required environment variables!', 'red');
    print('   Please check your .env.local file', 'red');
    print('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY', 'red');
    process.exit(1);
  }

  // Check if we're in staging mode
  if (envMode !== 'staging') {
    print(`⚠️  Warning: NEXT_PUBLIC_ENV_MODE is '${envMode}', expected 'staging'`, 'yellow');
    print('   Make sure you ran: npm run env:staging', 'yellow');
  }

  // Display environment info (masked for security)
  print(`✅ Supabase URL: ${supabaseUrl}`, 'green');
  print(`✅ Anon Key: ${supabaseAnonKey.substring(0, 20)}...`, 'green');
  print(`✅ Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'Not provided'}`, 'green');
  print(`✅ Environment Mode: ${envMode || 'not set'}`, 'green');

  // 2. Create Supabase client
  print('\n🔗 Creating Supabase client...', 'yellow');
  
  // Use service role key if available for broader access
  const supabase = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  // 3. Test database connection
  print('\n🗄️  Testing database connection...', 'yellow');
  
  try {
    // Test 1: Check if users table exists and is accessible
    const { data: users, error: usersError, count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (usersError) {
      print(`❌ Failed to query users table: ${usersError.message}`, 'red');
      print('   This might mean:', 'yellow');
      print('   - The users table doesn\'t exist yet', 'yellow');
      print('   - RLS policies are blocking access', 'yellow');
      print('   - The connection credentials are incorrect', 'yellow');
    } else {
      print(`✅ Successfully connected to database!`, 'green');
      print(`📊 Users table: ${userCount || 0} total records`, 'cyan');
      if (users && users.length > 0) {
        print('   Sample users:', 'cyan');
        users.forEach(user => {
          print(`   - ${user.name || 'No name'} (${user.email}) - Role: ${user.role}`, 'cyan');
        });
      }
    }

    // Test 2: Check content table
    const { data: content, error: contentError, count: contentCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (!contentError) {
      print(`📝 Content table: ${contentCount || 0} total records`, 'cyan');
      if (content && content.length > 0) {
        print('   Recent content:', 'cyan');
        content.forEach(item => {
          print(`   - ${item.title} (Type: ${item.type}, Status: ${item.status})`, 'cyan');
        });
      }
    }

    // Test 3: List all tables (requires service role key)
    if (supabaseServiceKey) {
      print('\n📋 Available tables in database:', 'yellow');
      
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (!tablesError && tables) {
        const tableNames = tables.map(t => t.table_name).sort();
        print(`   Found ${tableNames.length} tables:`, 'cyan');
        tableNames.forEach(name => {
          print(`   - ${name}`, 'cyan');
        });
      }
    }

    // 4. Test Storage (optional)
    print('\n📦 Testing storage buckets...', 'yellow');
    
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (!bucketsError && buckets) {
      print(`✅ Storage is accessible`, 'green');
      print(`   Found ${buckets.length} bucket(s)`, 'cyan');
      buckets.forEach(bucket => {
        print(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`, 'cyan');
      });
    } else if (bucketsError) {
      print(`⚠️  Storage test failed: ${bucketsError.message}`, 'yellow');
    }

    // 5. Summary
    print('\n' + '=' .repeat(50), 'cyan');
    print('✨ Staging Environment Test Complete!', 'bright');
    print('\nNext steps:', 'green');
    print('1. If tables are missing, copy your production schema', 'green');
    print('2. Add test data using the SQL editor', 'green');
    print('3. Start development with: npm run dev:staging', 'green');
    print('\nHappy coding! 🚀', 'bright');

  } catch (error) {
    print(`\n❌ Unexpected error: ${error.message}`, 'red');
    print('\nTroubleshooting:', 'yellow');
    print('1. Check your internet connection', 'yellow');
    print('2. Verify the Supabase project is active', 'yellow');
    print('3. Ensure environment variables are correct', 'yellow');
    print('4. Try running: npm run env:staging', 'yellow');
    process.exit(1);
  }
}

// Run the test
testStagingConnection().catch(error => {
  print(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});