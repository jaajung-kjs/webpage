/**
 * KEPCO AI Community Theme Utilities
 * 
 * Centralized theme management for consistent color usage across the application
 */

// Category color mappings - diverse colors for better visual distinction
export const categoryColors = {
  // Announcements categories
  general: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  important: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  update: 'bg-kepco-blue-200 text-kepco-blue-900 dark:bg-kepco-blue-800/20 dark:text-kepco-blue-200',
  
  // Cases categories
  usage: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  implementation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  analysis: 'bg-kepco-blue-500/10 text-kepco-blue-700 dark:bg-kepco-blue-500/20 dark:text-kepco-blue-300',
  productivity: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  
  // Community categories
  tips: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  review: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  help: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  discussion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  question: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  
  // Resources categories
  tutorial: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  template: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  guide: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  tool: 'bg-kepco-blue-600/10 text-kepco-blue-800 dark:bg-kepco-blue-600/20 dark:text-kepco-blue-200',
} as const

// Status color mappings - clear visual distinction
export const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  inactive: 'bg-kepco-gray-100 text-kepco-gray-600 dark:bg-kepco-gray-900 dark:text-kepco-gray-400',
  completed: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  
  // Activity statuses
  upcoming: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
} as const

// Role color mappings - distinctive colors for each role
export const roleColors = {
  leader: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  'vice-leader': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  admin: 'bg-kepco-blue-500/10 text-kepco-blue-700 dark:bg-kepco-blue-500/20 dark:text-kepco-blue-300',
  member: 'bg-kepco-gray-100 text-kepco-gray-700 dark:bg-kepco-gray-900 dark:text-kepco-gray-300',
} as const

// Skill level color mappings
export const skillLevelColors = {
  beginner: 'bg-kepco-gray-100 text-kepco-gray-700 dark:bg-kepco-gray-900 dark:text-kepco-gray-300',
  intermediate: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  advanced: 'bg-kepco-blue-300 text-kepco-blue-900 dark:bg-kepco-blue-700/20 dark:text-kepco-blue-200',
  expert: 'bg-kepco-blue-600/10 text-kepco-blue-800 dark:bg-kepco-blue-600/20 dark:text-kepco-blue-200',
} as const

// Button variants using KEPCO theme
export const buttonVariants = {
  primary: 'kepco-gradient text-white font-medium',
  secondary: 'bg-kepco-blue-100 text-kepco-blue-800 hover:bg-kepco-blue-200 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300 dark:hover:bg-kepco-blue-800/30 transition-colors',
  outline: 'border-kepco-blue-300 text-kepco-blue-700 hover:bg-kepco-blue-50 dark:border-kepco-blue-700 dark:text-kepco-blue-300 dark:hover:bg-kepco-blue-900/20 transition-colors',
  ghost: 'text-kepco-blue-700 hover:bg-kepco-blue-50 dark:text-kepco-blue-300 dark:hover:bg-kepco-blue-900/20 transition-colors',
} as const

// Helper function to get category color
export function getCategoryColor(category: string): string {
  return categoryColors[category as keyof typeof categoryColors] || categoryColors.general
}

// Helper function to get status color
export function getStatusColor(status: string): string {
  return statusColors[status as keyof typeof statusColors] || statusColors.inactive
}

// Helper function to get role color
export function getRoleColor(role: string): string {
  return roleColors[role as keyof typeof roleColors] || roleColors.member
}

// Helper function to get skill level color
export function getSkillLevelColor(level: string): string {
  return skillLevelColors[level as keyof typeof skillLevelColors] || skillLevelColors.beginner
}