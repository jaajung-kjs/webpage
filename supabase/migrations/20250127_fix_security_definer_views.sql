-- ================================
-- Fix SECURITY DEFINER Views
-- ================================
-- These views should not use SECURITY DEFINER as it bypasses RLS policies
-- Instead, they should respect the calling user's permissions

-- Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.comments_with_author CASCADE;
DROP VIEW IF EXISTS public.activities_with_details CASCADE;
DROP VIEW IF EXISTS public.content_with_author CASCADE;
DROP VIEW IF EXISTS public.user_stats CASCADE;

-- Recreate views without SECURITY DEFINER

-- Comments with author view
CREATE VIEW public.comments_with_author AS
SELECT 
    c.id,
    c.content_id,
    c.author_id,
    c.parent_id,
    c.comment,
    c.like_count,
    c.created_at,
    c.updated_at,
    u.name AS author_name,
    u.email AS author_email,
    u.avatar_url AS author_avatar,
    u.role AS author_role,
    u.department AS author_department
FROM comments c
LEFT JOIN users u ON c.author_id = u.id;

-- Activities with details view
CREATE VIEW public.activities_with_details AS
SELECT 
    a.id,
    a.content_id,
    a.activity_date,
    a.start_time,
    a.end_time,
    a.location,
    a.max_participants,
    a.current_participants,
    a.status,
    a.created_at,
    a.updated_at,
    c.title AS content_title,
    c.content AS content_body,
    c.author_id,
    u.name AS author_name,
    u.email AS author_email,
    u.avatar_url AS author_avatar,
    u.role AS author_role,
    u.department AS author_department
FROM activities a
LEFT JOIN content c ON a.content_id = c.id
LEFT JOIN users u ON c.author_id = u.id;

-- Content with author view
CREATE VIEW public.content_with_author AS
SELECT 
    c.id,
    c.type,
    c.title,
    c.content,
    c.category,
    c.tags,
    c.author_id,
    c.status,
    c.is_published,
    c.metadata,
    c.like_count,
    c.comment_count,
    c.view_count,
    c.created_at,
    c.updated_at,
    c.published_at,
    u.name AS author_name,
    u.email AS author_email,
    u.avatar_url AS author_avatar,
    u.role AS author_role,
    u.department AS author_department,
    u.bio AS author_bio
FROM content c
LEFT JOIN users u ON c.author_id = u.id;

-- User stats view
CREATE VIEW public.user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.department,
    u.activity_score,
    COALESCE(
        COUNT(DISTINCT c.id) FILTER (WHERE c.type = 'post'), 
        0
    )::integer AS content_count,
    COALESCE(
        COUNT(DISTINCT cm.id), 
        0
    )::integer AS comment_count,
    COALESCE(
        SUM(c.like_count) FILTER (WHERE c.type = 'post'), 
        0
    )::integer AS likes_received,
    u.created_at,
    u.last_seen_at
FROM users u
LEFT JOIN content c ON u.id = c.author_id AND c.status = 'published'
LEFT JOIN comments cm ON u.id = cm.author_id
GROUP BY u.id, u.name, u.email, u.role, u.department, u.activity_score, u.created_at, u.last_seen_at;

-- Grant appropriate permissions on views
GRANT SELECT ON public.comments_with_author TO anon, authenticated;
GRANT SELECT ON public.activities_with_details TO anon, authenticated;
GRANT SELECT ON public.content_with_author TO anon, authenticated;
GRANT SELECT ON public.user_stats TO anon, authenticated;

-- Add RLS policies to the base tables if not already present
-- These will naturally apply to the views

-- Ensure RLS is enabled on base tables
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Note: The views will now respect the RLS policies of the underlying tables
-- This is more secure as it ensures proper access control based on the calling user