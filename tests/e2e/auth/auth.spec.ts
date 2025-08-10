import { test, expect } from '../fixtures/base-test';

test.describe('Authentication & Authorization', () => {
  test('should successfully log in with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Check if already logged in
    const userButton = page.getByRole('button', { name: '사용자' });
    if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Log out first if already logged in
      await userButton.click();
      await page.getByRole('menuitem', { name: '로그아웃' }).click();
      await page.waitForTimeout(1000);
    }
    
    // Click login button
    await page.getByRole('button', { name: '로그인' }).click();
    
    // Wait for login modal
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill credentials
    await page.getByRole('textbox', { name: '이메일' }).fill('jaajung@naver.com');
    await page.getByRole('textbox', { name: '비밀번호' }).fill('kjs487956!@');
    
    // Submit login - use last() to get the submit button in the modal
    await page.getByRole('button', { name: '로그인' }).last().click();
    
    // Verify successful login
    await expect(page.locator('text=로그인되었습니다')).toBeVisible();
    
    // Verify user menu is visible
    await expect(page.getByRole('button', { name: '사용자' })).toBeVisible();
  });

  test('should maintain session after page refresh', async ({ page, context }) => {
    // Login first
    await page.goto('/');
    
    // Check if already logged in
    const userButton = page.getByRole('button', { name: '사용자' });
    if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Already logged in, test session persistence
    } else {
      // Need to login
      await page.getByRole('button', { name: '로그인' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('textbox', { name: '이메일' }).fill('jaajung@naver.com');
      await page.getByRole('textbox', { name: '비밀번호' }).fill('kjs487956!@');
      await page.getByRole('button', { name: '로그인' }).last().click();
      await expect(page.locator('text=로그인되었습니다')).toBeVisible();
    }
    
    // Refresh page
    await page.reload();
    
    // Verify still logged in
    await expect(page.getByRole('button', { name: '사용자' })).toBeVisible();
  });

  test('should successfully log out', async ({ page }) => {
    // Login first
    await page.goto('/');
    
    // Check if already logged in
    const userButton = page.getByRole('button', { name: '사용자' });
    if (!await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Need to login first
      await page.getByRole('button', { name: '로그인' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('textbox', { name: '이메일' }).fill('jaajung@naver.com');
      await page.getByRole('textbox', { name: '비밀번호' }).fill('kjs487956!@');
      await page.getByRole('button', { name: '로그인' }).last().click();
      await expect(page.locator('text=로그인되었습니다')).toBeVisible();
    }
    
    // Open user menu
    await page.getByRole('button', { name: '사용자' }).click();
    
    // Click logout
    await page.getByRole('menuitem', { name: '로그아웃' }).click();
    
    // Verify logged out
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/profile');
    
    // Should redirect to login or show login button
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('should show admin menu for admin users', async ({ page }) => {
    // Login as admin user
    await page.goto('/');
    
    // Check if already logged in
    const userButton = page.getByRole('button', { name: '사용자' });
    if (!await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Need to login
      await page.getByRole('button', { name: '로그인' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('textbox', { name: '이메일' }).fill('jaajung@naver.com');
      await page.getByRole('textbox', { name: '비밀번호' }).fill('kjs487956!@');
      await page.getByRole('button', { name: '로그인' }).last().click();
      await expect(page.locator('text=로그인되었습니다')).toBeVisible();
    }
    
    // Open user menu
    await page.getByRole('button', { name: '사용자' }).click();
    
    // Verify admin dashboard is visible
    await expect(page.getByRole('menuitem', { name: '관리자 대시보드' })).toBeVisible();
  });
});