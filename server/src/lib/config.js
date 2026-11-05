const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Deterministically load server/.env
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

function validateConfig() {
  const errors = [];

  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProd = NODE_ENV === 'production';

  // 1. DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required. Set it in server/.env');
  }

  // 2. JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required. Set it in server/.env');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for cryptographic security.');
  } else if (isProd && (jwtSecret.includes('dev-secret') || jwtSecret.includes('change-me'))) {
    errors.push('JWT_SECRET cannot use insecure placeholder values in production.');
  }

  // 3. ENABLE_DEV_LOGIN
  const enableDevLogin = process.env.ENABLE_DEV_LOGIN === 'true';
  if (isProd && enableDevLogin) {
    errors.push('ENABLE_DEV_LOGIN cannot be enabled when NODE_ENV === "production".');
  }

  // 4. GOOGLE_CLIENT_ID
  if (isProd && !process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is required in production for Google OAuth authentication.');
  }

  if (errors.length > 0) {
    console.error('\n❌ Server Startup Configuration Error(s):');
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error('\nPlease check your server/.env file and resolve the issues above.\n');
    throw new Error(`Configuration validation failed: ${errors.join('; ')}`);
  }

  return {
    PORT: parseInt(process.env.PORT, 10) || 3001,
    NODE_ENV,
    isProd,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: jwtSecret,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'GainChek <noreply@resend.dev>',
    ENABLE_DEV_LOGIN: enableDevLogin && NODE_ENV === 'development',
  };
}

const config = validateConfig();

module.exports = config;
