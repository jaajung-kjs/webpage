-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
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

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(50),
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

-- Create indexes for better performance
CREATE INDEX idx_cases_author_id ON cases(author_id);
CREATE INDEX idx_cases_category ON cases(category);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_cases_featured ON cases(is_featured) WHERE is_featured = TRUE;

CREATE INDEX idx_resources_author_id ON resources(author_id);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);

CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_instructor_id ON activities(instructor_id);

CREATE INDEX idx_announcements_author_id ON announcements(author_id);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

CREATE INDEX idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_pinned ON community_posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

CREATE INDEX idx_comments_case_id ON comments(case_id);
CREATE INDEX idx_comments_announcement_id ON comments(announcement_id);
CREATE INDEX idx_comments_community_post_id ON comments(community_post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_case_id ON likes(case_id);
CREATE INDEX idx_likes_community_post_id ON likes(community_post_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);

CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user_id ON activity_participants(user_id);

-- Full-text search indexes (using default English config as Korean is not available in Supabase)
CREATE INDEX idx_cases_search ON cases USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_resources_search ON resources USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_community_posts_search ON community_posts USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_announcements_search ON announcements USING gin(to_tsvector('english', title || ' ' || content));