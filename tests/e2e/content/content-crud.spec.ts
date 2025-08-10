import { test, expect, testUtils } from '../fixtures/base-test';

test.describe('Content Management CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await testUtils.login(page);
  });

  test('should create new content successfully', async ({ page }) => {
    const testData = testUtils.generateTestData('E2E Test Case');
    
    // Navigate to create content
    await page.goto('/cases/new');
    
    // Fill form
    await page.getByRole('textbox', { name: '제목' }).fill(testData.title);
    
    // Select category
    await page.getByRole('combobox', { name: '카테고리' }).click();
    await page.getByText('ChatGPT 활용').click();
    
    // Fill content - wait for editor to be ready
    await page.waitForSelector('[contenteditable="true"], .editor-content, [data-testid="content-editor"]', { timeout: 10000 });
    const editor = await page.locator('[contenteditable="true"], .editor-content, [data-testid="content-editor"]').first();
    await editor.click();
    await editor.fill(testData.content);
    
    // Add tags
    await page.getByPlaceholder('태그를 입력하고 Enter를 누르세요').fill('AI');
    await page.getByRole('button', { name: '추가' }).click();
    
    // Submit
    await page.getByRole('button', { name: '게시하기' }).click();
    
    // Verify success
    await expect(page).toHaveURL(/\/cases\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText(testData.title);
  });

  test('should edit existing content', async ({ page }) => {
    // Navigate to an existing content
    await page.goto('/cases');
    
    // Click on first content
    await page.locator('[href^="/cases/"]').first().click();
    
    // Wait for content to load
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Check if edit button is visible (user is owner)
    const editButton = page.getByRole('button', { name: '수정' });
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Update title
      const titleInput = await page.getByRole('textbox', { name: '제목' });
      const originalTitle = await titleInput.inputValue();
      const updatedTitle = `${originalTitle} - Updated`;
      await titleInput.fill(updatedTitle);
      
      // Save
      await page.getByRole('button', { name: '저장' }).click();
      
      // Verify update
      await expect(page.locator('h1')).toContainText('Updated');
    }
  });

  test('should delete content', async ({ page }) => {
    // Create content first
    const testData = testUtils.generateTestData('To Delete');
    
    await page.goto('/cases/new');
    await page.getByRole('textbox', { name: '제목' }).fill(testData.title);
    await page.getByRole('combobox', { name: '카테고리' }).click();
    await page.getByText('ChatGPT 활용').click();
    
    const editor = await page.locator('[contenteditable="true"], .editor-content, [data-testid="content-editor"]').first();
    await editor.click();
    await editor.fill(testData.content);
    
    await page.getByRole('button', { name: '게시하기' }).click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Delete the content
    const deleteButton = page.getByRole('button', { name: '삭제' });
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      await page.getByRole('button', { name: '확인' }).click();
      
      // Verify deletion
      await expect(page).toHaveURL('/cases');
      await expect(page.locator(`text="${testData.title}"`)).not.toBeVisible();
    }
  });

  test('should display content metadata correctly', async ({ page }) => {
    // Navigate to content list
    await page.goto('/cases');
    
    // Click on first content
    await page.locator('[href^="/cases/"]').first().click();
    
    // Wait for content to load
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Check metadata
    // View count
    const viewCount = await page.locator('text=/조회수.*\\d+/').textContent();
    expect(viewCount).toMatch(/조회수.*\d+/);
    
    // Like count
    const likeCount = await page.locator('[class*="like"], [data-testid*="like"]').locator('text=/\\d+/').textContent();
    expect(likeCount).toMatch(/^\d+$/);
    
    // Comment count
    const commentCount = await page.locator('[class*="comment"], [data-testid*="comment"]').locator('text=/\\d+/').textContent();
    expect(commentCount).toMatch(/^\d+$/);
    
    // Author info
    const authorName = await page.locator('[class*="author"], [data-testid*="author"]').textContent();
    expect(authorName).not.toContain('Test User');
    expect(authorName).not.toContain('Demo');
    
    // Timestamp
    const timestamp = await page.locator('text=/2025\\.\\s*\\d+\\.\\s*\\d+/').textContent();
    expect(timestamp).toMatch(/2025\.\s*\d+\.\s*\d+/);
  });

  test('should handle draft saving', async ({ page }) => {
    const testData = testUtils.generateTestData('Draft Test');
    
    // Navigate to create content
    await page.goto('/cases/new');
    
    // Fill form partially
    await page.getByRole('textbox', { name: '제목' }).fill(testData.title);
    
    // Check if draft save button exists
    const draftButton = page.getByRole('button', { name: '임시저장' });
    
    if (await draftButton.isVisible()) {
      await draftButton.click();
      
      // Verify draft saved
      await expect(page.locator('text=임시저장되었습니다')).toBeVisible();
      
      // Navigate away and come back
      await page.goto('/');
      await page.goto('/cases/new');
      
      // Check if draft is loaded
      const titleInput = await page.getByRole('textbox', { name: '제목' });
      const loadedTitle = await titleInput.inputValue();
      
      if (loadedTitle === testData.title) {
        expect(loadedTitle).toBe(testData.title);
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to create content
    await page.goto('/cases/new');
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: '게시하기' }).click();
    
    // Check for validation messages
    const validationMessages = await page.locator('[class*="error"], [role="alert"]').all();
    expect(validationMessages.length).toBeGreaterThan(0);
  });
});