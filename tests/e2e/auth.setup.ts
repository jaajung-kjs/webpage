import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  console.log('🔐 Starting authentication setup...');
  
  // Go to the home page first
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check if already logged in by looking for user button
  const userButton = page.getByRole('button', { name: '사용자' });
  const loginButton = page.getByRole('button', { name: '로그인' });
  
  if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('✅ Already logged in, saving current session...');
  } else if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('📝 Not logged in, proceeding with login...');
    
    // Click login button to open modal
    await loginButton.click();
    
    // Wait for login modal to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    
    // Fill in login credentials
    await page.getByRole('textbox', { name: '이메일' }).fill('jaajung@naver.com');
    await page.getByRole('textbox', { name: '비밀번호' }).fill('kjs487956!@');
    
    // Submit the form
    await page.getByRole('button', { name: '로그인' }).last().click();
    
    // Wait for successful login notification
    await expect(page.locator('text=로그인되었습니다')).toBeVisible({ timeout: 10000 });
    
    // Verify that we're logged in
    await expect(page.getByRole('button', { name: '사용자' })).toBeVisible({ timeout: 5000 });
  } else {
    throw new Error('Could not find login or user button');
  }
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication setup completed');
});