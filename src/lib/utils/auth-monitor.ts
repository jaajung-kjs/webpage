/**
 * Auth State Monitor - Development tool for tracking auth state changes
 * Helps detect infinite loops and unexpected auth behavior
 */

interface AuthEvent {
  timestamp: number
  event: string
  details: any
  stack?: string
}

export class AuthMonitor {
  private static events: AuthEvent[] = []
  private static MAX_EVENTS = 100
  private static isEnabled = process.env.NODE_ENV === 'development'
  
  /**
   * Log an auth event
   */
  static log(event: string, details?: any) {
    if (!this.isEnabled) return
    
    const authEvent: AuthEvent = {
      timestamp: Date.now(),
      event,
      details,
      stack: new Error().stack?.split('\n').slice(2, 5).join('\n')
    }
    
    this.events.push(authEvent)
    
    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS)
    }
    
    // Console output with visual indicators
    const emoji = this.getEventEmoji(event)
    console.log(`${emoji} [AuthMonitor] ${event}`, details || '')
  }
  
  /**
   * Get emoji for event type
   */
  private static getEventEmoji(event: string): string {
    if (event.includes('loop')) return '🔄'
    if (event.includes('error')) return '❌'
    if (event.includes('success')) return '✅'
    if (event.includes('init')) return '🚀'
    if (event.includes('update')) return '🔄'
    if (event.includes('token')) return '🔑'
    if (event.includes('session')) return '🔐'
    return '📌'
  }
  
  /**
   * Analyze auth patterns for potential issues
   */
  static analyze(windowMs: number = 5000): {
    loopDetected: boolean
    rapidUpdates: number
    patterns: string[]
  } {
    const now = Date.now()
    const recentEvents = this.events.filter(e => now - e.timestamp < windowMs)
    
    // Count event types
    const eventCounts = recentEvents.reduce((acc, e) => {
      acc[e.event] = (acc[e.event] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Detect patterns
    const patterns: string[] = []
    const rapidUpdates = recentEvents.length
    
    // Check for specific patterns
    if (eventCounts['update:TOKEN_REFRESHED'] > 3) {
      patterns.push('Excessive token refreshes')
    }
    
    if (eventCounts['getCurrentUser'] > 10) {
      patterns.push('Too many getCurrentUser calls')
    }
    
    if (rapidUpdates > 20) {
      patterns.push('Rapid auth state changes detected')
    }
    
    // Check for repeating sequences
    const sequence = recentEvents.map(e => e.event).join(' -> ')
    if (sequence.includes('TOKEN_REFRESHED -> TOKEN_REFRESHED -> TOKEN_REFRESHED')) {
      patterns.push('Token refresh loop detected')
    }
    
    return {
      loopDetected: patterns.length > 0,
      rapidUpdates,
      patterns
    }
  }
  
  /**
   * Get recent events for debugging
   */
  static getRecentEvents(count: number = 20): AuthEvent[] {
    return this.events.slice(-count)
  }
  
  /**
   * Clear event history
   */
  static clear() {
    this.events = []
  }
  
  /**
   * Generate a visual report of auth state changes
   */
  static generateReport(): string {
    const events = this.getRecentEvents(30)
    if (events.length === 0) return 'No auth events recorded'
    
    let report = '\n=== Auth State Report ===\n'
    report += `Total events: ${events.length}\n`
    report += `Time span: ${Math.round((Date.now() - events[0].timestamp) / 1000)}s\n\n`
    
    // Event timeline
    report += 'Timeline:\n'
    events.forEach((e, i) => {
      const time = new Date(e.timestamp).toLocaleTimeString()
      const emoji = this.getEventEmoji(e.event)
      report += `${time} ${emoji} ${e.event}`
      if (e.details) {
        report += ` - ${JSON.stringify(e.details)}`
      }
      report += '\n'
    })
    
    // Analysis
    const analysis = this.analyze()
    if (analysis.loopDetected) {
      report += '\n⚠️  WARNING: Potential issues detected:\n'
      analysis.patterns.forEach(p => {
        report += `  - ${p}\n`
      })
    }
    
    return report
  }
  
  /**
   * Create a visual graph of auth state transitions
   */
  static visualize(): void {
    if (!this.isEnabled) return
    
    const events = this.getRecentEvents(20)
    const transitions: Record<string, number> = {}
    
    // Count transitions
    for (let i = 1; i < events.length; i++) {
      const from = events[i - 1].event
      const to = events[i].event
      const key = `${from} → ${to}`
      transitions[key] = (transitions[key] || 0) + 1
    }
    
    console.log('\n📊 Auth State Transitions:')
    Object.entries(transitions)
      .sort(([, a], [, b]) => b - a)
      .forEach(([transition, count]) => {
        const bar = '█'.repeat(count)
        console.log(`${transition}: ${bar} (${count})`)
      })
  }
}

// Auto-attach to window in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).AuthMonitor = AuthMonitor
}