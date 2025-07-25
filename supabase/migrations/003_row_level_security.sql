-- Enable Row Level Security
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
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Cases policies
CREATE POLICY "Anyone can view published cases" ON cases
    FOR SELECT USING (true);

CREATE POLICY "Users can create cases" ON cases
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own cases" ON cases
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete cases" ON cases
    FOR DELETE USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- Resources policies
CREATE POLICY "Anyone can view resources" ON resources
    FOR SELECT USING (true);

CREATE POLICY "Users can create resources" ON resources
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own resources" ON resources
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete resources" ON resources
    FOR DELETE USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- Activities policies
CREATE POLICY "Anyone can view activities" ON activities
    FOR SELECT USING (true);

CREATE POLICY "Admins can create activities" ON activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

CREATE POLICY "Instructors and admins can update activities" ON activities
    FOR UPDATE USING (
        auth.uid() = instructor_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

CREATE POLICY "Admins can delete activities" ON activities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- Activity participants policies
CREATE POLICY "Anyone can view activity participants" ON activity_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can register for activities" ON activity_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unregister from activities" ON activity_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Announcements policies
CREATE POLICY "Anyone can view announcements" ON announcements
    FOR SELECT USING (true);

CREATE POLICY "Admins can create announcements" ON announcements
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

CREATE POLICY "Authors and admins can update announcements" ON announcements
    FOR UPDATE USING (
        auth.uid() = author_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

CREATE POLICY "Admins can delete announcements" ON announcements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- Community posts policies
CREATE POLICY "Anyone can view community posts" ON community_posts
    FOR SELECT USING (true);

CREATE POLICY "Users can create community posts" ON community_posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own community posts" ON community_posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete community posts" ON community_posts
    FOR DELETE USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete comments" ON comments
    FOR DELETE USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- Likes policies
CREATE POLICY "Anyone can view likes" ON likes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own likes" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON likes
    FOR DELETE USING (auth.uid() = user_id);

-- Attachments policies
CREATE POLICY "Anyone can view attachments" ON attachments
    FOR SELECT USING (true);

CREATE POLICY "Users can upload attachments" ON attachments
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders and admins can delete attachments" ON attachments
    FOR DELETE USING (
        auth.uid() = uploaded_by OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('leader', 'vice-leader', 'admin')
        )
    );

-- User stats policies
CREATE POLICY "Users can view all user stats" ON user_stats
    FOR SELECT USING (true);

CREATE POLICY "System can update user stats" ON user_stats
    FOR ALL USING (true);

-- Storage policies for avatars and attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', false);

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