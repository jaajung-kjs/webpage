import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
}

// Create Supabase client with proper error handling
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null

// Types for our database
export interface Profile {
  id: string
  email: string
  name: string
  department: string
  role: 'admin' | 'member' | 'visitor'
  avatar_url?: string
  bio?: string
  expertise_areas: string[]
  created_at: string
  updated_at: string
  last_active: string
}

export interface Post {
  id: string
  user_id: string
  title: string
  content: string
  category: 'automation' | 'document' | 'analysis' | 'creative' | 'other'
  tags: string[]
  status: 'published' | 'draft'
  likes_count: number
  views_count: number
  created_at: string
  updated_at: string
  author?: Profile
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id?: string
  created_at: string
  updated_at: string
  author?: Profile
  replies?: Comment[]
}

export interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  capacity: number
  registered_count: number
  created_by: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  title: string
  description: string
  url?: string
  file_path?: string
  category: 'tutorial' | 'guide' | 'tool' | 'template' | 'other'
  created_by: string
  downloads_count: number
  created_at: string
  updated_at: string
}