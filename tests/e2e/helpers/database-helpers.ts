import { Page } from '@playwright/test';

/**
 * Helper functions to validate database data vs UI display
 */

export class DatabaseValidation {
  constructor(private page: Page) {}

  /**
   * Check if displayed data matches actual database values
   * This will be called during tests to ensure no hardcoded data
   */
  async validateDataSource(selector: string, expectedPattern?: RegExp) {
    const element = await this.page.locator(selector);
    const text = await element.textContent();
    
    // Check for common hardcoded patterns
    const hardcodedPatterns = [
      /^(Test|Demo|Example|Sample)/i,
      /^Lorem ipsum/i,
      /^123$/,
      /^placeholder/i,
      /^TODO:/i,
      /^FIXME:/i,
    ];
    
    for (const pattern of hardcodedPatterns) {
      if (pattern.test(text || '')) {
        throw new Error(`Potential hardcoded data detected: "${text}" matches pattern ${pattern}`);
      }
    }
    
    // Check if data matches expected database pattern
    if (expectedPattern && text && !expectedPattern.test(text)) {
      throw new Error(`Data doesn't match expected database pattern: "${text}" doesn't match ${expectedPattern}`);
    }
    
    return text;
  }

  /**
   * Validate user profile data
   */
  async validateUserProfileData() {
    const checks = [
      // User stats should be numbers from DB
      { selector: '[data-testid="user-points"]', pattern: /^\d+$/ },
      { selector: '[data-testid="user-level"]', pattern: /^\d+$/ },
      { selector: '[data-testid="user-rank"]', pattern: /^\d+$/ },
      
      // Activity stats
      { selector: '[data-testid="total-posts"]', pattern: /^\d+$/ },
      { selector: '[data-testid="total-comments"]', pattern: /^\d+$/ },
      { selector: '[data-testid="total-likes"]', pattern: /^\d+$/ },
      
      // Badges and achievements
      { selector: '[data-testid="achievement-count"]', pattern: /^\d+$/ },
      { selector: '[data-testid="badge-count"]', pattern: /^\d+$/ },
      
      // Skill levels
      { selector: '[data-testid="skill-level"]', pattern: /^(초급|중급|고급|마스터)$/ },
    ];
    
    const results = [];
    for (const check of checks) {
      try {
        const element = await this.page.locator(check.selector);
        if (await element.count() > 0) {
          const value = await this.validateDataSource(check.selector, check.pattern);
          results.push({ selector: check.selector, value, valid: true });
        }
      } catch (error) {
        results.push({ selector: check.selector, error: (error as Error).message, valid: false });
      }
    }
    
    return results;
  }

  /**
   * Validate content data
   */
  async validateContentData() {
    const checks = [
      // View counts should be from DB
      { selector: '[data-testid="view-count"]', pattern: /^\d+$/ },
      { selector: '[data-testid="like-count"]', pattern: /^\d+$/ },
      { selector: '[data-testid="comment-count"]', pattern: /^\d+$/ },
      
      // Author info
      { selector: '[data-testid="author-name"]', pattern: /^(?!Test|Demo|Sample).+/ },
      { selector: '[data-testid="author-level"]', pattern: /^\d+$/ },
      
      // Timestamps
      { selector: '[data-testid="created-at"]', pattern: /\d{4}-\d{2}-\d{2}/ },
      { selector: '[data-testid="updated-at"]', pattern: /\d{4}-\d{2}-\d{2}/ },
    ];
    
    const results = [];
    for (const check of checks) {
      try {
        const element = await this.page.locator(check.selector);
        if (await element.count() > 0) {
          const value = await this.validateDataSource(check.selector, check.pattern);
          results.push({ selector: check.selector, value, valid: true });
        }
      } catch (error) {
        results.push({ selector: check.selector, error: (error as Error).message, valid: false });
      }
    }
    
    return results;
  }

  /**
   * Check for loading states and ensure data loads from DB
   */
  async waitForDataLoad(timeout = 10000) {
    // Wait for loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.skeleton',
      '.loading',
      '[aria-busy="true"]',
    ];
    
    for (const selector of loadingSelectors) {
      const loading = await this.page.locator(selector);
      if (await loading.count() > 0) {
        await loading.waitFor({ state: 'hidden', timeout });
      }
    }
    
    // Ensure data has loaded
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Monitor network requests to ensure DB calls are made
   */
  async monitorDatabaseCalls() {
    const dbRequests: string[] = [];
    
    this.page.on('request', request => {
      const url = request.url();
      // Check for Supabase API calls
      if (url.includes('supabase.co') || url.includes('/api/')) {
        dbRequests.push(url);
      }
    });
    
    return {
      getRequests: () => dbRequests,
      hasDBCalls: () => dbRequests.length > 0,
      clear: () => dbRequests.length = 0,
    };
  }
}