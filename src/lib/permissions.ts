/**
 * Permission management system for KEPCO AI Community
 * 
 * Handles role-based access control and permission checks
 * across different parts of the application.
 */

import { AuthUser } from '@/lib/auth'

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  'member': 1,
  'admin': 2,
  'vice-leader': 3,
  'leader': 4
} as const

export type UserRole = keyof typeof ROLE_HIERARCHY

// Permission types
export const PERMISSIONS = {
  // Member management permissions
  MANAGE_MEMBERS: 'manage_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_MEMBER_ROLES: 'change_member_roles',
  VIEW_MEMBER_DETAILS: 'view_member_details',
  
  // Announcement permissions
  CREATE_ANNOUNCEMENTS: 'create_announcements',
  EDIT_ANNOUNCEMENTS: 'edit_announcements',
  DELETE_ANNOUNCEMENTS: 'delete_announcements',
  PIN_ANNOUNCEMENTS: 'pin_announcements',
  
  // Activity scheduling permissions
  CREATE_ACTIVITIES: 'create_activities',
  EDIT_ACTIVITIES: 'edit_activities',
  DELETE_ACTIVITIES: 'delete_activities',
  MANAGE_ACTIVITY_PARTICIPANTS: 'manage_activity_participants',
  
  // Resource management permissions
  APPROVE_RESOURCES: 'approve_resources',
  DELETE_RESOURCES: 'delete_resources',
  MODERATE_RESOURCES: 'moderate_resources',
  
  // General permissions
  MODERATE_COMMUNITY: 'moderate_community',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings'
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role-permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  member: [
    PERMISSIONS.VIEW_MEMBER_DETAILS
  ],
  admin: [
    PERMISSIONS.VIEW_MEMBER_DETAILS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CREATE_ANNOUNCEMENTS,
    PERMISSIONS.EDIT_ANNOUNCEMENTS,
    PERMISSIONS.DELETE_ANNOUNCEMENTS,
    PERMISSIONS.PIN_ANNOUNCEMENTS,
    PERMISSIONS.CREATE_ACTIVITIES,
    PERMISSIONS.EDIT_ACTIVITIES,
    PERMISSIONS.DELETE_ACTIVITIES,
    PERMISSIONS.MANAGE_ACTIVITY_PARTICIPANTS,
    PERMISSIONS.APPROVE_RESOURCES,
    PERMISSIONS.DELETE_RESOURCES,
    PERMISSIONS.MODERATE_RESOURCES,
    PERMISSIONS.MODERATE_COMMUNITY
  ],
  'vice-leader': [
    PERMISSIONS.VIEW_MEMBER_DETAILS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CHANGE_MEMBER_ROLES,
    PERMISSIONS.CREATE_ANNOUNCEMENTS,
    PERMISSIONS.EDIT_ANNOUNCEMENTS,
    PERMISSIONS.DELETE_ANNOUNCEMENTS,
    PERMISSIONS.PIN_ANNOUNCEMENTS,
    PERMISSIONS.CREATE_ACTIVITIES,
    PERMISSIONS.EDIT_ACTIVITIES,
    PERMISSIONS.DELETE_ACTIVITIES,
    PERMISSIONS.MANAGE_ACTIVITY_PARTICIPANTS,
    PERMISSIONS.APPROVE_RESOURCES,
    PERMISSIONS.DELETE_RESOURCES,
    PERMISSIONS.MODERATE_RESOURCES,
    PERMISSIONS.MODERATE_COMMUNITY,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  leader: [
    PERMISSIONS.VIEW_MEMBER_DETAILS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CHANGE_MEMBER_ROLES,
    PERMISSIONS.CREATE_ANNOUNCEMENTS,
    PERMISSIONS.EDIT_ANNOUNCEMENTS,
    PERMISSIONS.DELETE_ANNOUNCEMENTS,
    PERMISSIONS.PIN_ANNOUNCEMENTS,
    PERMISSIONS.CREATE_ACTIVITIES,
    PERMISSIONS.EDIT_ACTIVITIES,
    PERMISSIONS.DELETE_ACTIVITIES,
    PERMISSIONS.MANAGE_ACTIVITY_PARTICIPANTS,
    PERMISSIONS.APPROVE_RESOURCES,
    PERMISSIONS.DELETE_RESOURCES,
    PERMISSIONS.MODERATE_RESOURCES,
    PERMISSIONS.MODERATE_COMMUNITY,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS
  ]
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user || !user.profile?.role) {
    return false
  }

  const userRole = user.profile.role as UserRole
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  
  return rolePermissions?.includes(permission) || false
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Check if a user is an admin (admin, vice-leader, or leader)
 */
export function isAdmin(user: AuthUser | null): boolean {
  if (!user || !user.profile?.role) {
    return false
  }

  const userRole = user.profile.role as UserRole
  return ['admin', 'vice-leader', 'leader'].includes(userRole)
}

/**
 * Check if a user can manage members
 */
export function canManageMembers(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.MANAGE_MEMBERS)
}

