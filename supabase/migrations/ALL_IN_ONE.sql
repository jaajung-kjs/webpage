-- ================================
-- KEPCO AI 커뮤니티 통합 마이그레이션
-- 한번에 모든 테이블, 함수, 트리거, 보안 정책 생성
-- ================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- 1. ENUM TYPES
-- ================================

CREATE TYPE user_role AS ENUM ('leader', 'vice-leader', 'admin', 'member');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE post_category AS ENUM ('productivity', 'creativity', 'development', 'analysis', 'other');
CREATE TYPE post_subcategory AS ENUM ('automation', 'documentation', 'coding', 'design', 'research', 'communication');
CREATE TYPE activity_category AS ENUM ('workshop', 'seminar', 'study', 'discussion', 'meeting');
CREATE TYPE activity_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE announcement_category AS ENUM ('notice', 'event', 'meeting', 'announcement');
CREATE TYPE announcement_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE community_category AS ENUM ('tips', 'review', 'help', 'discussion', 'question', 'chat');
CREATE TYPE resource_category AS ENUM ('tutorial', 'workshop', 'template', 'reference', 'guideline');
CREATE TYPE resource_type AS ENUM ('guide', 'presentation', 'video', 'document', 'spreadsheet', 'template');

-- ================================
-- 2. TABLES
-- ================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    job_position VARCHAR(50),
    role user_role DEFAULT 'member',
    avatar_url TEXT,
    location VARCHAR(50),
    skill_level skill_level DEFAULT 'beginner',
    bio TEXT,
    activity_score INTEGER DEFAULT 0,
    ai_expertise TEXT[] DEFAULT '{}',
    achievements TEXT[] DEFAULT '{}',
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cases table (AI 활용사례)
CREATE TABLE cases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category post_category NOT NULL,
    subcategory post_subcategory,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    tools TEXT[] DEFAULT '{}',
    difficulty skill_level DEFAULT 'beginner',
    time_required VARCHAR(50),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources table (학습자료)
CREATE TABLE resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category resource_category NOT NULL,
    type resource_type NOT NULL,
    url TEXT,
    file_path TEXT,
    downloads INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table (활동일정)
CREATE TABLE activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category activity_category NOT NULL,
    status activity_status DEFAULT 'upcoming',
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER, -- minutes
    location VARCHAR(200),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    instructor_id UUID REFERENCES profiles(id),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity participants table
CREATE TABLE activity_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Announcements table (공지사항)
CREATE TABLE announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category announcement_category NOT NULL,
    priority announcement_priority DEFAULT 'medium',
    is_pinned BOOLEAN DEFAULT FALSE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    views INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community posts table (자유게시판)
CREATE TABLE community_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category community_category NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    has_image BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table (통합 댓글 시스템)
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- for replies
    
    -- Polymorphic references - only one should be set
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    community_post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to ensure exactly one reference is set
    CONSTRAINT comments_single_parent CHECK (
        (case_id IS NOT NULL)::integer + 
        (announcement_id IS NOT NULL)::integer + 
        (community_post_id IS NOT NULL)::integer = 1
    )
);

-- Likes table (좋아요 시스템)
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Polymorphic references - only one should be set
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    community_post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to ensure exactly one reference is set
    CONSTRAINT likes_single_target CHECK (
        (case_id IS NOT NULL)::integer + 
        (community_post_id IS NOT NULL)::integer + 
        (comment_id IS NOT NULL)::integer = 1
    ),
    
    -- Prevent duplicate likes
    UNIQUE(user_id, case_id),
    UNIQUE(user_id, community_post_id),
    UNIQUE(user_id, comment_id)
);

-- File attachments table
CREATE TABLE attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Polymorphic references
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    community_post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    
    uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to ensure at least one reference is set
    CONSTRAINT attachments_has_parent CHECK (
        (case_id IS NOT NULL) OR 
        (resource_id IS NOT NULL) OR 
        (community_post_id IS NOT NULL)
    )
);

