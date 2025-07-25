-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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

-- Create trigger for like count updates
CREATE TRIGGER update_like_count_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_like_count();

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

-- Create trigger for comment count updates
CREATE TRIGGER update_comment_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Function to update view counts
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

-- Create trigger for activity participant count
CREATE TRIGGER update_activity_participant_count_trigger
    AFTER INSERT OR DELETE ON activity_participants
    FOR EACH ROW EXECUTE FUNCTION update_activity_participant_count();

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

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get user with stats
CREATE OR REPLACE FUNCTION get_user_with_stats(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(50),
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
        p.id, p.name, p.email, p.phone, p.department, p.position, p.role,
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