/**
 * Check if a user can remove members
 */
export function canRemoveMembers(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.REMOVE_MEMBERS)
}

/**
 * Check if a user can change member roles
 */
export function canChangeMemberRoles(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.CHANGE_MEMBER_ROLES)
}

/**
 * Check if a user can create announcements
 */
export function canCreateAnnouncements(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.CREATE_ANNOUNCEMENTS)
}

/**
 * Check if a user can create activities
 */
export function canCreateActivities(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.CREATE_ACTIVITIES)
}

/**
 * Check if a user can moderate resources
 */
export function canModerateResources(user: AuthUser | null): boolean {
  return hasPermission(user, PERMISSIONS.MODERATE_RESOURCES)
}

/**
 * Get the user's role hierarchy level
 */
export function getRoleLevel(user: AuthUser | null): number {
  if (!user || !user.profile?.role) {
    return 0
  }

  const userRole = user.profile.role as UserRole
  return ROLE_HIERARCHY[userRole] || 0
}

/**
 * Check if user A can modify user B (based on role hierarchy)
 */
export function canModifyUser(userA: AuthUser | null, userB: { role: string }): boolean {
  if (!userA || !userA.profile?.role) {
    return false
  }

  const userALevel = getRoleLevel(userA)
  const userBRole = userB.role as UserRole
  const userBLevel = ROLE_HIERARCHY[userBRole] || 0

  // Can only modify users with lower hierarchy level
  return userALevel > userBLevel
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: AuthUser | null): Permission[] {
  if (!user || !user.profile?.role) {
    return []
  }

  const userRole = user.profile.role as UserRole
  return ROLE_PERMISSIONS[userRole] || []
}

/**
 * Check if a user can perform an action on a specific resource
 */
export function canPerformAction(
  user: AuthUser | null, 
  action: Permission, 
  resourceOwner?: { user_id: string }
): boolean {
  if (!user) {
    return false
  }

  // Check base permission
  if (!hasPermission(user, action)) {
    return false
  }

  // If resource has an owner, check if user can modify it
  if (resourceOwner && resourceOwner.user_id !== user.id) {
    // For now, admins can modify any resource
    return isAdmin(user)
  }

  return true
}

/**
 * Filter members based on what the current user can see/manage
 */
export function filterMembersByPermissions(
  user: AuthUser | null, 
  members: any[], 
  action: 'view' | 'manage' | 'remove' = 'view'
): any[] {
  if (!user) {
    return []
  }

  const userLevel = getRoleLevel(user)
  
  return members.filter(member => {
    const memberLevel = ROLE_HIERARCHY[member.role as UserRole] || 0
    
    switch (action) {
      case 'view':
        // Everyone can view members at or below their level
        return userLevel >= memberLevel
      case 'manage':
      case 'remove':
        // Can only manage/remove members with lower hierarchy level
        return userLevel > memberLevel && canManageMembers(user)
      default:
        return false
    }
  })
}

/**
 * Get available roles that a user can assign to others
 */
export function getAssignableRoles(user: AuthUser | null): UserRole[] {
  if (!user || !canChangeMemberRoles(user)) {
    return []
  }

  const userLevel = getRoleLevel(user)
  const availableRoles: UserRole[] = []

  for (const [role, level] of Object.entries(ROLE_HIERARCHY)) {
    // Can only assign roles with lower hierarchy level
    if (level < userLevel) {
      availableRoles.push(role as UserRole)
    }
  }

  return availableRoles
}