-- User stats table (사용자 통계)
CREATE TABLE user_stats (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    total_posts INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    activities_joined INTEGER DEFAULT 0,
    resources_shared INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 3. INDEXES
-- ================================

-- Cases indexes
CREATE INDEX idx_cases_author_id ON cases(author_id);
CREATE INDEX idx_cases_category ON cases(category);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_cases_featured ON cases(is_featured) WHERE is_featured = TRUE;

-- Resources indexes
CREATE INDEX idx_resources_author_id ON resources(author_id);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);

-- Activities indexes
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_instructor_id ON activities(instructor_id);

-- Announcements indexes
CREATE INDEX idx_announcements_author_id ON announcements(author_id);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- Community posts indexes
CREATE INDEX idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_pinned ON community_posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

-- Comments indexes
CREATE INDEX idx_comments_case_id ON comments(case_id);
CREATE INDEX idx_comments_announcement_id ON comments(announcement_id);
CREATE INDEX idx_comments_community_post_id ON comments(community_post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Likes indexes
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_case_id ON likes(case_id);
CREATE INDEX idx_likes_community_post_id ON likes(community_post_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);

-- Activity participants indexes
CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user_id ON activity_participants(user_id);

-- ================================
-- 4. FUNCTIONS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        IF NEW.case_id IS NOT NULL THEN
            UPDATE cases SET likes_count = likes_count + 1 WHERE id = NEW.case_id;
        ELSIF NEW.community_post_id IS NOT NULL THEN
            UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.community_post_id;
        ELSIF NEW.comment_id IS NOT NULL THEN
            UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        IF OLD.case_id IS NOT NULL THEN
            UPDATE cases SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.case_id;
        ELSIF OLD.community_post_id IS NOT NULL THEN
            UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.community_post_id;
        ELSIF OLD.comment_id IS NOT NULL THEN
            UPDATE comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count (only for top-level comments)
        IF NEW.parent_id IS NULL THEN
            IF NEW.case_id IS NOT NULL THEN
                UPDATE cases SET comments_count = comments_count + 1 WHERE id = NEW.case_id;
            ELSIF NEW.announcement_id IS NOT NULL THEN
                UPDATE announcements SET comments_count = comments_count + 1 WHERE id = NEW.announcement_id;
            ELSIF NEW.community_post_id IS NOT NULL THEN
                UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.community_post_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment count (only for top-level comments)
        IF OLD.parent_id IS NULL THEN
            IF OLD.case_id IS NOT NULL THEN
                UPDATE cases SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.case_id;
            ELSIF OLD.announcement_id IS NOT NULL THEN
                UPDATE announcements SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.announcement_id;
            ELSIF OLD.community_post_id IS NOT NULL THEN
                UPDATE community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.community_post_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view counts
CREATE OR REPLACE FUNCTION increment_view_count(content_type TEXT, content_id UUID)
RETURNS VOID AS $$
BEGIN
    IF content_type = 'case' THEN
        UPDATE cases SET views = views + 1 WHERE id = content_id;
    ELSIF content_type = 'announcement' THEN
        UPDATE announcements SET views = views + 1 WHERE id = content_id;
    ELSIF content_type = 'community_post' THEN
        UPDATE community_posts SET views = views + 1 WHERE id = content_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update activity participant count
CREATE OR REPLACE FUNCTION update_activity_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE activities 
        SET current_participants = current_participants + 1 
        WHERE id = NEW.activity_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE activities 
        SET current_participants = GREATEST(0, current_participants - 1) 
        WHERE id = OLD.activity_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate activity score
CREATE OR REPLACE FUNCTION calculate_activity_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    post_count INTEGER;
    comment_count INTEGER;
    like_count INTEGER;
    activity_count INTEGER;
BEGIN
    -- Count posts (cases + community posts)
    SELECT COALESCE(
        (SELECT COUNT(*) FROM cases WHERE author_id = user_id) +
        (SELECT COUNT(*) FROM community_posts WHERE author_id = user_id), 0
    ) INTO post_count;
    
    -- Count comments
    SELECT COALESCE(COUNT(*), 0) FROM comments WHERE author_id = user_id INTO comment_count;
    
    -- Count likes received
    SELECT COALESCE(
        (SELECT COUNT(*) FROM likes l JOIN cases c ON l.case_id = c.id WHERE c.author_id = user_id) +
        (SELECT COUNT(*) FROM likes l JOIN community_posts cp ON l.community_post_id = cp.id WHERE cp.author_id = user_id) +
        (SELECT COUNT(*) FROM likes l JOIN comments cm ON l.comment_id = cm.id WHERE cm.author_id = user_id), 0
    ) INTO like_count;
    
    -- Count activity participations
    SELECT COALESCE(COUNT(*), 0) FROM activity_participants WHERE user_id = user_id INTO activity_count;
    
    -- Calculate score with weights
    score := (post_count * 10) + (comment_count * 2) + (like_count * 3) + (activity_count * 5);
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    stats_record RECORD;
BEGIN
    SELECT 
        COALESCE((SELECT COUNT(*) FROM cases WHERE author_id = target_user_id), 0) +
        COALESCE((SELECT COUNT(*) FROM community_posts WHERE author_id = target_user_id), 0) as total_posts,
        COALESCE((SELECT COUNT(*) FROM comments WHERE author_id = target_user_id), 0) as total_comments,
        COALESCE((SELECT SUM(likes_count) FROM cases WHERE author_id = target_user_id), 0) +
        COALESCE((SELECT SUM(likes_count) FROM community_posts WHERE author_id = target_user_id), 0) +
        COALESCE((SELECT SUM(likes_count) FROM comments WHERE author_id = target_user_id), 0) as total_likes_received,
        COALESCE((SELECT SUM(views) FROM cases WHERE author_id = target_user_id), 0) +
        COALESCE((SELECT SUM(views) FROM community_posts WHERE author_id = target_user_id), 0) as total_views,
        COALESCE((SELECT COUNT(*) FROM activity_participants WHERE user_id = target_user_id), 0) as activities_joined,
        COALESCE((SELECT COUNT(*) FROM resources WHERE author_id = target_user_id), 0) as resources_shared
    INTO stats_record;
    
    INSERT INTO user_stats (
        user_id, total_posts, total_comments, total_likes_received, 
        total_views, activities_joined, resources_shared, updated_at
    ) VALUES (
        target_user_id, stats_record.total_posts, stats_record.total_comments, 
        stats_record.total_likes_received, stats_record.total_views, 
        stats_record.activities_joined, stats_record.resources_shared, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_posts = EXCLUDED.total_posts,
        total_comments = EXCLUDED.total_comments,
        total_likes_received = EXCLUDED.total_likes_received,
        total_views = EXCLUDED.total_views,
        activities_joined = EXCLUDED.activities_joined,
        resources_shared = EXCLUDED.resources_shared,
        updated_at = NOW();
        
    -- Update activity score in profiles
    UPDATE profiles 
    SET activity_score = calculate_activity_score(target_user_id)
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    
    -- Initialize user stats
    INSERT INTO user_stats (user_id) VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user with stats
CREATE OR REPLACE FUNCTION get_user_with_stats(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    department VARCHAR(100),
    job_position VARCHAR(50),
    role user_role,
    avatar_url TEXT,
    location VARCHAR(50),
    skill_level skill_level,
    bio TEXT,
    activity_score INTEGER,
    ai_expertise TEXT[],
    achievements TEXT[],
    join_date TIMESTAMP WITH TIME ZONE,
    total_posts INTEGER,
    total_comments INTEGER,
    total_likes_received INTEGER,
    total_views INTEGER,
    activities_joined INTEGER,
    resources_shared INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.name, p.email, p.phone, p.department, p.job_position, p.role,
        p.avatar_url, p.location, p.skill_level, p.bio, p.activity_score,
        p.ai_expertise, p.achievements, p.join_date,
        COALESCE(us.total_posts, 0),
        COALESCE(us.total_comments, 0),
        COALESCE(us.total_likes_received, 0),
        COALESCE(us.total_views, 0),
        COALESCE(us.activities_joined, 0),
        COALESCE(us.resources_shared, 0)
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 5. TRIGGERS
-- ================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Like count triggers
CREATE TRIGGER update_like_count_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- Comment count triggers
CREATE TRIGGER update_comment_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Activity participant count triggers
CREATE TRIGGER update_activity_participant_count_trigger
    AFTER INSERT OR DELETE ON activity_participants
    FOR EACH ROW EXECUTE FUNCTION update_activity_participant_count();

-- New user creation trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================
-- 6. ROW LEVEL SECURITY
-- ================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id AND auth.jwt() ->> 'email_confirmed_at' IS NOT NULL);
CREATE POLICY "Email verified users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id AND auth.jwt() ->> 'email_confirmed_at' IS NOT NULL);

-- Cases policies
CREATE POLICY "Anyone can view published cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Email verified users can create cases" ON cases FOR INSERT WITH CHECK (auth.uid() = author_id AND auth.jwt() ->> 'email_confirmed_at' IS NOT NULL);
CREATE POLICY "Authors can update own cases" ON cases FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete cases" ON cases FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- Resources policies
CREATE POLICY "Anyone can view resources" ON resources FOR SELECT USING (true);
CREATE POLICY "Users can create resources" ON resources FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own resources" ON resources FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete resources" ON resources FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- Activities policies
CREATE POLICY "Anyone can view activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Admins can create activities" ON activities FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);
CREATE POLICY "Instructors and admins can update activities" ON activities FOR UPDATE USING (
    auth.uid() = instructor_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);
CREATE POLICY "Admins can delete activities" ON activities FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- Activity participants policies
CREATE POLICY "Anyone can view activity participants" ON activity_participants FOR SELECT USING (true);
CREATE POLICY "Users can register for activities" ON activity_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unregister from activities" ON activity_participants FOR DELETE USING (auth.uid() = user_id);

-- Announcements policies
CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins can create announcements" ON announcements FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);
CREATE POLICY "Authors and admins can update announcements" ON announcements FOR UPDATE USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);
CREATE POLICY "Admins can delete announcements" ON announcements FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- Community posts policies
CREATE POLICY "Anyone can view community posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create community posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own community posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete community posts" ON community_posts FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own comments" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete comments" ON comments FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can create their own likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Attachments policies
CREATE POLICY "Anyone can view attachments" ON attachments FOR SELECT USING (true);
CREATE POLICY "Users can upload attachments" ON attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploaders and admins can delete attachments" ON attachments FOR DELETE USING (
    auth.uid() = uploaded_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'vice-leader', 'admin'))
);

