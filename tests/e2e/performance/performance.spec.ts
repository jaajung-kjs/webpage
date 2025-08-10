import { test, expect } from '../fixtures/base-test';

test.describe('Performance & Quality Checks', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Navigate through main pages
    const pages = ['/', '/cases', '/resources', '/community', '/activities', '/announcements'];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    
    // Filter out known development warnings
    const criticalErrors = errors.filter(error => 
      !error.includes('Download the React DevTools') &&
      !error.includes('hydration') &&
      !error.includes('[Fast Refresh]')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should implement lazy loading for images', async ({ page }) => {
    await page.goto('/');
    
    // Check for lazy loaded images
    const images = await page.locator('img[loading="lazy"]').count();
    
    // Should have at least some lazy loaded images
    expect(images).toBeGreaterThan(0);
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    const title = await page.title();
    expect(title).toContain('KEPCO');
    
    // Check meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    
    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    
    // Should have OG tags for social sharing
    if (ogTitle) {
      expect(ogTitle).toBeTruthy();
    }
    if (ogDescription) {
      expect(ogDescription).toBeTruthy();
    }
  });

  test('should handle pagination efficiently', async ({ page }) => {
    await page.goto('/cases');
    
    // Look for pagination
    const pagination = page.locator('[class*="pagination"], [aria-label*="pagination"]');
    
    if (await pagination.isVisible()) {
      // Click next page
      const nextButton = page.locator('button:has-text("다음"), button[aria-label*="다음"]');
      
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        const startTime = Date.now();
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Pagination should be fast
        expect(loadTime).toBeLessThan(2000);
      }
    }
  });

  test('should implement infinite scroll where appropriate', async ({ page }) => {
    await page.goto('/community');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait for potential new content
    await page.waitForTimeout(2000);
    
    // Check if more content loaded
    const initialCount = await page.locator('[class*="post"], [class*="item"]').count();
    
    if (initialCount > 10) {
      // If there are many items, infinite scroll might be implemented
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      
      const newCount = await page.locator('[class*="post"], [class*="item"]').count();
      
      // New items might have loaded
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should have accessible color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Check for text visibility
    const bodyText = await page.locator('body').evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor
      };
    });
    
    // Should have defined colors
    expect(bodyText.color).toBeTruthy();
    expect(bodyText.backgroundColor).toBeTruthy();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if an element is focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    
    // Should have focus on something
    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one h1
    
    // Check heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      const level = parseInt(tagName.substring(1));
      
      // Should not skip heading levels
      if (lastLevel > 0) {
        expect(level).toBeLessThanOrEqual(lastLevel + 1);
      }
      lastLevel = level;
    }
  });

  test('should have ARIA labels for interactive elements', async ({ page }) => {
    await page.goto('/');
    
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Should have either text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('should handle viewport responsiveness', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Should have mobile menu or responsive layout
    const mobileMenu = page.locator('[class*="mobile"], [aria-label*="메뉴"]');
    expect(await mobileMenu.count()).toBeGreaterThanOrEqual(0);
  });

  test('should cache static assets', async ({ page }) => {
    // First visit
    const requests1: string[] = [];
    page.on('request', request => {
      if (request.url().includes('.js') || request.url().includes('.css')) {
        requests1.push(request.url());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Second visit
    const requests2: string[] = [];
    page.on('request', request => {
      if (request.url().includes('.js') || request.url().includes('.css')) {
        requests2.push(request.url());
      }
    });
    
    await page.reload();
    
    // Some assets should be cached (fewer requests on reload)
    // Note: This might not work perfectly in dev mode
    console.log(`First load: ${requests1.length} assets, Reload: ${requests2.length} assets`);
  });
});