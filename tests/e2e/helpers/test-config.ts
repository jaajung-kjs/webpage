export const TEST_CONFIG = {
  // Test user credentials
  user: {
    email: 'jaajung@naver.com',
    password: 'kjs487956!@',
  },
  
  // Timeouts
  timeouts: {
    navigation: 30000,
    action: 15000,
    assertion: 10000,
    realtime: 5000,
  },
  
  // API endpoints
  api: {
    baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  
  // Test data
  testData: {
    contentTitle: `Test Content ${Date.now()}`,
    messageContent: `Test Message ${Date.now()}`,
    commentContent: `Test Comment ${Date.now()}`,
  },
  
  // Network conditions for testing
  networkConditions: {
    offline: {
      offline: true,
    },
    slow3G: {
      offline: false,
      downloadThroughput: 50 * 1024 / 8, // 50kb/s
      uploadThroughput: 50 * 1024 / 8,
      latency: 400,
    },
    fast3G: {
      offline: false,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6Mb/s
      uploadThroughput: 750 * 1024 / 8,
      latency: 150,
    },
  },
  
  // Viewport sizes for responsive testing
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
  },
};