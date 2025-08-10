import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...');
  
  // Perform any cleanup tasks here
  // For example, cleaning up test data, closing connections, etc.
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;