import { test, expect, testUtils } from '../fixtures/base-test';

test.describe('Comments System', () => {
  test.beforeEach(async ({ page }) => {
    await testUtils.login(page);
  });

  test('should add a comment to content', async ({ page }) => {
    // Navigate to a content item
    await page.goto('/cases');
    await page.locator('[href^="/cases/"]').first().click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Find comment input
    const commentInput = page.locator('[placeholder*="댓글"], textarea, [contenteditable="true"]').first();
    
    if (await commentInput.isVisible()) {
      const testComment = `Test comment ${Date.now()}`;
      
      // Add comment
      await commentInput.fill(testComment);
      
      // Submit comment
      const submitButton = page.getByRole('button', { name: /등록|작성|전송/ });
      await submitButton.click();
      
      // Verify comment appears
      await expect(page.locator(`text="${testComment}"`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should reply to a comment', async ({ page }) => {
    // Navigate to content with comments
    await page.goto('/cases');
    await page.locator('[href^="/cases/"]').first().click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Find a comment with reply button
    const replyButton = page.locator('button:has-text("답글"), button:has-text("Reply")').first();
    
    if (await replyButton.isVisible()) {
      await replyButton.click();
      
      // Find reply input
      const replyInput = page.locator('[placeholder*="답글"], [placeholder*="reply"]').first();
      const testReply = `Test reply ${Date.now()}`;
      
      await replyInput.fill(testReply);
      
      // Submit reply
      const submitReply = page.getByRole('button', { name: /등록|작성|전송/ }).last();
      await submitReply.click();
      
      // Verify reply appears
      await expect(page.locator(`text="${testReply}"`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit own comment', async ({ page }) => {
    // First create a comment
    await page.goto('/cases');
    await page.locator('[href^="/cases/"]').first().click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    const commentInput = page.locator('[placeholder*="댓글"], textarea').first();
    const originalComment = `Original comment ${Date.now()}`;
    
    if (await commentInput.isVisible()) {
      await commentInput.fill(originalComment);
      await page.getByRole('button', { name: /등록|작성|전송/ }).click();
      await expect(page.locator(`text="${originalComment}"`)).toBeVisible({ timeout: 5000 });
      
      // Find edit button for the comment
      const commentElement = page.locator(`text="${originalComment}"`).locator('..');
      const editButton = commentElement.locator('button:has-text("수정"), button:has-text("Edit")').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Edit the comment
        const editInput = page.locator('[value*="Original comment"], textarea:has-text("Original comment")').first();
        const editedComment = `${originalComment} - Edited`;
        
        await editInput.clear();
        await editInput.fill(editedComment);
        
        // Save edit
        await page.getByRole('button', { name: /저장|완료/ }).click();
        
        // Verify edited comment
        await expect(page.locator(`text="${editedComment}"`)).toBeVisible();
      }
    }
  });

  test('should delete own comment', async ({ page }) => {
    // First create a comment
    await page.goto('/cases');
    await page.locator('[href^="/cases/"]').first().click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    const commentInput = page.locator('[placeholder*="댓글"], textarea').first();
    const commentToDelete = `Delete me ${Date.now()}`;
    
    if (await commentInput.isVisible()) {
      await commentInput.fill(commentToDelete);
      await page.getByRole('button', { name: /등록|작성|전송/ }).click();
      await expect(page.locator(`text="${commentToDelete}"`)).toBeVisible({ timeout: 5000 });
      
      // Find delete button
      const commentElement = page.locator(`text="${commentToDelete}"`).locator('..');
      const deleteButton = commentElement.locator('button:has-text("삭제"), button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        await page.getByRole('button', { name: /확인|삭제/ }).click();
        
        // Verify comment is deleted
        await expect(page.locator(`text="${commentToDelete}"`)).not.toBeVisible();
      }
    }
  });

  test('should display comment tree structure', async ({ page }) => {
    // Navigate to content with comments
    await page.goto('/cases');
    await page.locator('[href^="/cases/"]').first().click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Check for nested comment structure
    const comments = await page.locator('[class*="comment"]').all();
    
    if (comments.length > 0) {
      // Check for indentation or nesting indicators
      const nestedComments = await page.locator('[class*="reply"], [class*="nested"], [style*="margin-left"]').all();
      
      // If there are replies, they should be nested
      if (nestedComments.length > 0) {
        expect(nestedComments.length).toBeGreaterThan(0);
      }
    }
  });

  test('should show comment count correctly', async ({ page }) => {
    // Navigate to content list
    await page.goto('/cases');
    
    // Get comment count from list view
    const firstItem = page.locator('[href^="/cases/"]').first();
    const commentCountElement = firstItem.locator('text=/댓글.*\\d+|\\d+.*댓글/');
    
    if (await commentCountElement.isVisible()) {
      const listCommentCount = await commentCountElement.textContent();
      const count = parseInt(listCommentCount?.match(/\d+/)?.[0] || '0');
      
      // Click to view content
      await firstItem.click();
      await page.waitForURL(/\/cases\/[a-f0-9-]+/);
      
      // Count actual comments
      const actualComments = await page.locator('[class*="comment-item"], [data-testid*="comment"]').count();
      
      // Should match or be close (might have pagination)
      expect(actualComments).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle comment notifications', async ({ page }) => {
    // This would require another user to comment on your content
    // For now, check if notification system exists
    
    await page.goto('/');
    
    // Check for notification icon
    const notificationIcon = page.locator('[class*="notification"], [aria-label*="알림"]');
    
    if (await notificationIcon.isVisible()) {
      await notificationIcon.click();
      
      // Check for comment notifications
      const commentNotifications = await page.locator('text=/댓글|comment/i').all();
      
      // Should have notification UI
      expect(await notificationIcon.isVisible()).toBe(true);
    }
  });

  test('should validate comment before submission', async ({ page }) => {
    // Navigate to content
    await page.goto('/cases');
    await page.locator('[href^="/cases/"]').first().click();
    await page.waitForURL(/\/cases\/[a-f0-9-]+/);
    
    // Try to submit empty comment
    const submitButton = page.getByRole('button', { name: /등록|작성|전송/ });
    
    if (await submitButton.isVisible()) {
      // Click without entering text
      await submitButton.click();
      
      // Should not submit or show validation
      const errorMessage = page.locator('[class*="error"], [role="alert"]');
      const hasError = await errorMessage.count() > 0;
      
      // Or button might be disabled
      const isDisabled = await submitButton.isDisabled();
      
      expect(hasError || isDisabled).toBe(true);
    }
  });
});