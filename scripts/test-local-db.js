const { createClient } = require('@supabase/supabase-js');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLocalDB() {
  console.log('🔍 Testing local Supabase connection...\n');

  try {
    // 1. Check existing users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .limit(5);

    if (usersError || !users || users.length === 0) {
      if (usersError) {
        console.log('❌ Error fetching users:', usersError.message);
      } else {
        console.log('📋 No users found in database');
      }
      console.log('Creating a test user first...\n');
      
      // Create a test user
      const testUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          email: 'test@kepco.local',
          name: 'Test User',
          role: 'member',
          department: 'AI Research',
          bio: 'Local test user for development.'
        })
        .select()
        .single();

      if (createUserError) {
        console.log('❌ Error creating user:', createUserError.message);
        return;
      }
      
      console.log('✅ Test user created:', newUser.name);
    } else {
      console.log('✅ Found users in database:');
      users?.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
    }

    // 2. Get a user ID for creating content
    const { data: firstUser } = await supabase
      .from('users')
      .select('id, name')
      .limit(1)
      .single();

    if (!firstUser) {
      console.log('❌ No users found to create content');
      return;
    }

    console.log(`\n📝 Creating test post as ${firstUser.name}...\n`);

    // 3. Create a test post
    const testPost = {
      type: 'post',
      title: '🚀 로컬 Supabase 테스트 게시글',
      content: `# 안녕하세요! 로컬 환경 테스트입니다 👋

이 글은 로컬 Supabase 환경에서 작성된 테스트 게시글입니다.

## 테스트 내용
- ✅ 로컬 DB 연결 확인
- ✅ 데이터 생성 테스트
- ✅ RLS 정책 우회 (service role key 사용)

## 기술 스택
- **Database**: PostgreSQL (로컬)
- **API**: Supabase (http://localhost:54321)
- **환경**: 개발 환경

> 이 글은 자동으로 생성된 테스트 콘텐츠입니다.

**작성 시간**: ${new Date().toLocaleString('ko-KR')}`,
      author_id: firstUser.id,
      category: '자유게시판',
      tags: ['테스트', '로컬', 'Supabase'],
      status: 'published',
      metadata: {
        test: true,
        environment: 'local',
        created_by_script: true
      }
    };

    const { data: post, error: postError } = await supabase
      .from('content')
      .insert(testPost)
      .select()
      .single();

    if (postError) {
      console.log('❌ Error creating post:', postError.message);
      return;
    }

    console.log('✅ Test post created successfully!');
    console.log('   - ID:', post.id);
    console.log('   - Title:', post.title);
    console.log('   - Category:', post.category);
    console.log('   - Status:', post.status);
    console.log('   - Created at:', new Date(post.created_at).toLocaleString('ko-KR'));

    // 4. Verify the post
    const { data: verifyPost, error: verifyError } = await supabase
      .from('content')
      .select('id, title, view_count, like_count, comment_count')
      .eq('id', post.id)
      .single();

    if (!verifyError && verifyPost) {
      console.log('\n✅ Post verification:');
      console.log('   - View count:', verifyPost.view_count);
      console.log('   - Like count:', verifyPost.like_count);
      console.log('   - Comment count:', verifyPost.comment_count);
    }

    console.log('\n🎉 Local Supabase test completed successfully!');
    console.log('📌 You can view this post in Supabase Studio: http://localhost:54323');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLocalDB();