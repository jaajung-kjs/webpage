-- ================================
-- RLS Performance Optimization
-- ================================
-- Replaces auth.uid() with (select auth.uid()) to prevent re-evaluation for each row
-- This improves query performance at scale

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user role" ON public.users;
DROP POLICY IF EXISTS "Authors can delete their own content" ON public.content;
DROP POLICY IF EXISTS "Authors can update their own content" ON public.content;
DROP POLICY IF EXISTS "Authors can view their own content" ON public.content;
DROP POLICY IF EXISTS "Users can create content" ON public.content;
DROP POLICY IF EXISTS "Authors can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can update their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Instructors can manage their activities" ON public.activities;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.activity_participants;
DROP POLICY IF EXISTS "Uploaders can manage their media" ON public.media;
DROP POLICY IF EXISTS "Users can upload media" ON public.media;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view own activity logs" ON public.user_activity_logs;

-- Recreate policies with optimized auth.uid() calls

-- Users table policies
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (id = (select auth.uid()));

CREATE POLICY "Admins can update any user role" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
    );

-- Content table policies
CREATE POLICY "Authors can delete their own content" ON public.content
    FOR DELETE USING (author_id = (select auth.uid()));

CREATE POLICY "Authors can update their own content" ON public.content
    FOR UPDATE USING (author_id = (select auth.uid()));

CREATE POLICY "Authors can view their own content" ON public.content
    FOR SELECT USING (
        is_published = true 
        OR author_id = (select auth.uid())
    );

CREATE POLICY "Users can create content" ON public.content
    FOR INSERT WITH CHECK (author_id = (select auth.uid()));

-- Comments table policies
CREATE POLICY "Authors can delete their own comments" ON public.comments
    FOR DELETE USING (author_id = (select auth.uid()));

CREATE POLICY "Authors can update their own comments" ON public.comments
    FOR UPDATE USING (author_id = (select auth.uid()));

CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT WITH CHECK (author_id = (select auth.uid()));

-- Interactions table policies
CREATE POLICY "Users can create their own interactions" ON public.interactions
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own interactions" ON public.interactions
    FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own interactions" ON public.interactions
    FOR UPDATE USING (user_id = (select auth.uid()));

-- Activities table policies
CREATE POLICY "Instructors can manage their activities" ON public.activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.content 
            WHERE id = activities.content_id 
            AND author_id = (select auth.uid())
        )
    );

-- Activity participants table policies
CREATE POLICY "Users can manage their own participation" ON public.activity_participants
    FOR ALL USING (user_id = (select auth.uid()));

-- Media table policies
CREATE POLICY "Uploaders can manage their media" ON public.media
    FOR ALL USING (uploaded_by = (select auth.uid()));

CREATE POLICY "Users can upload media" ON public.media
    FOR INSERT WITH CHECK (uploaded_by = (select auth.uid()));

-- User settings table policies
CREATE POLICY "Users can delete their own settings" ON public.user_settings
    FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (user_id = (select auth.uid()));

-- User activity logs table policies  
CREATE POLICY "Users can view own activity logs" ON public.user_activity_logs
    FOR SELECT USING (user_id = (select auth.uid()));

-- ================================
-- Combine duplicate permissive policies
-- ================================

-- Drop duplicate policies for activities table
DROP POLICY IF EXISTS "Anyone can view activities" ON public.activities;

-- Create a single combined policy for viewing activities
CREATE POLICY "Anyone can view activities" ON public.activities
    FOR SELECT USING (true);

-- Drop duplicate policies for activity_participants table
DROP POLICY IF EXISTS "Anyone can view participants" ON public.activity_participants;

-- Create a single combined policy for viewing participants
CREATE POLICY "Anyone can view participants" ON public.activity_participants
    FOR SELECT USING (true);

-- Drop duplicate policies for content table
DROP POLICY IF EXISTS "Anyone can view published content" ON public.content;

-- Create a single combined policy for viewing content
CREATE POLICY "Anyone can view content" ON public.content
    FOR SELECT USING (
        is_published = true 
        OR author_id = (select auth.uid())
    );

-- Drop duplicate policies for media table
DROP POLICY IF EXISTS "Anyone can view media" ON public.media;

-- Create a single combined policy for viewing media
CREATE POLICY "Anyone can view media" ON public.media
    FOR SELECT USING (true);

-- ================================
-- Remove unused indexes
-- ================================

DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_users_activity_score;
DROP INDEX IF EXISTS public.idx_comments_parent;
DROP INDEX IF EXISTS public.idx_comments_created_at;
DROP INDEX IF EXISTS public.idx_interactions_type;
DROP INDEX IF EXISTS public.idx_interactions_created_at;
DROP INDEX IF EXISTS public.idx_activities_status;
DROP INDEX IF EXISTS public.idx_activity_participants_activity;
DROP INDEX IF EXISTS public.idx_media_comment;
DROP INDEX IF EXISTS public.idx_content_type;
DROP INDEX IF EXISTS public.idx_content_created_at;
DROP INDEX IF EXISTS public.idx_content_category;
DROP INDEX IF EXISTS public.idx_content_tags;
DROP INDEX IF EXISTS public.idx_content_view_count;
DROP INDEX IF EXISTS public.idx_content_search;
DROP INDEX IF EXISTS public.idx_user_activity_logs_created_at;
DROP INDEX IF EXISTS public.idx_user_activity_logs_activity_type;
DROP INDEX IF EXISTS public.idx_user_activity_logs_target;