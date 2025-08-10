import { test as base, expect } from '@playwright/test';
import { DatabaseValidation } from '../helpers/database-helpers';
import { RealtimeHelpers } from '../helpers/realtime-helpers';
import { NetworkHelpers } from '../helpers/network-helpers';
import { TEST_CONFIG } from '../helpers/test-config';

/**
 * Extended test fixture with all helper utilities
 */
type TestFixtures = {
  dbValidation: DatabaseValidation;
  realtimeHelpers: RealtimeHelpers;
  networkHelpers: NetworkHelpers;
  testConfig: typeof TEST_CONFIG;
  testUtils: typeof testUtils;
};

export const test = base.extend<TestFixtures>({
  dbValidation: async ({ page }, use) => {
    const dbValidation = new DatabaseValidation(page);
    await use(dbValidation);
  },
  
  realtimeHelpers: async ({ page }, use) => {
    const realtimeHelpers = new RealtimeHelpers(page);
    await use(realtimeHelpers);
  },
  
  networkHelpers: async ({ page }, use) => {
    const networkHelpers = new NetworkHelpers(page);
    await use(networkHelpers);
  },
  
  testConfig: async ({}, use) => {
    await use(TEST_CONFIG);
  },

  testUtils: async ({}, use) => {
    await use(testUtils);
  },
});

export { expect };

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Generate unique test data
   */
  generateTestData: (prefix: string) => {
    const timestamp = Date.now();
    return {
      title: `${prefix} Title ${timestamp}`,
      content: `${prefix} Content ${timestamp}`,
      description: `${prefix} Description ${timestamp}`,
    };
  },

  /**
   * Wait for API response
   */
  waitForAPI: async (page: any, urlPattern: string | RegExp) => {
    return page.waitForResponse((response: any) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    });
  },

  /**
   * Check console for errors
   */
  checkConsoleErrors: (page: any) => {
    const errors: string[] = [];
    
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error: Error) => {
      errors.push(error.message);
    });
    
    return {
      getErrors: () => errors,
      hasErrors: () => errors.length > 0,
      clear: () => errors.length = 0,
    };
  },

  /**
   * Take screenshot with timestamp
   */
  screenshot: async (page: any, name: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `tests/e2e/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  },

  /**
   * Login helper
   */
  login: async (page: any, email = TEST_CONFIG.user.email, password = TEST_CONFIG.user.password) => {
    await page.goto('/');
    
    // Check if already logged in
    const userButton = page.getByRole('button', { name: '사용자' });
    if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Already logged in
      return;
    }
    
    // Click login button to open modal
    await page.getByRole('button', { name: '로그인' }).click();
    
    // Wait for modal
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    
    // Fill credentials
    await page.getByRole('textbox', { name: '이메일' }).fill(email);
    await page.getByRole('textbox', { name: '비밀번호' }).fill(password);
    
    // Submit - use last() to get the submit button in the modal
    await page.getByRole('button', { name: '로그인' }).last().click();
    
    // Wait for success
    await page.locator('text=로그인되었습니다').waitFor({ state: 'visible', timeout: 10000 });
  },

  /**
   * Logout helper
   */
  logout: async (page: any) => {
    // Check if logged in
    const userButton = page.getByRole('button', { name: '사용자' });
    if (!await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Not logged in
      return;
    }
    
    // Open user menu
    await userButton.click();
    
    // Click logout
    await page.getByRole('menuitem', { name: '로그아웃' }).click();
    
    // Wait for logout to complete
    await page.getByRole('button', { name: '로그인' }).waitFor({ state: 'visible', timeout: 10000 });
  },

  /**
   * Navigate and wait for load
   */
  navigateTo: async (page: any, path: string) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  },

  /**
   * Fill rich text editor
   */
  fillRichTextEditor: async (page: any, selector: string, content: string) => {
    const editor = await page.locator(selector);
    await editor.click();
    await page.keyboard.type(content);
  },

  /**
   * Upload file
   */
  uploadFile: async (page: any, selector: string, filePath: string) => {
    const fileInput = await page.locator(selector);
    await fileInput.setInputFiles(filePath);
  },

  /**
   * Check element visibility with retry
   */
  waitForElement: async (page: any, selector: string, options = {}) => {
    const defaultOptions = {
      state: 'visible',
      timeout: 10000,
    };
    await page.locator(selector).waitFor({ ...defaultOptions, ...options });
  },

  /**
   * Scroll to element
   */
  scrollToElement: async (page: any, selector: string) => {
    await page.locator(selector).scrollIntoViewIfNeeded();
  },

  /**
   * Wait for network idle
   */
  waitForNetworkIdle: async (page: any, timeout = 10000) => {
    await page.waitForLoadState('networkidle', { timeout });
  },

  /**
   * Check for accessibility issues
   */
  checkAccessibility: async (page: any) => {
    // This would integrate with axe-core or similar
    // For now, basic checks
    const issues = [];
    
    // Check for alt text on images
    const images = await page.locator('img:not([alt])').count();
    if (images > 0) {
      issues.push(`${images} images without alt text`);
    }
    
    // Check for form labels
    const inputs = await page.locator('input:not([aria-label]):not([id])').count();
    if (inputs > 0) {
      issues.push(`${inputs} inputs without labels`);
    }
    
    // Check for heading hierarchy
    const h1Count = await page.locator('h1').count();
    if (h1Count !== 1) {
      issues.push(`Page has ${h1Count} h1 tags (should have exactly 1)`);
    }
    
    return issues;
  },
};