const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Search for the single authoritative .env file across standard project root paths
const candidateEnvPaths = [
  path.resolve(__dirname, '../../../.env'),         // Workspace Root
  path.resolve(__dirname, '../../.env'),            // Parent directory
  path.resolve(process.cwd(), '.env'),              // Current working directory
  path.resolve(process.cwd(), '../../.env'),        // CWD root if in subfolder
  path.resolve(__dirname, '../.env')                // Local fallback
];

let loadedPath = null;
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedPath = envPath;
    break;
  }
}

// Extract and normalize configuration values
const JWT_SECRET = process.env.JWT_SECRET || process.env.Jwt__Secret || process.env['Jwt:Secret'];
const MONGO_URI = process.env.MONGO_URI || process.env.Mongo__ConnectionString;
const PORT = parseInt(process.env.PORT || process.env.EXPRESS_PORT || '5005', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5265,http://localhost:5005')
  .split(',')
  .map(s => s.trim().replace(/^["']|["']$/g, ''))
  .filter(Boolean);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Fail-fast validation
if (!JWT_SECRET || JWT_SECRET.trim().length < 32) {
  const errMsg = '[FATAL CONFIGURATION ERROR] JWT_SECRET is missing or shorter than 32 characters. Centralized authentication requires a valid secret.';
  console.error(errMsg);
  if (NODE_ENV === 'production' || !JWT_SECRET) {
    throw new Error(errMsg);
  }
}

if (!MONGO_URI) {
  console.warn('[CONFIG WARNING] MONGO_URI is not set. Express auxiliary features will run in degraded mode.');
}

const config = Object.freeze({
  NODE_ENV,
  PORT,
  JWT_SECRET: JWT_SECRET ? JWT_SECRET.trim().replace(/^["']|["']$/g, '') : '',
  MONGO_URI: MONGO_URI ? MONGO_URI.trim().replace(/^["']|["']$/g, '') : '',
  ALLOWED_ORIGINS,
  RATE_LIMIT_MAX,
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  loadedFrom: loadedPath
});

module.exports = config;
