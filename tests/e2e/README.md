# KEPCO AI Community E2E Tests

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install browsers (first time only)
npx playwright install

# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific browser tests
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# View test report
npm run test:e2e:report
```

## 📁 Directory Structure

```
tests/e2e/
├── auth/                 # Authentication tests
├── content/             # Content CRUD tests
├── profile/             # Profile and user data tests
├── activities/          # Activity feature tests
├── messages/            # Messaging system tests
├── realtime/           # Realtime functionality tests
├── network/            # Network resilience tests
├── fixtures/           # Test fixtures and base setup
├── helpers/            # Test helper utilities
├── utils/              # Utility functions
├── .auth/              # Authentication state storage
├── screenshots/        # Test failure screenshots
├── auth.setup.ts      # Authentication setup
├── global-setup.ts    # Global test setup
├── global-teardown.ts # Global test teardown
└── test-plan.md       # Comprehensive test plan
```

## 🔑 Test User Credentials

Primary test account:
- Email: `jaajung@naver.com`
- Password: `kjs487956!@`

## ✅ What We Test

### 1. **No Hardcoded Data**
- All displayed data comes from the database
- Profile statistics (points, levels, badges)
- Achievement and skill data
- Content metadata (views, likes, timestamps)
- User rankings and leaderboards

### 2. **Core Features**
- User authentication and authorization
- Content creation, editing, deletion
- Comments and replies
- Activity participation (참가신청/참가취소)
- Messaging system
- Real-time notifications

### 3. **Realtime Features**
- Live message delivery
- Typing indicators
- Online user presence
- Real-time content updates
- Activity participant updates

### 4. **Network Resilience**
- Offline mode handling
- Reconnection after network loss
- Background data sync
- Request retry logic
- Caching behavior

### 5. **Performance**
- Page load times < 3s
- Time to interactive < 5s
- Smooth animations (60fps)
- Image lazy loading
- Bundle optimization

## 🛠️ Writing Tests

### Using Test Helpers

```typescript
import { test, expect, testUtils } from './fixtures/base-test';

test('example test', async ({ page, dbValidation, realtimeHelpers, networkHelpers }) => {
  // Use database validation helper
  await dbValidation.validateUserProfileData();
  
  // Use realtime helper
  await realtimeHelpers.waitForRealtimeConnection();
  
  // Use network helper
  await networkHelpers.testOfflineDataPersistence();
  
  // Use test utilities
  await testUtils.login(page);
  const testData = testUtils.generateTestData('Test');
});
```

### Test Structure

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await testUtils.login(page);
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await page.goto('/some-page');
    await expect(page.locator('selector')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
  });
});
```

## 🎯 Test Data Attributes

Add these attributes to your components for reliable test targeting:

```tsx
// Good - using data-testid
<button data-testid="submit-button">Submit</button>
<div data-testid="user-points">{userPoints}</div>
<input data-testid="title-input" />

// Good - semantic attributes for data validation
<span data-testid="view-count" data-source="database">{viewCount}</span>
<div data-testid="user-level" data-value={level}>{levelDisplay}</div>
```

## 📊 Validation Checks

The tests automatically check for:

1. **Hardcoded Patterns**:
   - Text starting with "Test", "Demo", "Example", "Sample"
   - Lorem ipsum text
   - Placeholder values
   - TODO/FIXME comments

2. **Data Sources**:
   - Numeric values that should come from DB
   - Timestamps and dates
   - User-generated content
   - Dynamic statistics

3. **Console Errors**:
   - JavaScript errors
   - Network failures
   - React warnings
   - Unhandled promises

## 🐛 Debugging Tests

```bash
# Run with debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/profile/profile.spec.ts

# Run with specific title
npx playwright test -g "should display user stats"

# Generate trace for debugging
npx playwright test --trace on

# Update snapshots
npx playwright test --update-snapshots
```

## 📈 CI/CD Integration

The tests are configured to run in CI with:
- Parallel execution disabled for stability
- Retry on failure (2 attempts)
- HTML and JSON reports
- Screenshot on failure
- Video recording on failure

## 🔧 Configuration

Edit `playwright.config.ts` to modify:
- Base URL
- Timeouts
- Browser settings
- Test directory
- Reporter settings

## 📝 Best Practices

1. **Always validate data sources** - Check that UI data comes from DB
2. **Use data-testid attributes** - For reliable element selection
3. **Test user journeys** - Not just individual features
4. **Check error states** - Test failure scenarios
5. **Monitor performance** - Keep track of load times
6. **Test accessibility** - Ensure keyboard navigation works
7. **Clean up test data** - Don't leave test artifacts

## 🚨 Common Issues

### Authentication Issues
- Ensure test user exists in database
- Check auth state is saved correctly
- Verify session persistence

### Flaky Tests
- Add proper waits for async operations
- Use `waitForLoadState('networkidle')`
- Check for race conditions

### Timeout Issues
- Increase timeout for slow operations
- Check network conditions
- Verify selectors are correct

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Setup](https://playwright.dev/docs/ci)