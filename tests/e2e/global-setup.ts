import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Create auth directory if it doesn't exist
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Perform any global setup tasks here
  // For example, seeding test data, clearing caches, etc.
  
  console.log('✅ Global setup completed');
  
  return async () => {
    // Global teardown will be called here
    console.log('🧹 Running global teardown...');
  };
}

export default globalSetup;