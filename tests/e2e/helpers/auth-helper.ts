import { Page, expect } from '@playwright/test';

/**
 * Authentication helper for consistent login across tests
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with provided credentials
   * Handles various UI states and overlay issues
   */
  async login(email: string, password: string): Promise<boolean> {
    console.log(`[AuthHelper] Attempting login with ${email}...`);
    
    // Check if already logged in
    if (await this.isLoggedIn()) {
      console.log('[AuthHelper] Already logged in');
      return true;
    }

    // Navigate to home if not already there
    if (!this.page.url().includes('localhost:3000')) {
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');
    }

    // Wait for initial render
    await this.page.waitForTimeout(2000);

    // Try to open login modal
    const modalOpened = await this.openLoginModal();
    if (!modalOpened) {
      console.error('[AuthHelper] Failed to open login modal');
      return false;
    }

    // Fill credentials
    const credentialsFilled = await this.fillCredentials(email, password);
    if (!credentialsFilled) {
      console.error('[AuthHelper] Failed to fill credentials');
      return false;
    }

    // Submit login
    const loginSubmitted = await this.submitLogin();
    if (!loginSubmitted) {
      console.error('[AuthHelper] Failed to submit login');
      return false;
    }

    // Verify login success
    const loginSuccess = await this.verifyLoginSuccess();
    if (!loginSuccess) {
      console.error('[AuthHelper] Login verification failed');
      return false;
    }

    console.log('[AuthHelper] Login successful');
    return true;
  }

  /**
   * Check if user is already logged in
   */
  async isLoggedIn(): Promise<boolean> {
    // Try multiple methods to check login state
    
    // Method 1: Check for user button
    const userButton = this.page.getByRole('button', { name: '사용자' });
    const userButtonVisible = await userButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (userButtonVisible) return true;

    // Method 2: Check with JavaScript
    const jsCheck = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some(btn => 
        btn.textContent?.includes('사용자') || 
        btn.querySelector('img[alt="사용자"]') !== null
      );
    });
    if (jsCheck) return true;

    // Method 3: Check for user menu or profile elements
    const profileCheck = await this.page.locator('[data-testid="user-menu"]').isVisible({ timeout: 1000 }).catch(() => false);
    if (profileCheck) return true;

    return false;
  }

  /**
   * Open login modal with multiple strategies
   */
  private async openLoginModal(): Promise<boolean> {
    console.log('[AuthHelper] Opening login modal...');
    
    // Strategy 1: Try regular button click
    try {
      const loginButton = this.page.getByRole('button', { name: '로그인' });
      await loginButton.click({ timeout: 5000 });
      await this.page.waitForTimeout(1000);
      
      // Check if modal appeared
      const modalVisible = await this.page.getByRole('dialog').isVisible({ timeout: 2000 }).catch(() => false);
      if (modalVisible) return true;
    } catch (error) {
      console.log('[AuthHelper] Regular click failed, trying alternative...');
    }

    // Strategy 2: Use JavaScript click to bypass overlays
    try {
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(b => 
          b.textContent?.trim() === '로그인' || 
          b.textContent?.includes('로그인')
        );
        if (loginBtn) {
          (loginBtn as HTMLElement).click();
          return true;
        }
        return false;
      });
      
      await this.page.waitForTimeout(2000);
      
      // Check if modal appeared
      const modalVisible = await this.page.getByRole('dialog').isVisible({ timeout: 2000 }).catch(() => false);
      if (modalVisible) return true;
    } catch (error) {
      console.log('[AuthHelper] JavaScript click also failed');
    }

    // Strategy 3: Force click with coordinates
    try {
      const loginButton = this.page.locator('button:has-text("로그인")').first();
      await loginButton.click({ force: true });
      await this.page.waitForTimeout(2000);
      
      const modalVisible = await this.page.getByRole('dialog').isVisible({ timeout: 2000 }).catch(() => false);
      if (modalVisible) return true;
    } catch (error) {
      console.log('[AuthHelper] Force click failed');
    }

    return false;
  }

  /**
   * Fill login credentials with multiple selector strategies
   */
  private async fillCredentials(email: string, password: string): Promise<boolean> {
    console.log('[AuthHelper] Filling credentials...');
    
    // Strategy 1: Try placeholder selectors
    try {
      const emailInput = this.page.getByPlaceholder('이메일을 입력하세요');
      const passwordInput = this.page.getByPlaceholder('비밀번호를 입력하세요');
      
      await emailInput.fill(email);
      await passwordInput.fill(password);
      return true;
    } catch (error) {
      console.log('[AuthHelper] Placeholder selectors failed');
    }

    // Strategy 2: Try role-based selectors
    try {
      const emailInput = this.page.getByRole('textbox', { name: '이메일' });
      const passwordInput = this.page.getByRole('textbox', { name: '비밀번호' });
      
      await emailInput.fill(email);
      await passwordInput.fill(password);
      return true;
    } catch (error) {
      console.log('[AuthHelper] Role selectors failed');
    }

    // Strategy 3: Try CSS selectors within dialog
    try {
      const emailInput = this.page.locator('dialog input[type="email"], dialog input[name="email"], dialog input:first-of-type');
      const passwordInput = this.page.locator('dialog input[type="password"], dialog input[name="password"], dialog input:last-of-type');
      
      await emailInput.fill(email);
      await passwordInput.fill(password);
      return true;
    } catch (error) {
      console.log('[AuthHelper] CSS selectors failed');
    }

    // Strategy 4: Use JavaScript
    try {
      const filled = await this.page.evaluate(({ email, password }) => {
        const inputs = Array.from(document.querySelectorAll('dialog input'));
        const emailInput = inputs.find(i => 
          i.getAttribute('type') === 'email' || 
          i.getAttribute('name')?.includes('email') ||
          i.getAttribute('placeholder')?.includes('이메일')
        ) as HTMLInputElement;
        const passwordInput = inputs.find(i => 
          i.getAttribute('type') === 'password' || 
          i.getAttribute('name')?.includes('password') ||
          i.getAttribute('placeholder')?.includes('비밀번호')
        ) as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          emailInput.value = email;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.value = password;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, { email, password });
      
      if (filled) return true;
    } catch (error) {
      console.log('[AuthHelper] JavaScript fill failed');
    }

    return false;
  }

  /**
   * Submit login form
   */
  private async submitLogin(): Promise<boolean> {
    console.log('[AuthHelper] Submitting login...');
    
    // Strategy 1: Click submit button in dialog
    try {
      const submitButton = this.page.locator('dialog button:has-text("로그인")').last();
      await submitButton.click();
      return true;
    } catch (error) {
      console.log('[AuthHelper] Dialog button click failed');
    }

    // Strategy 2: Press Enter
    try {
      await this.page.keyboard.press('Enter');
      return true;
    } catch (error) {
      console.log('[AuthHelper] Enter key failed');
    }

    // Strategy 3: JavaScript submit
    try {
      await this.page.evaluate(() => {
        const submitBtn = Array.from(document.querySelectorAll('dialog button')).find(b => 
          b.textContent?.includes('로그인') && 
          !b.textContent?.includes('소셜')
        ) as HTMLElement;
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
        return false;
      });
      return true;
    } catch (error) {
      console.log('[AuthHelper] JavaScript submit failed');
    }

    return false;
  }

  /**
   * Verify login was successful
   */
  private async verifyLoginSuccess(): Promise<boolean> {
    console.log('[AuthHelper] Verifying login success...');
    
    // Wait for any of these success indicators
    const successIndicators = await Promise.race([
      // Success notification
      this.page.waitForSelector('text=로그인되었습니다', { timeout: 10000 })
        .then(() => 'notification')
        .catch(() => null),
      
      // User button appears
      this.page.waitForSelector('button:has-text("사용자")', { timeout: 10000 })
        .then(() => 'userButton')
        .catch(() => null),
      
      // Modal disappears and user menu appears
      this.page.waitForFunction(() => {
        const modal = document.querySelector('dialog');
        const userBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent?.includes('사용자')
        );
        return !modal && userBtn;
      }, { timeout: 10000 })
        .then(() => 'modalClosed')
        .catch(() => null),
      
      // Timeout fallback
      this.page.waitForTimeout(10000).then(() => 'timeout')
    ]);

    if (successIndicators && successIndicators !== 'timeout') {
      console.log(`[AuthHelper] Login verified via: ${successIndicators}`);
      return true;
    }

    // Final check
    return await this.isLoggedIn();
  }

  /**
   * Logout
   */
  async logout(): Promise<boolean> {
    console.log('[AuthHelper] Attempting logout...');
    
    if (!(await this.isLoggedIn())) {
      console.log('[AuthHelper] Not logged in, skipping logout');
      return true;
    }

    // Try to open user menu
    try {
      const userButton = this.page.getByRole('button', { name: '사용자' });
      await userButton.click();
      await this.page.waitForTimeout(1000);
      
      // Click logout
      const logoutButton = this.page.getByRole('menuitem', { name: '로그아웃' });
      await logoutButton.click();
      
      // Wait for logout
      await this.page.waitForTimeout(2000);
      
      // Verify logged out
      const loginButton = await this.page.getByRole('button', { name: '로그인' }).isVisible({ timeout: 5000 });
      return loginButton;
    } catch (error) {
      console.log('[AuthHelper] Logout failed:', error);
      return false;
    }
  }
}

/**
 * Quick login helper function
 */
export async function quickLogin(page: Page, email: string, password: string): Promise<boolean> {
  const authHelper = new AuthHelper(page);
  return await authHelper.login(email, password);
}

/**
 * Quick logout helper function
 */
export async function quickLogout(page: Page): Promise<boolean> {
  const authHelper = new AuthHelper(page);
  return await authHelper.logout();
}