-- User stats policies
CREATE POLICY "Users can view all user stats" ON user_stats FOR SELECT USING (true);
CREATE POLICY "System can update user stats" ON user_stats FOR ALL USING (true);

-- ================================
-- 7. STORAGE SETUP
-- ================================

-- Create storage buckets (only if they don't exist)
INSERT INTO storage.buckets (id, name, public) 
SELECT 'avatars', 'avatars', true 
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'attachments', 'attachments', false 
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'attachments');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'resources', 'resources', false 
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resources');

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Attachments storage policies
CREATE POLICY "Authenticated users can view attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'attachments' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can upload attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Uploaders can delete their attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Resources storage policies
CREATE POLICY "Authenticated users can view resources" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resources' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can upload resources" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resources' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Uploaders can delete their resources" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resources' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ================================
-- 8. SAMPLE DATA 제거
-- ================================
-- 샘플 데이터는 실제 사용자가 가입한 후 직접 생성합니다.

-- ================================
-- MIGRATION COMPLETE
-- ================================

-- Show completion message
DO $$
BEGIN
    RAISE NOTICE '🎉 KEPCO AI 커뮤니티 데이터베이스 설정이 완료되었습니다!';
    RAISE NOTICE '✅ 모든 테이블, 함수, 트리거, 보안 정책이 생성되었습니다.';
    RAISE NOTICE '📦 Storage 버킷 3개가 설정되었습니다: avatars, attachments, resources';
    RAISE NOTICE '🔐 Row Level Security가 모든 테이블에 적용되었습니다.';
    RAISE NOTICE '🚀 이제 앱을 시작할 수 있습니다: npm run dev';
END $$;